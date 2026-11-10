using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using SchoolAdmission.Data;
using SchoolAdmission.Models;

namespace SchoolAdmission.Endpoints;

public static class ClassesEndpoints
{
    public static void MapClassesEndpoints(this WebApplication app)
    {
        app.MapPost("/classes", CreateClass);
        app.MapGet("/classes", GetAllClasses);
        app.MapGet("/classes/{classId:guid}", GetClassById);
        app.MapGet("/classes/{classId:guid}/confirmed-students", GetConfirmedStudents);
        app.MapGet("/classes/{classId:guid}/sections", GetClassSections);
        app.MapPost("/classes/{classId:guid}/sections", SaveClassSections);
        app.MapPost("/classes/{classId:guid}/demo-seed", SeedDemoStudents);
    }

    // POST /classes → 201 { id, name, totalSeats }
    private static async Task<IResult> CreateClass(
        [FromBody] CreateClassRequest req,
        AppDbContext db)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            return Results.Json(
                new { error = new { code = "INVALID_NAME", message = "Name must not be blank." } },
                statusCode: 400);

        if (req.TotalSeats <= 0)
            return Results.Json(
                new { error = new { code = "INVALID_SEATS", message = "totalSeats must be greater than 0." } },
                statusCode: 400);

        var cls = new Class
        {
            Id = Guid.NewGuid(),
            Name = req.Name.Trim(),
            TotalSeats = req.TotalSeats,
        };

        db.Classes.Add(cls);
        await db.SaveChangesAsync();

