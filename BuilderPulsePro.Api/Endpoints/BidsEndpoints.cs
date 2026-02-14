using BuilderPulsePro.Api.Attachments;
using BuilderPulsePro.Api.Auth;
using BuilderPulsePro.Api.Bids;
using BuilderPulsePro.Api.Contracts;
using BuilderPulsePro.Api.Data;
using BuilderPulsePro.Api.Domain;
using BuilderPulsePro.Api.Events;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using System.Linq.Expressions;
using System.Security.Claims;
using System.Text.Json;

namespace BuilderPulsePro.Api.Endpoints;

public static class BidsEndpoints
{
    public static IEndpointRouteBuilder MapBidEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/jobs/{jobId:guid}/bids")
            .WithTags("Bids");

        // Bidder actions
        group.MapPost("", CreateBid).RequireAuthorization();
        group.MapPut("/{bidId:guid}", UpdateBid).RequireAuthorization();
        group.MapPost("/parse-preview", ParseBidAttachmentPreview)
            .RequireAuthorization()
            .DisableAntiforgery();
        group.MapPost("/{bidId:guid}/attachments", AddBidAttachments)
            .RequireAuthorization()
            .DisableAntiforgery();

        // Poster-only actions
        group.MapGet("", ListBidsForJob).RequireAuthorization();
        group.MapGet("/accepted", GetAcceptedBid).RequireAuthorization();
        group.MapPost("/{bidId:guid}/accept", AcceptBid).RequireAuthorization();
        group.MapPost("/{bidId:guid}/reject", RejectBid).RequireAuthorization();
        group.MapGet("/{bidId:guid}/attachments", ListBidAttachments).RequireAuthorization();
        group.MapGet("/{bidId:guid}/attachments/{attachmentId:guid}", DownloadBidAttachment).RequireAuthorization();
        group.MapPost("/{bidId:guid}/attachments/parse", StartBidAttachmentParse).RequireAuthorization();
        group.MapPost("/{bidId:guid}/attachments/{attachmentId:guid}/parse", RegenerateBidAttachmentParse)
            .RequireAuthorization();
        group.MapGet("/{bidId:guid}/attachments/parse", ListBidAttachmentParseJobs).RequireAuthorization();
        group.MapGet("/{bidId:guid}/revisions", ListBidRevisions).RequireAuthorization();
        group.MapGet("/{bidId:guid}", GetBid).RequireAuthorization();

