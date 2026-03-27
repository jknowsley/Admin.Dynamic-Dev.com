using System.Text.Json;
using Admin.Shared.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Admin.Server.Controllers;

[ApiController]
[Route("api/provider-status")]
[Authorize]
public class ProviderStatusController : ControllerBase
{
    [HttpGet]
    public ActionResult<List<ProviderUsageStats>> Get()
    {
        var sessionsDir = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
            ".openclaw",
            "agents",
            "main",
            "sessions");

        if (!Directory.Exists(sessionsDir))
            return Ok(new List<ProviderUsageStats>());

        var providers = new Dictionary<string, ProviderUsageStats>(StringComparer.OrdinalIgnoreCase)
        {
            ["anthropic"] = NewProvider("anthropic", "Claude"),
            ["openai"] = NewProvider("openai", "GPT"),
            ["google"] = NewProvider("google", "Gemini")
        };

        foreach (var file in Directory.EnumerateFiles(sessionsDir, "*.jsonl"))
        {
            foreach (var line in System.IO.File.ReadLines(file))
            {
                if (string.IsNullOrWhiteSpace(line))
                    continue;

                try
                {
                    using var doc = JsonDocument.Parse(line);
                    var root = doc.RootElement;

                    if (!root.TryGetProperty("type", out var typeProp) || typeProp.GetString() != "message")
                        continue;

                    if (!root.TryGetProperty("message", out var messageProp))
                        continue;

                    if (!messageProp.TryGetProperty("role", out var roleProp) || roleProp.GetString() != "assistant")
                        continue;

                    if (!messageProp.TryGetProperty("provider", out var providerProp))
                        continue;

                    var providerKey = providerProp.GetString();
                    if (string.IsNullOrWhiteSpace(providerKey) || !providers.TryGetValue(providerKey, out var provider))
                        continue;

                    provider.Requests++;

                    if (messageProp.TryGetProperty("model", out var modelProp))
                    {
                        var modelName = modelProp.GetString();
                        if (!string.IsNullOrWhiteSpace(modelName))
                        {
                            var existingModel = provider.Models.FirstOrDefault(m => m.Name == modelName);
                            if (existingModel == null)
                            {
                                existingModel = new ModelUsageStats { Name = modelName };
                                provider.Models.Add(existingModel);
                            }
                            existingModel.Requests++;
                        }
                    }

                    if (root.TryGetProperty("timestamp", out var timestampProp))
                    {
                        var ts = timestampProp.GetString();
                        if (!string.IsNullOrWhiteSpace(ts) && string.CompareOrdinal(ts, provider.LastUsed) > 0)
                            provider.LastUsed = ts;
                    }

                    var isError = false;
                    if (messageProp.TryGetProperty("stopReason", out var stopReasonProp) && stopReasonProp.GetString() == "error")
                        isError = true;
                    if (messageProp.TryGetProperty("errorMessage", out var errorProp))
                    {
                        isError = true;
                        var error = errorProp.GetString();
                        if (!string.IsNullOrWhiteSpace(error))
                            provider.LastError = error.Length > 300 ? error[..300] + "..." : error;
                    }
                    if (isError)
                        provider.Errors++;

                    if (messageProp.TryGetProperty("usage", out var usageProp))
                    {
                        provider.InputTokens += GetLong(usageProp, "input");
                        provider.OutputTokens += GetLong(usageProp, "output");
                        provider.CacheReadTokens += GetLong(usageProp, "cacheRead");
                        provider.CacheWriteTokens += GetLong(usageProp, "cacheWrite");
                        provider.TotalTokens += GetLong(usageProp, "totalTokens");

                        if (usageProp.TryGetProperty("cost", out var costProp) &&
                            costProp.TryGetProperty("total", out var totalCostProp) &&
                            totalCostProp.TryGetDecimal(out var totalCost))
                        {
                            provider.TotalCost += totalCost;
                        }
                    }
                }
                catch
                {
                    // ignore malformed lines
                }
            }
        }

        foreach (var provider in providers.Values)
        {
            provider.Models = provider.Models
                .OrderByDescending(m => m.Requests)
                .ToList();

            provider.Status = GetStatus(provider);
            provider.IsHealthy = provider.Status is "Healthy" or "Active";
        }

        return Ok(providers.Values.OrderBy(p => p.DisplayName).ToList());
    }

    private static ProviderUsageStats NewProvider(string provider, string displayName) => new()
    {
        Provider = provider,
        DisplayName = displayName
    };

    private static long GetLong(JsonElement element, string propertyName)
    {
        if (!element.TryGetProperty(propertyName, out var prop))
            return 0;

        return prop.ValueKind switch
        {
            JsonValueKind.Number when prop.TryGetInt64(out var l) => l,
            JsonValueKind.Number => (long)prop.GetDouble(),
            _ => 0
        };
    }

    private static string GetStatus(ProviderUsageStats provider)
    {
        if (provider.Requests == 0)
            return "No data";

        if (provider.Errors == 0)
            return "Healthy";

        var errorRate = provider.Requests == 0 ? 0 : (decimal)provider.Errors / provider.Requests;
        if (errorRate >= 0.5m)
            return "Degraded";

        return "Active";
    }
}
