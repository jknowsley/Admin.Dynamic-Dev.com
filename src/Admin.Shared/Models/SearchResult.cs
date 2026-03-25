namespace Admin.Shared.Models;

public class SearchResult
{
    public int ConversationId { get; set; }
    public string ProjectName { get; set; } = string.Empty;
    public DateOnly Date { get; set; }
    public string Snippet { get; set; } = string.Empty;
    public int Rank { get; set; }
}
