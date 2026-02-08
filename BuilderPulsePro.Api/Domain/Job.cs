using NetTopologySuite.Geometries;

namespace BuilderPulsePro.Api.Domain;

public enum JobStatus
{
    Open = 0,
    Awarded = 1,
    Completed = 2,
    Cancelled = 3
}

public class Job
{
    public Guid Id { get; set; }
    public string Title { get; set; } = "";
    public string Trade { get; set; } = "";

    public Point SiteLocation { get; set; } = default!;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public JobStatus Status { get; set; } = JobStatus.Open;

    public Guid? AcceptedBidId { get; set; }

    public Guid PostedByUserId { get; set; }

    public DateTimeOffset? CompletedAt { get; set; }
}
