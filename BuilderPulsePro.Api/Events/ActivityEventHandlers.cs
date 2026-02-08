using System.Text.Json;
using BuilderPulsePro.Api.Data;
using BuilderPulsePro.Api.Domain;

namespace BuilderPulsePro.Api.Events;

public sealed class PersistJobPostedActivity(AppDbContext db) : IEventHandler<JobPosted>
{
    public Task HandleAsync(JobPosted evt, CancellationToken ct)
        => ActivityEventPersistence.PersistAsync(
            db,
            evt.JobId,
            null,
            evt.PostedByUserId,
            evt.OccurredAt,
            nameof(JobPosted),
            evt,
            ct);
}

public sealed class PersistBidPlacedActivity(AppDbContext db) : IEventHandler<BidPlaced>
{
    public Task HandleAsync(BidPlaced evt, CancellationToken ct)
        => ActivityEventPersistence.PersistAsync(
            db,
            evt.JobId,
            evt.BidId,
            evt.BidderUserId,
            evt.OccurredAt,
            nameof(BidPlaced),
            evt,
            ct);
}

public sealed class PersistBidAcceptedActivity(AppDbContext db) : IEventHandler<BidAccepted>
{
    public Task HandleAsync(BidAccepted evt, CancellationToken ct)
        => ActivityEventPersistence.PersistAsync(
            db,
            evt.JobId,
            evt.BidId,
            evt.AcceptedByUserId,
            evt.OccurredAt,
            nameof(BidAccepted),
            evt,
            ct);
}

public sealed class PersistJobCompletedActivity(AppDbContext db) : IEventHandler<JobCompleted>
{
    public Task HandleAsync(JobCompleted evt, CancellationToken ct)
        => ActivityEventPersistence.PersistAsync(
            db,
            evt.JobId,
            null,
            evt.CompletedByUserId,
            evt.OccurredAt,
            nameof(JobCompleted),
            evt,
            ct);
}

internal static class ActivityEventPersistence
{
    public static async Task PersistAsync(
        AppDbContext db,
        Guid? jobId,
        Guid? bidId,
        Guid? actorUserId,
        DateTimeOffset occurredAt,
        string type,
        object payload,
        CancellationToken ct)
    {
        var evt = new ActivityEvent
        {
            Id = Guid.NewGuid(),
            JobId = jobId,
            BidId = bidId,
            ActorUserId = actorUserId,
            Type = type,
            OccurredAt = occurredAt,
            PayloadJson = JsonSerializer.Serialize(payload)
        };

        db.ActivityEvents.Add(evt);
        await db.SaveChangesAsync(ct);
    }
}
