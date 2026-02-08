namespace BuilderPulsePro.Api.Contracts;

public record MyBidJobInfo(
    Guid JobId,
    string Title,
    string Trade,
    string Status,
    DateTimeOffset JobCreatedAt,
    Guid PostedByUserId
);

public record MyBidResponse(
    Guid BidId,
    long AmountCents,
    DateTimeOffset? EarliestStart,
    int? DurationDays,
    string Notes,
    bool IsAccepted,
    DateTimeOffset BidCreatedAt,
    MyBidJobInfo Job
);
