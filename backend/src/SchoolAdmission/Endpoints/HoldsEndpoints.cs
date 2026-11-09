using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using SchoolAdmission.Data;
using SchoolAdmission.Models;

namespace SchoolAdmission.Endpoints;

public static class HoldsEndpoints
{
    public static void MapHoldsEndpoints(this WebApplication app)
    {
        app.MapPost("/classes/{classId:guid}/holds", CreateHold);
        app.MapGet("/holds/{holdId:guid}", GetHold);
        app.MapPost("/holds/{holdId:guid}/confirm", ConfirmHold);
        app.MapDelete("/holds/{holdId:guid}", CancelHold);
        app.MapGet("/me/holds", GetMyHolds);
    }

    // POST /classes/{classId}/holds
    // Header: X-Student-Id (17 digits)
    // → 201 { holdId, classId, studentId, status: "HELD", expiresAt }
    // → 409 NO_SEATS | ALREADY_APPLIED
    private static async Task<IResult> CreateHold(
        Guid classId,
        HttpContext ctx,
        AppDbContext db,
        IConfiguration config)
    {
        var studentId = ctx.Request.Headers["X-Student-Id"].FirstOrDefault();
        if (!IsValidStudentId(studentId))
            return ErrorResult(400, "INVALID_STUDENT_ID", "X-Student-Id must be exactly 17 digits.");

        var durationSecs = int.Parse(config["HOLD_DURATION_SECONDS"] ?? "600");

        // Use raw SQL with explicit transaction and row-level lock
        var conn = (NpgsqlConnection)db.Database.GetDbConnection();
        await conn.OpenAsync();

        await using var txn = await conn.BeginTransactionAsync();
        try
        {
            // 1. Lock class row (FOR UPDATE) — also verifies it exists
            await using var checkCmd = new NpgsqlCommand(
                "SELECT total_seats FROM classes WHERE id = @classId FOR UPDATE",
                conn, txn);
            checkCmd.Parameters.AddWithValue("classId", classId);

            var totalSeatsObj = await checkCmd.ExecuteScalarAsync();
            if (totalSeatsObj is null)
            {
                await txn.RollbackAsync();
                return ErrorResult(404, "CLASS_NOT_FOUND", "Class not found.");
            }
            var totalSeats = (int)totalSeatsObj;

            // 2. Lazy-expire stale holds using DB clock
            await using var expireCmd = new NpgsqlCommand(
                "UPDATE holds SET status='EXPIRED' WHERE class_id=@classId AND status='HELD' AND expires_at <= now()",
                conn, txn);
            expireCmd.Parameters.AddWithValue("classId", classId);
            await expireCmd.ExecuteNonQueryAsync();

            // 3. Count active seats (HELD not-expired + CONFIRMED)
            await using var countCmd = new NpgsqlCommand(
                "SELECT count(*) FROM holds WHERE class_id=@classId AND status IN ('HELD','CONFIRMED')",
                conn, txn);
            countCmd.Parameters.AddWithValue("classId", classId);
            var activeCount = (long)(await countCmd.ExecuteScalarAsync())!;

            if (activeCount >= totalSeats)
            {
                await txn.RollbackAsync();
                return ErrorResult(409, "NO_SEATS", "No available seats in this class.");
            }

            // 4. Check ALREADY_APPLIED (active hold by same student in same class)
            await using var dupCmd = new NpgsqlCommand(
                "SELECT id FROM holds WHERE class_id=@classId AND student_id=@studentId AND status IN ('HELD','CONFIRMED') LIMIT 1",
                conn, txn);
            dupCmd.Parameters.AddWithValue("classId", classId);
            dupCmd.Parameters.AddWithValue("studentId", studentId!);
            var existingId = await dupCmd.ExecuteScalarAsync();
            if (existingId is not null)
            {
                await txn.RollbackAsync();
                return ErrorResult(409, "ALREADY_APPLIED", "Student already has an active hold or confirmed seat in this class.");
            }

            // 5. Insert the hold (expires_at uses DB clock)
            var newHoldId = Guid.NewGuid();
            await using var insertCmd = new NpgsqlCommand(
                @"INSERT INTO holds (id, class_id, student_id, status, expires_at)
                  VALUES (@id, @classId, @studentId, 'HELD', now() + @dur * interval '1 second')
                  RETURNING expires_at",
                conn, txn);
            insertCmd.Parameters.AddWithValue("id", newHoldId);
            insertCmd.Parameters.AddWithValue("classId", classId);
            insertCmd.Parameters.AddWithValue("studentId", studentId!);
            insertCmd.Parameters.AddWithValue("dur", durationSecs);

            var expiresAt = (DateTime)(await insertCmd.ExecuteScalarAsync())!;

            await txn.CommitAsync();

            return Results.Json(new
            {
                holdId = newHoldId,
                classId = classId,
                studentId = studentId,
                status = "HELD",
                expiresAt = expiresAt.ToString("o")
            }, statusCode: 201);
        }
        catch (PostgresException pgex) when (pgex.SqlState == "23505") // unique violation
        {
            await txn.RollbackAsync();
            return ErrorResult(409, "ALREADY_APPLIED", "Student already has an active hold or confirmed seat in this class.");
        }
        catch
        {
            await txn.RollbackAsync();
            throw;
        }
        finally
        {
            await conn.CloseAsync();
        }
    }

