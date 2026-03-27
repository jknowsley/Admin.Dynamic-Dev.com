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

function emptyProviders() {
  return {
    anthropic: newProvider('anthropic', 'Claude'),
    openai: newProvider('openai', 'GPT'),
    google: newProvider('google', 'Gemini')
  };
}

function getRanges() {
  const now = new Date();
  const startToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const endNow = now;
  const startLast7 = new Date(startToday);
  startLast7.setUTCDate(startLast7.getUTCDate() - 6);
  const startYear = new Date(Date.UTC(2026, 0, 1));

  return [
    { key: 'today', start: startToday, end: endNow },
    { key: 'last7days', start: startLast7, end: endNow },
    { key: 'daterange', start: startYear, end: endNow }
  ];
}

function applyUsage(bucket, row) {
  const msg = row.message;
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

function finalizeProvider(provider) {
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

function iso(dt) {
  return dt.toISOString();
}

if (!fs.existsSync(sessionsDir)) {
  console.error(`Sessions directory not found: ${sessionsDir}`);
  process.exit(1);
}

const ranges = getRanges();
const aggregateByRange = Object.fromEntries(ranges.map(r => [r.key, emptyProviders()]));

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
    if (row.message.role !== 'assistant') continue;
    if (!aggregateByRange.today[row.message.provider]) continue;
    if (!row.timestamp) continue;

    const ts = new Date(row.timestamp);
    if (Number.isNaN(ts.getTime())) continue;

    for (const range of ranges) {
      if (ts >= range.start && ts <= range.end) {
        applyUsage(aggregateByRange[range.key][row.message.provider], row);
      }
    }
  }
}

for (const range of ranges) {
  for (const provider of Object.values(aggregateByRange[range.key])) {
    finalizeProvider(provider);
  }
}

const statements = [];
for (const range of ranges) {
  for (const provider of Object.values(aggregateByRange[range.key])) {
    const modelsJson = JSON.stringify(Object.entries(provider.models)
      .map(([name, requests]) => ({ name, requests }))
      .sort((a, b) => b.requests - a.requests));

    statements.push(`MERGE [dbo].[ProviderUsageSnapshots] AS target
USING (SELECT ${sqlEscape(provider.provider)} AS Provider, ${sqlEscape(range.key)} AS RangeKey) AS source
ON target.Provider = source.Provider AND target.RangeKey = source.RangeKey
WHEN MATCHED THEN UPDATE SET
    DisplayName = ${sqlEscape(provider.displayName)},
    Status = ${sqlEscape(provider.status)},
    IsHealthy = ${provider.isHealthy ? 1 : 0},
    Requests = ${provider.requests},
    Errors = ${provider.errors},
    InputTokens = ${provider.inputTokens},
    OutputTokens = ${provider.outputTokens},
    CacheReadTokens = ${provider.cacheReadTokens},
    CacheWriteTokens = ${provider.cacheWriteTokens},
    TotalTokens = ${provider.totalTokens},
    TotalCost = ${provider.totalCost.toFixed(6)},
    LastUsed = ${sqlEscape(provider.lastUsed)},
    LastError = ${sqlEscape(provider.lastError)},
    ModelsJson = ${sqlEscape(modelsJson)},
    SnapshotAtUtc = SYSUTCDATETIME(),
    RangeStartUtc = ${sqlEscape(iso(range.start))},
    RangeEndUtc = ${sqlEscape(iso(range.end))}
WHEN NOT MATCHED THEN
    INSERT (Provider, DisplayName, Status, IsHealthy, Requests, Errors, InputTokens, OutputTokens, CacheReadTokens, CacheWriteTokens, TotalTokens, TotalCost, LastUsed, LastError, ModelsJson, SnapshotAtUtc, RangeKey, RangeStartUtc, RangeEndUtc)
    VALUES (${sqlEscape(provider.provider)}, ${sqlEscape(provider.displayName)}, ${sqlEscape(provider.status)}, ${provider.isHealthy ? 1 : 0}, ${provider.requests}, ${provider.errors}, ${provider.inputTokens}, ${provider.outputTokens}, ${provider.cacheReadTokens}, ${provider.cacheWriteTokens}, ${provider.totalTokens}, ${provider.totalCost.toFixed(6)}, ${sqlEscape(provider.lastUsed)}, ${sqlEscape(provider.lastError)}, ${sqlEscape(modelsJson)}, SYSUTCDATETIME(), ${sqlEscape(range.key)}, ${sqlEscape(iso(range.start))}, ${sqlEscape(iso(range.end))});`);
  }
}

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
