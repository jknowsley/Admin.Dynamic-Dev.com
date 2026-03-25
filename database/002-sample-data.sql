-- Sample Data for Admin.Dynamic-Dev.com
-- Run after 001-initial-schema.sql to seed the database with test data

-- =============================================
-- Sample Projects (if not already seeded)
-- =============================================
IF NOT EXISTS (SELECT * FROM [dbo].[Projects] WHERE [Name] = 'OpenClaw')
BEGIN
    INSERT INTO [dbo].[Projects] ([Name], [Description], [DiscordChannelId], [IsActive])
    VALUES 
        ('OpenClaw', 'AI assistant platform development and integrations', '1486436449829261412', 1),
        ('Mobile App', 'Cross-platform mobile application development', NULL, 1),
        ('Infrastructure', 'DevOps, CI/CD, and cloud infrastructure', NULL, 1);
END
GO

-- =============================================
-- Sample Conversations
-- =============================================
DECLARE @GeneralId INT = (SELECT Id FROM [dbo].[Projects] WHERE [Name] = 'General');
DECLARE @MintedCoreId INT = (SELECT Id FROM [dbo].[Projects] WHERE [Name] = 'MINTED-CORE');
DECLARE @BurksonId INT = (SELECT Id FROM [dbo].[Projects] WHERE [Name] = 'Burkson');
DECLARE @LogenixId INT = (SELECT Id FROM [dbo].[Projects] WHERE [Name] = 'Logenix');
DECLARE @OpenClawId INT = (SELECT Id FROM [dbo].[Projects] WHERE [Name] = 'OpenClaw');

-- General conversations
IF NOT EXISTS (SELECT * FROM [dbo].[Conversations] WHERE [ProjectId] = @GeneralId AND [Date] = '2026-03-25')
BEGIN
    INSERT INTO [dbo].[Conversations] ([ProjectId], [Date], [Content], [Summary], [MessageCount], [TokenCount])
    VALUES 
        (@GeneralId, '2026-03-25', 
         '**User:** Good morning Fred! Can you give me a quick status update on all projects?

**Fred:** Good morning Jonathan! Here''s your project overview:

**MINTED-CORE** - Auth migration complete, Work Center Scheduling in progress
- Latest commit: Cookie-based authentication phase 5 complete
- Next up: PWO drag-drop scheduling refinements

**Burkson TDG** - Sale Items filter feature
- Branch: DEV-Search-Sale-Items-Filter  
- Status: Ready for review

**Logenix** - UI standardization
- Dashboard deployed to Azure
- Web sockets and session affinity configured

Let me know which you''d like to focus on today!',
         'Daily standup covering all active projects status', 15, 1250),
        
        (@GeneralId, '2026-03-24',
         '**User:** What did we accomplish this week?

**Fred:** Here''s this week''s highlight reel:

1. **MINTED-CORE Auth Migration** (Major)
   - Migrated from insecure browser storage to ASP.NET Core cookie auth
   - 8-hour sliding expiration, proper middleware order
   - All 5 phases complete and tested

2. **Blazor Learnings**
   - Scoped CSS doesn''t work with Syncfusion components
   - UTC for all time operations (fixed timer bug)
   - Async initialization patterns for DI

3. **Infrastructure**
   - Mac Studio arrived and configured
   - Ollama running with qwen2.5-coder:32b and llama3.1:70b
   - Models set to stay loaded indefinitely

Solid week!',
         'Weekly recap: Auth migration, Blazor patterns, Mac Studio setup', 22, 1890);
END

