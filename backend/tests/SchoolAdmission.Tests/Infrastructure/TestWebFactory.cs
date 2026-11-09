using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.EntityFrameworkCore;
using Testcontainers.PostgreSql;
using SchoolAdmission.Data;

namespace SchoolAdmission.Tests.Infrastructure;

/// <summary>
/// Shared Testcontainers-backed WebApplicationFactory.
/// One PostgreSQL container per test-collection lifetime.
/// </summary>
public sealed class TestWebFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly PostgreSqlContainer _pg = new PostgreSqlBuilder()
        .WithImage("postgres:16-alpine")
        .Build();

    /// <summary>Extra settings injected before the host is built.</summary>
    public Dictionary<string, string?> ExtraSettings { get; } = new();

    // ── IAsyncLifetime ────────────────────────────────────────────────────────

    public async Task InitializeAsync()
    {
        await _pg.StartAsync();
    }

    public new async Task DisposeAsync()
    {
        await _pg.StopAsync();
        await base.DisposeAsync();
    }

    // ── WebApplicationFactory ─────────────────────────────────────────────────

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        // Point the app at the Testcontainers PostgreSQL instance
        builder.UseSetting("ConnectionStrings__Default", _pg.GetConnectionString());

        // Apply any extra settings supplied by the test (e.g. HOLD_DURATION_SECONDS)
        foreach (var (key, value) in ExtraSettings)
            builder.UseSetting(key, value);

        builder.UseEnvironment("Testing");
    }
}

/// <summary>
/// Variant factory with HOLD_DURATION_SECONDS overridden to 1 second,
/// used by expiry-sensitive tests.
/// </summary>
public sealed class ShortHoldTestWebFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly PostgreSqlContainer _pg = new PostgreSqlBuilder()
        .WithImage("postgres:16-alpine")
        .Build();

    public async Task InitializeAsync()
    {
        await _pg.StartAsync();
    }

    public new async Task DisposeAsync()
    {
        await _pg.StopAsync();
        await base.DisposeAsync();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseSetting("ConnectionStrings__Default", _pg.GetConnectionString());
        builder.UseSetting("HOLD_DURATION_SECONDS", "1");
        builder.UseEnvironment("Testing");
    }
}
