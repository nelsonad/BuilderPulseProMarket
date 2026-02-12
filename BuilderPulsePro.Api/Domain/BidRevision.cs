namespace BuilderPulsePro.Api.Domain;

public class BidRevision
{
    public Guid Id { get; set; }
    public Guid BidId { get; set; }
    public Bid Bid { get; set; } = default!;
    public int RevisionNumber { get; set; }
    public Guid CreatedByUserId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public string SnapshotJson { get; set; } = "";
}
