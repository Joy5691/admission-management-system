using Microsoft.EntityFrameworkCore;
using SchoolAdmission.Data;

namespace SchoolAdmission.Services;

/// <summary>
/// Background service that marks expired HELD holds every 5 seconds using DB clock.
/// </summary>
public class HoldExpiryService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<HoldExpiryService> _logger;
    private static readonly TimeSpan Interval = TimeSpan.FromSeconds(5);

    public HoldExpiryService(IServiceScopeFactory scopeFactory, ILogger<HoldExpiryService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Hold expiry sweeper started.");

        while (!stoppingToken.IsCancellationRequested)
        {
            await Task.Delay(Interval, stoppingToken);

            try
            {
                await using var scope = _scopeFactory.CreateAsyncScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

                var affected = await db.Database.ExecuteSqlRawAsync(
                    "UPDATE holds SET status='EXPIRED' WHERE status='HELD' AND expires_at <= now()");

                if (affected > 0)
                    _logger.LogInformation("Expired {Count} hold(s).", affected);
            }
            catch (Exception ex) when (!stoppingToken.IsCancellationRequested)
            {
                _logger.LogError(ex, "Error in hold expiry sweeper.");
            }
        }

        _logger.LogInformation("Hold expiry sweeper stopped.");
    }
}
