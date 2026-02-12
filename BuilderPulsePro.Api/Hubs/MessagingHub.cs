using BuilderPulsePro.Api.Auth;
using BuilderPulsePro.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace BuilderPulsePro.Api.Hubs;

[Authorize]
public class MessagingHub(AppDbContext db) : Hub
{
    public async Task JoinConversation(Guid jobId, Guid contractorProfileId)
    {
        var userId = CurrentUser.GetUserId(Context.User!);

        var job = await db.Jobs.AsNoTracking()
            .Where(j => j.Id == jobId)
            .Select(j => new { j.PostedByUserId })
            .FirstOrDefaultAsync();

        if (job is null)
            throw new HubException("Job not found.");

        if (job.PostedByUserId != userId && contractorProfileId != userId)
            throw new HubException("Not authorized for this conversation.");

        if (contractorProfileId == job.PostedByUserId)
            throw new HubException("Contractor cannot be the job poster.");

        var contractorProfile = await db.ContractorProfiles.AsNoTracking()
            .Where(p => p.UserId == contractorProfileId)
            .Select(p => new { p.UserId })
            .FirstOrDefaultAsync();
        if (contractorProfile is null)
            throw new HubException("Contractor profile not found.");

        if (userId != job.PostedByUserId && userId != contractorProfile.UserId)
            throw new HubException("Not authorized for this conversation.");

        var conversation = await db.Conversations
            .FirstOrDefaultAsync(c => c.JobId == jobId && c.ContractorProfileId == contractorProfileId);

        if (conversation is null)
        {
            conversation = new Domain.Conversation
            {
                Id = Guid.NewGuid(),
                JobId = jobId,
                ClientUserId = job.PostedByUserId,
                ContractorProfileId = contractorProfileId,
                CreatedAt = DateTimeOffset.UtcNow
            };

            db.Conversations.Add(conversation);
            await db.SaveChangesAsync();
        }

        await Groups.AddToGroupAsync(Context.ConnectionId, BuildConversationGroup(conversation.Id));
        await Clients.Caller.SendAsync("conversationJoined", conversation.Id);
    }

    public Task LeaveConversation(Guid conversationId)
        => Groups.RemoveFromGroupAsync(Context.ConnectionId, BuildConversationGroup(conversationId));

    public static string BuildConversationGroup(Guid conversationId)
        => $"conversation:{conversationId}";
}
