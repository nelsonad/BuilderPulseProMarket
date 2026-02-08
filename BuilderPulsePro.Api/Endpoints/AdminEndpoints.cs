using BuilderPulsePro.Api.Auth;
using BuilderPulsePro.Api.Contracts;
using BuilderPulsePro.Api.Data;
using BuilderPulsePro.Api.Domain;
using BuilderPulsePro.Api.Notifications;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;

namespace BuilderPulsePro.Api.Endpoints;

public static class AdminEndpoints
{
    public static IEndpointRouteBuilder MapAdminEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/admin")
            .WithTags("Admin")
            .RequireAuthorization(policy => policy.RequireRole("Admin"));

        group.MapPost("/notifications/job-digest/run", RunJobDigest);
        group.MapGet("/metrics", GetMetrics);
        group.MapGet("/reports/messages", ListMessageReports);
        group.MapPost("/reports/messages/{reportId:guid}/resolve", ResolveMessageReport);
        group.MapPost("/users/{userId:guid}/promote", PromoteUser);

        return app;
    }

    private static async Task<IResult> RunJobDigest(JobDigestRunner runner, CancellationToken ct)
    {
        var result = await runner.RunOnceAsync(ct);
        return Results.Ok(result);
    }

    private static async Task<IResult> GetMetrics(AppDbContext db)
    {
        var users = await db.Users.CountAsync();
        var contractors = await db.ContractorProfiles.CountAsync();
        var jobs = await db.Jobs.CountAsync();
        var bids = await db.Bids.CountAsync();
        var messages = await db.Messages.CountAsync();
        var reports = await db.MessageReports.CountAsync();

        var jobsByStatus = await db.Jobs.AsNoTracking()
            .GroupBy(j => j.Status)
            .Select(g => new JobStatusMetric(g.Key.ToString(), g.Count()))
            .ToListAsync();

        var bidsByStatus = await db.Bids.AsNoTracking()
            .GroupBy(b => b.IsAccepted)
            .Select(g => new BidStatusMetric(g.Key ? "accepted" : "pending", g.Count()))
            .ToListAsync();

        return Results.Ok(new DashboardMetricsResponse(
            users,
            contractors,
            jobs,
            bids,
            messages,
            reports,
            jobsByStatus,
            bidsByStatus));
    }

    private static async Task<IResult> ListMessageReports(
        AppDbContext db,
        bool? unresolved = null,
        int take = 100)
    {
        take = Math.Clamp(take, 1, 200);

        var query = db.MessageReports.AsNoTracking();

        if (unresolved is true)
            query = query.Where(r => r.ResolvedAt == null);

        var rows = await query
            .OrderByDescending(r => r.CreatedAt)
            .Take(take)
            .Select(r => new MessageReportResponse(
                r.Id,
                r.MessageId,
                r.ReporterUserId,
                r.Reason,
                r.CreatedAt,
                r.ResolvedAt,
                r.ResolvedByUserId
            ))
            .ToListAsync();

        return Results.Ok(rows);
    }

    private static async Task<IResult> ResolveMessageReport(
        AppDbContext db,
        Guid reportId,
        ResolveMessageReportRequest req,
        ClaimsPrincipal user)
    {
        var userId = CurrentUser.GetUserId(user);

        var report = await db.MessageReports.FirstOrDefaultAsync(r => r.Id == reportId);
        if (report is null) return Results.NotFound();

        if (req.Resolved)
        {
            report.ResolvedAt = DateTimeOffset.UtcNow;
            report.ResolvedByUserId = userId;
        }
        else
        {
            report.ResolvedAt = null;
            report.ResolvedByUserId = null;
        }

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

    private static async Task<IResult> PromoteUser(
        UserManager<AppUser> userManager,
        RoleManager<IdentityRole<Guid>> roleManager,
        Guid userId,
        PromoteUserRequest req)
    {
        var role = (req.Role ?? "").Trim();
        if (string.IsNullOrWhiteSpace(role))
            return Results.BadRequest("Role is required.");

        var user = await userManager.FindByIdAsync(userId.ToString());
        if (user is null) return Results.NotFound();

        if (!await roleManager.RoleExistsAsync(role))
            await roleManager.CreateAsync(new IdentityRole<Guid>(role));

        if (await userManager.IsInRoleAsync(user, role))
            return Results.Ok();

        var result = await userManager.AddToRoleAsync(user, role);
        if (!result.Succeeded)
            return Results.BadRequest(result.Errors.Select(e => e.Description));

        return Results.Ok();
    }
}
