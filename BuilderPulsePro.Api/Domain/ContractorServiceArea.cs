using NetTopologySuite.Geometries;

namespace BuilderPulsePro.Api.Domain;

/// <summary>
/// A geographic area (center + radius) that a contractor serves.
/// A profile can have multiple service areas (e.g. Denver metro, Boulder, Colorado Springs).
/// </summary>
public class ContractorServiceArea
{
    public Guid Id { get; set; }

    /// <summary>FK to ContractorProfile (UserId).</summary>
    public Guid ContractorProfileId { get; set; }

    public Point Center { get; set; } = default!; // geography(point)
    public int RadiusMeters { get; set; }

    /// <summary>Optional label, e.g. "Denver metro", "Boulder".</summary>
    public string? Label { get; set; }

    /// <summary>Zip code used to resolve Center (same pattern as main profile location).</summary>
    public string? Zip { get; set; }

    public int SortOrder { get; set; }
}
