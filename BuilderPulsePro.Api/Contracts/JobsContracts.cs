namespace BuilderPulsePro.Api.Contracts;

public record CreateJobRequest(
    string Title,
    string Trade,
    string? Description,
    string? City,
    string? State,
    string? Zip,
    double Lat,
    double Lng
);

public record UpdateJobRequest(
    string Title,
    string Trade,
    string? Description,
    string? City,
    string? State,
    string? Zip,
    double Lat,
    double Lng
);

public record JobResponse(
    Guid Id,
    string Title,
    string Trade,
    string? Description,
    string Status,
    DateTimeOffset CreatedAt,
    string? City,
    string? State,
    string? Zip,
    double Lat,
    double Lng,
    Guid? AcceptedBidId,
    DateTimeOffset? CompletedAt
);

public record JobAttachmentResponse(
    Guid Id,
    Guid JobId,
    string FileName,
    string ContentType,
    long SizeBytes,
    string? Url,
    DateTimeOffset CreatedAt
);
