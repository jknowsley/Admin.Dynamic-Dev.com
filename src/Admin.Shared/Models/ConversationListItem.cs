namespace Admin.Shared.Models;

public class ConversationListItem
{
    public int Id { get; set; }
    public int ProjectId { get; set; }
    public string ProjectName { get; set; } = string.Empty;
    public DateOnly Date { get; set; }
    public string? Summary { get; set; }
    public int MessageCount { get; set; }
    public int? TokenCount { get; set; }
}
