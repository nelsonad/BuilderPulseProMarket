namespace BuilderPulsePro.Api.Contracts;

public record ActivityEventResponse(
    Guid Id,
    string Type,
    Guid? JobId,
    Guid? BidId,
    Guid? ActorUserId,
    DateTimeOffset OccurredAt,
    string? PayloadJson
);
