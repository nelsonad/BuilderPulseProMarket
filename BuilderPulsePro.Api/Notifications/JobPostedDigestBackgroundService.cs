using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace BuilderPulsePro.Api.Notifications;

public sealed class JobPostedDigestBackgroundService(
    IServiceScopeFactory scopeFactory,
    IOptionsMonitor<JobDigestOptions> options,
    ILogger<JobPostedDigestBackgroundService> log) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await RunOnce(stoppingToken);
            }
            catch (Exception ex)
            {
                log.LogError(ex, "Job digest background service failed.");
            }

            var intervalMinutes = Math.Max(1, options.CurrentValue.IntervalMinutes);
            await Task.Delay(TimeSpan.FromMinutes(intervalMinutes), stoppingToken);
        }
    }

    private async Task RunOnce(CancellationToken ct)
    {
        using var scope = scopeFactory.CreateScope();

        var runner = scope.ServiceProvider.GetRequiredService<JobDigestRunner>();
        await runner.RunOnceAsync(ct);
    }
}
