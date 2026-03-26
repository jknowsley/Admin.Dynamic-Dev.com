using Admin.Server.Data;
using Admin.Shared.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Admin.Server.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class TasksController : ControllerBase
{
    private readonly AdminDbContext _context;

    public TasksController(AdminDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<List<TaskItem>>> GetTasks(
        [FromQuery] int? projectId = null,
        [FromQuery] string? status = null,
        [FromQuery] string? assignedTo = null)
    {
        var query = _context.Tasks
            .Include(t => t.Project)
            .OrderBy(t => t.KanbanOrder)
            .ThenByDescending(t => t.Priority == "Critical" ? 4 : t.Priority == "High" ? 3 : t.Priority == "Medium" ? 2 : 1)
            .ThenBy(t => t.CreatedAt)
            .AsQueryable();

        if (projectId.HasValue)
            query = query.Where(t => t.ProjectId == projectId.Value);
        if (!string.IsNullOrEmpty(status))
            query = query.Where(t => t.Status == status);
        if (!string.IsNullOrEmpty(assignedTo))
            query = query.Where(t => t.AssignedTo == assignedTo);

        return await query.ToListAsync();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<TaskItem>> GetTask(int id)
    {
        var task = await _context.Tasks
            .Include(t => t.Project)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (task == null) return NotFound();
        return task;
    }

    [HttpPost]
    public async Task<ActionResult<TaskItem>> CreateTask(TaskItem task)
    {
        task.CreatedAt = DateTime.UtcNow;
        task.Status = string.IsNullOrEmpty(task.Status) ? Admin.Shared.Models.TaskStatus.Backlog : task.Status;
        task.AssignedTo = string.IsNullOrEmpty(task.AssignedTo) ? "Fred" : task.AssignedTo;

        _context.Tasks.Add(task);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetTask), new { id = task.Id }, task);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateTask(int id, TaskItem task)
    {
        if (id != task.Id) return BadRequest();

        var existing = await _context.Tasks.FindAsync(id);
        if (existing == null) return NotFound();

        existing.Title = task.Title;
        existing.Description = task.Description;
        existing.Status = task.Status;
        existing.Priority = task.Priority;
        existing.AssignedTo = task.AssignedTo;
        existing.BranchName = task.BranchName;
        existing.AcceptanceCriteria = task.AcceptanceCriteria;
        existing.Notes = task.Notes;
        existing.CommitHash = task.CommitHash;
        existing.PRUrl = task.PRUrl;
        existing.ProjectId = task.ProjectId;
        existing.DueDate = task.DueDate;
        existing.KanbanOrder = task.KanbanOrder;
        existing.UpdatedAt = DateTime.UtcNow;

        if (task.Status == Admin.Shared.Models.TaskStatus.Done && existing.CompletedAt == null)
            existing.CompletedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpPatch("{id}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] StatusUpdate update)
    {
        var task = await _context.Tasks.FindAsync(id);
        if (task == null) return NotFound();

        task.Status = update.Status;
        task.UpdatedAt = DateTime.UtcNow;

        if (update.Status == Admin.Shared.Models.TaskStatus.Done && task.CompletedAt == null)
            task.CompletedAt = DateTime.UtcNow;
        if (update.Status != Admin.Shared.Models.TaskStatus.Done)
            task.CompletedAt = null;

        await _context.SaveChangesAsync();
        return Ok(task);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteTask(int id)
    {
        var task = await _context.Tasks.FindAsync(id);
        if (task == null) return NotFound();

        _context.Tasks.Remove(task);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}

public class StatusUpdate
{
    public string Status { get; set; } = "";
}

