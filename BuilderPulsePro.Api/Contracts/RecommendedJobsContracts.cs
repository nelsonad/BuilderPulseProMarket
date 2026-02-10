namespace BuilderPulsePro.Api.Contracts;

public record RecommendedJobResponse(
    Guid Id,
    string Title,
    string Trade,
    string Status,
    DateTimeOffset CreatedAt,
    string? City,
    string? State,
    string? Zip,
    double Lat,
    double Lng,
    Guid? AcceptedBidId,
    DateTimeOffset? CompletedAt,
    double DistanceMeters,
    bool HasBidByMe
);
