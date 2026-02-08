namespace BuilderPulsePro.Api.Contracts;

public record ContractorProfileResponse(
    string DisplayName,
    string[] Trades,
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
    double Lat,
    double Lng,
    int ServiceRadiusMeters
);

public record UpdateContractorAvailabilityRequest(
    bool IsAvailable,
    string? UnavailableReason
);
