using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using BuilderPulsePro.Api.Contracts;
using BuilderPulsePro.Api.Domain;
using BuilderPulsePro.Api.Notifications;
using Microsoft.AspNetCore.Identity;
using Microsoft.IdentityModel.Tokens;

namespace BuilderPulsePro.Api.Endpoints;

public static class AuthEndpoints
{
    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/auth").WithTags("Auth");

        group.MapPost("/register", Register);
        group.MapPost("/login", Login);
        group.MapGet("/confirm-email", ConfirmEmail);

        return app;
    }

    private static async Task<IResult> Register(
        UserManager<AppUser> userManager,
        RegisterRequest req,
        IEmailSender emailSender,
        IConfiguration config)
    {
        var email = (req.Email ?? "").Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(email)) return Results.BadRequest("Email is required.");
        if (string.IsNullOrWhiteSpace(req.Password)) return Results.BadRequest("Password is required.");

        var existing = await userManager.FindByEmailAsync(email);
        if (existing is not null) return Results.Conflict("Email already registered.");

        var user = new AppUser
        {
            Id = Guid.NewGuid(),
            UserName = email,
            Email = email
        };

        var result = await userManager.CreateAsync(user, req.Password);
        if (!result.Succeeded)
            return Results.BadRequest(result.Errors.Select(e => e.Description));

        var token = await userManager.GenerateEmailConfirmationTokenAsync(user);
        var baseUrl = (config["App:WebBaseUrl"] ?? "http://localhost:5173").Trim().TrimEnd('/');
        var confirmLink = $"{baseUrl}/confirm-email?userId={user.Id}&token={Uri.EscapeDataString(token)}";

        await emailSender.SendAsync(new EmailMessage(
            email,
            "Confirm your email",
            $"""
            Thanks for signing up!

            Confirm your email by visiting:
            {confirmLink}
            """
        ));

        return Results.Ok();
    }

    private static async Task<IResult> Login(
        UserManager<AppUser> userManager,
        SignInManager<AppUser> signInManager,
        LoginRequest req,
        IConfiguration config)
    {
        var email = (req.Email ?? "").Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(email)) return Results.BadRequest("Email is required.");
        if (string.IsNullOrWhiteSpace(req.Password)) return Results.BadRequest("Password is required.");

        var user = await userManager.FindByEmailAsync(email);
        if (user is null) return Results.Unauthorized();

        if (!user.EmailConfirmed)
            return Results.BadRequest("Email not confirmed.");

        var ok = await signInManager.CheckPasswordSignInAsync(user, req.Password, lockoutOnFailure: true);
        if (!ok.Succeeded) return Results.Unauthorized();

        var issuer = config["Jwt:Issuer"]!;
        var audience = config["Jwt:Audience"]!;
        var key = config["Jwt:Key"]!;
        var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
        var creds = new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256);

        var expires = DateTimeOffset.UtcNow.AddHours(12);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email ?? ""),
            new(ClaimTypes.NameIdentifier, user.Id.ToString())
        };

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: expires.UtcDateTime,
            signingCredentials: creds
        );

        var tokenString = new JwtSecurityTokenHandler().WriteToken(token);

        return Results.Ok(new AuthResponse(tokenString, expires));
    }

    private static async Task<IResult> ConfirmEmail(
        UserManager<AppUser> userManager,
        Guid userId,
        string? token)
    {
        if (userId == Guid.Empty || string.IsNullOrWhiteSpace(token))
            return Results.BadRequest("Invalid confirmation request.");

        var user = await userManager.FindByIdAsync(userId.ToString());
        if (user is null) return Results.NotFound();

        var result = await userManager.ConfirmEmailAsync(user, token);
        if (!result.Succeeded)
            return Results.BadRequest(result.Errors.Select(e => e.Description));

        return Results.Ok();
    }
}
