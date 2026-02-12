using BuilderPulsePro.Api.Bids;

namespace BuilderPulsePro.Api.Domain;

public class BidAttachmentParseJob
{
    public Guid Id { get; set; }
    public Guid BidId { get; set; }
    public Guid AttachmentId { get; set; }
    public BidAttachmentParseStatus Status { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public string? ErrorMessage { get; set; }
    public string? ResultJson { get; set; }
}
