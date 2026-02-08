namespace BuilderPulsePro.Api.Notifications;

public static class TradeMatching
{
    public static string NormalizeTrade(string? trade)
    {
        return (trade ?? "").Trim().ToLowerInvariant();
    }

    public static (string PatternMiddle, string PatternStart, string PatternEnd) GetTradePatterns(string normalizedTrade)
    {
        var trade = NormalizeTrade(normalizedTrade);
        return ($"%,{trade},%", $"{trade},%", $"%,{trade}");
    }

    public static bool MatchesTradesCsv(string? tradesCsv, string? trade)
    {
        var normalizedTrade = NormalizeTrade(trade);
        if (string.IsNullOrWhiteSpace(normalizedTrade)) return false;

        if (string.IsNullOrWhiteSpace(tradesCsv)) return false;

        var tokens = tradesCsv.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        return tokens.Any(t => string.Equals(t, normalizedTrade, StringComparison.OrdinalIgnoreCase));
    }
}