    // GET /holds/{holdId} → 200 { holdId, classId, status, expiresAt }
    private static async Task<IResult> GetHold(Guid holdId, AppDbContext db)
    {
        var hold = await db.Holds.FindAsync(holdId);
        if (hold is null)
            return ErrorResult(404, "HOLD_NOT_FOUND", "Hold not found.");

        // Apply lazy expiry reporting
        var now = DateTime.UtcNow;
        var reportedStatus = hold.Status == "HELD" && hold.ExpiresAt <= now ? "EXPIRED" : hold.Status;

        return Results.Ok(new
        {
            holdId = hold.Id,
            classId = hold.ClassId,
            status = reportedStatus,
            expiresAt = hold.ExpiresAt.ToString("o")
        });
    }

    // POST /holds/{holdId}/confirm → 200 { holdId, status: "CONFIRMED" } (idempotent)
    private static async Task<IResult> ConfirmHold(
        Guid holdId,
        HttpContext ctx,
        AppDbContext db)
    {
        var studentId = ctx.Request.Headers["X-Student-Id"].FirstOrDefault();
        if (!IsValidStudentId(studentId))
            return ErrorResult(400, "INVALID_STUDENT_ID", "X-Student-Id must be exactly 17 digits.");

        var conn = (NpgsqlConnection)db.Database.GetDbConnection();
        await conn.OpenAsync();
        await using var txn = await conn.BeginTransactionAsync();
        try
        {
            // Lock the hold row
            await using var selectCmd = new NpgsqlCommand(
                @"SELECT h.id, h.class_id, h.student_id, h.status, h.expires_at
                  FROM holds h
                  JOIN classes c ON c.id = h.class_id
                  WHERE h.id = @holdId
                  FOR UPDATE OF c",
                conn, txn);
            selectCmd.Parameters.AddWithValue("holdId", holdId);

            await using var reader = await selectCmd.ExecuteReaderAsync();
            if (!await reader.ReadAsync())
            {
                await reader.CloseAsync();
                await txn.RollbackAsync();
                return ErrorResult(404, "HOLD_NOT_FOUND", "Hold not found.");
            }

            var holdStudentId = reader.GetString(2).Trim();
            var status = reader.GetString(3);
            var expiresAt = reader.GetDateTime(4);
            await reader.CloseAsync();

            // Another student's hold → 404
            if (holdStudentId != studentId)
            {
                await txn.RollbackAsync();
                return ErrorResult(404, "HOLD_NOT_FOUND", "Hold not found.");
            }

            // Already confirmed by same student → 200 idempotent
            if (status == "CONFIRMED")
            {
                await txn.RollbackAsync();
                return Results.Ok(new { holdId, status = "CONFIRMED" });
            }

            // Not HELD at all (CANCELLED or already EXPIRED in DB)
            if (status != "HELD")
            {
                await txn.RollbackAsync();
                return ErrorResult(409, status == "CANCELLED" ? "HOLD_CANCELLED" : "HOLD_EXPIRED",
                    $"Hold is {status}.");
            }

            // HELD but actually expired (DB clock check)
            await using var nowCmd = new NpgsqlCommand("SELECT now()", conn, txn);
            var dbNow = (DateTime)(await nowCmd.ExecuteScalarAsync())!;

            if (expiresAt <= dbNow)
            {
                // Mark as EXPIRED
                await using var markCmd = new NpgsqlCommand(
                    "UPDATE holds SET status='EXPIRED' WHERE id=@id",
                    conn, txn);
                markCmd.Parameters.AddWithValue("id", holdId);
                await markCmd.ExecuteNonQueryAsync();
                await txn.CommitAsync();
                return ErrorResult(409, "HOLD_EXPIRED", "Hold has expired.");
            }

            // HELD and not expired → confirm
            await using var confirmCmd = new NpgsqlCommand(
                "UPDATE holds SET status='CONFIRMED', confirmed_at=now() WHERE id=@id",
                conn, txn);
            confirmCmd.Parameters.AddWithValue("id", holdId);
            await confirmCmd.ExecuteNonQueryAsync();
            await txn.CommitAsync();

            return Results.Ok(new { holdId, status = "CONFIRMED" });
        }
        catch
        {
            await txn.RollbackAsync();
            throw;
        }
        finally
        {
            await conn.CloseAsync();
        }
    }

