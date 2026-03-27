using System.Text.Json;
using Admin.Server.Data;
using Admin.Shared.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Admin.Server.Controllers;

[ApiController]
[Route("api/provider-status")]
[Authorize]
public class ProviderStatusController : ControllerBase
{
    private readonly AdminDbContext _context;

    public ProviderStatusController(AdminDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<List<ProviderUsageStats>>> Get(
        [FromQuery] string range = "today",
        [FromQuery] DateTime? startUtc = null,
        [FromQuery] DateTime? endUtc = null)
    {
        var normalizedRange = (range ?? "today").Trim().ToLowerInvariant();
        if (normalizedRange != "today" && normalizedRange != "last7days" && normalizedRange != "daterange")
            normalizedRange = "today";

        var query = _context.ProviderUsageSnapshots.AsNoTracking().AsQueryable();

        if (normalizedRange == "daterange")
        {
            if (!startUtc.HasValue || !endUtc.HasValue)
                return BadRequest("Date range requires startUtc and endUtc.");

            var start = DateTime.SpecifyKind(startUtc.Value, DateTimeKind.Utc);
            var end = DateTime.SpecifyKind(endUtc.Value, DateTimeKind.Utc);

            query = query.Where(p => p.RangeKey == "daterange"
                && p.RangeStartUtc == start
                && p.RangeEndUtc == end);
        }
        else
        {
            query = query.Where(p => p.RangeKey == normalizedRange);
        }

        var snapshots = await query
            .OrderBy(p => p.DisplayName)
            .ToListAsync();

        var results = snapshots.Select(s => new ProviderUsageStats
        {
            Provider = s.Provider,
            DisplayName = s.DisplayName,
            Status = s.Status,
            IsHealthy = s.IsHealthy,
            Requests = s.Requests,
            Errors = s.Errors,
            InputTokens = s.InputTokens,
            OutputTokens = s.OutputTokens,
            CacheReadTokens = s.CacheReadTokens,
            CacheWriteTokens = s.CacheWriteTokens,
            TotalTokens = s.TotalTokens,
            TotalCost = s.TotalCost,
            LastUsed = s.LastUsed,
            LastError = s.LastError,
            Models = ParseModels(s.ModelsJson)
        }).ToList();

        return Ok(results);
    }

    private static List<ModelUsageStats> ParseModels(string? modelsJson)
    {
        if (string.IsNullOrWhiteSpace(modelsJson))
            return new List<ModelUsageStats>();

        try
        {
            return JsonSerializer.Deserialize<List<ModelUsageStats>>(modelsJson) ?? new List<ModelUsageStats>();
        }
        catch
        {
            return new List<ModelUsageStats>();
        }
    }
}
