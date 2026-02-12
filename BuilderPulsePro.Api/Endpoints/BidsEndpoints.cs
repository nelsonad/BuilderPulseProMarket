using BuilderPulsePro.Api.Auth;
using BuilderPulsePro.Api.Attachments;
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
        group.MapGet("/{bidId:guid}/attachments", ListBidAttachments).RequireAuthorization();
        group.MapGet("/{bidId:guid}/attachments/{attachmentId:guid}", DownloadBidAttachment).RequireAuthorization();
        group.MapPost("/{bidId:guid}/attachments/{attachmentId:guid}/parse", RegenerateBidAttachmentParse)
            .RequireAuthorization();
        group.MapGet("/{bidId:guid}/attachments/parse", ListBidAttachmentParseJobs).RequireAuthorization();
        group.MapGet("/{bidId:guid}/revisions", ListBidRevisions).RequireAuthorization();

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
            .Select(p => new { p.UserId })
            .FirstOrDefaultAsync();

        if (profile is null)
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

        var alreadyBid = await db.Bids.AsNoTracking()
            .AnyAsync(b => b.JobId == jobId && b.BidderUserId == userId);

        if (alreadyBid)
            return Results.Conflict("You have already placed a bid for this job.");

        var termsResult = TryNormalizeOptionalText(req.Terms, 4000, "Terms");
        if (termsResult.Error is not null) return Results.BadRequest(termsResult.Error);

        var assumptionsResult = TryNormalizeOptionalText(req.Assumptions, 4000, "Assumptions");
        if (assumptionsResult.Error is not null) return Results.BadRequest(assumptionsResult.Error);

        var bid = new Bid
        {
            Id = Guid.NewGuid(),
            JobId = jobId,
            BidderUserId = userId,
            ContractorProfileId = profile.UserId,
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

        var lineItemsResult = BuildBidLineItems(bid.Id, req.LineItems);
        if (lineItemsResult.Error is not null)
            return Results.BadRequest(lineItemsResult.Error);

        if (lineItemsResult.TotalCents is not null && lineItemsResult.TotalCents != req.AmountCents)
            return Results.BadRequest("AmountCents must equal the sum of line items.");

        var variantsResult = BuildBidVariants(bid.Id, req.Variants);
        if (variantsResult.Error is not null)
            return Results.BadRequest(variantsResult.Error);

        db.Bids.Add(bid);
        if (lineItemsResult.Items.Count > 0)
            db.BidLineItems.AddRange(lineItemsResult.Items);
        if (variantsResult.Variants.Count > 0)
            db.BidVariants.AddRange(variantsResult.Variants);
        if (variantsResult.LineItems.Count > 0)
            db.BidVariantLineItems.AddRange(variantsResult.LineItems);

        var revision = CreateBidRevision(
            bid.Id,
            userId,
            revisionNumber: 1,
            BuildBidRevisionSnapshot(bid,
                lineItemsResult.Items.Select(ToBidLineItemResponse).ToList(),
                MapBidVariants(variantsResult.Variants, variantsResult.LineItems)));
        db.BidRevisions.Add(revision);
        await db.SaveChangesAsync();

        await bus.PublishAsync(new BidPlaced(bid.Id, bid.JobId, bid.BidderUserId, DateTimeOffset.UtcNow));

        var response = ToBidResponse(
            bid,
            lineItemsResult.Items.Select(ToBidLineItemResponse).ToList(),
            MapBidVariants(variantsResult.Variants, variantsResult.LineItems));

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

        var profile = await db.ContractorProfiles.AsNoTracking()
            .Where(p => p.UserId == userId)
            .Select(p => new { p.UserId })
            .FirstOrDefaultAsync(ct);

        if (profile is null)
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

        var lineItemsResult = BuildBidLineItems(bid.Id, req.LineItems);
        if (lineItemsResult.Error is not null)
            return Results.BadRequest(lineItemsResult.Error);

        if (lineItemsResult.TotalCents is not null && lineItemsResult.TotalCents != req.AmountCents)
            return Results.BadRequest("AmountCents must equal the sum of line items.");

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

        await db.BidLineItems
            .Where(i => i.BidId == bid.Id)
            .ExecuteDeleteAsync();

        var existingVariantIds = await db.BidVariants
            .Where(v => v.BidId == bid.Id)
            .Select(v => v.Id)
            .ToListAsync();

        if (existingVariantIds.Count > 0)
        {
            await db.BidVariantLineItems
                .Where(i => existingVariantIds.Contains(i.BidVariantId))
                .ExecuteDeleteAsync();

            await db.BidVariants
                .Where(v => v.BidId == bid.Id)
                .ExecuteDeleteAsync();
        }

        if (lineItemsResult.Items.Count > 0)
            db.BidLineItems.AddRange(lineItemsResult.Items);
        if (variantsResult.Variants.Count > 0)
            db.BidVariants.AddRange(variantsResult.Variants);
        if (variantsResult.LineItems.Count > 0)
            db.BidVariantLineItems.AddRange(variantsResult.LineItems);

        var nextRevision = await db.BidRevisions.AsNoTracking()
            .Where(r => r.BidId == bid.Id)
            .OrderByDescending(r => r.RevisionNumber)
            .Select(r => r.RevisionNumber)
            .FirstOrDefaultAsync();

        var revision = CreateBidRevision(
            bid.Id,
            userId,
            revisionNumber: nextRevision + 1,
            BuildBidRevisionSnapshot(bid,
                lineItemsResult.Items.Select(ToBidLineItemResponse).ToList(),
                MapBidVariants(variantsResult.Variants, variantsResult.LineItems)));
        db.BidRevisions.Add(revision);

        await db.SaveChangesAsync();

        var response = ToBidResponse(
            bid,
            lineItemsResult.Items.Select(ToBidLineItemResponse).ToList(),
            MapBidVariants(variantsResult.Variants, variantsResult.LineItems));

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

        var lineItems = await LoadBidLineItems(db, new[] { bidRow.Id });
        var variants = await LoadBidVariants(db, new[] { bidRow.Id });
        var response = new[] { bidRow }
            .Select(b => ToBidResponse(b, lineItems, variants))
            .First();

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
        if (userId != access.BidderUserId) return Results.Forbid();

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

        var now = DateTimeOffset.UtcNow;
        var parseJobs = attachments.Select(a => new BidAttachmentParseJob
        {
            Id = Guid.NewGuid(),
            BidId = bidId,
            AttachmentId = a.Id,
            Status = BidAttachmentParseStatus.Pending,
            CreatedAt = now,
            UpdatedAt = now
        }).ToList();

        db.Attachments.AddRange(attachments);
        db.BidAttachments.AddRange(bidAttachments);
        db.BidAttachmentParseJobs.AddRange(parseJobs);
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

        var authResult = AuthorizeBidAttachmentAccess(access, userId);
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

        var authResult = AuthorizeBidAttachmentAccess(access, userId);
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

        var authResult = AuthorizeBidAttachmentAccess(access, userId);
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

        var authResult = AuthorizeBidAttachmentAccess(access, userId);
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

        var authResult = AuthorizeBidReadAccess(access, userId);
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
        var lineItems = await LoadBidLineItems(db, bidIds);
        var variants = await LoadBidVariants(db, bidIds);

        return bids.Select(b => ToBidResponse(b, lineItems, variants)).ToList();
    }

    private static async Task MarkBidsViewedAsync(AppDbContext db, Guid jobId, Guid? bidId = null)
    {
        var query = db.Bids
            .Where(b => b.JobId == jobId && b.Status == BidStatus.Submitted);

        if (bidId is not null)
            query = query.Where(b => b.Id == bidId.Value);

        await query.ExecuteUpdateAsync(setters => setters.SetProperty(b => b.Status, BidStatus.Viewed));
    }

    // For in-memory mapping (e.g., newly created bid instance)
    private static BidResponse ToBidResponse(Bid b)
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
            Array.Empty<BidLineItemResponse>(),
            Array.Empty<BidVariantResponse>()
        );

    private static BidResponse ToBidResponse(
        BidRow bid,
        IReadOnlyDictionary<Guid, List<BidLineItemResponse>> lineItems,
        IReadOnlyDictionary<Guid, List<BidVariantResponse>> variants)
    {
        lineItems.TryGetValue(bid.Id, out var items);
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
            items ?? new List<BidLineItemResponse>(),
            bidVariants ?? new List<BidVariantResponse>()
        );
    }

    private static BidResponse ToBidResponse(
        Bid bid,
        IReadOnlyList<BidLineItemResponse> lineItems,
        IReadOnlyList<BidVariantResponse> variants)
        => new(
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
            bid.Status.ToString(),
            bid.CreatedAt,
            lineItems,
            variants
        );

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

    private static BidLineItemResponse ToBidLineItemResponse(BidLineItem item)
    {
        var totalCents = item.UnitPriceCents * item.Quantity;

        return new BidLineItemResponse(
            item.Id,
            item.BidId,
            item.Description,
            item.Quantity,
            item.UnitPriceCents,
            totalCents,
            item.SortOrder
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

    private static BidVariantLineItemResponse ToBidVariantLineItemResponse(BidVariantLineItem item)
    {
        var totalCents = item.UnitPriceCents * item.Quantity;

        return new BidVariantLineItemResponse(
            item.Id,
            item.BidVariantId,
            item.Description,
            item.Quantity,
            item.UnitPriceCents,
            totalCents,
            item.SortOrder
        );
    }

    private static BidVariantResponse ToBidVariantResponse(
        BidVariant variant,
        IReadOnlyList<BidVariantLineItemResponse> lineItems)
        => new(
            variant.Id,
            variant.BidId,
            variant.Name,
            variant.AmountCents,
            variant.Notes,
            variant.SortOrder,
            lineItems
        );

    private static IReadOnlyList<BidVariantResponse> MapBidVariants(
        IReadOnlyList<BidVariant> variants,
        IReadOnlyList<BidVariantLineItem> lineItems)
    {
        if (variants.Count == 0)
            return Array.Empty<BidVariantResponse>();

        var lineItemLookup = lineItems
            .GroupBy(i => i.BidVariantId)
            .ToDictionary(
                g => g.Key,
                g => g.Select(ToBidVariantLineItemResponse).ToList());

        return variants
            .OrderBy(v => v.SortOrder)
            .Select(v =>
            {
                lineItemLookup.TryGetValue(v.Id, out var items);
                return ToBidVariantResponse(v, items ?? new List<BidVariantLineItemResponse>());
            })
            .ToList();
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
        IReadOnlyList<BidLineItemResponse> lineItems,
        IReadOnlyList<BidVariantResponse> variants)
        => new(
            bid.AmountCents,
            bid.EarliestStart,
            bid.DurationDays,
            bid.Notes,
            bid.ValidUntil,
            bid.Terms,
            bid.Assumptions,
            lineItems,
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
            snapshot.LineItems,
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
                Array.Empty<BidLineItemResponse>(),
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

    private static string? ValidateLineItemFields(string description, int quantity, long unitPriceCents)
    {
        if (string.IsNullOrWhiteSpace(description))
            return "Line item description is required.";

        if (description.Length > 500)
            return "Line item description must be 500 characters or fewer.";

        if (quantity <= 0)
            return "Line item quantity must be greater than 0.";

        if (unitPriceCents <= 0)
            return "Line item unit price must be greater than 0.";

        return null;
    }

    private static (List<BidLineItem> Items, long? TotalCents, string? Error) BuildBidLineItems(
        Guid bidId,
        IReadOnlyList<BidLineItemRequest>? lineItems)
    {
        if (lineItems is null || lineItems.Count == 0)
            return (new List<BidLineItem>(), null, null);

        var items = new List<BidLineItem>();
        long totalCents = 0;

        for (var i = 0; i < lineItems.Count; i++)
        {
            var item = lineItems[i];
            var description = (item.Description ?? string.Empty).Trim();

            var error = ValidateLineItemFields(description, item.Quantity, item.UnitPriceCents);
            if (error is not null)
                return (new List<BidLineItem>(), null, error);

            var lineTotal = item.UnitPriceCents * item.Quantity;
            totalCents += lineTotal;

            items.Add(new BidLineItem
            {
                Id = Guid.NewGuid(),
                BidId = bidId,
                Description = description,
                Quantity = item.Quantity,
                UnitPriceCents = item.UnitPriceCents,
                SortOrder = i + 1
            });
        }

        return (items, totalCents, null);
    }

    private static (List<BidVariant> Variants, List<BidVariantLineItem> LineItems, string? Error) BuildBidVariants(
        Guid bidId,
        IReadOnlyList<BidVariantRequest>? variants)
    {
        if (variants is null || variants.Count == 0)
            return (new List<BidVariant>(), new List<BidVariantLineItem>(), null);

        var variantEntities = new List<BidVariant>();
        var variantLineItems = new List<BidVariantLineItem>();

        for (var i = 0; i < variants.Count; i++)
        {
            var variant = variants[i];
            var name = (variant.Name ?? string.Empty).Trim();

            if (string.IsNullOrWhiteSpace(name))
                return (new List<BidVariant>(), new List<BidVariantLineItem>(), "Variant name is required.");

            if (name.Length > 200)
                return (new List<BidVariant>(), new List<BidVariantLineItem>(), "Variant name must be 200 characters or fewer.");

            if (variant.AmountCents <= 0)
                return (new List<BidVariant>(), new List<BidVariantLineItem>(), "Variant AmountCents must be greater than 0.");

            var notes = string.IsNullOrWhiteSpace(variant.Notes) ? null : variant.Notes.Trim();
            if (notes is not null && notes.Length > 2000)
                return (new List<BidVariant>(), new List<BidVariantLineItem>(), "Variant notes must be 2000 characters or fewer.");

            var variantId = Guid.NewGuid();
            var lineItemsResult = BuildBidVariantLineItems(variantId, variant.LineItems);
            if (lineItemsResult.Error is not null)
                return (new List<BidVariant>(), new List<BidVariantLineItem>(), lineItemsResult.Error);

            if (lineItemsResult.TotalCents is not null && lineItemsResult.TotalCents != variant.AmountCents)
                return (new List<BidVariant>(), new List<BidVariantLineItem>(), "Variant AmountCents must equal the sum of line items.");

            variantEntities.Add(new BidVariant
            {
                Id = variantId,
                BidId = bidId,
                Name = name,
                Notes = notes,
                AmountCents = variant.AmountCents,
                SortOrder = i + 1
            });

            variantLineItems.AddRange(lineItemsResult.Items);
        }

        return (variantEntities, variantLineItems, null);
    }

    private static (List<BidVariantLineItem> Items, long? TotalCents, string? Error) BuildBidVariantLineItems(
        Guid bidVariantId,
        IReadOnlyList<BidVariantLineItemRequest>? lineItems)
    {
        if (lineItems is null || lineItems.Count == 0)
            return (new List<BidVariantLineItem>(), null, null);

        var items = new List<BidVariantLineItem>();
        long totalCents = 0;

        for (var i = 0; i < lineItems.Count; i++)
        {
            var item = lineItems[i];
            var description = (item.Description ?? string.Empty).Trim();

            var error = ValidateLineItemFields(description, item.Quantity, item.UnitPriceCents);
            if (error is not null)
                return (new List<BidVariantLineItem>(), null, error);

            var lineTotal = item.UnitPriceCents * item.Quantity;
            totalCents += lineTotal;

            items.Add(new BidVariantLineItem
            {
                Id = Guid.NewGuid(),
                BidVariantId = bidVariantId,
                Description = description,
                Quantity = item.Quantity,
                UnitPriceCents = item.UnitPriceCents,
                SortOrder = i + 1
            });
        }

        return (items, totalCents, null);
    }

    private static async Task<IReadOnlyDictionary<Guid, List<BidLineItemResponse>>> LoadBidLineItems(
        AppDbContext db,
        IReadOnlyCollection<Guid> bidIds)
    {
        if (bidIds.Count == 0)
            return new Dictionary<Guid, List<BidLineItemResponse>>();

        var items = await db.BidLineItems.AsNoTracking()
            .Where(i => bidIds.Contains(i.BidId))
            .OrderBy(i => i.SortOrder)
            .Select(i => new BidLineItemResponse(
                i.Id,
                i.BidId,
                i.Description,
                i.Quantity,
                i.UnitPriceCents,
                i.UnitPriceCents * i.Quantity,
                i.SortOrder))
            .ToListAsync();

        return items
            .GroupBy(i => i.BidId)
            .ToDictionary(g => g.Key, g => g.ToList());
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
            .Select(v => new BidVariantRow
            {
                Id = v.Id,
                BidId = v.BidId,
                Name = v.Name,
                AmountCents = v.AmountCents,
                Notes = v.Notes,
                SortOrder = v.SortOrder
            })
            .ToListAsync();

        if (variants.Count == 0)
            return new Dictionary<Guid, List<BidVariantResponse>>();

        var variantIds = variants.Select(v => v.Id).ToList();

        var lineItems = await db.BidVariantLineItems.AsNoTracking()
            .Where(i => variantIds.Contains(i.BidVariantId))
            .OrderBy(i => i.SortOrder)
            .Select(i => new BidVariantLineItemResponse(
                i.Id,
                i.BidVariantId,
                i.Description,
                i.Quantity,
                i.UnitPriceCents,
                i.UnitPriceCents * i.Quantity,
                i.SortOrder))
            .ToListAsync();

        var lineItemLookup = lineItems
            .GroupBy(i => i.BidVariantId)
            .ToDictionary(g => g.Key, g => g.ToList());

        return variants
            .GroupBy(v => v.BidId)
            .ToDictionary(
                g => g.Key,
                g => g.Select(v =>
                {
                    lineItemLookup.TryGetValue(v.Id, out var items);
                    return new BidVariantResponse(
                        v.Id,
                        v.BidId,
                        v.Name,
                        v.AmountCents,
                        v.Notes,
                        v.SortOrder,
                        items ?? new List<BidVariantLineItemResponse>());
                }).ToList());
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

    private sealed class BidAttachmentAccessRow
    {
        public Guid JobId { get; set; }
        public Guid BidId { get; set; }
        public Guid BidderUserId { get; set; }
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
        IReadOnlyList<BidLineItemResponse> LineItems,
        IReadOnlyList<BidVariantResponse> Variants
    );

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
}
