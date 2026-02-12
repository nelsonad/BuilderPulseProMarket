namespace BuilderPulsePro.Api.Contracts;

public record SendConversationMessageRequest(string? Body);

public record ConversationSummaryResponse(
    Guid ConversationId,
    Guid JobId,
    Guid ContractorProfileId,
    string ContractorDisplayName,
    DateTimeOffset CreatedAt,
    DateTimeOffset? LastMessageAt,
    string? LastMessagePreview,
    int UnreadCount
);

public record MessageAttachmentResponse(
    Guid AttachmentId,
    string FileName,
    string ContentType,
    long SizeBytes,
    string? Url,
    DateTimeOffset CreatedAt
);

public record MessageResponse(
    Guid MessageId,
    Guid ConversationId,
    Guid JobId,
    Guid ClientUserId,
    Guid ContractorProfileId,
    Guid SenderUserId,
    Guid RecipientUserId,
    string Body,
    DateTimeOffset CreatedAt,
    DateTimeOffset? ReadAt,
    IReadOnlyList<MessageAttachmentResponse> Attachments
);

public record MarkConversationReadResponse(
    Guid ConversationId,
    Guid JobId,
    Guid ContractorProfileId,
    DateTimeOffset ReadAt,
    int UpdatedCount
);
