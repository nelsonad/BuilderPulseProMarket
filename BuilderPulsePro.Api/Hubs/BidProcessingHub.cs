using BuilderPulsePro.Api.Auth;
using BuilderPulsePro.Api.Data;
using BuilderPulsePro.Api.Domain;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace BuilderPulsePro.Api.Hubs;

[Authorize]
public class BidProcessingHub(AppDbContext db) : Hub
{
    public async Task JoinBid(Guid jobId, Guid bidId)
    {
        var userId = CurrentUser.GetUserId(Context.User!);

        var access = await db.Bids.AsNoTracking()
            .Where(b => b.Id == bidId && b.JobId == jobId)
            .Join(db.Jobs.AsNoTracking(),
                b => b.JobId,
                j => j.Id,
                (b, j) => new
                {
                    b.Id,
                    b.BidderUserId,
                    b.IsAccepted,
                    b.Status,
                    j.PostedByUserId,
                    JobStatus = j.Status
                })
            .FirstOrDefaultAsync();

        if (access is null)
            throw new HubException("Bid not found.");

        if (!IsAuthorized(access.PostedByUserId, access.BidderUserId, access.Status, access.JobStatus, userId))
            throw new HubException("Not authorized for this bid.");

        await Groups.AddToGroupAsync(Context.ConnectionId, BuildBidGroup(access.Id));
        await Clients.Caller.SendAsync("bidJoined", access.Id);
    }

    public Task LeaveBid(Guid bidId)
        => Groups.RemoveFromGroupAsync(Context.ConnectionId, BuildBidGroup(bidId));

    public static string BuildBidGroup(Guid bidId)
        => $"bid:{bidId}";

    private static bool IsAuthorized(Guid postedByUserId, Guid bidderUserId, BidStatus bidStatus, JobStatus jobStatus, Guid userId)
    {
        if (userId == postedByUserId)
            return jobStatus == JobStatus.Open || bidStatus == BidStatus.Accepted;

        if (userId == bidderUserId)
            return jobStatus == JobStatus.Open && bidStatus != BidStatus.Accepted && bidStatus != BidStatus.Rejected && bidStatus != BidStatus.Withdrawn;

        return false;
    }
}
