namespace BuilderPulsePro.Api.Notifications;

public record EmailMessage(string To, string Subject, string Body);

public interface IEmailSender
{
    Task SendAsync(EmailMessage message, CancellationToken ct = default);
}

public interface IEmailStore
{
    EmailMessage? LatestMessage { get; }
}
