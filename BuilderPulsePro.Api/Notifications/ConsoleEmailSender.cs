using Microsoft.Extensions.Logging;

namespace BuilderPulsePro.Api.Notifications;

public sealed class ConsoleEmailSender(ILogger<ConsoleEmailSender> log) : IEmailSender
{
    public Task SendAsync(EmailMessage message, CancellationToken ct = default)
    {
        log.LogInformation(
            """
            === EMAIL (Console) ===
            To: {To}
            Subject: {Subject}
            Body:
            {Body}
            =======================
            """,
            message.To, message.Subject, message.Body);

        return Task.CompletedTask;
    }
}