-- MINTED-CORE conversations
IF NOT EXISTS (SELECT * FROM [dbo].[Conversations] WHERE [ProjectId] = @MintedCoreId AND [Date] = '2026-03-24')
BEGIN
    INSERT INTO [dbo].[Conversations] ([ProjectId], [Date], [Content], [Summary], [MessageCount], [TokenCount])
    VALUES 
        (@MintedCoreId, '2026-03-24',
         '**User:** The timer in the topbar is showing negative time. What''s wrong?

**Fred:** Found it! The issue is timezone-related. Here''s what''s happening:

```csharp
// Problem: Using local time
var elapsed = DateTime.Now - timeEntry.StartTime;
```

The database stores times in UTC, but we''re comparing against local time. BOT01 server is in EST (UTC-5), so the math is off.

**Fix:**
```csharp
// Solution: Use UTC consistently
var elapsed = DateTime.UtcNow - timeEntry.StartTime;
```

Applied this across NavState timer calculations. Timer now displays correctly!

**Lesson learned:** Always use `DateTime.UtcNow` when working with database-stored times.',
         'Fixed topbar timer showing negative time - UTC consistency issue', 8, 920),
        
        (@MintedCoreId, '2026-03-23',
         '**User:** Can we add external drag-drop from a panel to the Syncfusion Scheduler?

**Fred:** Attempted this with HTML5 drag-drop but it doesn''t work with Syncfusion. Here''s what does work:

**Required Setup:**
1. Use TreeView component (not raw HTML)
2. Enable `AllowDragAndDrop="true"`
3. Handle `OnNodeDragStop` event

**Code Pattern:**
```csharp
private async Task OnNodeDragStop(DragAndDropEventArgs args)
{
    // Get target cell from drop coordinates
    var cellData = await ScheduleRef.GetTargetCellAsync(args.Left, args.Top);
    
    if (cellData != null)
    {
        // Open scheduler editor with pre-filled data
        await ScheduleRef.OpenEditorAsync(cellData, CurrentAction.Add);
    }
}
```

Also learned: Don''t modify lists in `OnActionBegin` - do it in `ActionCompleted` instead to avoid concurrent render errors.',
         'Implemented Syncfusion Scheduler external drag-drop from TreeView', 18, 2100);
END

