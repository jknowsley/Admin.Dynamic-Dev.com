namespace Admin.Shared.Models;

public class ProviderUsageSnapshot
{
    public int Id { get; set; }
    public string Provider { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Status { get; set; } = "Unknown";
    public bool IsHealthy { get; set; }
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
    public string ModelsJson { get; set; } = "[]";
    public DateTime SnapshotAtUtc { get; set; }
}
