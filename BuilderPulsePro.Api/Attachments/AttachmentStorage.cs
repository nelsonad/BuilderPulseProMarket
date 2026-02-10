using Amazon;
using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using BuilderPulsePro.Api.Domain;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.Extensions.Options;

namespace BuilderPulsePro.Api.Attachments;

public sealed class AttachmentStorageOptions
{
    public bool UseAwsStorage { get; set; }
    public bool UseAzureStorage { get; set; }
    public AwsOptions Aws { get; set; } = new();
    public AzureOptions Azure { get; set; } = new();

    public sealed class AwsOptions
    {
        public string BucketName { get; set; } = "";
        public string Region { get; set; } = "";
        public string AccessKeyId { get; set; } = "";
        public string SecretAccessKey { get; set; } = "";
    }

    public sealed class AzureOptions
    {
        public string ConnectionString { get; set; } = "";
        public string ContainerName { get; set; } = "";
    }
}

public sealed record AttachmentUpload(
    Guid JobId,
    string FileName,
    string ContentType,
    long SizeBytes,
    Stream Content
);

public sealed record AttachmentStorageResult(
    string StorageProvider,
    string StorageKey,
    string? StorageUrl,
    byte[]? Content,
    long SizeBytes
);

public interface IAttachmentStorage
{
    Task<AttachmentStorageResult> SaveAsync(AttachmentUpload upload, CancellationToken ct);
    Task DeleteAsync(JobAttachment attachment, CancellationToken ct);
}

public sealed class AttachmentHelper(IAttachmentStorage storage)
{
    public async Task<JobAttachment> SaveAsync(Guid jobId, IFormFile file, CancellationToken ct)
    {
        await using var stream = file.OpenReadStream();
        var contentType = string.IsNullOrWhiteSpace(file.ContentType)
            ? "application/octet-stream"
            : file.ContentType;

        if (string.IsNullOrWhiteSpace(contentType) || contentType == "application/octet-stream")
        {
            var provider = new FileExtensionContentTypeProvider();
            if (provider.TryGetContentType(file.FileName, out var inferredType))
                contentType = inferredType;
        }

        var upload = new AttachmentUpload(jobId, file.FileName, contentType, file.Length, stream);
        var result = await storage.SaveAsync(upload, ct);

        return new JobAttachment
        {
            Id = Guid.NewGuid(),
            JobId = jobId,
            FileName = file.FileName,
            ContentType = contentType,
            SizeBytes = result.SizeBytes,
            StorageProvider = result.StorageProvider,
            StorageKey = result.StorageKey,
            StorageUrl = result.StorageUrl,
            Content = result.Content,
            CreatedAt = DateTimeOffset.UtcNow
        };
    }

    public Task DeleteAsync(JobAttachment attachment, CancellationToken ct)
        => storage.DeleteAsync(attachment, ct);
}

public sealed class AttachmentStorage(IOptions<AttachmentStorageOptions> options) : IAttachmentStorage
{
    private readonly AttachmentStorageOptions _options = options.Value;

    public Task<AttachmentStorageResult> SaveAsync(AttachmentUpload upload, CancellationToken ct)
    {
        if (_options.UseAwsStorage)
            return SaveToAwsAsync(upload, ct);

        if (_options.UseAzureStorage)
            return SaveToAzureAsync(upload, ct);

        return SaveToDatabaseAsync(upload, ct);
    }

    public Task DeleteAsync(JobAttachment attachment, CancellationToken ct)
    {
        if (_options.UseAwsStorage)
            return DeleteFromAwsAsync(attachment, ct);

        if (_options.UseAzureStorage)
            return DeleteFromAzureAsync(attachment, ct);

        return Task.CompletedTask;
    }

    private static async Task<AttachmentStorageResult> SaveToDatabaseAsync(AttachmentUpload upload, CancellationToken ct)
    {
        await using var memory = new MemoryStream();
        await upload.Content.CopyToAsync(memory, ct);
        var content = memory.ToArray();

        return new AttachmentStorageResult(
            StorageProvider: "Database",
            StorageKey: Guid.NewGuid().ToString("N"),
            StorageUrl: null,
            Content: content,
            SizeBytes: content.Length
        );
    }

