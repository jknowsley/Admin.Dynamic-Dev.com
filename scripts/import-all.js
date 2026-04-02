#!/usr/bin/env node
// Discord Incremental Message Import Script
// Only fetches new messages since last import, upserts today's conversation
// Usage: node import-all.js <BOT_TOKEN>

const https = require('https');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const BOT_TOKEN = process.argv[2] || process.env.DISCORD_BOT_TOKEN;
if (!BOT_TOKEN) {
    console.error('Usage: node import-all.js <BOT_TOKEN>');
    process.exit(1);
}

const CHANNELS = {
    '1476208136061718660': { name: 'MINTED-CORE', projectId: 2 },
    '1476208017191075945': { name: 'Burkson', projectId: 4 },
    '1476208077979123783': { name: 'Logenix', projectId: 5 },
    '1476208047390199980': { name: 'Aegis', projectId: 6 },
    '1476196683032563824': { name: 'General', projectId: 1 },
    '1486436449829261412': { name: 'Admin Panel', projectId: 11 },
};

const STATE_FILE = path.join(__dirname, 'import-state.json');
const SQLCMD = '"C:\\Program Files\\Microsoft SQL Server\\Client SDK\\ODBC\\170\\Tools\\Binn\\SQLCMD.EXE"';
const DB = { server: 'Dynamicdev.database.windows.net', database: 'Dynamicdev', user: 'sysdba', password: 'dB2020!@#$' };

// --- State management ---

function loadState() {
    try {
        return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    } catch {
        return {};
    }
}

function saveState(state) {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
}

// --- Discord API ---

