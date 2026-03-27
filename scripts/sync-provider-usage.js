const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const sessionsDir = path.join(process.env.USERPROFILE, '.openclaw', 'agents', 'main', 'sessions');
const sqlcmd = 'C:\\Program Files\\Microsoft SQL Server\\Client SDK\\ODBC\\170\\Tools\\Binn\\SQLCMD.EXE';
const connection = {
  server: 'Dynamicdev.database.windows.net',
  database: 'Dynamicdev',
  user: 'sysdba',
  password: 'dB2020!@#$'
};

function newProvider(provider, displayName) {
  return {
    provider,
    displayName,
    status: 'No data',
    isHealthy: false,
    requests: 0,
    errors: 0,
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    totalTokens: 0,
    totalCost: 0,
    lastUsed: null,
    lastError: null,
    models: {}
  };
}

const providers = {
  anthropic: newProvider('anthropic', 'Claude'),
  openai: newProvider('openai', 'GPT'),
  google: newProvider('google', 'Gemini')
};

if (!fs.existsSync(sessionsDir)) {
  console.error(`Sessions directory not found: ${sessionsDir}`);
  process.exit(1);
}

for (const file of fs.readdirSync(sessionsDir).filter(f => f.endsWith('.jsonl'))) {
  const fullPath = path.join(sessionsDir, file);
  const lines = fs.readFileSync(fullPath, 'utf8').split(/\r?\n/).filter(Boolean);

  for (const line of lines) {
    let row;
    try {
      row = JSON.parse(line);
    } catch {
      continue;
    }

    if (row.type !== 'message' || !row.message) continue;
    const msg = row.message;
    if (msg.role !== 'assistant') continue;

    const bucket = providers[msg.provider];
    if (!bucket) continue;

    bucket.requests++;

    if (row.timestamp && (!bucket.lastUsed || row.timestamp > bucket.lastUsed)) {
      bucket.lastUsed = row.timestamp;
    }

    if (msg.model) {
      bucket.models[msg.model] = (bucket.models[msg.model] || 0) + 1;
    }

    let isError = false;
    if (msg.stopReason === 'error') isError = true;
    if (msg.errorMessage) {
      isError = true;
      bucket.lastError = String(msg.errorMessage).slice(0, 2000);
    }
    if (isError) bucket.errors++;

    const usage = msg.usage || {};
    bucket.inputTokens += usage.input || 0;
    bucket.outputTokens += usage.output || 0;
    bucket.cacheReadTokens += usage.cacheRead || 0;
    bucket.cacheWriteTokens += usage.cacheWrite || 0;
    bucket.totalTokens += usage.totalTokens || 0;
    if (usage.cost && typeof usage.cost.total === 'number') {
      bucket.totalCost += usage.cost.total;
    }
  }
}

for (const provider of Object.values(providers)) {
  if (provider.requests === 0) {
    provider.status = 'No data';
    provider.isHealthy = false;
  } else if (provider.errors === 0) {
    provider.status = 'Healthy';
    provider.isHealthy = true;
  } else {
    const errorRate = provider.errors / provider.requests;
    provider.status = errorRate >= 0.5 ? 'Degraded' : 'Active';
    provider.isHealthy = provider.status === 'Healthy' || provider.status === 'Active';
  }
}

function sqlEscape(value) {
  if (value === null || value === undefined) return 'NULL';
  return `N'${String(value).replace(/'/g, "''")}'`;
}

const statements = Object.values(providers).map(p => {
  const modelsJson = JSON.stringify(Object.entries(p.models)
    .map(([name, requests]) => ({ name, requests }))
    .sort((a, b) => b.requests - a.requests));

  return `MERGE [dbo].[ProviderUsageSnapshots] AS target
USING (SELECT ${sqlEscape(p.provider)} AS Provider) AS source
ON target.Provider = source.Provider
WHEN MATCHED THEN UPDATE SET
    DisplayName = ${sqlEscape(p.displayName)},
    Status = ${sqlEscape(p.status)},
    IsHealthy = ${p.isHealthy ? 1 : 0},
    Requests = ${p.requests},
    Errors = ${p.errors},
    InputTokens = ${p.inputTokens},
    OutputTokens = ${p.outputTokens},
    CacheReadTokens = ${p.cacheReadTokens},
    CacheWriteTokens = ${p.cacheWriteTokens},
    TotalTokens = ${p.totalTokens},
    TotalCost = ${p.totalCost.toFixed(6)},
    LastUsed = ${sqlEscape(p.lastUsed)},
    LastError = ${sqlEscape(p.lastError)},
    ModelsJson = ${sqlEscape(modelsJson)},
    SnapshotAtUtc = SYSUTCDATETIME()
WHEN NOT MATCHED THEN
    INSERT (Provider, DisplayName, Status, IsHealthy, Requests, Errors, InputTokens, OutputTokens, CacheReadTokens, CacheWriteTokens, TotalTokens, TotalCost, LastUsed, LastError, ModelsJson, SnapshotAtUtc)
    VALUES (${sqlEscape(p.provider)}, ${sqlEscape(p.displayName)}, ${sqlEscape(p.status)}, ${p.isHealthy ? 1 : 0}, ${p.requests}, ${p.errors}, ${p.inputTokens}, ${p.outputTokens}, ${p.cacheReadTokens}, ${p.cacheWriteTokens}, ${p.totalTokens}, ${p.totalCost.toFixed(6)}, ${sqlEscape(p.lastUsed)}, ${sqlEscape(p.lastError)}, ${sqlEscape(modelsJson)}, SYSUTCDATETIME());`;
});

const sql = statements.join('\n\n');
const tempFile = path.join(os.tmpdir(), 'sync-provider-usage.sql');
fs.writeFileSync(tempFile, sql, 'utf8');

try {
  execFileSync(sqlcmd, [
    '-S', connection.server,
    '-d', connection.database,
    '-U', connection.user,
    '-P', connection.password,
    '-C',
    '-i', tempFile
  ], { stdio: 'inherit' });

  console.log('Provider usage synced to SQL successfully.');
} finally {
  try { fs.unlinkSync(tempFile); } catch {}
}
