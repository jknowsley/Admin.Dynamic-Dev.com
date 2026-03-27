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
    public async Task<ActionResult<List<ProviderUsageStats>>> Get()
    {
        var snapshots = await _context.ProviderUsageSnapshots
            .AsNoTracking()
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
