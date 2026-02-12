using BuilderPulsePro.Api.Auth;
using BuilderPulsePro.Api.Attachments;
using BuilderPulsePro.Api.Contracts;
using BuilderPulsePro.Api.Data;
using BuilderPulsePro.Api.Domain;
using BuilderPulsePro.Api.Events;
using BuilderPulsePro.Api.Geo;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;
using System.Security.Claims;

namespace BuilderPulsePro.Api.Endpoints;

public static class JobsEndpoints
{
    public static IEndpointRouteBuilder MapJobEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGroup("/jobs")
            .WithTags("Jobs")
            .MapJobsRoutes();

        app.MapGroup("/my")
            .WithTags("My")
            .RequireAuthorization()
            .MapMyRoutes();

        return app;
    }

    private static RouteGroupBuilder MapJobsRoutes(this RouteGroupBuilder group)
    {
        group.MapPost("", CreateJob).RequireAuthorization();
        group.MapGet("", ListJobs);
        group.MapGet("/{id:guid}", GetJob);
        group.MapPut("/{id:guid}", UpdateJob).RequireAuthorization();
        group.MapPost("/{id:guid}/attachments", AddJobAttachments)
            .RequireAuthorization()
            .DisableAntiforgery();
        group.MapGet("/{id:guid}/attachments", ListJobAttachments);
        group.MapGet("/{id:guid}/attachments/{attachmentId:guid}", DownloadJobAttachment);
        group.MapDelete("/{id:guid}/attachments/{attachmentId:guid}", DeleteJobAttachment).RequireAuthorization();
        group.MapGet("/{id:guid}/activity", GetJobActivity).RequireAuthorization();
        group.MapPost("/{id:guid}/review", CreateReview).RequireAuthorization();
        group.MapPost("/{id:guid}/complete", CompleteJob).RequireAuthorization();

        return group;
    }

    private static RouteGroupBuilder MapMyRoutes(this RouteGroupBuilder group)
    {
        group.MapGet("/jobs", ListMyJobs);
        return group;
    }

    // ---------------------------
    // Handlers
    // ---------------------------

    private static async Task<IResult> CreateJob(AppDbContext db, CreateJobRequest req, ClaimsPrincipal user, IEventBus bus, GeoNamesZipLookup lookup)
    {
        if (string.IsNullOrWhiteSpace(req.Title)) return Results.BadRequest("Title is required.");
        if (string.IsNullOrWhiteSpace(req.Trade)) return Results.BadRequest("Trade is required.");
        if (string.IsNullOrWhiteSpace(req.Zip)) return Results.BadRequest("Zip is required.");

        var userId = CurrentUser.GetUserId(user);

        var zip = string.IsNullOrWhiteSpace(req.Zip) ? null : req.Zip.Trim();
        var city = string.IsNullOrWhiteSpace(req.City) ? null : req.City.Trim();
        var state = string.IsNullOrWhiteSpace(req.State) ? null : req.State.Trim();
        var lat = req.Lat;
        var lng = req.Lng;

        if (!string.IsNullOrWhiteSpace(zip))
        {
            var postalLookup = lookup.Lookup(zip);

            if (postalLookup == null)
                return Results.BadRequest("Zip code not found.");

            lat = postalLookup.Lat;
            lng = postalLookup.Lng;
        }

        var job = new Job
        {
            Id = Guid.NewGuid(),
            Title = req.Title.Trim(),
            Trade = req.Trade.Trim(),
            Description = string.IsNullOrWhiteSpace(req.Description) ? null : req.Description.Trim(),
            City = city,
            State = state,
            Zip = zip,
            SiteLocation = new Point(lng, lat) { SRID = 4326 },
            CreatedAt = DateTimeOffset.UtcNow,
            Status = JobStatus.Open,
            PostedByUserId = userId
        };

        db.Jobs.Add(job);
        await db.SaveChangesAsync();

        await bus.PublishAsync(new JobPosted(job.Id, job.PostedByUserId, DateTimeOffset.UtcNow));

        return Results.Created($"/jobs/{job.Id}", ToJobResponse(job));
    }

    private static async Task<IResult> ListJobs(
        AppDbContext db,
        string? trade,
        double? lat,
        double? lng,
        int? radiusMeters,
        int take = 50)
    {
        var jobs = await LoadMarketplaceJobs(db, trade, lat, lng, radiusMeters, take);
        return Results.Ok(jobs);
    }

    private static async Task<IResult> GetJob(AppDbContext db, Guid id)
    {
        var job = await db.Jobs.AsNoTracking()
            .Where(j => j.Id == id)
            .Select(j => new JobRow
            {
                Id = j.Id,
                Title = j.Title,
                Trade = j.Trade,
                Description = j.Description,
                City = j.City,
                State = j.State,
                Zip = j.Zip,
                Status = j.Status,
                CreatedAt = j.CreatedAt,
                AcceptedBidId = j.AcceptedBidId,
                CompletedAt = j.CompletedAt,
                SiteLocation = j.SiteLocation
            })
            .FirstOrDefaultAsync();

        if (job is null) return Results.NotFound();

        return Results.Ok(ToJobResponse(job));
    }

    private static async Task<IResult> UpdateJob(
        AppDbContext db,
        UpdateJobRequest req,
        ClaimsPrincipal user,
        Guid id,
        GeoNamesZipLookup lookup)
    {
        if (string.IsNullOrWhiteSpace(req.Title)) return Results.BadRequest("Title is required.");
        if (string.IsNullOrWhiteSpace(req.Trade)) return Results.BadRequest("Trade is required.");
        if (string.IsNullOrWhiteSpace(req.Zip)) return Results.BadRequest("Zip is required.");

        var userId = CurrentUser.GetUserId(user);

        var job = await db.Jobs.FirstOrDefaultAsync(j => j.Id == id);
        if (job is null) return Results.NotFound("Job not found.");
        if (job.PostedByUserId != userId) return Results.Forbid();

        var zip = string.IsNullOrWhiteSpace(req.Zip) ? null : req.Zip.Trim();
        var city = string.IsNullOrWhiteSpace(req.City) ? null : req.City.Trim();
        var state = string.IsNullOrWhiteSpace(req.State) ? null : req.State.Trim();
        var lat = req.Lat;
        var lng = req.Lng;

        if (!string.IsNullOrWhiteSpace(zip))
        {
            var postalLookup = lookup.Lookup(zip);

            if (postalLookup == null)
                return Results.BadRequest("Zip code not found.");

            lat = postalLookup.Lat;
            lng = postalLookup.Lng;
        }

        job.Title = req.Title.Trim();
        job.Trade = req.Trade.Trim();
        job.Description = string.IsNullOrWhiteSpace(req.Description) ? null : req.Description.Trim();
        job.City = city;
        job.State = state;
        job.Zip = zip;
        job.SiteLocation = new Point(lng, lat) { SRID = 4326 };

        await db.SaveChangesAsync();

        return Results.Ok(ToJobResponse(job));
    }

    private static async Task<IResult> AddJobAttachments(
        AppDbContext db,
        ClaimsPrincipal user,
        Guid id,
        IFormFileCollection files,
        AttachmentHelper helper,
        CancellationToken ct)
    {
        var userId = CurrentUser.GetUserId(user);

        var job = await db.Jobs.AsNoTracking()
            .Where(j => j.Id == id)
            .Select(j => new { j.PostedByUserId })
            .FirstOrDefaultAsync(ct);

        if (job is null) return Results.NotFound("Job not found.");
        if (job.PostedByUserId != userId) return Results.Forbid();

        if (files.Count == 0)
            return Results.BadRequest("At least one attachment is required.");

        var invalidFile = files.FirstOrDefault(file =>
            file.Length > 0 && !AttachmentValidation.IsAllowedFileName(file.FileName));
        if (invalidFile is not null)
            return Results.BadRequest(
                $"File type not allowed: {invalidFile.FileName}. Allowed types: {AttachmentValidation.AllowedExtensionsDisplay}.");

        var attachments = new List<Attachment>();
        var jobAttachments = new List<JobAttachment>();

        foreach (var file in files)
        {
            if (file.Length <= 0)
                continue;

            var attachment = await helper.SaveAsync(file, ct);
            attachments.Add(attachment);
            jobAttachments.Add(new JobAttachment
            {
                JobId = id,
                AttachmentId = attachment.Id,
                Attachment = attachment
            });
        }

        if (attachments.Count == 0)
            return Results.BadRequest("At least one attachment is required.");

        db.Attachments.AddRange(attachments);
        db.JobAttachments.AddRange(jobAttachments);
        await db.SaveChangesAsync(ct);

        var response = attachments.Select(a => ToJobAttachmentResponse(id, a)).ToList();
        return Results.Ok(response);
    }

    private static async Task<IResult> ListJobAttachments(AppDbContext db, Guid id)
    {
        var attachments = await db.JobAttachments.AsNoTracking()
            .Where(a => a.JobId == id)
            .Select(a => a.Attachment)
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync();

        if (attachments.Count == 0)
            return Results.Ok(new List<JobAttachmentResponse>());

        var response = attachments.Select(a => ToJobAttachmentResponse(id, a)).ToList();
        return Results.Ok(response);
    }

    private static async Task<IResult> DownloadJobAttachment(
        AppDbContext db,
        Guid id,
        Guid attachmentId,
        bool download = false)
    {
        var attachment = await db.JobAttachments.AsNoTracking()
            .Where(a => a.JobId == id && a.AttachmentId == attachmentId)
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

    private static async Task<IResult> DeleteJobAttachment(
        AppDbContext db,
        ClaimsPrincipal user,
        Guid id,
        Guid attachmentId,
        AttachmentHelper helper,
        CancellationToken ct)
    {
        var userId = CurrentUser.GetUserId(user);

        var job = await db.Jobs.AsNoTracking()
            .Where(j => j.Id == id)
            .Select(j => new { j.PostedByUserId })
            .FirstOrDefaultAsync();

        if (job is null) return Results.NotFound("Job not found.");
        if (job.PostedByUserId != userId) return Results.Forbid();

        var jobAttachment = await db.JobAttachments
            .Include(a => a.Attachment)
            .FirstOrDefaultAsync(a => a.AttachmentId == attachmentId && a.JobId == id, ct);

        if (jobAttachment is null) return Results.NotFound("Attachment not found.");

        var attachment = jobAttachment.Attachment;

        if (attachment is null) return Results.NotFound("Attachment not found.");

        db.JobAttachments.Remove(jobAttachment);
        await db.SaveChangesAsync(ct);

        var stillLinked = await db.JobAttachments
            .AnyAsync(a => a.AttachmentId == attachment.Id, ct);

        if (!stillLinked)
        {
            await helper.DeleteAsync(attachment, ct);
            db.Attachments.Remove(attachment);
            await db.SaveChangesAsync(ct);
        }

        return Results.NoContent();
    }

    private static async Task<IResult> ListMyJobs(AppDbContext db, ClaimsPrincipal user, int take = 50)
    {
        var userId = CurrentUser.GetUserId(user);
        take = Math.Clamp(take, 1, 200);

        var rows = await db.Jobs.AsNoTracking()
            .Where(j => j.PostedByUserId == userId)
            .OrderByDescending(j => j.CreatedAt)
            .Take(take)
            .Select(j => new JobRow
            {
                Id = j.Id,
                Title = j.Title,
                Trade = j.Trade,
                Description = j.Description,
                City = j.City,
                State = j.State,
                Zip = j.Zip,
                Status = j.Status,
                CreatedAt = j.CreatedAt,
                AcceptedBidId = j.AcceptedBidId,
                CompletedAt = j.CompletedAt,
                SiteLocation = j.SiteLocation
            })
            .ToListAsync();

        var result = rows.Select(ToJobResponse);
        return Results.Ok(result);
    }

    private static async Task<IResult> CompleteJob(AppDbContext db, Guid id, ClaimsPrincipal user, IEventBus bus)
    {
        var userId = CurrentUser.GetUserId(user);

        var job = await db.Jobs.FirstOrDefaultAsync(j => j.Id == id);
        if (job is null) return Results.NotFound("Job not found.");

        if (job.PostedByUserId != userId) return Results.Forbid();

        if (job.Status != JobStatus.Awarded)
            return Results.BadRequest("Only awarded jobs can be completed.");

        job.Status = JobStatus.Completed;
        job.CompletedAt = DateTimeOffset.UtcNow;

        await db.SaveChangesAsync();

        await bus.PublishAsync(new JobCompleted(id, userId, DateTimeOffset.UtcNow));

        return Results.Ok();
    }

    private static async Task<IResult> GetJobActivity(
        AppDbContext db,
        Guid id,
        ClaimsPrincipal user,
        int take = 100)
    {
        var userId = CurrentUser.GetUserId(user);
        take = Math.Clamp(take, 1, 200);

        var job = await db.Jobs.AsNoTracking()
            .Where(j => j.Id == id)
            .Select(j => new { j.PostedByUserId })
            .FirstOrDefaultAsync();

        if (job is null) return Results.NotFound();
        if (job.PostedByUserId != userId) return Results.Forbid();

        var rows = await db.ActivityEvents.AsNoTracking()
            .Where(e => e.JobId == id)
            .OrderByDescending(e => e.OccurredAt)
            .Take(take)
            .Select(e => new ActivityEventResponse(
                e.Id,
                e.Type,
                e.JobId,
                e.BidId,
                e.ActorUserId,
                e.OccurredAt,
                e.PayloadJson
            ))
            .ToListAsync();

        return Results.Ok(rows);
    }

    private static async Task<IResult> CreateReview(
        AppDbContext db,
        Guid id,
        CreateReviewRequest req,
        ClaimsPrincipal user)
    {
        var userId = CurrentUser.GetUserId(user);

        if (req.Rating is < 1 or > 5)
            return Results.BadRequest("Rating must be between 1 and 5.");

        var body = (req.Body ?? "").Trim();
        if (body.Length > 2000)
            return Results.BadRequest("Body must be 2000 characters or fewer.");

        var job = await db.Jobs.AsNoTracking()
            .Where(j => j.Id == id)
            .Select(j => new { j.Status, j.PostedByUserId, j.AcceptedBidId })
            .FirstOrDefaultAsync();

        if (job is null) return Results.NotFound();
        if (job.Status != JobStatus.Completed)
            return Results.BadRequest("Reviews are only allowed after job completion.");
        if (job.AcceptedBidId is null)
            return Results.BadRequest("Reviews require an accepted bid.");

        var contractorUserId = await db.Bids.AsNoTracking()
            .Where(b => b.Id == job.AcceptedBidId.Value)
            .Select(b => b.BidderUserId)
            .FirstOrDefaultAsync();

        if (contractorUserId == Guid.Empty) return Results.NotFound();

        if (userId != job.PostedByUserId && userId != contractorUserId)
            return Results.Forbid();

        var revieweeUserId = userId == job.PostedByUserId ? contractorUserId : job.PostedByUserId;

        var alreadyReviewed = await db.Reviews.AsNoTracking()
            .AnyAsync(r => r.JobId == id && r.ReviewerUserId == userId);

        if (alreadyReviewed)
            return Results.Conflict("You have already reviewed this job.");

        var review = new Review
        {
            Id = Guid.NewGuid(),
            JobId = id,
            ReviewerUserId = userId,
            RevieweeUserId = revieweeUserId,
            Rating = req.Rating,
            Body = string.IsNullOrWhiteSpace(body) ? null : body,
            CreatedAt = DateTimeOffset.UtcNow
        };

        db.Reviews.Add(review);
        await db.SaveChangesAsync();

        return Results.Ok(new ReviewResponse(
            review.Id,
            review.JobId,
            review.ReviewerUserId,
            review.RevieweeUserId,
            review.Rating,
            review.Body,
            review.CreatedAt
        ));
    }

    // ---------------------------
    // Helpers
    // ---------------------------

    private static async Task<IEnumerable<JobResponse>> LoadMarketplaceJobs(
        AppDbContext db,
        string? trade,
        double? lat,
        double? lng,
        int? radiusMeters,
        int take)
    {
        take = Math.Clamp(take, 1, 200);

        var query = BuildMarketplaceJobsQuery(db, trade, lat, lng, radiusMeters);

        var rows = await query
            .OrderByDescending(r => r.CreatedAt)
            .Take(take)
            .ToListAsync();

        // Important: SiteLocation.Y/X must be read in memory (geography -> ST_Y not supported)
        return rows.Select(ToJobResponse);
    }

    private static JobAttachmentResponse ToJobAttachmentResponse(Guid jobId, Attachment attachment)
    {
        var url = string.IsNullOrWhiteSpace(attachment.StorageUrl)
            ? $"/jobs/{jobId}/attachments/{attachment.Id}"
            : attachment.StorageUrl;

        return new JobAttachmentResponse(
            attachment.Id,
            jobId,
            attachment.FileName,
            attachment.ContentType,
            attachment.SizeBytes,
            url,
            attachment.CreatedAt
        );
    }

    private static IQueryable<JobRow> BuildMarketplaceJobsQuery(
        AppDbContext db,
        string? trade,
        double? lat,
        double? lng,
        int? radiusMeters)
    {
        var q = db.Jobs.AsNoTracking()
            .Where(j => j.Status == JobStatus.Open);

        if (!string.IsNullOrWhiteSpace(trade))
            q = q.Where(j => j.Trade == trade.Trim());

        if (lat is not null && lng is not null && radiusMeters is not null)
        {
            var center = new Point(lng.Value, lat.Value) { SRID = 4326 };
            q = q.Where(j => j.SiteLocation.Distance(center) <= radiusMeters.Value);
        }

        return q.Select(j => new JobRow
        {
            Id = j.Id,
            Title = j.Title,
            Trade = j.Trade,
            Description = j.Description,
            City = j.City,
            State = j.State,
            Zip = j.Zip,
            Status = j.Status,
            CreatedAt = j.CreatedAt,
            AcceptedBidId = j.AcceptedBidId,
            CompletedAt = j.CompletedAt,
            SiteLocation = j.SiteLocation
        });
    }

    private static JobResponse ToJobResponse(Job job)
        => new(
            job.Id,
            job.Title,
            job.Trade,
            job.Description,
            job.Status.ToString(),
            job.CreatedAt,
            job.City,
            job.State,
            job.Zip,
            job.SiteLocation.Y, // lat (in-memory)
            job.SiteLocation.X, // lng (in-memory)
            job.AcceptedBidId,
            job.CompletedAt
        );

    private static JobResponse ToJobResponse(JobRow row)
        => new(
            row.Id,
            row.Title,
            row.Trade,
            row.Description,
            row.Status.ToString(),
            row.CreatedAt,
            row.City,
            row.State,
            row.Zip,
            row.SiteLocation.Y, // lat (in-memory)
            row.SiteLocation.X, // lng (in-memory)
            row.AcceptedBidId,
            row.CompletedAt
        );

    private sealed class JobRow
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = "";
        public string Trade { get; set; } = "";
        public string? Description { get; set; }
        public string? City { get; set; }
        public string? State { get; set; }
        public string? Zip { get; set; }
        public JobStatus Status { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
        public Guid? AcceptedBidId { get; set; }
        public DateTimeOffset? CompletedAt { get; set; }
        public Point SiteLocation { get; set; } = default!;
    }
}
