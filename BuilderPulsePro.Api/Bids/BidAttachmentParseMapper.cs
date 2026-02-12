using BuilderPulsePro.Api.Contracts;
using BuilderPulsePro.Api.Domain;

namespace BuilderPulsePro.Api.Bids;

public static class BidAttachmentParseMapper
{
    public static BidAttachmentParseResponse ToResponse(BidAttachmentParseJob job)
    {
        BidAttachmentParseResult? result = null;

        if (!string.IsNullOrWhiteSpace(job.ResultJson))
            result = BidAttachmentParsingSerializer.DeserializeResult(job.ResultJson);

        return new BidAttachmentParseResponse(
            job.Id,
            job.BidId,
            job.AttachmentId,
            job.Status,
            job.CreatedAt,
            job.UpdatedAt,
            job.ErrorMessage,
            result
        );
    }
}
