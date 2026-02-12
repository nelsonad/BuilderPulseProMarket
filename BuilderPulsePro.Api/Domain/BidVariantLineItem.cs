namespace BuilderPulsePro.Api.Domain;

public class BidVariantLineItem
{
    public Guid Id { get; set; }
    public Guid BidVariantId { get; set; }
    public BidVariant BidVariant { get; set; } = default!;
    public string Description { get; set; } = "";
    public int Quantity { get; set; }
    public long UnitPriceCents { get; set; }
    public int SortOrder { get; set; }
}
