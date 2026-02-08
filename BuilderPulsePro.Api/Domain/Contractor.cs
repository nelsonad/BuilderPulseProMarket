using NetTopologySuite.Geometries;

namespace BuilderPulsePro.Api.Domain;

public class Contractor
{
    public Guid Id { get; set; }
    public string DisplayName { get; set; } = "";

    // Store (lng, lat) with SRID 4326
    public Point HomeBase { get; set; } = default!;

    // e.g. 16093 for ~10 miles
    public int ServiceRadiusMeters { get; set; }
}
