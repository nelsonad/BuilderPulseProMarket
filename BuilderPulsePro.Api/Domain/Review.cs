namespace BuilderPulsePro.Api.Domain;

public class Review
{
    public Guid Id { get; set; }
    public Guid JobId { get; set; }
    public Guid ReviewerUserId { get; set; }
    public Guid RevieweeUserId { get; set; }
    public int Rating { get; set; }
    public string? Body { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