-- Burkson conversations
IF NOT EXISTS (SELECT * FROM [dbo].[Conversations] WHERE [ProjectId] = @BurksonId AND [Date] = '2026-03-22')
BEGIN
    INSERT INTO [dbo].[Conversations] ([ProjectId], [Date], [Content], [Summary], [MessageCount], [TokenCount])
    VALUES 
        (@BurksonId, '2026-03-22',
         '**User:** Add a filter for sale items to the search results.

**Fred:** Implementing the Sale Items filter. Key technical note discovered:

When merging filter results where some filters may not apply (empty sets), DON''T use simple intersection - it returns empty.

**Pattern:**
```csharp
if (targetSet.Count == 0) {
    targetSet.UnionWith(sourceSet);  // First filter - add all
} else if (sourceSet.Count > 0) {
    targetSet.IntersectWith(sourceSet);  // Narrow down
}
// If source is empty, skip (don''t narrow by "nothing")
```

Filter completed and styled with brand red (#c41230) for sale item badges.

Branch: DEV-Search-Sale-Items-Filter',
         'Added Sale Items dropdown filter with proper HashSet intersection pattern', 12, 1450);
END

-- Logenix conversations
IF NOT EXISTS (SELECT * FROM [dbo].[Conversations] WHERE [ProjectId] = @LogenixId AND [Date] = '2026-03-21')
BEGIN
    INSERT INTO [dbo].[Conversations] ([ProjectId], [Date], [Content], [Summary], [MessageCount], [TokenCount])
    VALUES 
        (@LogenixId, '2026-03-21',
         '**User:** Dashboard keeps losing auth state after deployment.

**Fred:** Classic Blazor Server on Azure issue! Two settings were missing:

**Azure App Service Settings Required:**
1. **Web sockets** = ON (SignalR needs this)
2. **Session Affinity** = ON (keeps user on same server instance)

Without web sockets, SignalR falls back to polling (unreliable). Without session affinity, scoped services don''t persist across circuit reconnects.

Applied both settings in Azure portal → Configuration → General settings.

Dashboard now maintains auth state correctly!',
         'Fixed Blazor Server auth state on Azure - web sockets and session affinity', 10, 870);
END

-- OpenClaw conversations
IF NOT EXISTS (SELECT * FROM [dbo].[Conversations] WHERE [ProjectId] = @OpenClawId AND [Date] = '2026-03-25')
BEGIN
    INSERT INTO [dbo].[Conversations] ([ProjectId], [Date], [Content], [Summary], [MessageCount], [TokenCount])
    VALUES 
        (@OpenClawId, '2026-03-25',
         '**User:** Create a new admin panel channel and logo for Dynamic Dev Solutions.

**Fred:** Setting up #admin-panel channel for the new Admin.Dynamic-Dev.com project.

**Generated assets:**
- Full logo (1536x1024): "DDS" lettermark with code brackets, navy-to-teal gradient
- Icon (1024x1024): Abstract D with bracket symbols for favicon/icon use

**Updates to admin panel:**
- Header: "Dynamic Dev Solutions Admin Panel"
- Logo added to navigation bar
- Sample data script created for testing

The app uses:
- Blazor WASM frontend
- ASP.NET Core API backend
- MudBlazor UI components
- Azure SQL with full-text search
- Azure AD authentication',
         'Admin panel branding update and new channel setup', 6, 750);
END
GO

-- =============================================
-- Sample Tasks
-- =============================================
IF NOT EXISTS (SELECT * FROM [dbo].[Tasks] WHERE [Title] = 'Complete PWO scheduling drag-drop')
BEGIN
    INSERT INTO [dbo].[Tasks] ([ProjectId], [Title], [Description], [Status], [Priority], [DueDate])
    SELECT 
        (SELECT Id FROM [dbo].[Projects] WHERE [Name] = 'MINTED-CORE'),
        'Complete PWO scheduling drag-drop',
        'Finish implementing drag-drop from unscheduled PWO list to work center scheduler',
        'In Progress',
        'High',
        '2026-03-28';
        
    INSERT INTO [dbo].[Tasks] ([ProjectId], [Title], [Description], [Status], [Priority], [DueDate])
    SELECT 
        (SELECT Id FROM [dbo].[Projects] WHERE [Name] = 'Burkson'),
        'Review Sale Items filter PR',
        'Code review and testing of the Sale Items filter feature',
        'Open',
        'Medium',
        '2026-03-26';
        
    INSERT INTO [dbo].[Tasks] ([ProjectId], [Title], [Description], [Status], [Priority], [DueDate])
    SELECT 
        (SELECT Id FROM [dbo].[Projects] WHERE [Name] = 'General'),
        'Set up automated OpenClaw sync',
        'Implement automatic data import from OpenClaw conversations to admin panel',
        'Open',
        'Low',
        '2026-04-01';
        
    INSERT INTO [dbo].[Tasks] ([ProjectId], [Title], [Description], [Status], [Priority], [DueDate])
    SELECT 
        (SELECT Id FROM [dbo].[Projects] WHERE [Name] = 'Logenix'),
        'BlazorDatasheet integration',
        'Evaluate and integrate BlazorDatasheet for Excel-like grid editing',
        'Open',
        'Medium',
        '2026-03-30';
END
GO

-- =============================================
-- Sample Code Snippets
-- =============================================
IF NOT EXISTS (SELECT * FROM [dbo].[CodeSnippets] WHERE [Title] = 'HashSet Filter Intersection Pattern')
BEGIN
    INSERT INTO [dbo].[CodeSnippets] ([ProjectId], [Title], [Description], [Language], [Code], [Tags])
    SELECT 
        (SELECT Id FROM [dbo].[Projects] WHERE [Name] = 'Burkson'),
        'HashSet Filter Intersection Pattern',
        'Safe pattern for merging filter results where some filters may return empty sets',
        'C#',
        'if (targetSet.Count == 0) {
    targetSet.UnionWith(sourceSet);  // First filter - add all
} else if (sourceSet.Count > 0) {
    targetSet.IntersectWith(sourceSet);  // Subsequent filters - narrow down
}
// If source is empty, skip (don''t narrow by "nothing")',
        'filter,hashset,intersection,search';
        
    INSERT INTO [dbo].[CodeSnippets] ([ProjectId], [Title], [Description], [Language], [Code], [Tags])
    SELECT 
        (SELECT Id FROM [dbo].[Projects] WHERE [Name] = 'MINTED-CORE'),
        'Syncfusion Scheduler External Drag-Drop',
        'Pattern for dragging from external TreeView to Syncfusion Scheduler',
        'C#',
        'private async Task OnNodeDragStop(DragAndDropEventArgs args)
{
    var cellData = await ScheduleRef.GetTargetCellAsync(args.Left, args.Top);
    
    if (cellData != null)
    {
        await ScheduleRef.OpenEditorAsync(cellData, CurrentAction.Add);
    }
}',
        'syncfusion,scheduler,drag-drop,treeview,blazor';
        
    INSERT INTO [dbo].[CodeSnippets] ([ProjectId], [Title], [Description], [Language], [Code], [Tags])
    SELECT 
        NULL,
        'JWT Array Claims Parsing',
        'Handle JWT claims that serialize as JSON arrays',
        'C#',
        'if (kvp.Value.ValueKind == JsonValueKind.Array)
{
    foreach (var element in kvp.Value.EnumerateArray())
        claims.Add(new Claim(kvp.Key, element.GetString()));
}
// Don''t call .ToString() on the array - returns the whole array as one string!',
        'jwt,claims,authentication,json';
