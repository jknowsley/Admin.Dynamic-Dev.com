namespace Admin.Shared.Models;

public class TaskItem
{
    public int Id { get; set; }
    public int? ProjectId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Status { get; set; } = "Backlog";
    public string Priority { get; set; } = "Medium";
    public string AssignedTo { get; set; } = "Fred";
    public string? BranchName { get; set; }
    public string? AcceptanceCriteria { get; set; }
    public string? Notes { get; set; }
    public string? CommitHash { get; set; }
    public string? PRUrl { get; set; }
    public int KanbanOrder { get; set; }
    public DateOnly? DueDate { get; set; }
    public DateTime? CompletedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    // Navigation
    public Project? Project { get; set; }
}

public static class TaskStatus
{
    public const string Backlog = "Backlog";
    public const string ToDo = "To Do";
    public const string InProgress = "In Progress";
    public const string Review = "Review";
    public const string Done = "Done";

    public static readonly string[] All = { Backlog, ToDo, InProgress, Review, Done };
}

public static class TaskPriority
{
    public const string Low = "Low";
    public const string Medium = "Medium";
    public const string High = "High";
    public const string Critical = "Critical";

    public static readonly string[] All = { Low, Medium, High, Critical };
}