        return Results.Json(
            new { id = cls.Id, name = cls.Name, totalSeats = cls.TotalSeats },
            statusCode: 201);
    }

    // GET /classes → 200 [{ id, name, totalSeats, heldSeats, confirmedSeats, availableSeats }]
    // Uses DB clock (now()) for expiry — never the application clock.
    private static async Task<IResult> GetAllClasses(AppDbContext db)
    {
        var conn = (NpgsqlConnection)db.Database.GetDbConnection();
        await conn.OpenAsync();
        try
        {
            var classes = await db.Classes.OrderBy(c => c.CreatedAt).ToListAsync();
            var classIds = classes.Select(c => c.Id).ToArray();

            var heldDict = new Dictionary<Guid, int>();
            var confirmedDict = new Dictionary<Guid, int>();

            if (classIds.Length > 0)
            {
                await using var cmd = new NpgsqlCommand(@"
                    SELECT class_id,
                           COUNT(*) FILTER (WHERE status='HELD' AND expires_at > now())::int AS held,
                           COUNT(*) FILTER (WHERE status='CONFIRMED')::int AS confirmed
                    FROM holds
                    WHERE class_id = ANY(@ids)
                    GROUP BY class_id", conn);
                cmd.Parameters.AddWithValue("ids", classIds);
                await using var reader = await cmd.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                {
                    var cid = reader.GetGuid(0);
                    heldDict[cid] = reader.GetInt32(1);
                    confirmedDict[cid] = reader.GetInt32(2);
                }
            }

            var result = classes.Select(c =>
            {
                var held = heldDict.GetValueOrDefault(c.Id);
                var confirmed = confirmedDict.GetValueOrDefault(c.Id);
                return new
                {
                    id = c.Id,
                    name = c.Name,
                    totalSeats = c.TotalSeats,
                    heldSeats = held,
                    confirmedSeats = confirmed,
                    availableSeats = c.TotalSeats - held - confirmed
                };
            });

            return Results.Ok(result);
        }
        finally
        {
            await conn.CloseAsync();
        }
    }

    // GET /classes/{classId} → 200 { id, name, totalSeats, heldSeats, confirmedSeats, availableSeats }
    // Uses DB clock (now()) for expiry — never the application clock.
    private static async Task<IResult> GetClassById(Guid classId, AppDbContext db)
    {
        var cls = await db.Classes.FindAsync(classId);
        if (cls is null)
            return Results.Json(
                new { error = new { code = "CLASS_NOT_FOUND", message = "Class not found." } },
                statusCode: 404);

        var conn = (NpgsqlConnection)db.Database.GetDbConnection();
        await conn.OpenAsync();
        try
        {
            await using var cmd = new NpgsqlCommand(@"
                SELECT
                    COUNT(*) FILTER (WHERE status='HELD' AND expires_at > now())::int AS held,
                    COUNT(*) FILTER (WHERE status='CONFIRMED')::int AS confirmed
                FROM holds
                WHERE class_id = @classId", conn);
            cmd.Parameters.AddWithValue("classId", classId);
            await using var reader = await cmd.ExecuteReaderAsync();
            await reader.ReadAsync();
            var held = reader.GetInt32(0);
            var confirmed = reader.GetInt32(1);

            return Results.Ok(new
            {
                id = cls.Id,
                name = cls.Name,
                totalSeats = cls.TotalSeats,
                heldSeats = held,
                confirmedSeats = confirmed,
                availableSeats = cls.TotalSeats - held - confirmed
            });
        }
        finally
        {
            await conn.CloseAsync();
        }
    }

    // GET /classes/{classId}/confirmed-students
    private static async Task<IResult> GetConfirmedStudents(Guid classId, AppDbContext db)
    {
        var conn = (NpgsqlConnection)db.Database.GetDbConnection();
        await conn.OpenAsync();
        try
        {
            await using var cmd = new NpgsqlCommand(@"
                SELECT id, student_id, confirmed_at, created_at
                FROM holds
                WHERE class_id = @classId AND status = 'CONFIRMED'
                ORDER BY confirmed_at ASC NULLS LAST, created_at ASC", conn);
            cmd.Parameters.AddWithValue("classId", classId);
            await using var reader = await cmd.ExecuteReaderAsync();
            var list = new List<object>();
            var seatNum = 1;
            while (await reader.ReadAsync())
            {
                list.Add(new
                {
                    holdId = reader.GetGuid(0),
                    studentId = reader.GetString(1),
                    confirmedAt = reader.IsDBNull(2) ? null : reader.GetDateTime(2).ToString("o"),
                    createdAt = reader.GetDateTime(3).ToString("o"),
                    seatNumber = seatNum++
                });
            }
            return Results.Ok(list);
        }
        finally
        {
            await conn.CloseAsync();
        }
    }

    // GET /classes/{classId}/sections
    private static async Task<IResult> GetClassSections(Guid classId, AppDbContext db)
    {
        var conn = (NpgsqlConnection)db.Database.GetDbConnection();
        await conn.OpenAsync();
        try
        {
            await using var cmd = new NpgsqlCommand(@"
                SELECT section_size, data_json, updated_at
                FROM class_sections
                WHERE class_id = @classId", conn);
            cmd.Parameters.AddWithValue("classId", classId);
            await using var reader = await cmd.ExecuteReaderAsync();
            if (!await reader.ReadAsync())
                return Results.Ok(new { exists = false, sectionSize = 30, sections = Array.Empty<object>() });

            var sectionSize = reader.GetInt32(0);
            var json = reader.GetString(1);
            var updatedAt = reader.GetDateTime(2).ToString("o");
            return Results.Ok(new
            {
                exists = true,
                sectionSize,
                updatedAt,
                sections = System.Text.Json.JsonDocument.Parse(json).RootElement
            });
        }
        finally
        {
            await conn.CloseAsync();
        }
    }

    // POST /classes/{classId}/sections
    private static async Task<IResult> SaveClassSections(
        Guid classId,
        [FromBody] SaveSectionsRequest req,
        AppDbContext db)
    {
        var conn = (NpgsqlConnection)db.Database.GetDbConnection();
        await conn.OpenAsync();
        try
        {
            var json = System.Text.Json.JsonSerializer.Serialize(req.Sections);
            await using var cmd = new NpgsqlCommand(@"
                INSERT INTO class_sections (class_id, section_size, data_json, updated_at)
                VALUES (@classId, @size, @json, now())
                ON CONFLICT (class_id)
                DO UPDATE SET section_size = EXCLUDED.section_size, data_json = EXCLUDED.data_json, updated_at = now()", conn);
            cmd.Parameters.AddWithValue("classId", classId);
            cmd.Parameters.AddWithValue("size", req.SectionSize <= 0 ? 30 : req.SectionSize);
            cmd.Parameters.AddWithValue("json", json);
            await cmd.ExecuteNonQueryAsync();
            return Results.Ok(new { success = true });
        }
        finally
        {
            await conn.CloseAsync();
        }
    }

    // POST /classes/{classId}/demo-seed?count=160
    private static async Task<IResult> SeedDemoStudents(
        Guid classId,
        [FromQuery] int? count,
        AppDbContext db)
    {
        var seedCount = (count == null || count <= 0) ? 160 : Math.Min(count.Value, 300);
        var cls = await db.Classes.FindAsync(classId);
        if (cls == null) return Results.NotFound();

        if (cls.TotalSeats < seedCount)
        {
            cls.TotalSeats = seedCount;
            await db.SaveChangesAsync();
        }

        var conn = (NpgsqlConnection)db.Database.GetDbConnection();
        await conn.OpenAsync();
        try
        {
            await using var countCmd = new NpgsqlCommand(
                "SELECT count(*) FROM holds WHERE class_id=@classId AND status='CONFIRMED'", conn);
            countCmd.Parameters.AddWithValue("classId", classId);
            var existing = (long)(await countCmd.ExecuteScalarAsync())!;

            var toAdd = seedCount - (int)existing;
            if (toAdd > 0)
            {
                for (int i = 1; i <= toAdd; i++)
                {
                    var studentNum = existing + i;
                    var studentId = $"2015{studentNum:D13}";
                    await using var insCmd = new NpgsqlCommand(@"
                        INSERT INTO holds (id, class_id, student_id, status, expires_at, confirmed_at)
                        VALUES (@id, @classId, @studentId, 'CONFIRMED', now() + interval '1 day', now() - (interval '1 minute' * @min))
                        ON CONFLICT DO NOTHING", conn);
                    insCmd.Parameters.AddWithValue("id", Guid.NewGuid());
                    insCmd.Parameters.AddWithValue("classId", classId);
                    insCmd.Parameters.AddWithValue("studentId", studentId);
                    insCmd.Parameters.AddWithValue("min", toAdd - i);
                    await insCmd.ExecuteNonQueryAsync();
                }
            }
            return Results.Ok(new { success = true, seeded = seedCount });
        }
        finally
        {
            await conn.CloseAsync();
        }
    }
}

public record SaveSectionsRequest(int SectionSize, object Sections);

public record CreateClassRequest(string Name, int TotalSeats);