function fetchMessages(channelId, after = null, before = null) {
    return new Promise((resolve, reject) => {
        let url = `/api/v10/channels/${channelId}/messages?limit=100`;
        if (after) url += `&after=${after}`;
        if (before) url += `&before=${before}`;

        const req = https.request({
            hostname: 'discord.com',
            path: url,
            method: 'GET',
            headers: { 'Authorization': `Bot ${BOT_TOKEN}`, 'Content-Type': 'application/json' }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    resolve(JSON.parse(data));
                } else if (res.statusCode === 429) {
                    const retryAfter = JSON.parse(data).retry_after || 1;
                    console.log(`  Rate limited, waiting ${retryAfter}s...`);
                    setTimeout(() => fetchMessages(channelId, after, before).then(resolve).catch(reject), retryAfter * 1000);
                } else {
                    reject(new Error(`Discord API error ${res.statusCode}: ${data.substring(0, 200)}`));
                }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

async function fetchNewMessages(channelId, channelName, afterId) {
    const allMessages = [];
    let after = afterId;
    let page = 0;

    while (true) {
        page++;
        const messages = await fetchMessages(channelId, after, null);
        if (!messages || messages.length === 0) break;

        // Discord returns newest first when using 'after', so sort ascending
        messages.sort((a, b) => BigInt(a.id) < BigInt(b.id) ? -1 : 1);
        allMessages.push(...messages);
        after = messages[messages.length - 1].id;

        process.stdout.write(`  ${channelName}: ${allMessages.length} new messages (page ${page})...\r`);
        await new Promise(r => setTimeout(r, 500));
        if (messages.length < 100) break;
    }

    if (allMessages.length > 0) {
        console.log(`  ${channelName}: ${allMessages.length} new messages fetched`);
    } else {
        console.log(`  ${channelName}: no new messages`);
    }
    return allMessages;
}

// --- Formatting ---

function groupByDate(messages) {
    const groups = {};
    messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    for (const msg of messages) {
        const date = msg.timestamp.split('T')[0];
        if (!groups[date]) groups[date] = [];
        groups[date].push(msg);
    }
    return groups;
}

function formatConversation(messages) {
    const lines = [];
    for (const msg of messages) {
        if (!msg.content && (!msg.attachments || msg.attachments.length === 0)) continue;
        const author = msg.author.bot ? '**Fred:**' : `**Jonathan:**`;
        let content = msg.content || '';
        if (msg.author.bot && content.length < 30 && /^(Let me |Now let me |Now |Good|Build )/.test(content)) continue;
        if (content) lines.push(`${author} ${content}`);
        if (msg.attachments && msg.attachments.length > 0) {
            const types = msg.attachments.map(a => a.content_type?.split('/')[0] || 'file');
            lines.push(`_(${types.join(', ')} attached)_`);
        }
    }
    return lines.join('\n\n');
}

function generateSummary(messages, projectName) {
    const userMessages = messages.filter(m => !m.author.bot && m.content);
    const topics = userMessages.slice(0, 5).map(m => m.content.substring(0, 80)).join('; ');
    return `${projectName}: ${topics}`.substring(0, 200);
}

// --- SQL ---

function escapeSql(str) {
    return str.replace(/'/g, "''");
}

function executeSql(sql) {
    const tmpFile = path.join(os.tmpdir(), 'import-sql-tmp.sql');
    try {
        fs.writeFileSync(tmpFile, sql, 'utf8');
        execSync(`${SQLCMD} -S ${DB.server} -d ${DB.database} -U ${DB.user} -P "${DB.password}" -C -i "${tmpFile}"`, {
            stdio: 'pipe',
            timeout: 60000
        });
        return true;
    } catch (e) {
        console.error(`  SQL Error: ${e.message.substring(0, 200)}`);
        return false;
    } finally {
        try { fs.unlinkSync(tmpFile); } catch {}
    }
}

// --- Main ---

async function main() {
    console.log('=== Discord Incremental Import ===\n');

    const state = loadState();
    const today = new Date().toISOString().split('T')[0];
    let totalNew = 0;
    let totalUpserted = 0;

    for (const [channelId, channel] of Object.entries(CHANNELS)) {
        console.log(`\nImporting #${channel.name}...`);

        try {
            const lastMessageId = state[channelId]?.lastMessageId || null;
            const messages = await fetchNewMessages(channelId, channel.name, lastMessageId);

            if (messages.length === 0) continue;
            totalNew += messages.length;

            // Track the newest message ID for next run
            const newestId = messages.reduce((max, m) => BigInt(m.id) > BigInt(max) ? m.id : max, messages[0].id);
            if (!state[channelId]) state[channelId] = {};
            state[channelId].lastMessageId = newestId;
            state[channelId].lastImport = new Date().toISOString();

            const dateGroups = groupByDate(messages);
            const dates = Object.keys(dateGroups).sort();

            for (const date of dates) {
                const dayMessages = dateGroups[date];
                const content = formatConversation(dayMessages);
                const summary = generateSummary(dayMessages, channel.name);

                if (content.length < 10) continue;

                const truncatedContent = content.length > 65000
                    ? content.substring(0, 65000) + '\n\n... (truncated)'
                    : content;

                const isToday = date === today;

                let sql;
                if (isToday) {
                    // Upsert today: update content by appending new messages, or insert if new
                    sql = `IF EXISTS (SELECT 1 FROM [dbo].[Conversations] WHERE ProjectId=${channel.projectId} AND [Date]='${date}')
BEGIN
    UPDATE [dbo].[Conversations]
    SET Content = Content + CHAR(10) + CHAR(10) + N'${escapeSql(truncatedContent)}',
        Summary = N'${escapeSql(summary.substring(0, 200))}',
        MessageCount = MessageCount + ${dayMessages.length},
        TokenCount = TokenCount + ${Math.round(content.length / 4)},
        UpdatedAt = GETUTCDATE()
    WHERE ProjectId=${channel.projectId} AND [Date]='${date}'
END
ELSE
BEGIN
    INSERT INTO [dbo].[Conversations] ([ProjectId], [Date], [Content], [Summary], [MessageCount], [TokenCount])
    VALUES (${channel.projectId}, '${date}', N'${escapeSql(truncatedContent)}', N'${escapeSql(summary.substring(0, 200))}', ${dayMessages.length}, ${Math.round(content.length / 4)})
END`;
                } else {
                    // Past days: insert only if not exists
                    sql = `INSERT INTO [dbo].[Conversations] ([ProjectId], [Date], [Content], [Summary], [MessageCount], [TokenCount])
SELECT ${channel.projectId}, '${date}', N'${escapeSql(truncatedContent)}', N'${escapeSql(summary.substring(0, 200))}', ${dayMessages.length}, ${Math.round(content.length / 4)}
WHERE NOT EXISTS (SELECT 1 FROM [dbo].[Conversations] WHERE ProjectId=${channel.projectId} AND [Date]='${date}')`;
                }

                if (executeSql(sql)) {
                    totalUpserted++;
                    process.stdout.write(`  ${date}: ${dayMessages.length} msgs (${content.length} chars) ${isToday ? '↻' : '✓'}\r`);
                } else {
                    console.log(`  ${date}: ${dayMessages.length} msgs - FAILED`);
                }
            }

            console.log(`  Done! ${dates.length} days processed.`);
        } catch (e) {
            console.error(`  Error: ${e.message}`);
        }
    }

    saveState(state);
    console.log(`\n=== Import Complete ===`);
    console.log(`New messages: ${totalNew} | Days upserted: ${totalUpserted}`);
}

main().catch(console.error);
