namespace Admin.Shared.Models;

public class ProviderUsageFilter
{
    public string Range { get; set; } = "today";
    public DateTime? StartUtc { get; set; }
    public DateTime? EndUtc { get; set; }
}
