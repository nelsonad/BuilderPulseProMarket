namespace BuilderPulsePro.Api.Contracts;

public record RegisterRequest(string Email, string Password);

public record LoginRequest(string Email, string Password);

public record AuthResponse(string AccessToken, DateTimeOffset ExpiresAt);