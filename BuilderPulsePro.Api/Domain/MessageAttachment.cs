namespace BuilderPulsePro.Api.Domain;

public class MessageAttachment
{
    public Guid MessageId { get; set; }
    public Guid AttachmentId { get; set; }
    public Attachment Attachment { get; set; } = default!;
}
