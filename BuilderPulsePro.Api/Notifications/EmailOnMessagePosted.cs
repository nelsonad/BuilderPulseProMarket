using BuilderPulsePro.Api.Data;
using BuilderPulsePro.Api.Domain;
using BuilderPulsePro.Api.Events;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace BuilderPulsePro.Api.Notifications;

public sealed class EmailOnMessagePosted(
    AppDbContext db,
    UserManager<AppUser> userManager,
    IEmailSender email) : IEventHandler<MessagePosted>
{
    public async Task HandleAsync(MessagePosted evt, CancellationToken ct)
    {
        var recipient = await userManager.FindByIdAsync(evt.RecipientUserId.ToString());
        var to = recipient?.Email;
        if (string.IsNullOrWhiteSpace(to)) return;

        var job = await db.Jobs.AsNoTracking()
            .Where(j => j.Id == evt.JobId)
            .Select(j => new { j.Title })
            .FirstOrDefaultAsync(ct);

        if (job is null) return;

        var subject = $"New message about: {job.Title}";
        var body =
            $"""
            You have a new message about the job "{job.Title}".

            Open the app to reply.
            """;

        await email.SendAsync(new EmailMessage(to, subject, body), ct);
    }
}
