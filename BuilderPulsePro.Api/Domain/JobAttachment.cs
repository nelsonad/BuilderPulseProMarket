namespace BuilderPulsePro.Api.Domain;

public class JobAttachment
{
    public Guid JobId { get; set; }
    public Guid AttachmentId { get; set; }
    public Attachment Attachment { get; set; } = default!;
}
