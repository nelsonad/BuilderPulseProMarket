namespace BuilderPulsePro.Api.Domain;

public class ActivityEvent
{
    public Guid Id { get; set; }

    public Guid? JobId { get; set; }
    public Guid? BidId { get; set; }
    public Guid? ActorUserId { get; set; }

    public string Type { get; set; } = "";
    public DateTimeOffset OccurredAt { get; set; }
    public string? PayloadJson { get; set; }
}
