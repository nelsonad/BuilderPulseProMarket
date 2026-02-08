namespace BuilderPulsePro.Api.Domain;

public class ContractorJobNotification
{
    public Guid Id { get; set; }

    public Guid ContractorUserId { get; set; }
    public Guid JobId { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public DateTimeOffset? SentAt { get; set; }
}
