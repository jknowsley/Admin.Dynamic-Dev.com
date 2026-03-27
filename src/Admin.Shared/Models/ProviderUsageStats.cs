namespace Admin.Shared.Models;

public class ProviderUsageStats
{
    public string Provider { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public bool IsHealthy { get; set; }
    public string Status { get; set; } = "Unknown";
    public int Requests { get; set; }
    public int Errors { get; set; }
    public long InputTokens { get; set; }
    public long OutputTokens { get; set; }
    public long CacheReadTokens { get; set; }
    public long CacheWriteTokens { get; set; }
    public long TotalTokens { get; set; }
    public decimal TotalCost { get; set; }
    public string? LastUsed { get; set; }
    public string? LastError { get; set; }
    public List<ModelUsageStats> Models { get; set; } = new();
}

public class ModelUsageStats
{
    public string Name { get; set; } = string.Empty;
    public int Requests { get; set; }
}
