using System.Security.Claims;

namespace BuilderPulsePro.Api.Auth;

public static class CurrentUser
{
    public static Guid GetUserId(ClaimsPrincipal user)
    {
        var id = user.FindFirstValue(ClaimTypes.NameIdentifier)
                 ?? user.FindFirstValue("sub");

        return Guid.TryParse(id, out var guid)
            ? guid
            : throw new InvalidOperationException("Missing/invalid user id claim.");
    }
}
