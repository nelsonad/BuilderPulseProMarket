namespace BuilderPulsePro.Api.Domain;

/// <summary>
/// A user who is authorized to act on behalf of a contractor profile (bid, message clients).
/// The profile owner (ContractorProfile.UserId) can always act; this table adds additional users.
/// </summary>
public class ContractorAuthorizedUser
{
    public Guid ContractorProfileId { get; set; }
    public Guid UserId { get; set; }
}
