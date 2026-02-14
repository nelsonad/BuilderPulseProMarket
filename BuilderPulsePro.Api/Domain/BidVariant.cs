namespace BuilderPulsePro.Api.Domain;

public class BidVariant
{
    public Guid Id { get; set; }
    public Guid BidId { get; set; }
    public Bid Bid { get; set; } = default!;
    public string Name { get; set; } = "";
    public string? Notes { get; set; }
    public long AmountCents { get; set; }
    public int SortOrder { get; set; }
}
