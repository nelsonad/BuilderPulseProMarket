namespace BuilderPulsePro.Api.Contracts;

public record CreateBidRequest(
    long AmountCents,
    DateTimeOffset? EarliestStart,
    int? DurationDays,
    string? Notes
);

public record BidResponse(
    Guid Id,
    Guid JobId,
    string ContractorName,
    long AmountCents,
    DateTimeOffset? EarliestStart,
    int? DurationDays,
    string Notes,
    bool IsAccepted,
    DateTimeOffset CreatedAt
);
