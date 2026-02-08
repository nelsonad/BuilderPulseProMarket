namespace BuilderPulsePro.Api.Domain;

public class Message
{
    public Guid Id { get; set; }
    public Guid ConversationId { get; set; }
    public Guid SenderUserId { get; set; }
    public string Body { get; set; } = "";
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
