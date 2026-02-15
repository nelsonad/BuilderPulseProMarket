namespace BuilderPulsePro.Api.Contracts;

/// <summary>Service area in API responses (center resolved from zip at save time).</summary>
public record ServiceAreaItem(double Lat, double Lng, int RadiusMeters, string? Label, string? Zip);

/// <summary>Service area in upsert requests: zip is looked up to get lat/lng (same pattern as main location).</summary>
public record ServiceAreaRequestItem(string Zip, int RadiusMeters, string? Label);

public record ContractorProfileResponse(
    string DisplayName,
    string[] Trades,
    string? City,
    string? State,
    string? Zip,
    double Lat,
    double Lng,
    int ServiceRadiusMeters,
    ServiceAreaItem[] ServiceAreas,
    bool IsAvailable,
    string? UnavailableReason,
    DateTimeOffset UpdatedAt
);

public record UpsertContractorProfileRequest(
    string DisplayName,
    string[] Trades,
    string? City,
    string? State,
    string? Zip,
    double Lat,
    double Lng,
    int ServiceRadiusMeters,
    ServiceAreaRequestItem[]? ServiceAreas,
    bool? IsAvailable,
    string? UnavailableReason
);

public record UpdateContractorAvailabilityRequest(
    bool IsAvailable,
    string? UnavailableReason
);

/// <summary>An authorized user who can act on behalf of the contractor profile.</summary>
public record AuthorizedUserItem(Guid UserId, string Email);

/// <summary>Request to add an authorized user by email (user must already have an account).</summary>
public record AddAuthorizedUserRequest(string Email);
