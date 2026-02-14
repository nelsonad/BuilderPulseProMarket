using BuilderPulsePro.Api.Auth;
using BuilderPulsePro.Api.Attachments;
using BuilderPulsePro.Api.Contracts;
using BuilderPulsePro.Api.Data;
using BuilderPulsePro.Api.Domain;
using BuilderPulsePro.Api.Events;
using BuilderPulsePro.Api.Hubs;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace BuilderPulsePro.Api.Endpoints;

public static class MessagingEndpoints
{
    public static IEndpointRouteBuilder MapMessagingEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/jobs/{jobId:guid}/conversations")
            .WithTags("Messaging")
            .RequireAuthorization();

        group.MapGet("", ListJobConversations);
        group.MapGet("/{contractorProfileId:guid}/messages", ListConversationMessages);
        group.MapPost("/{contractorProfileId:guid}/messages", SendConversationMessage)
            .DisableAntiforgery();
        group.MapPost("/{contractorProfileId:guid}/messages/read", MarkConversationRead);
        group.MapGet("/{contractorProfileId:guid}/messages/{messageId:guid}/attachments/{attachmentId:guid}", DownloadMessageAttachment);

        var contractorGroup = app.MapGroup("/contractor")
            .WithTags("Contractor")
            .RequireAuthorization();

        contractorGroup.MapGet("/conversations", ListContractorConversations);

        app.MapGroup("/messages")
            .WithTags("Messaging")
            .RequireAuthorization()
            .MapPost("/{messageId:guid}/report", ReportMessage);