    // DELETE /holds/{holdId} → 204
    private static async Task<IResult> CancelHold(
        Guid holdId,
        HttpContext ctx,
        AppDbContext db)
    {
        var studentId = ctx.Request.Headers["X-Student-Id"].FirstOrDefault();
        if (!IsValidStudentId(studentId))
            return ErrorResult(400, "INVALID_STUDENT_ID", "X-Student-Id must be exactly 17 digits.");

        var hold = await db.Holds.FindAsync(holdId);
        if (hold is null || hold.StudentId.Trim() != studentId)
            return ErrorResult(404, "HOLD_NOT_FOUND", "Hold not found.");

        if (hold.Status == "CONFIRMED")
            return ErrorResult(409, "HOLD_CONFIRMED", "Confirmed holds cannot be cancelled.");

        if (hold.Status != "HELD")
            return ErrorResult(409, "HOLD_NOT_ACTIVE", $"Hold is {hold.Status} and cannot be cancelled.");

        hold.Status = "CANCELLED";
        hold.CancelledAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        return Results.NoContent();
    }

    // GET /me/holds → 200 [{ holdId, classId, className, status, expiresAt }]
    private static async Task<IResult> GetMyHolds(HttpContext ctx, AppDbContext db)
    {
        var studentId = ctx.Request.Headers["X-Student-Id"].FirstOrDefault();
        if (!IsValidStudentId(studentId))
            return ErrorResult(400, "INVALID_STUDENT_ID", "X-Student-Id must be exactly 17 digits.");

        var now = DateTime.UtcNow;
        var holds = await db.Holds
            .Include(h => h.Class)
            .Where(h => h.StudentId == studentId)
            .OrderByDescending(h => h.CreatedAt)
            .ToListAsync();

        var result = holds.Select(h =>
        {
            var reportedStatus = h.Status == "HELD" && h.ExpiresAt <= now ? "EXPIRED" : h.Status;
            return new
            {
                holdId = h.Id,
                classId = h.ClassId,
                className = h.Class.Name,
                status = reportedStatus,
                expiresAt = h.ExpiresAt.ToString("o")
            };
        });

        return Results.Ok(result);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private static bool IsValidStudentId(string? id) =>
        id is { Length: 17 } && id.All(char.IsDigit);

    private static IResult ErrorResult(int status, string code, string message) =>
        Results.Json(
            new { error = new { code, message } },
            statusCode: status);
}
