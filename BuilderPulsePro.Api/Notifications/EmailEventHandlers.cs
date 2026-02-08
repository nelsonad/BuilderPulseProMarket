using BuilderPulsePro.Api.Data;
using BuilderPulsePro.Api.Domain;
using BuilderPulsePro.Api.Events;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.UI.Services;
using Microsoft.EntityFrameworkCore;
using System.Net.Mail;

namespace BuilderPulsePro.Api.Notifications;

public sealed class EmailOnBidPlaced(
    AppDbContext db,
    UserManager<AppUser> userManager,
    IEmailSender email) : IEventHandler<BidPlaced>
{
    public async Task HandleAsync(BidPlaced evt, CancellationToken ct)
    {
        // Find job owner + job title
        var job = await db.Jobs.AsNoTracking()
            .Where(j => j.Id == evt.JobId)
            .Select(j => new { j.Id, j.Title, j.PostedByUserId })
            .FirstOrDefaultAsync(ct);

        if (job is null) return;

        var poster = await userManager.FindByIdAsync(job.PostedByUserId.ToString());
        var to = poster?.Email;
        if (string.IsNullOrWhiteSpace(to)) return;

        // Get bid info (for amount + contractor display name)
        var bid = await db.Bids.AsNoTracking()
            .Where(b => b.Id == evt.BidId)
            .Select(b => new { b.AmountCents, b.ContractorName })
            .FirstOrDefaultAsync(ct);

        if (bid is null) return;

        var subject = $"New bid received: {job.Title}";
        var body =
            $"""
            Your job "{job.Title}" received a new bid.

            Contractor: {bid.ContractorName}
            Amount: ${(bid.AmountCents / 100.0):0.00}

            View bids in the app.
            """;

        await email.SendAsync(new EmailMessage(to, subject, body), ct);
    }
}

public sealed class EmailOnBidAccepted(
    AppDbContext db,
    UserManager<AppUser> userManager,
    IEmailSender email) : IEventHandler<BidAccepted>
{
    public async Task HandleAsync(BidAccepted evt, CancellationToken ct)
    {
        // Load bid bidder + job title
        var row = await db.Bids.AsNoTracking()
            .Where(b => b.Id == evt.BidId && b.JobId == evt.JobId)
            .Join(db.Jobs.AsNoTracking(),
                b => b.JobId,
                j => j.Id,
                (b, j) => new { b.BidderUserId, b.ContractorName, j.Title })
            .FirstOrDefaultAsync(ct);

        if (row is null) return;

        var bidder = await userManager.FindByIdAsync(row.BidderUserId.ToString());
        var to = bidder?.Email;
        if (string.IsNullOrWhiteSpace(to)) return;

        var subject = $"Your bid was accepted: {row.Title}";
        var body =
            $"""
            Good news — your bid was accepted for:

            Job: "{row.Title}"
            Contractor name on bid: {row.ContractorName}

            Open the app for next steps.
            """;

        await email.SendAsync(new EmailMessage(to, subject, body), ct);
    }
}

public sealed class EmailOnJobCompleted(
    AppDbContext db,
    UserManager<AppUser> userManager,
    IEmailSender email) : IEventHandler<JobCompleted>
{
    public async Task HandleAsync(JobCompleted evt, CancellationToken ct)
    {
        var job = await db.Jobs.AsNoTracking()
            .Where(j => j.Id == evt.JobId)
            .Select(j => new { j.Id, j.Title, j.PostedByUserId, j.AcceptedBidId })
            .FirstOrDefaultAsync(ct);

        if (job is null) return;

        // Email poster confirmation
        var poster = await userManager.FindByIdAsync(job.PostedByUserId.ToString());
        var posterEmail = poster?.Email;
        if (!string.IsNullOrWhiteSpace(posterEmail))
        {
            await email.SendAsync(new EmailMessage(
                posterEmail,
                $"Job marked complete: {job.Title}",
                $"""
                You marked the job "{job.Title}" as completed.

                Thanks for using BuilderPulsePro.
                """
            ), ct);
        }

        // Email accepted contractor (if exists)
        if (job.AcceptedBidId is null) return;

        var accepted = await db.Bids.AsNoTracking()
            .Where(b => b.Id == job.AcceptedBidId.Value)
            .Select(b => new { b.BidderUserId })
            .FirstOrDefaultAsync(ct);

        if (accepted is null) return;

        var contractor = await userManager.FindByIdAsync(accepted.BidderUserId.ToString());
        var contractorEmail = contractor?.Email;
        if (string.IsNullOrWhiteSpace(contractorEmail)) return;

        await email.SendAsync(new EmailMessage(
            contractorEmail,
            $"Job completed: {job.Title}",
            $"""
            The job "{job.Title}" has been marked completed by the poster.

            Thanks for using BuilderPulsePro.
            """
        ), ct);
    }
}
