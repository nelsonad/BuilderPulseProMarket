using BuilderPulsePro.Api.Contracts;
using BuilderPulsePro.Api.Data;
using BuilderPulsePro.Api.Domain;
using BuilderPulsePro.Api.Hubs;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.SignalR;
using System.Text.Json;

namespace BuilderPulsePro.Api.Bids;

public enum BidAttachmentParseStatus
{
    Pending = 0,
    Processing = 1,
    Completed = 2,
    Failed = 3,
    Skipped = 4
}

public interface IBidAttachmentParser
{
    Task<BidAttachmentParseResult?> ParseAsync(Attachment attachment, CancellationToken ct);
}

public sealed class NoOpBidAttachmentParser : IBidAttachmentParser
{
    public Task<BidAttachmentParseResult?> ParseAsync(Attachment attachment, CancellationToken ct)
        => Task.FromResult<BidAttachmentParseResult?>(null);
}

public static class BidAttachmentParsingSerializer
{
    private static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web);

    public static string SerializeResult(BidAttachmentParseResult result)
        => JsonSerializer.Serialize(result, Options);

    public static BidAttachmentParseResult DeserializeResult(string json)
        => JsonSerializer.Deserialize<BidAttachmentParseResult>(json, Options)
           ?? new BidAttachmentParseResult(
               null,
               null,
               null,
               null,
               null,
               null,
               null,
               Array.Empty<BidVariantResponse>());
}

public sealed class BidAttachmentParseWorker(
    IServiceScopeFactory scopeFactory,
    IBidAttachmentParser parser,
    IHubContext<BidProcessingHub> hubContext,
    ILogger<BidAttachmentParseWorker> logger)
    : BackgroundService
{
    private static readonly TimeSpan PollDelay = TimeSpan.FromSeconds(5);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessNextJob(stoppingToken);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed while processing bid attachment parse jobs.");
                await Task.Delay(PollDelay, stoppingToken);
            }
        }
    }

    private async Task ProcessNextJob(CancellationToken ct)
    {
        await using var scope = scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var job = await db.BidAttachmentParseJobs
            .OrderBy(j => j.CreatedAt)
            .FirstOrDefaultAsync(j => j.Status == BidAttachmentParseStatus.Pending, ct);

        if (job is null)
        {
            await Task.Delay(PollDelay, ct);
            return;
        }

        job.Status = BidAttachmentParseStatus.Processing;
        job.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);

        await NotifyJobUpdateAsync(job, ct);

        var attachment = await db.Attachments.AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == job.AttachmentId, ct);

        if (attachment is null)
        {
            await UpdateJobStatusAsync(db, job, BidAttachmentParseStatus.Failed, "Attachment not found.", ct);
            return;
        }

        if (attachment.Content is null && string.IsNullOrWhiteSpace(attachment.StorageUrl))
        {
            await UpdateJobStatusAsync(db, job, BidAttachmentParseStatus.Skipped,
                "Attachment content is not available for parsing.", ct);
            return;
        }

        BidAttachmentParseResult? result = null;

        try
        {
            result = await parser.ParseAsync(attachment, ct);
        }
        catch (Exception ex)
        {
            await UpdateJobStatusAsync(db, job, BidAttachmentParseStatus.Failed, ex.Message, ct);
            return;
        }

        if (result is null)
        {
            await UpdateJobStatusAsync(db, job, BidAttachmentParseStatus.Skipped,
                "No parser configured for bid attachments.", ct);
            return;
        }

        job.Status = BidAttachmentParseStatus.Completed;
        job.ResultJson = BidAttachmentParsingSerializer.SerializeResult(result);
        job.ErrorMessage = null;
        job.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);

        await NotifyJobUpdateAsync(job, ct);
    }

    private async Task UpdateJobStatusAsync(
        AppDbContext db,
        BidAttachmentParseJob job,
        BidAttachmentParseStatus status,
        string error,
        CancellationToken ct)
    {
        job.Status = status;
        job.ErrorMessage = error;
        job.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);

        await NotifyJobUpdateAsync(job, ct);
    }

    private Task NotifyJobUpdateAsync(BidAttachmentParseJob job, CancellationToken ct)
    {
        var response = BidAttachmentParseMapper.ToResponse(job);
        return hubContext.Clients.Group(BidProcessingHub.BuildBidGroup(job.BidId))
            .SendAsync("bidAttachmentParseUpdated", response, ct);
    }
}
