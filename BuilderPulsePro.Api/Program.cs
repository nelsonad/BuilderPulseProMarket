using BuilderPulsePro.Api.Auth;
using BuilderPulsePro.Api.Contracts;
using BuilderPulsePro.Api.Data;
using BuilderPulsePro.Api.Domain;
using BuilderPulsePro.Api.Endpoints;
using BuilderPulsePro.Api.Events;
using BuilderPulsePro.Api.Notifications;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using NetTopologySuite.Geometries;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

builder.Services.AddDbContext<AppDbContext>(opt =>
{
    opt.UseNpgsql(
        builder.Configuration.GetConnectionString("Default"),
        npgsql => npgsql.UseNetTopologySuite()
    );
});

builder.Services
    .AddIdentityCore<AppUser>(options =>
    {
        options.User.RequireUniqueEmail = true;
        options.SignIn.RequireConfirmedEmail = true;
        options.Password.RequiredLength = 8;
        options.Password.RequireNonAlphanumeric = false;
        options.Password.RequireUppercase = false;
        options.Password.RequireLowercase = false;
        options.Password.RequireDigit = true;
    })
    .AddRoles<IdentityRole<Guid>>()
    .AddEntityFrameworkStores<AppDbContext>()
    .AddSignInManager()
    .AddDefaultTokenProviders();

var jwtIssuer = builder.Configuration["Jwt:Issuer"]!;
var jwtAudience = builder.Configuration["Jwt:Audience"]!;
var jwtKey = builder.Configuration["Jwt:Key"]!;
var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = signingKey,
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateIssuerSigningKey = true,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(1)
        };
    });

builder.Services.AddAuthorization();

builder.Services.AddCors(options =>
{
    options.AddPolicy("DevCors", policy =>
    {
        policy.WithOrigins("http://localhost:5173", "https://localhost:5173")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

builder.Services.Configure<JobDigestOptions>(
    builder.Configuration.GetSection("Notifications:JobDigest"));

builder.Services.AddSingleton<IEventBus, InProcessEventBus>();

// logging handlers
builder.Services.AddScoped<IEventHandler<JobPosted>, LogJobPosted>();
builder.Services.AddScoped<IEventHandler<BidPlaced>, LogBidPlaced>();
builder.Services.AddScoped<IEventHandler<BidAccepted>, LogBidAccepted>();
builder.Services.AddScoped<IEventHandler<JobCompleted>, LogJobCompleted>();
builder.Services.AddScoped<IEventHandler<JobPosted>, PersistJobPostedActivity>();
builder.Services.AddScoped<IEventHandler<BidPlaced>, PersistBidPlacedActivity>();
builder.Services.AddScoped<IEventHandler<BidAccepted>, PersistBidAcceptedActivity>();
builder.Services.AddScoped<IEventHandler<JobCompleted>, PersistJobCompletedActivity>();

// Email sender (console)
builder.Services.AddSingleton<ConsoleEmailSender>();
builder.Services.AddSingleton<IEmailSender>(sp => sp.GetRequiredService<ConsoleEmailSender>());
builder.Services.AddSingleton<IEmailStore>(sp => sp.GetRequiredService<ConsoleEmailSender>());

builder.Services.AddScoped<JobDigestRunner>();

// Email handlers
builder.Services.AddScoped<IEventHandler<JobPosted>, EnqueueJobPostedDigestItems>();
builder.Services.AddScoped<IEventHandler<BidPlaced>, EmailOnBidPlaced>();
builder.Services.AddScoped<IEventHandler<BidAccepted>, EmailOnBidAccepted>();
builder.Services.AddScoped<IEventHandler<JobCompleted>, EmailOnJobCompleted>();
builder.Services.AddScoped<IEventHandler<MessagePosted>, EmailOnMessagePosted>();

builder.Services.AddHostedService<JobPostedDigestBackgroundService>();

var app = builder.Build();

await using (var scope = app.Services.CreateAsyncScope())
{
    var config = scope.ServiceProvider.GetRequiredService<IConfiguration>();
    var userManager = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
    var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole<Guid>>>();

    var seedEmail = (config["Admin:SeedEmail"] ?? "").Trim().ToLowerInvariant();
    if (!string.IsNullOrWhiteSpace(seedEmail))
    {
        var roleName = "Admin";

        if (!await roleManager.RoleExistsAsync(roleName))
            await roleManager.CreateAsync(new IdentityRole<Guid>(roleName));

        var user = await userManager.FindByEmailAsync(seedEmail);
        if (user is not null && !await userManager.IsInRoleAsync(user, roleName))
            await userManager.AddToRoleAsync(user, roleName);
    }
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapGet("/dev/emails/latest", (IEmailStore store) =>
    {
        if (store.LatestMessage is null)
            return Results.NotFound("No emails have been sent yet.");

        var message = store.LatestMessage;
        return Results.Ok(new
        {
            message.To,
            message.Subject,
            message.Body
        });
    });
}

app.UseHttpsRedirection();
app.UseCors("DevCors");
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/health/db", async (AppDbContext db) =>
{
    var canConnect = await db.Database.CanConnectAsync();
    return Results.Ok(new { canConnect });
});

app.MapAuthEndpoints();
app.MapJobEndpoints();
app.MapBidEndpoints();
app.MapContractorEndpoints();
app.MapAdminEndpoints();

app.Run();
