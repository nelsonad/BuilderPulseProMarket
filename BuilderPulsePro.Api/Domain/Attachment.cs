namespace BuilderPulsePro.Api.Domain;

public class Attachment
{
    public Guid Id { get; set; }
    public string FileName { get; set; } = "";
    public string ContentType { get; set; } = "";
    public long SizeBytes { get; set; }
    public string StorageProvider { get; set; } = "";
    public string StorageKey { get; set; } = "";
    public string? StorageUrl { get; set; }
    public byte[]? Content { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
