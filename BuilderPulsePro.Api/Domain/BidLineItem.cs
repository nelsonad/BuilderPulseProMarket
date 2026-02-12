namespace BuilderPulsePro.Api.Domain;

public class BidLineItem
{
    public Guid Id { get; set; }
    public Guid BidId { get; set; }
    public Bid Bid { get; set; } = default!;
    public string Description { get; set; } = "";
    public int Quantity { get; set; }
    public long UnitPriceCents { get; set; }
    public int SortOrder { get; set; }
}
