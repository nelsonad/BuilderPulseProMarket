namespace BuilderPulsePro.Api.Contracts;

public record CreateReviewRequest(
    int Rating,
    string? Body
);

public record ReviewResponse(
    Guid ReviewId,
    Guid JobId,
    Guid ReviewerUserId,
    Guid RevieweeUserId,
    int Rating,
    string? Body,
    DateTimeOffset CreatedAt
);
