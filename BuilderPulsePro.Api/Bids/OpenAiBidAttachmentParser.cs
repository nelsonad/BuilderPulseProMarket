using BuilderPulsePro.Api.Contracts;
using BuilderPulsePro.Api.Domain;
using Microsoft.Extensions.Options;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace BuilderPulsePro.Api.Bids;

public sealed class OpenAiOptions
{
    public string ApiKey { get; set; } = "";
    public string Model { get; set; } = "gpt-4o-mini";
    public double Temperature { get; set; } = 0.1;
    public int MaxOutputTokens { get; set; } = 800;
    public int MaxAttachmentBytes { get; set; } = 5_000_000;
    public int MaxTextCharacters { get; set; } = 12000;
}

public sealed class OpenAiBidAttachmentParser(
    HttpClient httpClient,
    IHttpClientFactory httpClientFactory,
    IOptions<OpenAiOptions> options,
    ILogger<OpenAiBidAttachmentParser> logger)
    : IBidAttachmentParser
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        PropertyNameCaseInsensitive = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    public async Task<BidAttachmentParseResult?> ParseAsync(Attachment attachment, CancellationToken ct)
    {
        var settings = options.Value;
        if (string.IsNullOrWhiteSpace(settings.ApiKey))
            return null;

        var (bytes, contentType) = await LoadAttachmentBytesAsync(attachment, settings, ct);
        if (bytes is null)
            return null;

        var fileId = await UploadFileAsync(settings, attachment, bytes, contentType, ct);
        if (string.IsNullOrWhiteSpace(fileId))
            return null;

        try
        {
            var prompt = BuildPrompt();
            var request = BuildRequest(settings, prompt, fileId);

            using var message = new HttpRequestMessage(HttpMethod.Post, "responses")
            {
                Content = new StringContent(JsonSerializer.Serialize(request, JsonOptions), Encoding.UTF8, "application/json")
            };
            message.Headers.Authorization = new AuthenticationHeaderValue("Bearer", settings.ApiKey);

            using var response = await httpClient.SendAsync(message, ct);
            var body = await response.Content.ReadAsStringAsync(ct);
            if (!response.IsSuccessStatusCode)
            {
                logger.LogWarning("OpenAI parsing failed: {Status} {Body}", response.StatusCode, body);
                return null;
            }

            var content = ExtractResponseText(body);
            if (string.IsNullOrWhiteSpace(content))
                return null;

            var json = ExtractJson(content);
            if (string.IsNullOrWhiteSpace(json))
                return null;

            try
            {
                return JsonSerializer.Deserialize<BidAttachmentParseResult>(json, JsonOptions);
            }
            catch (JsonException ex)
            {
                logger.LogWarning(ex, "Failed to deserialize OpenAI bid parse response.");
                return null;
            }
        }
        finally
        {
            await DeleteFileAsync(settings, fileId, ct);
        }
    }

    private async Task<(byte[]? Bytes, string ContentType)> LoadAttachmentBytesAsync(
        Attachment attachment,
        OpenAiOptions settings,
        CancellationToken ct)
    {
        if (attachment.Content is { Length: > 0 })
        {
            if (attachment.Content.Length > settings.MaxAttachmentBytes)
                return (null, attachment.ContentType);

            return (attachment.Content, attachment.ContentType);
        }

        if (!string.IsNullOrWhiteSpace(attachment.StorageUrl))
        {
            var client = httpClientFactory.CreateClient();
            using var response = await client.GetAsync(attachment.StorageUrl, ct);
            if (!response.IsSuccessStatusCode)
                return (null, attachment.ContentType);

            var bytes = await response.Content.ReadAsByteArrayAsync(ct);
            if (bytes.Length > settings.MaxAttachmentBytes)
                return (null, attachment.ContentType);

            var contentType = response.Content.Headers.ContentType?.MediaType ?? attachment.ContentType;
            return (bytes, contentType);
        }

        return (null, attachment.ContentType);
    }

    private static OpenAiRequest BuildRequest(
        OpenAiOptions settings,
        OpenAiPrompt prompt,
        string fileId)
    {
        var userContents = new List<OpenAiInputContent>
        {
            new("input_text", prompt.User),
            new("input_file", FileId: fileId)
        };

        var input = new List<OpenAiInputMessage>
        {
            new("user", userContents)
        };

        return new OpenAiRequest(
            settings.Model,
            prompt.System,
            settings.Temperature,
            settings.MaxOutputTokens,
            input);
    }

    private async Task<string?> UploadFileAsync(
        OpenAiOptions settings,
        Attachment attachment,
        byte[] bytes,
        string contentType,
        CancellationToken ct)
    {
        if (bytes.Length > settings.MaxAttachmentBytes)
            return null;

        using var content = new MultipartFormDataContent();
        content.Add(new StringContent("user_data"), "purpose");

        var fileName = string.IsNullOrWhiteSpace(attachment.FileName)
            ? $"attachment-{attachment.Id:N}"
            : attachment.FileName;

        var fileContent = new ByteArrayContent(bytes);
        fileContent.Headers.ContentType = new MediaTypeHeaderValue(string.IsNullOrWhiteSpace(contentType)
            ? "application/octet-stream"
            : contentType);
        content.Add(fileContent, "file", fileName);

        using var message = new HttpRequestMessage(HttpMethod.Post, "files")
        {
            Content = content
        };
        message.Headers.Authorization = new AuthenticationHeaderValue("Bearer", settings.ApiKey);

        using var response = await httpClient.SendAsync(message, ct);
        var body = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
        {
            logger.LogWarning("OpenAI file upload failed: {Status} {Body}", response.StatusCode, body);
            return null;
        }

        try
        {
            var file = JsonSerializer.Deserialize<OpenAiFileResponse>(body, JsonOptions);
            return file?.Id;
        }
        catch (JsonException ex)
        {
            logger.LogWarning(ex, "Failed to deserialize OpenAI file upload response.");
            return null;
        }
    }

    private async Task DeleteFileAsync(OpenAiOptions settings, string fileId, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(fileId))
            return;

        using var message = new HttpRequestMessage(HttpMethod.Delete, $"files/{fileId}");
        message.Headers.Authorization = new AuthenticationHeaderValue("Bearer", settings.ApiKey);

        try
        {
            using var response = await httpClient.SendAsync(message, ct);
            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync(ct);
                logger.LogWarning("OpenAI file delete failed: {Status} {Body}", response.StatusCode, body);
            }
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "OpenAI file delete request failed.");
        }
    }

    private static OpenAiPrompt BuildPrompt()
    {
        const string userPrompt = "Parse this bid document and return JSON with this schema: " +
            "{\"amountCents\":number|null,\"earliestStart\":string|null,\"durationDays\":number|null," +
            "\"validUntil\":string|null,\"terms\":string|null,\"assumptions\":string|null," +
            "\"lineItems\":[{\"description\":string,\"quantity\":number,\"unitPriceCents\":number}]," +
            "\"variants\":[{\"name\":string,\"amountCents\":number,\"notes\":string|null," +
            "\"lineItems\":[{\"description\":string,\"quantity\":number,\"unitPriceCents\":number}]}]}. " +
            "Convert all currency amounts to cents (USD). Use ISO-8601 for dates. " +
            "If handwritten or scanned, infer best-effort values. Return JSON only.";

        return new OpenAiPrompt(BuildSystemPrompt(), userPrompt);
    }

    private static string BuildSystemPrompt()
    {
        return "You extract pricing, dates, and line items from construction bids. " +
               "Always return strict JSON with the requested schema. " +
               "Line item descriptions should be concise. " +
               "If totals and line items disagree, keep the document's total and still list line items.";
    }

    private static string? ExtractResponseText(string json)
    {
        try
        {
            var response = JsonSerializer.Deserialize<OpenAiResponse>(json, JsonOptions);
            return response?.Output?
                .SelectMany(o => o.Content)
                .FirstOrDefault(c => c.Type == "output_text")
                ?.Text;
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private static string? ExtractJson(string content)
    {
        var trimmed = content.Trim();
        if (trimmed.StartsWith("```"))
        {
            var start = trimmed.IndexOf('{');
            var end = trimmed.LastIndexOf('}');
            if (start >= 0 && end > start)
                return trimmed[start..(end + 1)];
        }

        return trimmed;
    }

    private sealed record OpenAiPrompt(string System, string User);

    private sealed record OpenAiRequest(
        [property: JsonPropertyName("model")] string Model,
        [property: JsonPropertyName("instructions")] string Instructions,
        [property: JsonPropertyName("temperature")] double Temperature,
        [property: JsonPropertyName("max_output_tokens")] int MaxOutputTokens,
        [property: JsonPropertyName("input")] IReadOnlyList<OpenAiInputMessage> Input);

    private sealed record OpenAiInputMessage(
        [property: JsonPropertyName("role")] string Role,
        [property: JsonPropertyName("content")] IReadOnlyList<OpenAiInputContent> Content);

    private sealed record OpenAiInputContent(
        [property: JsonPropertyName("type")] string Type,
        [property: JsonPropertyName("text")] string? Text = null,
        [property: JsonPropertyName("file_id")] string? FileId = null);

    private sealed record OpenAiResponse([property: JsonPropertyName("output")] IReadOnlyList<OpenAiOutput>? Output);

    private sealed record OpenAiOutput([property: JsonPropertyName("content")] IReadOnlyList<OpenAiContent> Content);

    private sealed record OpenAiContent(
        [property: JsonPropertyName("type")] string Type,
        [property: JsonPropertyName("text")] string? Text);

    private sealed record OpenAiFileResponse([property: JsonPropertyName("id")] string Id);
}
