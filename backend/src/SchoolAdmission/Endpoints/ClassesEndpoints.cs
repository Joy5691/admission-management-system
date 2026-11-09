using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
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
    private static async Task<IResult> GetAllClasses(AppDbContext db)
    {
        var now = DateTime.UtcNow;
        var classes = await db.Classes.ToListAsync();

        var classIds = classes.Select(c => c.Id).ToList();

        // Get held counts (not expired)
        var heldCounts = await db.Holds
            .Where(h => classIds.Contains(h.ClassId) && h.Status == "HELD" && h.ExpiresAt > now)
            .GroupBy(h => h.ClassId)
            .Select(g => new { ClassId = g.Key, Count = g.Count() })
            .ToListAsync();

        var confirmedCounts = await db.Holds
            .Where(h => classIds.Contains(h.ClassId) && h.Status == "CONFIRMED")
            .GroupBy(h => h.ClassId)
            .Select(g => new { ClassId = g.Key, Count = g.Count() })
            .ToListAsync();

        var heldDict = heldCounts.ToDictionary(x => x.ClassId, x => x.Count);
        var confirmedDict = confirmedCounts.ToDictionary(x => x.ClassId, x => x.Count);

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

    // GET /classes/{classId} → 200 { id, name, totalSeats, heldSeats, confirmedSeats, availableSeats }
    private static async Task<IResult> GetClassById(Guid classId, AppDbContext db)
    {
        var cls = await db.Classes.FindAsync(classId);
        if (cls is null)
            return Results.Json(
                new { error = new { code = "CLASS_NOT_FOUND", message = "Class not found." } },
                statusCode: 404);

        var now = DateTime.UtcNow;
        var held = await db.Holds.CountAsync(h => h.ClassId == classId && h.Status == "HELD" && h.ExpiresAt > now);
        var confirmed = await db.Holds.CountAsync(h => h.ClassId == classId && h.Status == "CONFIRMED");

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
}

public record CreateClassRequest(string Name, int TotalSeats);