    private async Task DeleteFromAwsAsync(JobAttachment attachment, CancellationToken ct)
    {
        var aws = _options.Aws;
        if (string.IsNullOrWhiteSpace(aws.BucketName))
            throw new InvalidOperationException("Attachments:Aws:BucketName is required when using AWS storage.");

        var regionName = string.IsNullOrWhiteSpace(aws.Region) ? "us-east-1" : aws.Region.Trim();
        var region = RegionEndpoint.GetBySystemName(regionName);

        var credentials = string.IsNullOrWhiteSpace(aws.AccessKeyId)
            ? null
            : new BasicAWSCredentials(aws.AccessKeyId, aws.SecretAccessKey);

        using var client = credentials is null
            ? new AmazonS3Client(region)
            : new AmazonS3Client(credentials, region);

        await client.DeleteObjectAsync(new DeleteObjectRequest
        {
            BucketName = aws.BucketName,
            Key = attachment.StorageKey
        }, ct);
    }

    private async Task<AttachmentStorageResult> SaveToAwsAsync(AttachmentUpload upload, CancellationToken ct)
    {
        var aws = _options.Aws;
        if (string.IsNullOrWhiteSpace(aws.BucketName))
            throw new InvalidOperationException("Attachments:Aws:BucketName is required when using AWS storage.");

        var regionName = string.IsNullOrWhiteSpace(aws.Region) ? "us-east-1" : aws.Region.Trim();
        var region = RegionEndpoint.GetBySystemName(regionName);
        var key = BuildStorageKey(upload.JobId, upload.FileName);

        var credentials = string.IsNullOrWhiteSpace(aws.AccessKeyId)
            ? null
            : new BasicAWSCredentials(aws.AccessKeyId, aws.SecretAccessKey);

        using var client = credentials is null
            ? new AmazonS3Client(region)
            : new AmazonS3Client(credentials, region);

        var request = new PutObjectRequest
        {
            BucketName = aws.BucketName,
            Key = key,
            InputStream = upload.Content,
            ContentType = upload.ContentType
        };

        await client.PutObjectAsync(request, ct);

        var url = $"https://{aws.BucketName}.s3.{region.SystemName}.amazonaws.com/{key}";

        return new AttachmentStorageResult(
            StorageProvider: "AwsS3",
            StorageKey: key,
            StorageUrl: url,
            Content: null,
            SizeBytes: upload.SizeBytes
        );
    }

    private async Task DeleteFromAzureAsync(JobAttachment attachment, CancellationToken ct)
    {
        var azure = _options.Azure;
        if (string.IsNullOrWhiteSpace(azure.ConnectionString))
            throw new InvalidOperationException("Attachments:Azure:ConnectionString is required when using Azure storage.");

        if (string.IsNullOrWhiteSpace(azure.ContainerName))
            throw new InvalidOperationException("Attachments:Azure:ContainerName is required when using Azure storage.");

        var container = new BlobContainerClient(azure.ConnectionString, azure.ContainerName);
        var blob = container.GetBlobClient(attachment.StorageKey);
        await blob.DeleteIfExistsAsync(cancellationToken: ct);
    }

    private async Task<AttachmentStorageResult> SaveToAzureAsync(AttachmentUpload upload, CancellationToken ct)
    {
        var azure = _options.Azure;
        if (string.IsNullOrWhiteSpace(azure.ConnectionString))
            throw new InvalidOperationException("Attachments:Azure:ConnectionString is required when using Azure storage.");

        if (string.IsNullOrWhiteSpace(azure.ContainerName))
            throw new InvalidOperationException("Attachments:Azure:ContainerName is required when using Azure storage.");

        var container = new BlobContainerClient(azure.ConnectionString, azure.ContainerName);
        await container.CreateIfNotExistsAsync(cancellationToken: ct);

        var blobName = BuildStorageKey(upload.JobId, upload.FileName);
        var blob = container.GetBlobClient(blobName);

        await blob.UploadAsync(upload.Content, new BlobHttpHeaders { ContentType = upload.ContentType }, cancellationToken: ct);

        return new AttachmentStorageResult(
            StorageProvider: "AzureBlob",
            StorageKey: blobName,
            StorageUrl: blob.Uri.ToString(),
            Content: null,
            SizeBytes: upload.SizeBytes
        );
    }

    private static string BuildStorageKey(Guid jobId, string fileName)
    {
        var safeName = Path.GetFileName(fileName).Replace(" ", "-");
        return $"jobs/{jobId:D}/{Guid.NewGuid():N}/{safeName}";
    }
}
