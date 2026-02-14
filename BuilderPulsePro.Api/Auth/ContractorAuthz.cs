using BuilderPulsePro.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace BuilderPulsePro.Api.Auth;

/// <summary>
/// Authorization helpers for contractor profile access. A user can "act for" a profile if they are
/// the profile owner (ContractorProfile.UserId) or listed in ContractorAuthorizedUsers.
/// </summary>
public static class ContractorAuthz
{
    /// <summary>
    /// Returns true if the user is the profile owner or an authorized user for the given contractor profile.
    /// </summary>
    public static async Task<bool> CanActForContractorProfileAsync(
        AppDbContext db,
        Guid userId,
        Guid contractorProfileId,
        CancellationToken ct = default)
    {
        if (userId == contractorProfileId)
            return true;

        return await db.ContractorAuthorizedUsers.AsNoTracking()
            .AnyAsync(a => a.ContractorProfileId == contractorProfileId && a.UserId == userId, ct);
    }

    /// <summary>
    /// Returns the contractor profile ID the user can use for bidding (owned profile preferred, else first authorized).
    /// </summary>
    public static async Task<Guid?> GetContractorProfileIdForBiddingAsync(
        AppDbContext db,
        Guid userId,
        CancellationToken ct = default)
    {
        var owned = await db.ContractorProfiles.AsNoTracking()
            .Where(p => p.UserId == userId)
            .Select(p => p.UserId)
            .FirstOrDefaultAsync(ct);

        if (owned != default)
            return owned;

        var authorizedId = await db.ContractorAuthorizedUsers.AsNoTracking()
            .Where(a => a.UserId == userId)
            .Select(a => a.ContractorProfileId)
            .FirstOrDefaultAsync(ct);
        return authorizedId != default ? authorizedId : null;
    }

    /// <summary>
    /// Returns all contractor profile IDs the user can act for (owner + authorized).
    /// </summary>
    public static async Task<List<Guid>> GetContractorProfileIdsForUserAsync(
        AppDbContext db,
        Guid userId,
        CancellationToken ct = default)
    {
        var owned = await db.ContractorProfiles.AsNoTracking()
            .Where(p => p.UserId == userId)
            .Select(p => p.UserId)
            .ToListAsync(ct);

        var authorized = await db.ContractorAuthorizedUsers.AsNoTracking()
            .Where(a => a.UserId == userId)
            .Select(a => a.ContractorProfileId)
            .ToListAsync(ct);

        return owned.Union(authorized).Distinct().ToList();
    }
}
