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
            
        // Use SQL Full-Text Search
        var results = await _context.Conversations
            .FromSqlRaw(@"
                SELECT c.* 
                FROM Conversations c
                INNER JOIN CONTAINSTABLE(Conversations, Content, {0}) AS ft
                    ON c.Id = ft.[KEY]
                ORDER BY ft.RANK DESC", query)
            .Include(c => c.Project)
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
}
