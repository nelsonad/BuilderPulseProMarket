using BuilderPulsePro.Api.Auth;
using BuilderPulsePro.Api.Contracts;
using BuilderPulsePro.Api.Data;
using BuilderPulsePro.Api.Domain;
using BuilderPulsePro.Api.Geo;
using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;
using System.Security.Claims;

namespace BuilderPulsePro.Api.Endpoints;

public static class ContractorEndpoints
{
    public static IEndpointRouteBuilder MapContractorEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/contractor")
            .WithTags("Contractor")
            .RequireAuthorization();

        group.MapGet("/bids", GetMyBids);
        group.MapDelete("/bids/{bidId:guid}", WithdrawMyBid);

        group.MapGet("/profile", GetProfile);
        group.MapPut("/profile", UpsertProfile);
        group.MapPut("/profile/availability", UpdateAvailability);

        group.MapGet("/jobs/recommended", GetRecommendedJobs);

        return app;
    }

    private static async Task<IResult> GetMyBids(
        AppDbContext db,
        ClaimsPrincipal user,
        string? status = null,
        bool? accepted = null,
        int take = 50)
    {
        var userId = CurrentUser.GetUserId(user);
        var result = await LoadMyBids(db, userId, status, accepted, take);
        return Results.Ok(result);
    }

    private static async Task<IResult> WithdrawMyBid(
        AppDbContext db,
        ClaimsPrincipal user,
        Guid bidId,
        string? status = null,
        bool? accepted = null,
        int take = 50)
    {
        var userId = CurrentUser.GetUserId(user);

        // Load the bid and job status (must be this user’s bid)
        var row = await db.Bids
            .Where(b => b.Id == bidId && b.BidderUserId == userId)
            .Join(db.Jobs,
                b => b.JobId,
                j => j.Id,
                (b, j) => new { Bid = b, JobStatus = j.Status })
            .FirstOrDefaultAsync();

        if (row is null) return Results.NotFound("Bid not found.");

        if (row.Bid.IsAccepted)
            return Results.BadRequest("Accepted bids cannot be withdrawn.");

        if (row.JobStatus != JobStatus.Open)
            return Results.BadRequest("Bids can only be withdrawn while the job is open.");

        db.Bids.Remove(row.Bid);
        await db.SaveChangesAsync();

        // Return updated list (same as GET)
        var result = await LoadMyBids(db, userId, status, accepted, take);
        return Results.Ok(result);
    }

    private static async Task<IEnumerable<MyBidResponse>> LoadMyBids(
        AppDbContext db,
        Guid userId,
        string? status,
        bool? accepted,
        int take)
    {
        take = Math.Clamp(take, 1, 200);

        var query = BuildMyBidsQuery(db, userId, status, accepted);

        var rows = await query
            .OrderByDescending(x => x.BidCreatedAt)
            .Take(take)
            .ToListAsync();

        return rows.Select(r => new MyBidResponse(
            BidId: r.BidId,
            AmountCents: r.AmountCents,
            EarliestStart: r.EarliestStart,
            DurationDays: r.DurationDays,
            Notes: r.Notes,
            IsAccepted: r.IsAccepted,
            BidCreatedAt: r.BidCreatedAt,
            Job: new MyBidJobInfo(
                JobId: r.JobId,
                Title: r.Title,
                Trade: r.Trade,
                Status: r.JobStatus.ToString(),
                JobCreatedAt: r.JobCreatedAt,
                PostedByUserId: r.PostedByUserId
            )
        ));
    }

    /// <summary>
    /// Builds the query for "my bids" (filterable). Keep it projection-only so EF can translate.
    /// </summary>
    private static IQueryable<MyBidRow> BuildMyBidsQuery(
        AppDbContext db,
        Guid userId,
        string? status,
        bool? accepted)
    {
        var bids = db.Bids.AsNoTracking()
            .Where(b => b.BidderUserId == userId);

        if (accepted is true)
            bids = bids.Where(b => b.IsAccepted);

        var joined = bids.Join(
            db.Jobs.AsNoTracking(),
            b => b.JobId,
            j => j.Id,
            (b, j) => new MyBidRow
            {
                BidId = b.Id,
                JobId = j.Id,
                AmountCents = b.AmountCents,
                EarliestStart = b.EarliestStart,
                DurationDays = b.DurationDays,
                Notes = b.Notes,
                IsAccepted = b.IsAccepted,
                BidCreatedAt = b.CreatedAt,

                Title = j.Title,
                Trade = j.Trade,
                JobStatus = j.Status,
                JobCreatedAt = j.CreatedAt,
                PostedByUserId = j.PostedByUserId
            });

        if (!string.IsNullOrWhiteSpace(status) &&
            Enum.TryParse<JobStatus>(status, ignoreCase: true, out var parsedStatus))
        {
            joined = joined.Where(x => x.JobStatus == parsedStatus);
        }

        return joined;
    }

    private static async Task<IResult> GetProfile(AppDbContext db, ClaimsPrincipal user)
    {
        var userId = CurrentUser.GetUserId(user);

        var p = await db.ContractorProfiles.AsNoTracking()
            .FirstOrDefaultAsync(x => x.UserId == userId);

        if (p is null) return Results.NotFound();

        return Results.Ok(new ContractorProfileResponse(
            p.DisplayName,
            SplitTrades(p.TradesCsv),
            p.City,
            p.State,
            p.Zip,
            p.HomeBase.Y, // lat (in-memory)
            p.HomeBase.X, // lng (in-memory)
            p.ServiceRadiusMeters,
            p.IsAvailable,
            p.UnavailableReason,
            p.UpdatedAt
        ));
    }

    private static async Task<IResult> UpsertProfile(AppDbContext db, ClaimsPrincipal user, UpsertContractorProfileRequest req, GeoNamesZipLookup lookup)
    {
        var userId = CurrentUser.GetUserId(user);

        if (string.IsNullOrWhiteSpace(req.DisplayName))
            return Results.BadRequest("DisplayName is required.");

        if (string.IsNullOrWhiteSpace(req.Zip))
            return Results.BadRequest("Zip is required.");

        if (req.ServiceRadiusMeters <= 0)
            return Results.BadRequest("ServiceRadiusMeters must be > 0.");

        var tradesCsv = NormalizeTrades(req.Trades);
        if (string.IsNullOrWhiteSpace(tradesCsv))
            return Results.BadRequest("At least one trade is required.");

        var zip = string.IsNullOrWhiteSpace(req.Zip) ? null : req.Zip.Trim();
        var city = string.IsNullOrWhiteSpace(req.City) ? null : req.City.Trim();
        var state = string.IsNullOrWhiteSpace(req.State) ? null : req.State.Trim();
        var lat = req.Lat;
        var lng = req.Lng;



        if (!string.IsNullOrWhiteSpace(zip))
        {
            var lookupResult = lookup.Lookup(zip);

            if (lookupResult == null)
                return Results.BadRequest("Zip code not found.");

            lat = lookupResult.Lat;
            lng = lookupResult.Lng;
        }

        var existing = await db.ContractorProfiles.FirstOrDefaultAsync(x => x.UserId == userId);

        var requestedAvailability = req.IsAvailable;
        var normalizedReason = string.IsNullOrWhiteSpace(req.UnavailableReason)
            ? null
            : req.UnavailableReason.Trim();

        var resolvedAvailability = requestedAvailability ?? existing?.IsAvailable ?? true;
        var resolvedReason = resolvedAvailability ? null : normalizedReason;

        if (existing is null)
        {
            existing = new ContractorProfile
            {
                UserId = userId,
                DisplayName = req.DisplayName.Trim(),
                City = city,
                State = state,
                Zip = zip,
                TradesCsv = tradesCsv,
                HomeBase = new Point(lng, lat) { SRID = 4326 },
                ServiceRadiusMeters = req.ServiceRadiusMeters,
                IsAvailable = resolvedAvailability,
                UnavailableReason = resolvedReason,
                UpdatedAt = DateTimeOffset.UtcNow
            };

            db.ContractorProfiles.Add(existing);
        }
        else
        {
            existing.DisplayName = req.DisplayName.Trim();
            existing.City = city;
            existing.State = state;
            existing.Zip = zip;
            existing.TradesCsv = tradesCsv;
            existing.HomeBase = new Point(lng, lat) { SRID = 4326 };
            existing.ServiceRadiusMeters = req.ServiceRadiusMeters;
            existing.IsAvailable = resolvedAvailability;
            existing.UnavailableReason = resolvedReason;
            existing.UpdatedAt = DateTimeOffset.UtcNow;
        }

        await db.SaveChangesAsync();

        return Results.Ok(new ContractorProfileResponse(
            existing.DisplayName,
            SplitTrades(existing.TradesCsv),
            existing.City,
            existing.State,
            existing.Zip,
            existing.HomeBase.Y,
            existing.HomeBase.X,
            existing.ServiceRadiusMeters,
            existing.IsAvailable,
            existing.UnavailableReason,
            existing.UpdatedAt
        ));
    }

    private static async Task<IResult> UpdateAvailability(
        AppDbContext db,
        ClaimsPrincipal user,
        UpdateContractorAvailabilityRequest req)
    {
        var userId = CurrentUser.GetUserId(user);

        var profile = await db.ContractorProfiles.FirstOrDefaultAsync(x => x.UserId == userId);
        if (profile is null) return Results.NotFound();

        profile.IsAvailable = req.IsAvailable;

        if (req.IsAvailable)
        {
            profile.UnavailableReason = null;
        }
        else
        {
            var reason = (req.UnavailableReason ?? "").Trim();
            profile.UnavailableReason = string.IsNullOrWhiteSpace(reason) ? null : reason;
        }

        profile.UpdatedAt = DateTimeOffset.UtcNow;

        await db.SaveChangesAsync();

        return Results.Ok(new ContractorProfileResponse(
            profile.DisplayName,
            SplitTrades(profile.TradesCsv),
            profile.City,
            profile.State,
            profile.Zip,
            profile.HomeBase.Y,
            profile.HomeBase.X,
            profile.ServiceRadiusMeters,
            profile.IsAvailable,
            profile.UnavailableReason,
            profile.UpdatedAt
        ));
    }

    private static async Task<IResult> GetRecommendedJobs(
    AppDbContext db,
    ClaimsPrincipal user,
    string? trade = null,
    int? maxDistanceMeters = null,
    string? sort = null,
    int take = 50,
    int skip = 0)
    {
        var userId = CurrentUser.GetUserId(user);
        take = Math.Clamp(take, 1, 200);
        skip = Math.Max(skip, 0);

        var profile = await db.ContractorProfiles.AsNoTracking()
            .Where(p => p.UserId == userId)
            .Select(p => new
            {
                p.HomeBase,
                p.ServiceRadiusMeters,
                p.IsAvailable,
                p.TradesCsv
            })
            .FirstOrDefaultAsync();

        if (profile is null)
            return Results.BadRequest("Create your contractor profile to get recommended jobs.");

        if (!profile.IsAvailable)
            return Results.Ok(new PagedResponse<RecommendedJobResponse>(0, new List<RecommendedJobResponse>()));

        var homeBase = profile.HomeBase;

        var effectiveMaxDistance = profile.ServiceRadiusMeters;
        if (maxDistanceMeters is > 0)
            effectiveMaxDistance = Math.Min(effectiveMaxDistance, maxDistanceMeters.Value);

        var tradeFilter = (trade ?? "").Trim();
        var hasTradeFilter = !string.IsNullOrWhiteSpace(tradeFilter);
        var profileTrades = SplitTrades(profile.TradesCsv);
        var tradeMatches = profileTrades.Length > 0;

        var jobs = db.Jobs.AsNoTracking()
            .Where(j => j.Status == JobStatus.Open);

        if (hasTradeFilter)
        {
            var pattern = $"%{tradeFilter}%";
            jobs = jobs.Where(j => EF.Functions.ILike(j.Trade, pattern));
        }
        else if (tradeMatches)
        {
            jobs = jobs.Where(j => profileTrades.Any(t => EF.Functions.ILike(j.Trade, t)));
        }

        // Build the common projected query (IQueryable) ONCE
        var projected = jobs
            .Select(j => new
            {
                j.Id,
                j.Title,
                j.Trade,
                j.Status,
                j.CreatedAt,
                j.City,
                j.State,
                j.Zip,
                j.AcceptedBidId,
                j.CompletedAt,
                j.SiteLocation,
                DistanceMeters = j.SiteLocation.Distance(homeBase),
                HasBidByMe = db.Bids.Any(b => b.JobId == j.Id && b.BidderUserId == userId)
            })
            .Where(x => x.DistanceMeters <= effectiveMaxDistance);

        // Total count (no ordering/paging)
        var total = await projected.CountAsync();

        // Page items
        var sortKey = (sort ?? "").Trim().ToLowerInvariant();

        var ordered = sortKey switch
        {
            "newest" => projected
                .OrderByDescending(x => x.CreatedAt)
                .ThenBy(x => x.DistanceMeters),
            "oldest" => projected
                .OrderBy(x => x.CreatedAt)
                .ThenBy(x => x.DistanceMeters),
            _ => projected
                .OrderBy(x => x.DistanceMeters)
                .ThenByDescending(x => x.CreatedAt)
        };

        var rows = await ordered
            .Skip(skip)
            .Take(take)
            .ToListAsync();

        // Convert to response (lat/lng read in-memory)
        var items = rows.Select(x => new RecommendedJobResponse(
            x.Id,
            x.Title,
            x.Trade,
            x.Status.ToString(),
            x.CreatedAt,
            x.City,
            x.State,
            x.Zip,
            x.SiteLocation.Y,
            x.SiteLocation.X,
            x.AcceptedBidId,
            x.CompletedAt,
            x.DistanceMeters,
            x.HasBidByMe
        )).ToList();

        return Results.Ok(new PagedResponse<RecommendedJobResponse>(total, items));
    }

    private static string NormalizeTrades(string[] trades)
    {
        var cleaned = (trades ?? Array.Empty<string>())
            .Select(t => (t ?? "").Trim())
            .Where(t => !string.IsNullOrWhiteSpace(t))
            .Select(t => t.ToLowerInvariant())
            .Distinct()
            .ToArray();

        return string.Join(",", cleaned);
    }

    private static string[] SplitTrades(string tradesCsv)
    {
        return (tradesCsv ?? "")
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .ToArray();
    }

    private sealed class MyBidRow
    {
        public Guid BidId { get; set; }
        public Guid JobId { get; set; }
        public long AmountCents { get; set; }
        public DateTimeOffset? EarliestStart { get; set; }
        public int? DurationDays { get; set; }
        public string Notes { get; set; } = "";
        public bool IsAccepted { get; set; }
        public DateTimeOffset BidCreatedAt { get; set; }

        public string Title { get; set; } = "";
        public string Trade { get; set; } = "";
        public JobStatus JobStatus { get; set; }
        public DateTimeOffset JobCreatedAt { get; set; }
        public Guid PostedByUserId { get; set; }
    }
}
