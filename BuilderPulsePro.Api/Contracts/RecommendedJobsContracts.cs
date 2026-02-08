namespace BuilderPulsePro.Api.Contracts;

public record RecommendedJobResponse(
    Guid Id,
    string Title,
    string Trade,
    string Status,
    DateTimeOffset CreatedAt,
    double Lat,
    double Lng,
    Guid? AcceptedBidId,
    DateTimeOffset? CompletedAt,
    double DistanceMeters,
    bool HasBidByMe
);
