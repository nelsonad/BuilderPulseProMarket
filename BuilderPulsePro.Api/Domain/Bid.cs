namespace BuilderPulsePro.Api.Domain;

public class Bid
{
    public Guid Id { get; set; }

    public Guid JobId { get; set; }
    public Job Job { get; set; } = default!;

    // NEW: the authenticated user placing the bid
    public Guid BidderUserId { get; set; }

    public Guid ContractorProfileId { get; set; }

    public long AmountCents { get; set; }
    public DateTimeOffset? EarliestStart { get; set; }
    public int? DurationDays { get; set; }
    public string Notes { get; set; } = "";
    public DateTimeOffset? ValidUntil { get; set; }
    public string? Terms { get; set; }
    public string? Assumptions { get; set; }

    public bool IsAccepted { get; set; }
    public BidStatus Status { get; set; } = BidStatus.Submitted;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
