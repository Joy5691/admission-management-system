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
}

public record CreateClassRequest(string Name, int TotalSeats);
