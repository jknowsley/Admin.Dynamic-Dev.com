namespace Admin.Shared.Models;

public class Conversation
{
    public int Id { get; set; }
    public int ProjectId { get; set; }
    public DateOnly Date { get; set; }
    public string Content { get; set; } = string.Empty;
    public string? Summary { get; set; }
    public int MessageCount { get; set; }
    public int? TokenCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    
    // Navigation
    public Project? Project { get; set; }
}
