namespace BuilderPulsePro.Api.Notifications;

public sealed class JobDigestOptions
{
    public int IntervalMinutes { get; set; } = 30;
    public int MinIntervalMinutes { get; set; } = 30;
}
