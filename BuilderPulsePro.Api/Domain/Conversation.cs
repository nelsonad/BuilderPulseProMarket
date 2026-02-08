namespace BuilderPulsePro.Api.Domain;

public class Conversation
{
    public Guid Id { get; set; }
    public Guid JobId { get; set; }
    public Guid PosterUserId { get; set; }
    public Guid ContractorUserId { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
