namespace BuilderPulsePro.Api.Contracts;

public record CreateBidRequest(
    long AmountCents,
    DateTimeOffset? EarliestStart,
    int? DurationDays,
    string? Notes,
    DateTimeOffset? ValidUntil,
    string? Terms,
    string? Assumptions,
    IReadOnlyList<BidLineItemRequest>? LineItems,
    IReadOnlyList<BidVariantRequest>? Variants
);

public record UpdateBidRequest(
    long AmountCents,
    DateTimeOffset? EarliestStart,
    int? DurationDays,
    string? Notes,
    DateTimeOffset? ValidUntil,
    string? Terms,
    string? Assumptions,
    IReadOnlyList<BidLineItemRequest>? LineItems,
    IReadOnlyList<BidVariantRequest>? Variants
);

public record BidResponse(
    Guid Id,
    Guid JobId,
    Guid ContractorProfileId,
    long AmountCents,
    DateTimeOffset? EarliestStart,
    int? DurationDays,
    string Notes,
    DateTimeOffset? ValidUntil,
    string? Terms,
    string? Assumptions,
    bool IsAccepted,
    string Status,
    DateTimeOffset CreatedAt,
    IReadOnlyList<BidLineItemResponse> LineItems,
    IReadOnlyList<BidVariantResponse> Variants
);

public record BidLineItemRequest(
    string Description,
    int Quantity,
    long UnitPriceCents
);

public record BidLineItemResponse(
    Guid Id,
    Guid BidId,
    string Description,
    int Quantity,
    long UnitPriceCents,
    long TotalCents,
    int SortOrder
);

public record BidVariantRequest(
    string Name,
    long AmountCents,
    string? Notes,
    IReadOnlyList<BidVariantLineItemRequest>? LineItems
);

public record BidVariantResponse(
    Guid Id,
    Guid BidId,
    string Name,
    long AmountCents,
    string? Notes,
    int SortOrder,
    IReadOnlyList<BidVariantLineItemResponse> LineItems
);

public record BidVariantLineItemRequest(
    string Description,
    int Quantity,
    long UnitPriceCents
);

public record BidVariantLineItemResponse(
    Guid Id,
    Guid BidVariantId,
    string Description,
    int Quantity,
    long UnitPriceCents,
    long TotalCents,
    int SortOrder
);

public record BidRevisionResponse(
    Guid Id,
    Guid BidId,
    int RevisionNumber,
    Guid CreatedByUserId,
    DateTimeOffset CreatedAt,
    long AmountCents,
    DateTimeOffset? EarliestStart,
    int? DurationDays,
    string Notes,
    DateTimeOffset? ValidUntil,
    string? Terms,
    string? Assumptions,
    IReadOnlyList<BidLineItemResponse> LineItems,
    IReadOnlyList<BidVariantResponse> Variants
);

public record BidAttachmentParseResult(
    long? AmountCents,
    DateTimeOffset? EarliestStart,
    int? DurationDays,
    DateTimeOffset? ValidUntil,
    string? Terms,
    string? Assumptions,
    IReadOnlyList<BidLineItemResponse> LineItems,
    IReadOnlyList<BidVariantResponse> Variants
);

public record BidAttachmentParseResponse(
    Guid Id,
    Guid BidId,
    Guid AttachmentId,
    BuilderPulsePro.Api.Bids.BidAttachmentParseStatus Status,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    string? ErrorMessage,
    BidAttachmentParseResult? Result
);

public record BidAttachmentResponse(
    Guid Id,
    Guid BidId,
    string FileName,
    string ContentType,
    long SizeBytes,
    string? Url,
    DateTimeOffset CreatedAt
);
