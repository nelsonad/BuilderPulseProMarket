using Microsoft.Extensions.Logging;

namespace BuilderPulsePro.Api.Events;

public sealed class LogJobPosted(ILogger<LogJobPosted> log) : IEventHandler<JobPosted>
{
    public Task HandleAsync(JobPosted evt, CancellationToken ct)
    {
        log.LogInformation("Event JobPosted: JobId={JobId} PostedBy={UserId}", evt.JobId, evt.PostedByUserId);
        return Task.CompletedTask;
    }
}

public sealed class LogBidPlaced(ILogger<LogBidPlaced> log) : IEventHandler<BidPlaced>
{
    public Task HandleAsync(BidPlaced evt, CancellationToken ct)
    {
        log.LogInformation("Event BidPlaced: BidId={BidId} JobId={JobId} Bidder={UserId}", evt.BidId, evt.JobId, evt.BidderUserId);
        return Task.CompletedTask;
    }
}

public sealed class LogBidAccepted(ILogger<LogBidAccepted> log) : IEventHandler<BidAccepted>
{
    public Task HandleAsync(BidAccepted evt, CancellationToken ct)
    {
        log.LogInformation("Event BidAccepted: JobId={JobId} BidId={BidId} By={UserId}", evt.JobId, evt.BidId, evt.AcceptedByUserId);
        return Task.CompletedTask;
    }
}

public sealed class LogBidUpdated(ILogger<LogBidUpdated> log) : IEventHandler<BidUpdated>
{
    public Task HandleAsync(BidUpdated evt, CancellationToken ct)
    {
        log.LogInformation("Event BidUpdated: BidId={BidId} JobId={JobId} By={UserId}", evt.BidId, evt.JobId, evt.BidderUserId);
        return Task.CompletedTask;
    }
}

public sealed class LogBidWithdrawn(ILogger<LogBidWithdrawn> log) : IEventHandler<BidWithdrawn>
{
    public Task HandleAsync(BidWithdrawn evt, CancellationToken ct)
    {
        log.LogInformation("Event BidWithdrawn: BidId={BidId} JobId={JobId} By={UserId}", evt.BidId, evt.JobId, evt.BidderUserId);
        return Task.CompletedTask;
    }
}

public sealed class LogBidRejected(ILogger<LogBidRejected> log) : IEventHandler<BidRejected>
{
    public Task HandleAsync(BidRejected evt, CancellationToken ct)
    {
        log.LogInformation("Event BidRejected: BidId={BidId} JobId={JobId} Bidder={BidderId} By={UserId}",
            evt.BidId, evt.JobId, evt.BidderUserId, evt.RejectedByUserId);
        return Task.CompletedTask;
    }
}

public sealed class LogJobCompleted(ILogger<LogJobCompleted> log) : IEventHandler<JobCompleted>
{
    public Task HandleAsync(JobCompleted evt, CancellationToken ct)
    {
        log.LogInformation("Event JobCompleted: JobId={JobId} By={UserId}", evt.JobId, evt.CompletedByUserId);
        return Task.CompletedTask;
    }
}