        return app;
    }

    private static async Task<IResult> ListJobConversations(AppDbContext db, ClaimsPrincipal user, Guid jobId)
    {
        var userId = CurrentUser.GetUserId(user);

        var job = await db.Jobs.AsNoTracking()
            .Where(j => j.Id == jobId)
            .Select(j => new { j.PostedByUserId })
            .FirstOrDefaultAsync();

        if (job is null) return Results.NotFound("Job not found.");
        if (job.PostedByUserId != userId) return Results.Forbid();

        var conversations = await db.Conversations.AsNoTracking()
            .Where(c => c.JobId == jobId)
            .Select(c => new
            {
                c.Id,
                c.JobId,
                c.ContractorProfileId,
                c.CreatedAt
            })
            .ToListAsync();

        if (conversations.Count == 0)
            return Results.Ok(new List<ConversationSummaryResponse>());

        var contractorIds = conversations.Select(c => c.ContractorProfileId).Distinct().ToList();

        var contractorProfiles = await db.ContractorProfiles.AsNoTracking()
            .Where(p => contractorIds.Contains(p.UserId))
            .Select(p => new { p.UserId, p.DisplayName })
            .ToListAsync();

        var contractorLookup = contractorProfiles
            .GroupBy(p => p.UserId)
            .ToDictionary(g => g.Key, g => g.First().DisplayName);

        var conversationIds = conversations.Select(c => c.Id).ToList();

        var lastMessages = await db.Messages.AsNoTracking()
            .Where(m => conversationIds.Contains(m.ConversationId))
            .GroupBy(m => m.ConversationId)
            .Select(g => g.OrderByDescending(m => m.CreatedAt)
                .Select(m => new { m.ConversationId, m.CreatedAt, m.Body })
                .FirstOrDefault())
            .ToListAsync();

        var lastMessageLookup = lastMessages
            .Where(m => m is not null)
            .ToDictionary(m => m!.ConversationId, m => m!);

        var unreadCounts = await db.Messages.AsNoTracking()
            .Where(m => conversationIds.Contains(m.ConversationId)
                && m.RecipientUserId == userId
                && m.ReadAt == null)
            .GroupBy(m => m.ConversationId)
            .Select(g => new { ConversationId = g.Key, Count = g.Count() })
            .ToListAsync();

        var unreadLookup = unreadCounts.ToDictionary(u => u.ConversationId, u => u.Count);

        var result = conversations.Select(c =>
        {
            contractorLookup.TryGetValue(c.ContractorProfileId, out var displayName);
            lastMessageLookup.TryGetValue(c.Id, out var last);
            unreadLookup.TryGetValue(c.Id, out var unreadCount);

            return new ConversationSummaryResponse(
                c.Id,
                c.JobId,
                c.ContractorProfileId,
                displayName ?? "Contractor",
                c.CreatedAt,
                last?.CreatedAt,
                last?.Body,
                unreadCount
            );
        });

        return Results.Ok(result);
    }

    private static async Task<IResult> ListContractorConversations(AppDbContext db, ClaimsPrincipal user)
    {
        var userId = CurrentUser.GetUserId(user);

        var profileIds = await ContractorAuthz.GetContractorProfileIdsForUserAsync(db, userId);
        if (profileIds.Count == 0) return Results.Forbid();

        var contractorProfiles = await db.ContractorProfiles.AsNoTracking()
            .Where(p => profileIds.Contains(p.UserId))
            .Select(p => new { p.UserId, p.DisplayName })
            .ToListAsync();

        var profileLookup = contractorProfiles.ToDictionary(p => p.UserId, p => p.DisplayName);

        var conversations = await db.Conversations.AsNoTracking()
            .Where(c => profileIds.Contains(c.ContractorProfileId))
            .Select(c => new
            {
                c.Id,
                c.JobId,
                c.ContractorProfileId,
                c.CreatedAt
            })
            .ToListAsync();

        if (conversations.Count == 0)
            return Results.Ok(new List<ConversationSummaryResponse>());

        var conversationIds = conversations.Select(c => c.Id).ToList();

        var lastMessages = await db.Messages.AsNoTracking()
            .Where(m => conversationIds.Contains(m.ConversationId))
            .GroupBy(m => m.ConversationId)
            .Select(g => g.OrderByDescending(m => m.CreatedAt)
                .Select(m => new { m.ConversationId, m.CreatedAt, m.Body })
                .FirstOrDefault())
            .ToListAsync();

        var lastMessageLookup = lastMessages
            .Where(m => m is not null)
            .ToDictionary(m => m!.ConversationId, m => m!);

        var unreadCounts = await db.Messages.AsNoTracking()
            .Where(m => conversationIds.Contains(m.ConversationId)
                && m.RecipientUserId == userId
                && m.ReadAt == null)
            .GroupBy(m => m.ConversationId)
            .Select(g => new { ConversationId = g.Key, Count = g.Count() })
            .ToListAsync();

        var unreadLookup = unreadCounts.ToDictionary(u => u.ConversationId, u => u.Count);

        var result = conversations.Select(c =>
        {
            profileLookup.TryGetValue(c.ContractorProfileId, out var displayName);
            lastMessageLookup.TryGetValue(c.Id, out var last);
            unreadLookup.TryGetValue(c.Id, out var unreadCount);

            return new ConversationSummaryResponse(
                c.Id,
                c.JobId,
                c.ContractorProfileId,
                displayName ?? "Contractor",
                c.CreatedAt,
                last?.CreatedAt,
                last?.Body,
                unreadCount
            );
        });

        return Results.Ok(result);
    }

    private static async Task<IResult> ListConversationMessages(
        AppDbContext db,
        ClaimsPrincipal user,
        Guid jobId,
        Guid contractorProfileId,
        int take = 200)
    {
        var (conversation, _, errorResult) = await ResolveConversation(
            db,
            user,
            jobId,
            contractorProfileId,
            createIfMissing: false,
            allowMissing: true);

        if (errorResult is not null) return errorResult;
        if (conversation is null)
            return Results.Ok(new List<MessageResponse>());
        take = Math.Clamp(take, 1, 500);

        var messages = await db.Messages.AsNoTracking()
            .Where(m => m.ConversationId == conversation.Id)
            .OrderBy(m => m.CreatedAt)
            .Take(take)
            .Select(m => new
            {
                m.Id,
                m.ConversationId,
                m.ClientUserId,
                m.ContractorProfileId,
                m.SenderUserId,
                m.RecipientUserId,
                m.Body,
                m.CreatedAt,
                m.ReadAt
            })
            .ToListAsync();

        if (messages.Count == 0)
            return Results.Ok(new List<MessageResponse>());

        var messageIds = messages.Select(m => m.Id).ToList();

        var attachments = await db.MessageAttachments.AsNoTracking()
            .Where(ma => messageIds.Contains(ma.MessageId))
            .Select(ma => new MessageAttachmentRow(
                ma.MessageId,
                ma.Attachment.Id,
                ma.Attachment.FileName,
                ma.Attachment.ContentType,
                ma.Attachment.SizeBytes,
                ma.Attachment.StorageUrl,
                ma.Attachment.CreatedAt))
            .ToListAsync();

        var attachmentLookup = attachments
            .GroupBy(a => a.MessageId)
            .ToDictionary(g => g.Key, g => g.ToList());

        var resultMessages = messages.Select(m => new MessageResponse(
            m.Id,
            conversation.Id,
            conversation.JobId,
            m.ClientUserId,
            m.ContractorProfileId,
            m.SenderUserId,
            m.RecipientUserId,
            m.Body,
            m.CreatedAt,
            m.ReadAt,
            MapMessageAttachments(jobId, contractorProfileId, m.Id, attachmentLookup)
        ));

        return Results.Ok(resultMessages);
    }

    private static async Task<IResult> SendConversationMessage(
        AppDbContext db,
        ClaimsPrincipal user,
        Guid jobId,
        Guid contractorProfileId,
        HttpRequest request,
        AttachmentHelper helper,
        IEventBus bus,
        IHubContext<MessagingHub> hub,
        CancellationToken ct)
    {
        var form = await request.ReadFormAsync(ct);
        var body = form["body"].ToString();
        var files = form.Files;
        var (conversation, _, errorResult) = await ResolveConversation(
            db,
            user,
            jobId,
            contractorProfileId,
            createIfMissing: true,
            allowMissing: false,
            ct: ct);

        if (errorResult is not null || conversation is null) return errorResult ?? Results.NotFound("Conversation not found.");
        var userId = CurrentUser.GetUserId(user);

        var trimmedBody = (body ?? string.Empty).Trim();
        var hasAttachments = files is { Count: > 0 };

        if (string.IsNullOrWhiteSpace(trimmedBody) && !hasAttachments)
            return Results.BadRequest("Message body or attachments are required.");

        if (trimmedBody.Length > 2000)
            return Results.BadRequest("Message body must be 2000 characters or fewer.");

        var recipientUserId = userId == conversation.ClientUserId
            ? conversation.ContractorProfileId
            : conversation.ClientUserId;

        var message = new Message
        {
            Id = Guid.NewGuid(),
            ConversationId = conversation.Id,
            ClientUserId = conversation.ClientUserId,
            ContractorProfileId = conversation.ContractorProfileId,
            SenderUserId = userId,
            RecipientUserId = recipientUserId,
            Body = trimmedBody,
            CreatedAt = DateTimeOffset.UtcNow
        };

        db.Messages.Add(message);

        var messageAttachments = new List<MessageAttachment>();
        var attachments = new List<Attachment>();

        if (hasAttachments)
        {
            var invalidFile = files.FirstOrDefault(file =>
                file.Length > 0 && !AttachmentValidation.IsAllowedFileName(file.FileName));

            if (invalidFile is not null)
                return Results.BadRequest(
                    $"File type not allowed: {invalidFile.FileName}. Allowed types: {AttachmentValidation.AllowedExtensionsDisplay}.");

            foreach (var file in files)
            {
                if (file.Length <= 0)
                    continue;

                var attachment = await helper.SaveAsync(file, ct);
                attachments.Add(attachment);
                messageAttachments.Add(new MessageAttachment
                {
                    MessageId = message.Id,
                    AttachmentId = attachment.Id,
                    Attachment = attachment
                });
            }

            if (attachments.Count == 0)
                return Results.BadRequest("At least one attachment is required.");

            db.Attachments.AddRange(attachments);
            db.MessageAttachments.AddRange(messageAttachments);
        }

        await db.SaveChangesAsync(ct);

        var response = new MessageResponse(
            message.Id,
            conversation.Id,
            conversation.JobId,
            message.ClientUserId,
            message.ContractorProfileId,
            message.SenderUserId,
            message.RecipientUserId,
            message.Body,
            message.CreatedAt,
            message.ReadAt,
            attachments.Select(a => new MessageAttachmentResponse(
                a.Id,
                a.FileName,
                a.ContentType,
                a.SizeBytes,
                BuildMessageAttachmentUrl(jobId, contractorProfileId, message.Id, a.Id, a.StorageUrl),
                a.CreatedAt
            )).ToList()
        );

        await bus.PublishAsync(new MessagePosted(
            message.Id,
            conversation.Id,
            conversation.JobId,
            message.SenderUserId,
            message.RecipientUserId,
            message.CreatedAt));

        await hub.Clients.Group(MessagingHub.BuildConversationGroup(conversation.Id))
            .SendAsync("messageReceived", response, ct);

        return Results.Ok(response);
    }

    private static async Task<IResult> MarkConversationRead(
        AppDbContext db,
        ClaimsPrincipal user,
        Guid jobId,
        Guid contractorProfileId,
        IHubContext<MessagingHub> hub,
        CancellationToken ct)
    {
        var (conversation, _, errorResult) = await ResolveConversation(
            db,
            user,
            jobId,
            contractorProfileId,
            createIfMissing: false,
            allowMissing: false,
            ct: ct);

        if (errorResult is not null || conversation is null) return errorResult ?? Results.NotFound("Conversation not found.");
        var userId = CurrentUser.GetUserId(user);
        var readAt = DateTimeOffset.UtcNow;

        var updatedCount = await db.Messages
            .Where(m => m.ConversationId == conversation.Id
                && m.RecipientUserId == userId
                && m.ReadAt == null)
            .ExecuteUpdateAsync(setters => setters.SetProperty(m => m.ReadAt, readAt), ct);

        var response = new MarkConversationReadResponse(
            conversation.Id,
            conversation.JobId,
            conversation.ContractorProfileId,
            readAt,
            updatedCount);

        await hub.Clients.Group(MessagingHub.BuildConversationGroup(conversation.Id))
            .SendAsync("messagesRead", response, ct);

        return Results.Ok(response);
    }

    private static async Task<IResult> DownloadMessageAttachment(
        AppDbContext db,
        ClaimsPrincipal user,
        Guid jobId,
        Guid contractorProfileId,
        Guid messageId,
        Guid attachmentId,
        bool download = false)
    {
        var (conversation, _, errorResult) = await ResolveConversation(
            db,
            user,
            jobId,
            contractorProfileId,
            createIfMissing: false,
            allowMissing: false);

        if (errorResult is not null || conversation is null) return errorResult ?? Results.NotFound("Conversation not found.");

        var attachment = await db.MessageAttachments.AsNoTracking()
            .Where(ma => ma.MessageId == messageId && ma.AttachmentId == attachmentId)
            .Select(ma => ma.Attachment)
            .FirstOrDefaultAsync();

        if (attachment is null) return Results.NotFound("Attachment not found.");

        var messageExists = await db.Messages.AsNoTracking()
            .AnyAsync(m => m.Id == messageId && m.ConversationId == conversation.Id);

        if (!messageExists) return Results.NotFound("Message not found.");

        if (attachment.StorageProvider == "Database" && attachment.Content is not null)
        {
            return download
                ? Results.File(attachment.Content, attachment.ContentType, attachment.FileName)
                : Results.File(attachment.Content, attachment.ContentType);
        }

        if (!string.IsNullOrWhiteSpace(attachment.StorageUrl))
            return Results.Redirect(attachment.StorageUrl);

        return Results.NotFound("Attachment content not available.");
    }

    private static async Task<IResult> ReportMessage(
        AppDbContext db,
        Guid messageId,
        ReportMessageRequest req,
        ClaimsPrincipal user)
    {
        var userId = CurrentUser.GetUserId(user);

        var reason = (req.Reason ?? "").Trim();
        if (string.IsNullOrWhiteSpace(reason))
            return Results.BadRequest("Reason is required.");
        if (reason.Length > 1000)
            return Results.BadRequest("Reason must be 1000 characters or fewer.");

        var messageInfo = await db.Messages.AsNoTracking()
            .Where(m => m.Id == messageId)
            .Join(db.Conversations.AsNoTracking(),
                m => m.ConversationId,
                c => c.Id,
                (m, c) => new { m.ConversationId, c.ClientUserId, c.ContractorProfileId })
            .FirstOrDefaultAsync();

        if (messageInfo is null) return Results.NotFound("Message not found.");

        if (userId != messageInfo.ClientUserId && userId != messageInfo.ContractorProfileId)
        {
            if (!await ContractorAuthz.CanActForContractorProfileAsync(db, userId, messageInfo.ContractorProfileId))
                return Results.Forbid();
        }

        var report = new MessageReport
        {
            Id = Guid.NewGuid(),
            MessageId = messageId,
            ReporterUserId = userId,
            Reason = reason,
            CreatedAt = DateTimeOffset.UtcNow
        };

        db.MessageReports.Add(report);
        await db.SaveChangesAsync();

        return Results.Ok(new MessageReportResponse(
            report.Id,
            report.MessageId,
            report.ReporterUserId,
            report.Reason,
            report.CreatedAt,
            report.ResolvedAt,
            report.ResolvedByUserId
        ));
    }

    private static async Task<(Conversation? Conversation, JobInfo? JobInfo, IResult? ErrorResult)> ResolveConversation(
        AppDbContext db,
        ClaimsPrincipal user,
        Guid jobId,
        Guid contractorProfileId,
        bool createIfMissing,
        bool allowMissing,
        CancellationToken ct = default)
    {
        var userId = CurrentUser.GetUserId(user);

        var job = await db.Jobs.AsNoTracking()
            .Where(j => j.Id == jobId)
            .Select(j => new JobInfo(j.Id, j.PostedByUserId))
            .FirstOrDefaultAsync(ct);

        if (job is null) return (null, null, Results.NotFound("Job not found."));

        if (contractorProfileId == job.PostedByUserId)
            return (null, job, Results.BadRequest("Contractor cannot be the job poster."));

        if (userId != job.PostedByUserId && userId != contractorProfileId)
        {
            if (!await ContractorAuthz.CanActForContractorProfileAsync(db, userId, contractorProfileId, ct))
                return (null, job, Results.Forbid());
        }

        var contractorProfile = await db.ContractorProfiles.AsNoTracking()
            .Where(p => p.UserId == contractorProfileId)
            .Select(p => new { p.UserId })
            .FirstOrDefaultAsync(ct);

        if (contractorProfile is null)
            return (null, job, Results.NotFound("Contractor profile not found."));

        var conversation = await db.Conversations
            .FirstOrDefaultAsync(c => c.JobId == jobId && c.ContractorProfileId == contractorProfileId, ct);

        if (conversation is null && createIfMissing)
        {
            conversation = new Conversation
            {
                Id = Guid.NewGuid(),
                JobId = jobId,
                ClientUserId = job.PostedByUserId,
                ContractorProfileId = contractorProfileId,
                CreatedAt = DateTimeOffset.UtcNow
            };

            db.Conversations.Add(conversation);
            await db.SaveChangesAsync(ct);
        }

        if (conversation is null && !allowMissing)
            return (null, job, Results.NotFound("Conversation not found."));

        return (conversation, job, null);
    }

    private static IReadOnlyList<MessageAttachmentResponse> MapMessageAttachments(
        Guid jobId,
        Guid contractorProfileId,
        Guid messageId,
        IDictionary<Guid, List<MessageAttachmentRow>> attachments)
    {
        if (!attachments.TryGetValue(messageId, out var list))
            return Array.Empty<MessageAttachmentResponse>();

        return list.Select(a => new MessageAttachmentResponse(
            a.Id,
            a.FileName,
            a.ContentType,
            a.SizeBytes,
            BuildMessageAttachmentUrl(jobId, contractorProfileId, messageId, a.Id, a.StorageUrl),
            a.CreatedAt
        )).ToList();
    }

    private static string? BuildMessageAttachmentUrl(
        Guid jobId,
        Guid contractorProfileId,
        Guid messageId,
        Guid attachmentId,
        string? storageUrl)
    {
        if (!string.IsNullOrWhiteSpace(storageUrl))
            return storageUrl;

        return $"/jobs/{jobId}/conversations/{contractorProfileId}/messages/{messageId}/attachments/{attachmentId}";
    }

    private sealed record JobInfo(Guid JobId, Guid PostedByUserId);
    private sealed record MessageAttachmentRow(
        Guid MessageId,
        Guid Id,
        string FileName,
        string ContentType,
        long SizeBytes,
        string? StorageUrl,
        DateTimeOffset CreatedAt);
}
