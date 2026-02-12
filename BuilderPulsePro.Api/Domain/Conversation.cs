namespace BuilderPulsePro.Api.Domain;

public class Conversation
{
    public Guid Id { get; set; }
    public Guid JobId { get; set; }
    public Guid ClientUserId { get; set; }
    public Guid ContractorProfileId { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
