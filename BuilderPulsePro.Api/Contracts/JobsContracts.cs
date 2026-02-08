namespace BuilderPulsePro.Api.Contracts;

public record CreateJobRequest(
    string Title,
    string Trade,
    double Lat,
    double Lng
);

public record JobResponse(
    Guid Id,
    string Title,
    string Trade,
    string Status,
    DateTimeOffset CreatedAt,
    double Lat,
    double Lng,
    Guid? AcceptedBidId,
    DateTimeOffset? CompletedAt
);
