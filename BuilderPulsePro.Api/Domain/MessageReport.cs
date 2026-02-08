namespace BuilderPulsePro.Api.Domain;

public class MessageReport
{
    public Guid Id { get; set; }
    public Guid MessageId { get; set; }
    public Guid ReporterUserId { get; set; }
    public string Reason { get; set; } = "";
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public DateTimeOffset? ResolvedAt { get; set; }
    public Guid? ResolvedByUserId { get; set; }
}