        return app;
    }

    private static async Task<BidAccessRow?> LoadBidAccessRow(
        AppDbContext db,
        Guid jobId,
        Guid bidId)
    {
        return await db.Bids.AsNoTracking()
            .Where(b => b.Id == bidId && b.JobId == jobId)
            .Join(db.Jobs.AsNoTracking(),
                b => b.JobId,
                j => j.Id,
                (b, j) => new BidAccessRow
                {
                    JobId = j.Id,
                    BidId = b.Id,
                    BidderUserId = b.BidderUserId,
                    ContractorProfileId = b.ContractorProfileId,
                    IsAccepted = b.IsAccepted,
                    PostedByUserId = j.PostedByUserId,
                    JobStatus = j.Status
                })
            .FirstOrDefaultAsync();
    }

    private static IResult? AuthorizeBidReadAccess(BidAccessRow access, Guid userId)
    {
        if (userId == access.PostedByUserId)
        {
            if (access.JobStatus != JobStatus.Open && !access.IsAccepted)
                return Results.Forbid();

            return null;
        }

        if (userId == access.BidderUserId)
            return null;

        return Results.Forbid();
    }

    private static async Task<IResult?> AuthorizeBidReadAccessWithContractorProfileAsync(
        AppDbContext db,
        BidAccessRow access,
        Guid userId,
        CancellationToken ct = default)
    {
        var result = AuthorizeBidReadAccess(access, userId);
        if (result is null)
            return null;
        if (await ContractorAuthz.CanActForContractorProfileAsync(db, userId, access.ContractorProfileId, ct))
            return null;
        return result;
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

        var profileId = await ContractorAuthz.GetContractorProfileIdForBiddingAsync(db, userId);
        if (profileId is null)
            return Results.BadRequest("Create your contractor profile before bidding.");

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

        var termsResult = TryNormalizeOptionalText(req.Terms, 4000, "Terms");
        if (termsResult.Error is not null) return Results.BadRequest(termsResult.Error);

        var assumptionsResult = TryNormalizeOptionalText(req.Assumptions, 4000, "Assumptions");
        if (assumptionsResult.Error is not null) return Results.BadRequest(assumptionsResult.Error);

        var existingBid = await db.Bids
            .FirstOrDefaultAsync(b => b.JobId == jobId && b.BidderUserId == userId);

        if (existingBid is not null)
        {
            if (existingBid.Status == BidStatus.Withdrawn)
            {
                // Reactivate withdrawn bid: update and resubmit
                var reactivateVariants = BuildBidVariants(existingBid.Id, req.Variants);
                if (reactivateVariants.Error is not null)
                    return Results.BadRequest(reactivateVariants.Error);

                existingBid.AmountCents = req.AmountCents;
                existingBid.EarliestStart = req.EarliestStart;
                existingBid.DurationDays = req.DurationDays;
                existingBid.Notes = (req.Notes ?? "").Trim();
                existingBid.ValidUntil = req.ValidUntil;
                existingBid.Terms = termsResult.Value;
                existingBid.Assumptions = assumptionsResult.Value;
                existingBid.Status = BidStatus.Submitted;

                await db.BidVariants
                    .Where(v => v.BidId == existingBid.Id)
                    .ExecuteDeleteAsync();

                if (reactivateVariants.Variants.Count > 0)
                    db.BidVariants.AddRange(reactivateVariants.Variants);

                var nextRevNum = await db.BidRevisions.AsNoTracking()
                    .Where(r => r.BidId == existingBid.Id)
                    .OrderByDescending(r => r.RevisionNumber)
                    .Select(r => r.RevisionNumber)
                    .FirstOrDefaultAsync();

                var reactivateRevision = CreateBidRevision(
                    existingBid.Id,
                    userId,
                    revisionNumber: nextRevNum + 1,
                    BuildBidRevisionSnapshot(existingBid, ToBidVariantResponseList(reactivateVariants.Variants)));
                db.BidRevisions.Add(reactivateRevision);
                await db.SaveChangesAsync();

                await bus.PublishAsync(new BidPlaced(existingBid.Id, existingBid.JobId, existingBid.BidderUserId, DateTimeOffset.UtcNow));

                var reactivateResponse = ToBidResponse(existingBid, ToBidVariantResponseList(reactivateVariants.Variants));
                return Results.Created($"/jobs/{jobId}/bids/{existingBid.Id}", reactivateResponse);
            }

            return Results.Conflict("You have already placed a bid for this job.");
        }

        var bid = new Bid
        {
            Id = Guid.NewGuid(),
            JobId = jobId,
            BidderUserId = userId,
            ContractorProfileId = profileId.Value,
            AmountCents = req.AmountCents,
            EarliestStart = req.EarliestStart,
            DurationDays = req.DurationDays,
            Notes = (req.Notes ?? "").Trim(),
            ValidUntil = req.ValidUntil,
            Terms = termsResult.Value,
            Assumptions = assumptionsResult.Value,
            CreatedAt = DateTimeOffset.UtcNow,
            IsAccepted = false,
            Status = BidStatus.Submitted
        };

        var variantsResult = BuildBidVariants(bid.Id, req.Variants);
        if (variantsResult.Error is not null)
            return Results.BadRequest(variantsResult.Error);

        db.Bids.Add(bid);
        if (variantsResult.Variants.Count > 0)
            db.BidVariants.AddRange(variantsResult.Variants);

        var revision = CreateBidRevision(
            bid.Id,
            userId,
            revisionNumber: 1,
            BuildBidRevisionSnapshot(bid, ToBidVariantResponseList(variantsResult.Variants)));
        db.BidRevisions.Add(revision);
        await db.SaveChangesAsync();

        await bus.PublishAsync(new BidPlaced(bid.Id, bid.JobId, bid.BidderUserId, DateTimeOffset.UtcNow));

        var response = ToBidResponse(bid, ToBidVariantResponseList(variantsResult.Variants));

        return Results.Created($"/jobs/{jobId}/bids/{bid.Id}", response);
    }

    private static async Task<IResult> ParseBidAttachmentPreview(
        AppDbContext db,
        Guid jobId,
        ClaimsPrincipal user,
        IFormFileCollection files,
        AttachmentHelper helper,
        IBidAttachmentParser parser,
        CancellationToken ct)
    {
        var userId = CurrentUser.GetUserId(user);

        var job = await db.Jobs.AsNoTracking()
            .Where(j => j.Id == jobId)
            .Select(j => new { j.Id, j.Status, j.PostedByUserId })
            .FirstOrDefaultAsync(ct);

        if (job is null) return Results.NotFound("Job not found.");

        if (job.PostedByUserId == userId)
            return Results.BadRequest("You cannot bid on your own job.");

        if (job.Status != JobStatus.Open)
            return Results.BadRequest("Job is not open for bidding.");

        var profileId = await ContractorAuthz.GetContractorProfileIdForBiddingAsync(db, userId, ct);
        if (profileId is null)
            return Results.BadRequest("Create your contractor profile before bidding.");

        if (files.Count == 0)
            return Results.BadRequest("At least one attachment is required.");

        var invalidFile = files.FirstOrDefault(file =>
            file.Length > 0 && !AttachmentValidation.IsAllowedFileName(file.FileName));
        if (invalidFile is not null)
            return Results.BadRequest(
                $"File type not allowed: {invalidFile.FileName}. Allowed types: {AttachmentValidation.AllowedExtensionsDisplay}.");

        var file = files.FirstOrDefault(f => f.Length > 0);
        if (file is null)
            return Results.BadRequest("At least one attachment is required.");

        var attachment = await helper.SaveAsync(file, ct);

        try
        {
            var result = await parser.ParseAsync(attachment, ct);
            return result is null ? Results.NoContent() : Results.Ok(result);
        }
        finally
        {
            await helper.DeleteAsync(attachment, ct);
        }
    }

    private static async Task<IResult> GetBid(
        AppDbContext db,
        Guid jobId,
        Guid bidId,
        ClaimsPrincipal user)
    {
        var userId = CurrentUser.GetUserId(user);
        var access = await LoadBidAccessRow(db, jobId, bidId);

        if (access is null) return Results.NotFound("Bid not found.");

        var authResult = await AuthorizeBidReadAccessWithContractorProfileAsync(db, access, userId);
        if (authResult is not null) return authResult;

        var bidRow = await db.Bids.AsNoTracking()
            .Where(b => b.Id == bidId && b.JobId == jobId)
            .Select(ToBidRowExpr)
            .FirstOrDefaultAsync();

        if (bidRow is null) return Results.NotFound("Bid not found.");

        var variants = await LoadBidVariants(db, new[] { bidRow.Id });
        var response = ToBidResponse(bidRow, variants);

        return Results.Ok(response);
    }

    private static async Task<IResult> UpdateBid(
        AppDbContext db,
        Guid jobId,
        Guid bidId,
        UpdateBidRequest req,
        ClaimsPrincipal user,
        IEventBus bus)
    {
        if (req.AmountCents <= 0)
            return Results.BadRequest("AmountCents must be > 0.");

        var userId = CurrentUser.GetUserId(user);
        var access = await LoadBidAccessRow(db, jobId, bidId);

        if (access is null) return Results.NotFound("Bid not found.");
        if (access.BidderUserId != userId) return Results.Forbid();
        if (access.JobStatus != JobStatus.Open || access.IsAccepted)
            return Results.BadRequest("Bids can only be updated while the job is open and the bid is not accepted.");

        var bid = await db.Bids.FirstOrDefaultAsync(b => b.Id == bidId && b.JobId == jobId);
        if (bid is null) return Results.NotFound("Bid not found.");

        var variantsResult = BuildBidVariants(bid.Id, req.Variants);
        if (variantsResult.Error is not null)
            return Results.BadRequest(variantsResult.Error);

        var updateTermsResult = TryNormalizeOptionalText(req.Terms, 4000, "Terms");
        if (updateTermsResult.Error is not null) return Results.BadRequest(updateTermsResult.Error);

        var updateAssumptionsResult = TryNormalizeOptionalText(req.Assumptions, 4000, "Assumptions");
        if (updateAssumptionsResult.Error is not null) return Results.BadRequest(updateAssumptionsResult.Error);

        bid.AmountCents = req.AmountCents;
        bid.EarliestStart = req.EarliestStart;
        bid.DurationDays = req.DurationDays;
        bid.Notes = (req.Notes ?? "").Trim();
        bid.ValidUntil = req.ValidUntil;
        bid.Terms = updateTermsResult.Value;
        bid.Assumptions = updateAssumptionsResult.Value;
        if (bid.Status == BidStatus.Viewed)
            bid.Status = BidStatus.Submitted;

        await db.BidVariants
            .Where(v => v.BidId == bid.Id)
            .ExecuteDeleteAsync();

        if (variantsResult.Variants.Count > 0)
            db.BidVariants.AddRange(variantsResult.Variants);

        var nextRevision = await db.BidRevisions.AsNoTracking()
            .Where(r => r.BidId == bid.Id)
            .OrderByDescending(r => r.RevisionNumber)
            .Select(r => r.RevisionNumber)
            .FirstOrDefaultAsync();

        var revision = CreateBidRevision(
            bid.Id,
            userId,
            revisionNumber: nextRevision + 1,
            BuildBidRevisionSnapshot(bid, ToBidVariantResponseList(variantsResult.Variants)));
        db.BidRevisions.Add(revision);

        await db.SaveChangesAsync();

        var response = ToBidResponse(bid, ToBidVariantResponseList(variantsResult.Variants));

        await bus.PublishAsync(new BidUpdated(bid.Id, bid.JobId, bid.BidderUserId, DateTimeOffset.UtcNow));

        return Results.Ok(response);
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
        if (job.Status == JobStatus.Open)
            await MarkBidsViewedAsync(db, job.JobId);
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

        var bidRow = await db.Bids.AsNoTracking()
            .Where(b => b.JobId == jobId && b.Id == job.AcceptedBidId.Value)
            .Select(ToBidRowExpr)
            .FirstOrDefaultAsync();

        if (bidRow is null) return Results.NotFound("No accepted bid.");

        if (job.Status == JobStatus.Open)
            await MarkBidsViewedAsync(db, jobId, bidRow.Id);

        var variants = await LoadBidVariants(db, new[] { bidRow.Id });
        var response = ToBidResponse(bidRow, variants);

        return Results.Ok(response);
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

        if (bid.Status is BidStatus.Withdrawn or BidStatus.Rejected)
            return Results.BadRequest("Bid is not eligible for acceptance.");

        // Idempotency
        if (job.AcceptedBidId == bidId && job.Status == JobStatus.Awarded)
            return Results.Ok();

        var rejectedBids = await db.Bids.AsNoTracking()
            .Where(b => b.JobId == jobId && b.Id != bidId && b.Status != BidStatus.Withdrawn)
            .Select(b => new { b.Id, b.BidderUserId })
            .ToListAsync();

        bid.IsAccepted = true;
        bid.Status = BidStatus.Accepted;
        job.AcceptedBidId = bidId;
        job.Status = JobStatus.Awarded;

        await db.Bids
            .Where(b => b.JobId == jobId && b.Id != bidId && b.Status != BidStatus.Withdrawn)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(b => b.IsAccepted, false)
                .SetProperty(b => b.Status, BidStatus.Rejected));

        await db.SaveChangesAsync();

        var occurredAt = DateTimeOffset.UtcNow;
        await bus.PublishAsync(new BidAccepted(jobId, bidId, userId, occurredAt));

        foreach (var rejected in rejectedBids)
            await bus.PublishAsync(new BidRejected(rejected.Id, jobId, rejected.BidderUserId, userId, occurredAt));

        return Results.Ok();
    }

    private static async Task<IResult> RejectBid(
        AppDbContext db,
        Guid jobId,
        Guid bidId,
        ClaimsPrincipal user,
        IEventBus bus)
    {
        var userId = CurrentUser.GetUserId(user);

        var job = await db.Jobs.AsNoTracking()
            .Where(j => j.Id == jobId)
            .Select(j => new { j.PostedByUserId, j.Status })
            .FirstOrDefaultAsync();

        if (job is null) return Results.NotFound("Job not found.");
        if (job.PostedByUserId != userId) return Results.Forbid();

        if (job.Status != JobStatus.Open)
            return Results.BadRequest("Bids can only be rejected while the job is open.");

        var bid = await db.Bids.FirstOrDefaultAsync(b => b.Id == bidId && b.JobId == jobId);
        if (bid is null) return Results.NotFound("Bid not found.");

        if (bid.Status == BidStatus.Accepted)
            return Results.BadRequest("Accepted bid cannot be rejected.");

        if (bid.Status == BidStatus.Withdrawn)
            return Results.BadRequest("Withdrawn bid is already declined.");

        if (bid.Status == BidStatus.Rejected)
            return Results.Ok();

        bid.IsAccepted = false;
        bid.Status = BidStatus.Rejected;
        await db.SaveChangesAsync();

        await bus.PublishAsync(new BidRejected(bid.Id, jobId, bid.BidderUserId, userId, DateTimeOffset.UtcNow));

        return Results.Ok();
    }

    private static async Task<IResult> AddBidAttachments(
        AppDbContext db,
        ClaimsPrincipal user,
        Guid jobId,
        Guid bidId,
        IFormFileCollection files,
        AttachmentHelper helper,
        CancellationToken ct)
    {
        var userId = CurrentUser.GetUserId(user);
        var access = await LoadBidAttachmentAccessRow(db, jobId, bidId, ct);

        if (access is null) return Results.NotFound("Bid not found.");
        var addAuthResult = await AuthorizeBidAttachmentAccessWithContractorProfileAsync(db, access, userId, ct);
        if (addAuthResult is not null) return addAuthResult;
        if (userId == access.PostedByUserId)
            return Results.BadRequest("Only the bidder can add attachments.");
        if (access.JobStatus != JobStatus.Open || access.Status != BidStatus.Submitted && access.Status != BidStatus.Viewed)
            return Results.BadRequest("Bid attachments can only be added while the job is open and the bid is not accepted.");

        if (files.Count == 0)
            return Results.BadRequest("At least one attachment is required.");

        var invalidFile = files.FirstOrDefault(file =>
            file.Length > 0 && !AttachmentValidation.IsAllowedFileName(file.FileName));
        if (invalidFile is not null)
            return Results.BadRequest(
                $"File type not allowed: {invalidFile.FileName}. Allowed types: {AttachmentValidation.AllowedExtensionsDisplay}.");

        var attachments = new List<Attachment>();
        var bidAttachments = new List<BidAttachment>();

        foreach (var file in files)
        {
            if (file.Length <= 0)
                continue;

            var attachment = await helper.SaveAsync(file, ct);
            attachments.Add(attachment);
            bidAttachments.Add(new BidAttachment
            {
                BidId = bidId,
                AttachmentId = attachment.Id,
                Attachment = attachment
            });
        }

        if (attachments.Count == 0)
            return Results.BadRequest("At least one attachment is required.");

        db.Attachments.AddRange(attachments);
        db.BidAttachments.AddRange(bidAttachments);
        await db.SaveChangesAsync(ct);

        var response = attachments.Select(a => ToBidAttachmentResponse(jobId, bidId, a)).ToList();
        return Results.Ok(response);
    }

    private static async Task<IResult> ListBidAttachments(
        AppDbContext db,
        Guid jobId,
        Guid bidId,
        ClaimsPrincipal user)
    {
        var userId = CurrentUser.GetUserId(user);
        var access = await LoadBidAttachmentAccessRow(db, jobId, bidId);

        if (access is null) return Results.NotFound("Bid not found.");

        var authResult = await AuthorizeBidAttachmentAccessWithContractorProfileAsync(db, access, userId);
        if (authResult is not null) return authResult;

        var attachments = await db.BidAttachments.AsNoTracking()
            .Where(a => a.BidId == bidId)
            .Select(a => a.Attachment)
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync();

        if (attachments.Count == 0)
            return Results.Ok(new List<BidAttachmentResponse>());

        var response = attachments.Select(a => ToBidAttachmentResponse(jobId, bidId, a)).ToList();
        return Results.Ok(response);
    }

    private static async Task<IResult> DownloadBidAttachment(
        AppDbContext db,
        ClaimsPrincipal user,
        Guid jobId,
        Guid bidId,
        Guid attachmentId,
        bool download = false)
    {
        var userId = CurrentUser.GetUserId(user);
        var access = await LoadBidAttachmentAccessRow(db, jobId, bidId);

        if (access is null) return Results.NotFound("Bid not found.");

        var authResult = await AuthorizeBidAttachmentAccessWithContractorProfileAsync(db, access, userId);
        if (authResult is not null) return authResult;

        var attachment = await db.BidAttachments.AsNoTracking()
            .Where(a => a.BidId == bidId && a.AttachmentId == attachmentId)
            .Select(a => a.Attachment)
            .FirstOrDefaultAsync();

        if (attachment is null) return Results.NotFound("Attachment not found.");

        if (attachment.StorageProvider == "Database" && attachment.Content is not null)
        {
            return download
                ? Results.File(attachment.Content, attachment.ContentType, attachment.FileName)
                : Results.File(attachment.Content, attachment.ContentType);
        }

        if (!string.IsNullOrWhiteSpace(attachment.StorageUrl))
            return Results.Redirect(attachment.StorageUrl);

        return Results.NotFound("Attachment content not available.");
    }

    private static async Task<IResult> StartBidAttachmentParse(
        AppDbContext db,
        Guid jobId,
        Guid bidId,
        ClaimsPrincipal user)
    {
        var userId = CurrentUser.GetUserId(user);
        var access = await LoadBidAttachmentAccessRow(db, jobId, bidId);

        if (access is null) return Results.NotFound("Bid not found.");

        var authResult = await AuthorizeBidAttachmentAccessWithContractorProfileAsync(db, access, userId);
        if (authResult is not null) return authResult;

        var attachmentIds = await db.BidAttachments.AsNoTracking()
            .Where(a => a.BidId == bidId)
            .Select(a => a.AttachmentId)
            .ToListAsync();

        if (attachmentIds.Count == 0)
            return Results.BadRequest("No attachments to parse.");

        var now = DateTimeOffset.UtcNow;
        var parseJobs = attachmentIds.Select(attachmentId => new BidAttachmentParseJob
        {
            Id = Guid.NewGuid(),
            BidId = bidId,
            AttachmentId = attachmentId,
            Status = BidAttachmentParseStatus.Pending,
            CreatedAt = now,
            UpdatedAt = now
        }).ToList();

        db.BidAttachmentParseJobs.AddRange(parseJobs);
        await db.SaveChangesAsync();

        var response = parseJobs.Select(ToBidAttachmentParseResponse).ToList();
        return Results.Accepted($"/jobs/{jobId}/bids/{bidId}/attachments/parse", response);
    }

    private static async Task<IResult> RegenerateBidAttachmentParse(
        AppDbContext db,
        Guid jobId,
        Guid bidId,
        Guid attachmentId,
        ClaimsPrincipal user)
    {
        var userId = CurrentUser.GetUserId(user);
        var access = await LoadBidAttachmentAccessRow(db, jobId, bidId);

        if (access is null) return Results.NotFound("Bid not found.");

        var authResult = await AuthorizeBidAttachmentAccessWithContractorProfileAsync(db, access, userId);
        if (authResult is not null) return authResult;

        var isLinked = await db.BidAttachments.AsNoTracking()
            .AnyAsync(a => a.BidId == bidId && a.AttachmentId == attachmentId);

        if (!isLinked) return Results.NotFound("Attachment not found.");

        var now = DateTimeOffset.UtcNow;
        var job = new BidAttachmentParseJob
        {
            Id = Guid.NewGuid(),
            BidId = bidId,
            AttachmentId = attachmentId,
            Status = BidAttachmentParseStatus.Pending,
            CreatedAt = now,
            UpdatedAt = now
        };

        db.BidAttachmentParseJobs.Add(job);
        await db.SaveChangesAsync();

        return Results.Accepted($"/jobs/{jobId}/bids/{bidId}/attachments/parse", ToBidAttachmentParseResponse(job));
    }

    private static async Task<IResult> ListBidAttachmentParseJobs(
        AppDbContext db,
        Guid jobId,
        Guid bidId,
        ClaimsPrincipal user)
    {
        var userId = CurrentUser.GetUserId(user);
        var access = await LoadBidAttachmentAccessRow(db, jobId, bidId);

        if (access is null) return Results.NotFound("Bid not found.");

        var authResult = await AuthorizeBidAttachmentAccessWithContractorProfileAsync(db, access, userId);
        if (authResult is not null) return authResult;

        var jobs = await db.BidAttachmentParseJobs.AsNoTracking()
            .Where(j => j.BidId == bidId)
            .OrderByDescending(j => j.CreatedAt)
            .ToListAsync();

        var response = jobs.Select(ToBidAttachmentParseResponse).ToList();
        return Results.Ok(response);
    }

    private static async Task<IResult> ListBidRevisions(
        AppDbContext db,
        Guid jobId,
        Guid bidId,
        ClaimsPrincipal user)
    {
        var userId = CurrentUser.GetUserId(user);
        var access = await LoadBidAccessRow(db, jobId, bidId);

        if (access is null) return Results.NotFound("Bid not found.");

        var authResult = await AuthorizeBidReadAccessWithContractorProfileAsync(db, access, userId);
        if (authResult is not null) return authResult;

        var revisions = await db.BidRevisions.AsNoTracking()
            .Where(r => r.BidId == bidId)
            .OrderByDescending(r => r.RevisionNumber)
            .ToListAsync();

        if (revisions.Count == 0)
            return Results.Ok(new List<BidRevisionResponse>());

        var response = revisions
            .Select(r => ToBidRevisionResponse(r))
            .ToList();

        return Results.Ok(response);
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
        else
        {
            bidsQuery = bidsQuery.Where(b => b.Status != BidStatus.Withdrawn && b.Status != BidStatus.Rejected);
        }

        var bids = await bidsQuery
            .OrderBy(b => b.AmountCents)
            .Select(ToBidRowExpr)
            .ToListAsync();

        if (bids.Count == 0)
            return new List<BidResponse>();

        var bidIds = bids.Select(b => b.Id).ToList();
        var variants = await LoadBidVariants(db, bidIds);

        return bids.Select(b => ToBidResponse(b, variants)).ToList();
    }

    private static async Task MarkBidsViewedAsync(AppDbContext db, Guid jobId, Guid? bidId = null)
    {
        var query = db.Bids
            .Where(b => b.JobId == jobId && b.Status == BidStatus.Submitted);

        if (bidId is not null)
            query = query.Where(b => b.Id == bidId.Value);

        await query.ExecuteUpdateAsync(setters => setters.SetProperty(b => b.Status, BidStatus.Viewed));
    }

    private static BidResponse ToBidResponse(Bid b, IReadOnlyList<BidVariantResponse> variants)
        => new(
            b.Id,
            b.JobId,
            b.ContractorProfileId,
            b.AmountCents,
            b.EarliestStart,
            b.DurationDays,
            b.Notes,
            b.ValidUntil,
            b.Terms,
            b.Assumptions,
            b.IsAccepted,
            b.Status.ToString(),
            b.CreatedAt,
            variants
        );

    private static BidResponse ToBidResponse(
        BidRow bid,
        IReadOnlyDictionary<Guid, List<BidVariantResponse>> variants)
    {
        variants.TryGetValue(bid.Id, out var bidVariants);

        return new BidResponse(
            bid.Id,
            bid.JobId,
            bid.ContractorProfileId,
            bid.AmountCents,
            bid.EarliestStart,
            bid.DurationDays,
            bid.Notes,
            bid.ValidUntil,
            bid.Terms,
            bid.Assumptions,
            bid.IsAccepted,
            bid.Status,
            bid.CreatedAt,
            bidVariants ?? new List<BidVariantResponse>()
        );
    }

    private static IReadOnlyList<BidVariantResponse> ToBidVariantResponseList(IReadOnlyList<BidVariant> variants)
        => variants
            .OrderBy(v => v.SortOrder)
            .Select(v => new BidVariantResponse(
                v.Id,
                v.BidId,
                v.Name,
                v.AmountCents,
                v.Notes,
                v.SortOrder))
            .ToList();

    private static BidAttachmentResponse ToBidAttachmentResponse(Guid jobId, Guid bidId, Attachment attachment)
    {
        var url = string.IsNullOrWhiteSpace(attachment.StorageUrl)
            ? $"/jobs/{jobId}/bids/{bidId}/attachments/{attachment.Id}"
            : attachment.StorageUrl;

        return new BidAttachmentResponse(
            attachment.Id,
            bidId,
            attachment.FileName,
            attachment.ContentType,
            attachment.SizeBytes,
            url,
            attachment.CreatedAt
        );
    }

    private static BidAttachmentParseResponse ToBidAttachmentParseResponse(BidAttachmentParseJob job)
        => BidAttachmentParseMapper.ToResponse(job);

    private static (string? Value, string? Error) TryNormalizeOptionalText(string? value, int maxLength, string fieldName)
    {
        if (string.IsNullOrWhiteSpace(value))
            return (null, null);

        var trimmed = value.Trim();
        if (trimmed.Length > maxLength)
            return (null, $"{fieldName} must be {maxLength} characters or fewer.");

        return (trimmed, null);
    }

    private static BidRevision CreateBidRevision(
        Guid bidId,
        Guid createdByUserId,
        int revisionNumber,
        BidRevisionSnapshot snapshot)
    {
        var json = JsonSerializer.Serialize(snapshot, JsonOptions);

        return new BidRevision
        {
            Id = Guid.NewGuid(),
            BidId = bidId,
            CreatedByUserId = createdByUserId,
            RevisionNumber = revisionNumber,
            CreatedAt = DateTimeOffset.UtcNow,
            SnapshotJson = json
        };
    }

    private static BidRevisionSnapshot BuildBidRevisionSnapshot(
        Bid bid,
        IReadOnlyList<BidVariantResponse> variants)
        => new(
            bid.AmountCents,
            bid.EarliestStart,
            bid.DurationDays,
            bid.Notes,
            bid.ValidUntil,
            bid.Terms,
            bid.Assumptions,
            variants
        );

    private static BidRevisionResponse ToBidRevisionResponse(BidRevision revision)
    {
        var snapshot = DeserializeBidRevisionSnapshot(revision.SnapshotJson);

        return new BidRevisionResponse(
            revision.Id,
            revision.BidId,
            revision.RevisionNumber,
            revision.CreatedByUserId,
            revision.CreatedAt,
            snapshot.AmountCents,
            snapshot.EarliestStart,
            snapshot.DurationDays,
            snapshot.Notes,
            snapshot.ValidUntil,
            snapshot.Terms,
            snapshot.Assumptions,
            snapshot.Variants
        );
    }

    private static BidRevisionSnapshot DeserializeBidRevisionSnapshot(string json)
    {
        return JsonSerializer.Deserialize<BidRevisionSnapshot>(json, JsonOptions)
            ?? new BidRevisionSnapshot(
                0,
                null,
                null,
                string.Empty,
                null,
                null,
                null,
                Array.Empty<BidVariantResponse>());
    }

    // For EF translation in Select(...)
    private static readonly Expression<Func<Bid, BidRow>> ToBidRowExpr =
        b => new BidRow
        {
            Id = b.Id,
            JobId = b.JobId,
            ContractorProfileId = b.ContractorProfileId,
            AmountCents = b.AmountCents,
            EarliestStart = b.EarliestStart,
            DurationDays = b.DurationDays,
            Notes = b.Notes,
            ValidUntil = b.ValidUntil,
            Terms = b.Terms,
            Assumptions = b.Assumptions,
            IsAccepted = b.IsAccepted,
            Status = b.Status.ToString(),
            CreatedAt = b.CreatedAt
        };

    private sealed class JobPosterGateRow
    {
        public Guid JobId { get; set; }
        public Guid PostedByUserId { get; set; }
        public JobStatus Status { get; set; }
        public Guid? AcceptedBidId { get; set; }
    }

    private static (List<BidVariant> Variants, string? Error) BuildBidVariants(
        Guid bidId,
        IReadOnlyList<BidVariantRequest>? variants)
    {
        if (variants is null || variants.Count == 0)
            return (new List<BidVariant>(), null);

        var variantEntities = new List<BidVariant>();

        for (var i = 0; i < variants.Count; i++)
        {
            var variant = variants[i];
            var name = (variant.Name ?? string.Empty).Trim();

            if (string.IsNullOrWhiteSpace(name))
                return (new List<BidVariant>(), "Variant name is required.");

            if (name.Length > 200)
                return (new List<BidVariant>(), "Variant name must be 200 characters or fewer.");

            if (variant.AmountCents <= 0)
                return (new List<BidVariant>(), "Variant AmountCents must be greater than 0.");

            var notes = string.IsNullOrWhiteSpace(variant.Notes) ? null : variant.Notes.Trim();
            if (notes is not null && notes.Length > 2000)
                return (new List<BidVariant>(), "Variant notes must be 2000 characters or fewer.");

            variantEntities.Add(new BidVariant
            {
                Id = Guid.NewGuid(),
                BidId = bidId,
                Name = name,
                Notes = notes,
                AmountCents = variant.AmountCents,
                SortOrder = i + 1
            });
        }

        return (variantEntities, null);
    }

    private static async Task<IReadOnlyDictionary<Guid, List<BidVariantResponse>>> LoadBidVariants(
        AppDbContext db,
        IReadOnlyCollection<Guid> bidIds)
    {
        if (bidIds.Count == 0)
            return new Dictionary<Guid, List<BidVariantResponse>>();

        var variants = await db.BidVariants.AsNoTracking()
            .Where(v => bidIds.Contains(v.BidId))
            .OrderBy(v => v.SortOrder)
            .Select(v => new BidVariantResponse(
                v.Id,
                v.BidId,
                v.Name,
                v.AmountCents,
                v.Notes,
                v.SortOrder))
            .ToListAsync();

        return variants
            .GroupBy(v => v.BidId)
            .ToDictionary(g => g.Key, g => g.ToList());
    }

    private static async Task<BidAttachmentAccessRow?> LoadBidAttachmentAccessRow(
        AppDbContext db,
        Guid jobId,
        Guid bidId,
        CancellationToken ct = default)
    {
        return await db.Bids.AsNoTracking()
            .Where(b => b.Id == bidId && b.JobId == jobId)
            .Join(db.Jobs.AsNoTracking(),
                b => b.JobId,
                j => j.Id,
                (b, j) => new BidAttachmentAccessRow
                {
                    JobId = j.Id,
                    BidId = b.Id,
                    BidderUserId = b.BidderUserId,
                    ContractorProfileId = b.ContractorProfileId,
                    IsAccepted = b.IsAccepted,
                    Status = b.Status,
                    PostedByUserId = j.PostedByUserId,
                    JobStatus = j.Status
                })
            .FirstOrDefaultAsync(ct);
    }

    private static IResult? AuthorizeBidAttachmentAccess(BidAttachmentAccessRow access, Guid userId)
    {
        if (userId == access.PostedByUserId)
        {
            if (access.JobStatus != JobStatus.Open && access.Status != BidStatus.Accepted)
                return Results.Forbid();

            return null;
        }

        if (userId == access.BidderUserId)
        {
            if (access.JobStatus != JobStatus.Open || access.Status is BidStatus.Accepted or BidStatus.Rejected or BidStatus.Withdrawn)
                return Results.Forbid();

            return null;
        }

        return Results.Forbid();
    }

    private static async Task<IResult?> AuthorizeBidAttachmentAccessWithContractorProfileAsync(
        AppDbContext db,
        BidAttachmentAccessRow access,
        Guid userId,
        CancellationToken ct = default)
    {
        var result = AuthorizeBidAttachmentAccess(access, userId);
        if (result is null)
            return null;
        if (await ContractorAuthz.CanActForContractorProfileAsync(db, userId, access.ContractorProfileId, ct))
            return null;
        return result;
    }

    private sealed class BidAttachmentAccessRow
    {
        public Guid JobId { get; set; }
        public Guid BidId { get; set; }
        public Guid BidderUserId { get; set; }
        public Guid ContractorProfileId { get; set; }
        public bool IsAccepted { get; set; }
        public BidStatus Status { get; set; }
        public Guid PostedByUserId { get; set; }
        public JobStatus JobStatus { get; set; }
    }

    private sealed class BidAccessRow
    {
        public Guid JobId { get; set; }
        public Guid BidId { get; set; }
        public Guid BidderUserId { get; set; }
        public Guid ContractorProfileId { get; set; }
        public bool IsAccepted { get; set; }
        public BidStatus Status { get; set; }
        public Guid PostedByUserId { get; set; }
        public JobStatus JobStatus { get; set; }
    }

    private sealed class BidRow
    {
        public Guid Id { get; set; }
        public Guid JobId { get; set; }
        public Guid ContractorProfileId { get; set; }
        public long AmountCents { get; set; }
        public DateTimeOffset? EarliestStart { get; set; }
        public int? DurationDays { get; set; }
        public string Notes { get; set; } = "";
        public DateTimeOffset? ValidUntil { get; set; }
        public string? Terms { get; set; }
        public string? Assumptions { get; set; }
        public bool IsAccepted { get; set; }
        public string Status { get; set; } = "";
        public DateTimeOffset CreatedAt { get; set; }
    }

    private sealed class BidVariantRow
    {
        public Guid Id { get; set; }
        public Guid BidId { get; set; }
        public string Name { get; set; } = "";
        public long AmountCents { get; set; }
        public string? Notes { get; set; }
        public int SortOrder { get; set; }
    }

    private sealed record BidRevisionSnapshot(
        long AmountCents,
        DateTimeOffset? EarliestStart,
        int? DurationDays,
        string Notes,
        DateTimeOffset? ValidUntil,
        string? Terms,
        string? Assumptions,
        IReadOnlyList<BidVariantResponse> Variants
    );

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
}
