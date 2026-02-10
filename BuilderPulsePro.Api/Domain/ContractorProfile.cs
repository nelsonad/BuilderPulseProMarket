using NetTopologySuite.Geometries;

namespace BuilderPulsePro.Api.Domain;

public class ContractorProfile
{
    // 1:1 with AppUser
    public Guid UserId { get; set; }

    public string DisplayName { get; set; } = "";

    public string? City { get; set; }
    public string? State { get; set; }
    public string? Zip { get; set; }

    // MVP: comma-separated string like "Plumbing,Electrical"
    // Later: normalize into join table
    public string TradesCsv { get; set; } = "";

    public Point HomeBase { get; set; } = default!; // geography(point)
    public int ServiceRadiusMeters { get; set; } = 16093; // ~10 miles default

    public bool IsAvailable { get; set; } = true;
    public string? UnavailableReason { get; set; }
    public DateTimeOffset? LastDigestSentAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
