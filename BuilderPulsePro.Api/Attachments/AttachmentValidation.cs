using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.IO;

namespace BuilderPulsePro.Api.Attachments;

public static class AttachmentValidation
{
    private static readonly string[] AllowedExtensionsList =
    [
        ".jpg",
        ".jpeg",
        ".png",
        ".gif",
        ".webp",
        ".bmp",
        ".pdf",
        ".docx",
        ".xlsx",
        ".pptx",
        ".txt",
        ".rtf",
        ".csv",
        ".odt",
        ".ods",
        ".odp"
    ];

    private static readonly HashSet<string> AllowedExtensions =
        new(AllowedExtensionsList, StringComparer.OrdinalIgnoreCase);

    public static string AllowedExtensionsDisplay => string.Join(", ", AllowedExtensionsList);

    public static bool IsAllowedFileName(string fileName)
    {
        var extension = Path.GetExtension(fileName);
        return !string.IsNullOrWhiteSpace(extension) && AllowedExtensions.Contains(extension);
    }

    public static bool TryValidate(IFormFile file, out string error)
    {
        if (!IsAllowedFileName(file.FileName))
        {
            error = $"File type not allowed: {file.FileName}. Allowed types: {AllowedExtensionsDisplay}.";
            return false;
        }

        error = "";
        return true;
    }
}
