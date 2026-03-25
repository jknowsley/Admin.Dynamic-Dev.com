using Admin.Server.Data;
using Admin.Shared.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Admin.Server.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ConversationsController : ControllerBase
{
    private readonly AdminDbContext _context;
    
    public ConversationsController(AdminDbContext context)
    {
        _context = context;
    }
    
    [HttpGet]
    public async Task<ActionResult<List<Conversation>>> GetConversations(
        [FromQuery] int? projectId = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var query = _context.Conversations
            .Include(c => c.Project)
            .OrderByDescending(c => c.Date)
            .AsQueryable();
            
        if (projectId.HasValue)
            query = query.Where(c => c.ProjectId == projectId.Value);
            
        return await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
    }
    
    [HttpGet("{id}")]
    public async Task<ActionResult<Conversation>> GetConversation(int id)
    {
        var conversation = await _context.Conversations
            .Include(c => c.Project)
            .FirstOrDefaultAsync(c => c.Id == id);
            
        if (conversation == null) return NotFound();
        return conversation;
    }
    
    [HttpGet("search")]
    public async Task<ActionResult<List<SearchResult>>> Search([FromQuery] string query)
    {
        if (string.IsNullOrWhiteSpace(query))
            return BadRequest("Search query is required");
            
        // Use simple LIKE search for broader matching
        var searchTerm = $"%{query}%";
        
        var results = await _context.Conversations
            .Include(c => c.Project)
            .Where(c => EF.Functions.Like(c.Content, searchTerm) || 
                        EF.Functions.Like(c.Summary ?? "", searchTerm))
            .OrderByDescending(c => c.Date)
            .Take(50)
            .Select(c => new SearchResult
            {
                ConversationId = c.Id,
                ProjectName = c.Project!.Name,
                Date = c.Date,
                Snippet = c.Content.Length > 200 ? c.Content.Substring(0, 200) + "..." : c.Content,
                Rank = 0
            })
            .ToListAsync();
            
        return results;
    }
    
    [HttpGet("project/{projectId}/date/{date}")]
    public async Task<ActionResult<Conversation>> GetByProjectAndDate(int projectId, DateOnly date)
    {
        var conversation = await _context.Conversations
            .Include(c => c.Project)
            .FirstOrDefaultAsync(c => c.ProjectId == projectId && c.Date == date);
            
        if (conversation == null) return NotFound();
        return conversation;
    }
    
    /// <summary>
    /// Import or update a conversation from external source (OpenClaw)
    /// </summary>
    [HttpPost("import")]
    public async Task<ActionResult<Conversation>> ImportConversation([FromBody] ConversationImport import)
    {
        // Find project by Discord channel ID or name
        var project = await _context.Projects
            .FirstOrDefaultAsync(p => p.DiscordChannelId == import.DiscordChannelId || p.Name == import.ProjectName);
            
        if (project == null)
            return BadRequest($"Project not found for channel {import.DiscordChannelId} or name {import.ProjectName}");
        
        // Check if conversation exists for this project/date
        var existing = await _context.Conversations
            .FirstOrDefaultAsync(c => c.ProjectId == project.Id && c.Date == import.Date);
            
        if (existing != null)
        {
            // Update existing
            existing.Content = import.Content;
            existing.Summary = import.Summary;
            existing.MessageCount = import.MessageCount;
            existing.TokenCount = import.TokenCount;
            existing.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            // Create new
            existing = new Conversation
            {
                ProjectId = project.Id,
                Date = import.Date,
                Content = import.Content,
                Summary = import.Summary,
                MessageCount = import.MessageCount,
                TokenCount = import.TokenCount,
                CreatedAt = DateTime.UtcNow
            };
            _context.Conversations.Add(existing);
        }
        
        await _context.SaveChangesAsync();
        
        // Reload with project
        existing = await _context.Conversations
            .Include(c => c.Project)
            .FirstOrDefaultAsync(c => c.Id == existing.Id);
            
        return existing!;
    }
}

public class ConversationImport
{
    public string? DiscordChannelId { get; set; }
    public string? ProjectName { get; set; }
    public DateOnly Date { get; set; }
    public string Content { get; set; } = "";
    public string? Summary { get; set; }
    public int MessageCount { get; set; }
    public int? TokenCount { get; set; }
}
