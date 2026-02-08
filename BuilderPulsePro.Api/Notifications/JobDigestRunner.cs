using BuilderPulsePro.Api.Data;
using BuilderPulsePro.Api.Domain;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace BuilderPulsePro.Api.Notifications;

public sealed record JobDigestRunResult(
    int ContractorsProcessed,
    int NotificationsSent,
    int EmailsSent);

public sealed class JobDigestRunner(
    AppDbContext db,
    UserManager<AppUser> userManager,
    IEmailSender email,
    IOptionsMonitor<JobDigestOptions> options,
    ILogger<JobDigestRunner> log)
{
    public async Task<JobDigestRunResult> RunOnceAsync(CancellationToken ct)
    {
        var contractorIds = await db.ContractorJobNotifications.AsNoTracking()
            .Where(n => n.SentAt == null)
            .Select(n => n.ContractorUserId)
            .Distinct()
            .Take(200)
            .ToListAsync(ct);

        var contractorsProcessed = 0;
        var notificationsSent = 0;
        var emailsSent = 0;

        foreach (var contractorUserId in contractorIds)
        {
            var profile = await db.ContractorProfiles
                .FirstOrDefaultAsync(p => p.UserId == contractorUserId, ct);

            if (profile is null) continue;

            if (!profile.IsAvailable) continue;

            var minIntervalMinutes = Math.Max(1, options.CurrentValue.MinIntervalMinutes);
            if (profile.LastDigestSentAt is not null &&
                DateTimeOffset.UtcNow - profile.LastDigestSentAt.Value < TimeSpan.FromMinutes(minIntervalMinutes))
            {
                continue;
            }

            var pending = await db.ContractorJobNotifications
                .Where(n => n.ContractorUserId == contractorUserId && n.SentAt == null)
                .Join(db.Jobs.AsNoTracking(),
                    n => n.JobId,
                    j => j.Id,
                    (n, j) => new
                    {
                        NotificationId = n.Id,
                        j.Id,
                        j.Title,
                        j.Trade,
                        j.CreatedAt
                    })
                .OrderByDescending(x => x.CreatedAt)
                .Take(25)
                .ToListAsync(ct);

            if (pending.Count == 0) continue;

            contractorsProcessed++;
            notificationsSent += pending.Count;

            var user = await userManager.FindByIdAsync(contractorUserId.ToString());
            var to = user?.Email;
            if (string.IsNullOrWhiteSpace(to))
            {
                await MarkSent(pending.Select(x => x.NotificationId).ToList(), ct);
                continue;
            }

            var subject = $"New jobs in your area ({pending.Count})";

            var lines = pending
                .Select(x => $"- {x.Trade}: {x.Title}")
                .ToArray();

            var body =
                $"""
                You have {pending.Count} new job(s) in your service area:

                {string.Join(Environment.NewLine, lines)}

                Open the app to view details and place bids.
                """;

            await email.SendAsync(new EmailMessage(to, subject, body), ct);
            emailsSent++;

            profile.LastDigestSentAt = DateTimeOffset.UtcNow;
            await MarkSent(pending.Select(x => x.NotificationId).ToList(), ct);
        }

        if (contractorsProcessed > 0)
            log.LogInformation(
                "Job digest run complete. Contractors={Contractors} Notifications={Notifications} Emails={Emails}",
                contractorsProcessed,
                notificationsSent,
                emailsSent);

        return new JobDigestRunResult(contractorsProcessed, notificationsSent, emailsSent);
    }

    private async Task MarkSent(List<Guid> notificationIds, CancellationToken ct)
    {
        var now = DateTimeOffset.UtcNow;

        var rows = await db.ContractorJobNotifications
            .Where(n => notificationIds.Contains(n.Id))
            .ToListAsync(ct);

        foreach (var r in rows)
            r.SentAt = now;

        await db.SaveChangesAsync(ct);
    }
}
