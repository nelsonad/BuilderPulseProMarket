using BuilderPulsePro.Api.Auth;
using BuilderPulsePro.Api.Contracts;
using BuilderPulsePro.Api.Data;
using BuilderPulsePro.Api.Domain;
using BuilderPulsePro.Api.Events;
using Microsoft.EntityFrameworkCore;
using System.Linq.Expressions;
using System.Security.Claims;

namespace BuilderPulsePro.Api.Endpoints;

public static class BidsEndpoints
{
    public static IEndpointRouteBuilder MapBidEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/jobs/{jobId:guid}/bids")
            .WithTags("Bids");

        // Bidder actions
        group.MapPost("", CreateBid).RequireAuthorization();

        // Poster-only actions
        group.MapGet("", ListBidsForJob).RequireAuthorization();
        group.MapGet("/accepted", GetAcceptedBid).RequireAuthorization();
        group.MapPost("/{bidId:guid}/accept", AcceptBid).RequireAuthorization();

        return app;
    }

    // ---------------------------
    // Handlers
    // ---------------------------

    private static async Task<IResult> CreateBid(
        AppDbContext db,
        Guid jobId,
        CreateBidRequest req,
        ClaimsPrincipal user,
        IEventBus bus)
    {
        var userId = CurrentUser.GetUserId(user);

        var profile = await db.ContractorProfiles.AsNoTracking()
            .Where(p => p.UserId == userId)
            .Select(p => new { p.DisplayName })
            .FirstOrDefaultAsync();

        if (profile is null)
            return Results.BadRequest("Create your contractor profile before bidding.");

        var contractorName = profile.DisplayName;

        if (req.AmountCents <= 0)
            return Results.BadRequest("AmountCents must be > 0.");

        var job = await db.Jobs.AsNoTracking()
            .Where(j => j.Id == jobId)
            .Select(j => new { j.Id, j.Status, j.PostedByUserId })
            .FirstOrDefaultAsync();

        if (job is null) return Results.NotFound("Job not found.");

        if (job.PostedByUserId == userId)
            return Results.BadRequest("You cannot bid on your own job.");

        if (job.Status != JobStatus.Open)
            return Results.BadRequest("Job is not open for bidding.");

        var alreadyBid = await db.Bids.AsNoTracking()
            .AnyAsync(b => b.JobId == jobId && b.BidderUserId == userId);

        if (alreadyBid)
            return Results.Conflict("You have already placed a bid for this job.");

        var bid = new Bid
        {
            Id = Guid.NewGuid(),
            JobId = jobId,
            BidderUserId = userId,
            ContractorName = contractorName,
            AmountCents = req.AmountCents,
            EarliestStart = req.EarliestStart,
            DurationDays = req.DurationDays,
            Notes = (req.Notes ?? "").Trim(),
            CreatedAt = DateTimeOffset.UtcNow,
            IsAccepted = false
        };

        db.Bids.Add(bid);
        await db.SaveChangesAsync();

        await bus.PublishAsync(new BidPlaced(bid.Id, bid.JobId, bid.BidderUserId, DateTimeOffset.UtcNow));

        return Results.Created($"/jobs/{jobId}/bids/{bid.Id}", ToBidResponse(bid));
    }

    private static async Task<IResult> ListBidsForJob(
        AppDbContext db,
        Guid jobId,
        ClaimsPrincipal user)
    {
        var userId = CurrentUser.GetUserId(user);

        var job = await LoadJobForPosterGate(db, jobId);
        if (job is null) return Results.NotFound("Job not found.");
        if (job.PostedByUserId != userId) return Results.Forbid();

        var bids = await LoadVisibleBidsForPoster(db, job);
        return Results.Ok(bids);
    }

    private static async Task<IResult> GetAcceptedBid(
        AppDbContext db,
        Guid jobId,
        ClaimsPrincipal user)
    {
        var userId = CurrentUser.GetUserId(user);

        var job = await LoadJobForPosterGate(db, jobId);
        if (job is null) return Results.NotFound("Job not found.");
        if (job.PostedByUserId != userId) return Results.Forbid();

        if (job.AcceptedBidId is null)
            return Results.NotFound("No accepted bid.");

        var bid = await db.Bids.AsNoTracking()
            .Where(b => b.JobId == jobId && b.Id == job.AcceptedBidId.Value)
            .Select(ToBidResponseExpr)
            .FirstOrDefaultAsync();

        return bid is null ? Results.NotFound("No accepted bid.") : Results.Ok(bid);
    }

    private static async Task<IResult> AcceptBid(
        AppDbContext db,
        Guid jobId,
        Guid bidId,
        ClaimsPrincipal user, IEventBus bus)
    {
        var userId = CurrentUser.GetUserId(user);

        var job = await db.Jobs.FirstOrDefaultAsync(j => j.Id == jobId);
        if (job is null) return Results.NotFound("Job not found.");
        if (job.PostedByUserId != userId) return Results.Forbid();

        if (job.Status != JobStatus.Open)
            return Results.BadRequest("Job is not open.");

        var bid = await db.Bids.FirstOrDefaultAsync(b => b.Id == bidId && b.JobId == jobId);
        if (bid is null) return Results.NotFound("Bid not found.");

        // Idempotency
        if (job.AcceptedBidId == bidId && job.Status == JobStatus.Awarded)
            return Results.Ok();

        bid.IsAccepted = true;
        job.AcceptedBidId = bidId;
        job.Status = JobStatus.Awarded;

        await db.Bids
            .Where(b => b.JobId == jobId && b.Id != bidId)
            .ExecuteUpdateAsync(setters => setters.SetProperty(b => b.IsAccepted, false));

        await db.SaveChangesAsync();

        await bus.PublishAsync(new BidAccepted(jobId, bidId, userId, DateTimeOffset.UtcNow));

        return Results.Ok();
    }

    // ---------------------------
    // Helpers
    // ---------------------------

    private static async Task<JobPosterGateRow?> LoadJobForPosterGate(AppDbContext db, Guid jobId)
    {
        return await db.Jobs.AsNoTracking()
            .Where(j => j.Id == jobId)
            .Select(j => new JobPosterGateRow
            {
                JobId = j.Id,
                PostedByUserId = j.PostedByUserId,
                Status = j.Status,
                AcceptedBidId = j.AcceptedBidId
            })
            .FirstOrDefaultAsync();
    }

    private static async Task<List<BidResponse>> LoadVisibleBidsForPoster(AppDbContext db, JobPosterGateRow job)
    {
        var bidsQuery = db.Bids.AsNoTracking()
            .Where(b => b.JobId == job.JobId);

        // If job is no longer open, only show accepted bid (or none)
        if (job.Status != JobStatus.Open)
        {
            if (job.AcceptedBidId is null)
                return new List<BidResponse>();

            bidsQuery = bidsQuery.Where(b => b.Id == job.AcceptedBidId.Value);
        }

        return await bidsQuery
            .OrderBy(b => b.AmountCents)
            .Select(ToBidResponseExpr)
            .ToListAsync();
    }

    // For in-memory mapping (e.g., newly created bid instance)
    private static BidResponse ToBidResponse(Bid b)
        => new(
            b.Id,
            b.JobId,
            b.ContractorName,
            b.AmountCents,
            b.EarliestStart,
            b.DurationDays,
            b.Notes,
            b.IsAccepted,
            b.CreatedAt
        );

    // For EF translation in Select(...)
    private static readonly Expression<Func<Bid, BidResponse>> ToBidResponseExpr =
        b => new BidResponse(
            b.Id,
            b.JobId,
            b.ContractorName,
            b.AmountCents,
            b.EarliestStart,
            b.DurationDays,
            b.Notes,
            b.IsAccepted,
            b.CreatedAt
        );

    private sealed class JobPosterGateRow
    {
        public Guid JobId { get; set; }
        public Guid PostedByUserId { get; set; }
        public JobStatus Status { get; set; }
        public Guid? AcceptedBidId { get; set; }
    }
}