END
GO

-- =============================================
-- Sample Decisions
-- =============================================
IF NOT EXISTS (SELECT * FROM [dbo].[Decisions] WHERE [Title] = 'Cookie-based authentication for MINTED-CORE')
BEGIN
    INSERT INTO [dbo].[Decisions] ([ProjectId], [Title], [Description], [Rationale], [DecisionDate])
    SELECT 
        (SELECT Id FROM [dbo].[Projects] WHERE [Name] = 'MINTED-CORE'),
        'Cookie-based authentication for MINTED-CORE',
        'Migrate from browser storage (localStorage/sessionStorage) to ASP.NET Core cookie authentication',
        'Browser storage is vulnerable to XSS attacks. Cookie auth with HttpOnly and Secure flags provides better security. Also enables proper server-side session management with 8-hour sliding expiration.',
        '2026-02-18';
        
    INSERT INTO [dbo].[Decisions] ([ProjectId], [Title], [Description], [Rationale], [DecisionDate])
    SELECT 
        (SELECT Id FROM [dbo].[Projects] WHERE [Name] = 'General'),
        'Local Ollama for code sub-agents',
        'Use local Ollama instance on Mac Studio for coder and code-reviewer sub-agents instead of cloud APIs',
        'Cost savings on sub-agent API calls. Mac Studio M3 Max with 96GB RAM can run qwen2.5-coder:32b and llama3.1:70b models efficiently. Keep Opus for main agent only.',
        '2026-03-20';
        
    INSERT INTO [dbo].[Decisions] ([ProjectId], [Title], [Description], [Rationale], [DecisionDate])
    SELECT 
        (SELECT Id FROM [dbo].[Projects] WHERE [Name] = 'Logenix'),
        'BlazorDatasheet for Excel-like grids',
        'Use open-source BlazorDatasheet component instead of commercial alternatives',
        'Provides Excel-like editing experience without licensing costs. Supports List<T> binding, cell formatting, validators, and change events. Good enough for internal tools.',
        '2026-02-27';
END
GO

PRINT 'Sample data inserted successfully!';
