namespace BuilderPulsePro.Api.Contracts;

public record SendJobMessageRequest(string Body);

public record JobMessageResponse(
    Guid MessageId,
    Guid JobId,
    Guid SenderUserId,
    string Body,
    DateTimeOffset CreatedAt
);
