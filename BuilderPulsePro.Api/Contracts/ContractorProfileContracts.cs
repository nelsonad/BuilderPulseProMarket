namespace BuilderPulsePro.Api.Contracts;

public record ContractorProfileResponse(
    string DisplayName,
    string[] Trades,
    string? City,
    string? State,
    string? Zip,
    double Lat,
    double Lng,
    int ServiceRadiusMeters,
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
    bool? IsAvailable,
    string? UnavailableReason
);

public record UpdateContractorAvailabilityRequest(
    bool IsAvailable,
    string? UnavailableReason
);
