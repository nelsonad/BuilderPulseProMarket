namespace BuilderPulsePro.Api.Domain;

public class BidAttachment
{
    public Guid BidId { get; set; }
    public Guid AttachmentId { get; set; }
    public Attachment Attachment { get; set; } = default!;
}
