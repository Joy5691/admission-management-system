using Microsoft.EntityFrameworkCore;
using SchoolAdmission.Data;
using SchoolAdmission.Endpoints;
using SchoolAdmission.Middleware;
using SchoolAdmission.Services;

var builder = WebApplication.CreateBuilder(args);

// ── Configure JSON serialization (camelCase) ──────────────────────────────────
builder.Services.ConfigureHttpJsonOptions(o =>
{
    o.SerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
});

// ── Database ──────────────────────────────────────────────────────────────────
var connStr = builder.Configuration["ConnectionStrings__Default"]
    ?? builder.Configuration.GetConnectionString("Default")
    ?? throw new InvalidOperationException("No database connection string configured.");

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connStr));

// ── Background sweeper ────────────────────────────────────────────────────────
builder.Services.AddHostedService<HoldExpiryService>();

// ── CORS ──────────────────────────────────────────────────────────────────────
builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendPolicy", policy =>
        policy.WithOrigins("http://localhost:3000")
              .AllowAnyHeader()
              .AllowAnyMethod());
});

var app = builder.Build();

// ── Middleware ────────────────────────────────────────────────────────────────
app.UseMiddleware<ErrorHandlingMiddleware>();
app.UseCors("FrontendPolicy");

// ── Apply DB schema on startup ────────────────────────────────────────────────
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    // Retry until DB is reachable (Docker healthcheck should handle this, but be safe)
    for (var attempt = 1; attempt <= 10; attempt++)
    {
        try
        {
            await db.Database.OpenConnectionAsync();
            await db.Database.CloseConnectionAsync();
            break;
        }
        catch (Exception ex) when (attempt < 10)
        {
            var log = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
            log.LogWarning("DB not ready (attempt {Attempt}): {Message}. Retrying in 2s…", attempt, ex.Message);
            await Task.Delay(2000);
        }
    }

    await db.EnsureSchemaAsync();
}

// ── Route endpoints ───────────────────────────────────────────────────────────
app.MapClassesEndpoints();
app.MapHoldsEndpoints();

app.Run();
