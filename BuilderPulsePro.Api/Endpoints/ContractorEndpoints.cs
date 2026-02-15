using BuilderPulsePro.Api.Auth;
using BuilderPulsePro.Api.Contracts;
using BuilderPulsePro.Api.Data;
using BuilderPulsePro.Api.Domain;
using BuilderPulsePro.Api.Events;
using BuilderPulsePro.Api.Geo;
using Microsoft.AspNetCore.Identity;
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

        group.MapGet("/profile/authorized-users", ListAuthorizedUsers);
        group.MapPost("/profile/authorized-users", AddAuthorizedUser);
        group.MapDelete("/profile/authorized-users/{authorizedUserId:guid}", RemoveAuthorizedUser);

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
        IEventBus bus,
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

        if (row.Bid.Status == BidStatus.Accepted)
            return Results.BadRequest("Accepted bids cannot be withdrawn.");

        if (row.JobStatus != JobStatus.Open)
            return Results.BadRequest("Bids can only be withdrawn while the job is open.");

        if (row.Bid.Status == BidStatus.Withdrawn)
            return Results.BadRequest("Bid is already withdrawn.");

        row.Bid.Status = BidStatus.Withdrawn;
        row.Bid.IsAccepted = false;
        await db.SaveChangesAsync();

        await bus.PublishAsync(new BidWithdrawn(row.Bid.Id, row.Bid.JobId, row.Bid.BidderUserId, DateTimeOffset.UtcNow));

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
            Status: r.Status.ToString(),
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
                Status = b.Status,
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

        var profileId = await ContractorAuthz.GetContractorProfileIdForBiddingAsync(db, userId);
        if (profileId is null) return Results.NotFound();

        var p = await db.ContractorProfiles.AsNoTracking()
            .FirstOrDefaultAsync(x => x.UserId == profileId.Value);

        if (p is null) return Results.NotFound();

        // Load without projecting geography Y/X in SQL (ST_Y(geography) not supported in PostGIS)
        var serviceAreaRows = await db.ContractorServiceAreas.AsNoTracking()
            .Where(sa => sa.ContractorProfileId == profileId.Value)
            .OrderBy(sa => sa.SortOrder)
            .Select(sa => new { sa.Center, sa.RadiusMeters, sa.Label, sa.Zip })
            .ToListAsync();
        var serviceAreas = serviceAreaRows.Select(sa => new ServiceAreaItem(sa.Center.Y, sa.Center.X, sa.RadiusMeters, sa.Label, sa.Zip)).ToList();

        return Results.Ok(BuildProfileResponse(p, serviceAreas));
    }

    private static ContractorProfileResponse BuildProfileResponse(ContractorProfile p, List<ServiceAreaItem> serviceAreas)
    {
        return new ContractorProfileResponse(
            p.DisplayName,
            SplitTrades(p.TradesCsv),
            p.City,
            p.State,
            p.Zip,
            p.HomeBase.Y,
            p.HomeBase.X,
            p.ServiceRadiusMeters,
            serviceAreas.Count > 0 ? serviceAreas.ToArray() : new[] { new ServiceAreaItem(p.HomeBase.Y, p.HomeBase.X, p.ServiceRadiusMeters, "Primary", p.Zip) },
            p.IsAvailable,
            p.UnavailableReason,
            p.UpdatedAt
        );
    }

    private static async Task<IResult> UpsertProfile(AppDbContext db, ClaimsPrincipal user, UpsertContractorProfileRequest req, GeoNamesZipLookup lookup)
    {
        var userId = CurrentUser.GetUserId(user);

        // Only the profile owner can create or update the profile (Phase 1: no admin role).
        var ownedProfileId = await db.ContractorProfiles.AsNoTracking()
            .Where(p => p.UserId == userId)
            .Select(p => p.UserId)
            .FirstOrDefaultAsync();
        if (ownedProfileId == default && await db.ContractorAuthorizedUsers.AsNoTracking().AnyAsync(a => a.UserId == userId))
            return Results.BadRequest("Only the profile owner can edit the profile. You are an authorized user.");

        if (string.IsNullOrWhiteSpace(req.DisplayName))
            return Results.BadRequest("DisplayName is required.");

        if (string.IsNullOrWhiteSpace(req.Zip))
            return Results.BadRequest("Zip is required.");

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

        List<ServiceAreaItem> areasToSave;
        if (req.ServiceAreas is { Length: > 0 })
        {
            areasToSave = new List<ServiceAreaItem>();
            foreach (var a in req.ServiceAreas)
            {
                if (string.IsNullOrWhiteSpace(a.Zip))
                    return Results.BadRequest("Each service area must have a Zip code.");
                if (a.RadiusMeters <= 0)
                    return Results.BadRequest("Each service area must have RadiusMeters > 0.");
                var areaLookup = lookup.Lookup(a.Zip.Trim());
                if (areaLookup == null)
                    return Results.BadRequest($"Zip code not found: {a.Zip.Trim()}.");
                areasToSave.Add(new ServiceAreaItem(areaLookup.Lat, areaLookup.Lng, a.RadiusMeters, string.IsNullOrWhiteSpace(a.Label) ? null : a.Label.Trim(), a.Zip.Trim()));
            }
        }
        else
        {
            if (req.ServiceRadiusMeters <= 0)
                return Results.BadRequest("ServiceRadiusMeters must be > 0.");
            areasToSave = new List<ServiceAreaItem> { new ServiceAreaItem(lat, lng, req.ServiceRadiusMeters, "Primary", zip) };
        }

        var existing = await db.ContractorProfiles.FirstOrDefaultAsync(x => x.UserId == userId);

        var requestedAvailability = req.IsAvailable;
        var normalizedReason = string.IsNullOrWhiteSpace(req.UnavailableReason)
            ? null
            : req.UnavailableReason.Trim();
        var resolvedAvailability = requestedAvailability ?? existing?.IsAvailable ?? true;
        var resolvedReason = resolvedAvailability ? null : normalizedReason;

        var primary = areasToSave[0];
        var homeBase = new Point(primary.Lng, primary.Lat) { SRID = 4326 };

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
                HomeBase = homeBase,
                ServiceRadiusMeters = primary.RadiusMeters,
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
            existing.HomeBase = homeBase;
            existing.ServiceRadiusMeters = primary.RadiusMeters;
            existing.IsAvailable = resolvedAvailability;
            existing.UnavailableReason = resolvedReason;
            existing.UpdatedAt = DateTimeOffset.UtcNow;
        }

        var existingAreas = await db.ContractorServiceAreas
            .Where(sa => sa.ContractorProfileId == userId)
            .ToListAsync();
        db.ContractorServiceAreas.RemoveRange(existingAreas);

        for (var i = 0; i < areasToSave.Count; i++)
        {
            var a = areasToSave[i];
            db.ContractorServiceAreas.Add(new ContractorServiceArea
            {
                Id = Guid.NewGuid(),
                ContractorProfileId = userId,
                Center = new Point(a.Lng, a.Lat) { SRID = 4326 },
                RadiusMeters = a.RadiusMeters,
                Label = string.IsNullOrWhiteSpace(a.Label) ? null : a.Label.Trim(),
                Zip = a.Zip,
                SortOrder = i
            });
        }

        await db.SaveChangesAsync();

        return Results.Ok(BuildProfileResponse(existing, areasToSave));
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

        // Load without projecting geography Y/X in SQL (ST_Y(geography) not supported in PostGIS)
        var serviceAreaRows = await db.ContractorServiceAreas.AsNoTracking()
            .Where(sa => sa.ContractorProfileId == userId)
            .OrderBy(sa => sa.SortOrder)
            .Select(sa => new { sa.Center, sa.RadiusMeters, sa.Label, sa.Zip })
            .ToListAsync();
        var serviceAreas = serviceAreaRows.Select(sa => new ServiceAreaItem(sa.Center.Y, sa.Center.X, sa.RadiusMeters, sa.Label, sa.Zip)).ToList();

        return Results.Ok(BuildProfileResponse(profile, serviceAreas));
    }

    private static async Task<IResult> ListAuthorizedUsers(AppDbContext db, ClaimsPrincipal user)
    {
        var userId = CurrentUser.GetUserId(user);

        var ownedProfile = await db.ContractorProfiles.AsNoTracking()
            .Where(p => p.UserId == userId)
            .Select(p => p.UserId)
            .FirstOrDefaultAsync();
        if (ownedProfile == default)
            return Results.Forbid();

        var authorized = await db.ContractorAuthorizedUsers.AsNoTracking()
            .Where(a => a.ContractorProfileId == userId)
            .Join(db.Users.AsNoTracking(),
                a => a.UserId,
                u => u.Id,
                (a, u) => new AuthorizedUserItem(u.Id, u.Email ?? ""))
            .ToListAsync();

        return Results.Ok(authorized);
    }

    private static async Task<IResult> AddAuthorizedUser(
        AppDbContext db,
        UserManager<AppUser> userManager,
        ClaimsPrincipal user,
        AddAuthorizedUserRequest req)
    {
        var userId = CurrentUser.GetUserId(user);

        var ownedProfile = await db.ContractorProfiles.AsNoTracking()
            .Where(p => p.UserId == userId)
            .Select(p => p.UserId)
            .FirstOrDefaultAsync();
        if (ownedProfile == default)
            return Results.Forbid();

        var email = (req.Email ?? "").Trim();
        if (string.IsNullOrWhiteSpace(email))
            return Results.BadRequest("Email is required.");

        var targetUser = await userManager.FindByEmailAsync(email);
        if (targetUser is null)
            return Results.BadRequest("No account found with that email. The person must sign up first.");

        if (targetUser.Id == userId)
            return Results.BadRequest("You cannot add yourself as an authorized user.");

        var exists = await db.ContractorAuthorizedUsers
            .AnyAsync(a => a.ContractorProfileId == userId && a.UserId == targetUser.Id);
        if (exists)
            return Results.BadRequest("That user is already authorized.");

        db.ContractorAuthorizedUsers.Add(new ContractorAuthorizedUser
        {
            ContractorProfileId = userId,
            UserId = targetUser.Id,
        });
        await db.SaveChangesAsync();

        var list = await db.ContractorAuthorizedUsers.AsNoTracking()
            .Where(a => a.ContractorProfileId == userId)
            .Join(db.Users.AsNoTracking(),
                a => a.UserId,
                u => u.Id,
                (a, u) => new AuthorizedUserItem(u.Id, u.Email ?? ""))
            .ToListAsync();

        return Results.Ok(list);
    }

    private static async Task<IResult> RemoveAuthorizedUser(
        AppDbContext db,
        ClaimsPrincipal user,
        Guid authorizedUserId)
    {
        var userId = CurrentUser.GetUserId(user);

        var ownedProfile = await db.ContractorProfiles.AsNoTracking()
            .Where(p => p.UserId == userId)
            .Select(p => p.UserId)
            .FirstOrDefaultAsync();
        if (ownedProfile == default)
            return Results.Forbid();

        var deleted = await db.ContractorAuthorizedUsers
            .Where(a => a.ContractorProfileId == userId && a.UserId == authorizedUserId)
            .ExecuteDeleteAsync();

        if (deleted == 0)
            return Results.NotFound("Authorized user not found.");

        return Results.NoContent();
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

        var profileId = await ContractorAuthz.GetContractorProfileIdForBiddingAsync(db, userId);
        if (profileId is null)
            return Results.BadRequest("Create your contractor profile to get recommended jobs.");

        var profile = await db.ContractorProfiles.AsNoTracking()
            .Where(p => p.UserId == profileId.Value)
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

        var hasServiceAreas = await db.ContractorServiceAreas.AnyAsync(sa => sa.ContractorProfileId == profileId.Value);

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

        IQueryable<RecommendedJobProjection> projected;
        if (hasServiceAreas)
        {
            var pid = profileId.Value;
            projected = jobs
                .Where(j => db.ContractorServiceAreas.Any(sa =>
                    sa.ContractorProfileId == pid && j.SiteLocation.Distance(sa.Center) <= sa.RadiusMeters))
                .Select(j => new RecommendedJobProjection
                {
                    Id = j.Id,
                    Title = j.Title,
                    Trade = j.Trade,
                    Status = j.Status,
                    CreatedAt = j.CreatedAt,
                    City = j.City,
                    State = j.State,
                    Zip = j.Zip,
                    AcceptedBidId = j.AcceptedBidId,
                    CompletedAt = j.CompletedAt,
                    SiteLocation = j.SiteLocation,
                    DistanceMeters = db.ContractorServiceAreas
                        .Where(sa => sa.ContractorProfileId == pid)
                        .Min(sa => j.SiteLocation.Distance(sa.Center)),
                    HasBidByMe = db.Bids.Any(b => b.JobId == j.Id && b.BidderUserId == userId)
                });
        }
        else
        {
            var homeBase = profile.HomeBase;
            var effectiveMaxDistance = profile.ServiceRadiusMeters;
            if (maxDistanceMeters is > 0)
                effectiveMaxDistance = Math.Min(effectiveMaxDistance, maxDistanceMeters.Value);

            projected = jobs
                .Select(j => new RecommendedJobProjection
                {
                    Id = j.Id,
                    Title = j.Title,
                    Trade = j.Trade,
                    Status = j.Status,
                    CreatedAt = j.CreatedAt,
                    City = j.City,
                    State = j.State,
                    Zip = j.Zip,
                    AcceptedBidId = j.AcceptedBidId,
                    CompletedAt = j.CompletedAt,
                    SiteLocation = j.SiteLocation,
                    DistanceMeters = j.SiteLocation.Distance(homeBase),
                    HasBidByMe = db.Bids.Any(b => b.JobId == j.Id && b.BidderUserId == userId)
                })
                .Where(x => x.DistanceMeters <= effectiveMaxDistance);
        }

        if (maxDistanceMeters is > 0 && hasServiceAreas)
            projected = projected.Where(x => x.DistanceMeters <= maxDistanceMeters!.Value);

        var total = await projected.CountAsync();

        var sortKey = (sort ?? "").Trim().ToLowerInvariant();
        var ordered = sortKey switch
        {
            "newest" => projected.OrderByDescending(x => x.CreatedAt).ThenBy(x => x.DistanceMeters),
            "oldest" => projected.OrderBy(x => x.CreatedAt).ThenBy(x => x.DistanceMeters),
            _ => projected.OrderBy(x => x.DistanceMeters).ThenByDescending(x => x.CreatedAt)
        };

        var rows = await ordered.Skip(skip).Take(take).ToListAsync();

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

    private sealed class RecommendedJobProjection
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = "";
        public string Trade { get; set; } = "";
        public JobStatus Status { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
        public string? City { get; set; }
        public string? State { get; set; }
        public string? Zip { get; set; }
        public Guid? AcceptedBidId { get; set; }
        public DateTimeOffset? CompletedAt { get; set; }
        public Point SiteLocation { get; set; } = default!;
        public double DistanceMeters { get; set; }
        public bool HasBidByMe { get; set; }
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
        public BidStatus Status { get; set; }
        public DateTimeOffset BidCreatedAt { get; set; }

        public string Title { get; set; } = "";
        public string Trade { get; set; } = "";
        public JobStatus JobStatus { get; set; }
        public DateTimeOffset JobCreatedAt { get; set; }
        public Guid PostedByUserId { get; set; }
    }
}
