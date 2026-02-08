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
        var convo = await db.Conversations.AsNoTracking()
            .Where(c => c.Id == evt.ConversationId && c.JobId == evt.JobId)
            .Select(c => new { c.PosterUserId, c.ContractorUserId })
            .FirstOrDefaultAsync(ct);

        if (convo is null) return;

        Guid recipientUserId;
        if (evt.SenderUserId == convo.PosterUserId)
            recipientUserId = convo.ContractorUserId;
        else if (evt.SenderUserId == convo.ContractorUserId)
            recipientUserId = convo.PosterUserId;
        else
            return;

        var recipient = await userManager.FindByIdAsync(recipientUserId.ToString());
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
