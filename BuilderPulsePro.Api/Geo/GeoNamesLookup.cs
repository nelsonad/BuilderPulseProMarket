namespace BuilderPulsePro.Api.Geo;

using System.Globalization;

public sealed record ZipLookupResult(string City, string State, double Lat, double Lng);

public sealed class GeoNamesZipLookup
{
    private readonly Dictionary<string, ZipLookupResult> _byZip;

    private GeoNamesZipLookup(Dictionary<string, ZipLookupResult> byZip)
        => _byZip = byZip;

    public static GeoNamesZipLookup LoadFromStream(Stream usTxtStream)
    {
        var dict = new Dictionary<string, ZipLookupResult>(capacity: 50000, comparer: StringComparer.Ordinal);

        using var reader = new StreamReader(usTxtStream, leaveOpen: false);

        string? line;
        while ((line = reader.ReadLine()) is not null)
        {
            if (string.IsNullOrWhiteSpace(line))
                continue;

            // GeoNames US.txt is tab-delimited:
            // 0 countryCode, 1 postalCode, 2 placeName, 4 adminCode1, 9 lat, 10 lon
            var parts = line.Split('\t');
            if (parts.Length < 11) continue;

            if (!parts[0].Equals("US", StringComparison.Ordinal)) continue;

            var zip = parts[1].Trim();
            if (zip.Length != 5) continue;
            if (dict.ContainsKey(zip)) continue; // first wins

            var city = parts[2].Trim();
            var state = parts[4].Trim();

            if (!double.TryParse(parts[9], NumberStyles.Float, CultureInfo.InvariantCulture, out var lat)) continue;
            if (!double.TryParse(parts[10], NumberStyles.Float, CultureInfo.InvariantCulture, out var lng)) continue;

            dict[zip] = new ZipLookupResult(city, state, lat, lng);
        }

        return new GeoNamesZipLookup(dict);
    }

    public ZipLookupResult? Lookup(string? zipRaw)
    {
        var zip5 = NormalizeZip5(zipRaw);
        if (zip5 is null) return null;
        return _byZip.TryGetValue(zip5, out var r) ? r : null;
    }

    private static string? NormalizeZip5(string? zipRaw)
    {
        if (string.IsNullOrWhiteSpace(zipRaw)) return null;

        Span<char> digits = stackalloc char[16];
        var n = 0;

        foreach (var ch in zipRaw)
        {
            if (ch is >= '0' and <= '9')
            {
                digits[n++] = ch;
                if (n == 5) break;
                if (n == digits.Length) break;
            }
        }

        return n == 5 ? new string(digits[..5]) : null;
    }
}
