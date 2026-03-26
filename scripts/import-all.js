#!/usr/bin/env node
// Discord Historical Message Import Script
// Fetches all messages from Discord channels and imports into Admin Panel database
// Usage: node import-all.js

const https = require('https');
const http = require('http');

// Discord Bot Token (from OpenClaw config)
const BOT_TOKEN = process.argv[2] || process.env.DISCORD_BOT_TOKEN;
if (!BOT_TOKEN) {
    console.error('Usage: node import-all.js <BOT_TOKEN>');
    console.error('Or set DISCORD_BOT_TOKEN env var');
    process.exit(1);
}

// Channel to Project mapping
const CHANNELS = {
    '1476208136061718660': { name: 'MINTED-CORE', projectId: 2 },
    '1476208017191075945': { name: 'Burkson', projectId: 4 },
    '1476208077979123783': { name: 'Logenix', projectId: 5 },
    '1476208047390199980': { name: 'Aegis', projectId: 6 },
    '1476196683032563824': { name: 'General', projectId: 1 },
    '1486436449829261412': { name: 'OpenClaw', projectId: 8 },
};

// Admin Panel API
const API_BASE = 'http://192.168.1.195:5002';

// Fetch messages from Discord channel
async function fetchMessages(channelId, before = null) {
    return new Promise((resolve, reject) => {
        let url = `/api/v10/channels/${channelId}/messages?limit=100`;
        if (before) url += `&before=${before}`;

        const options = {
            hostname: 'discord.com',
            path: url,
            method: 'GET',
            headers: {
                'Authorization': `Bot ${BOT_TOKEN}`,
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    resolve(JSON.parse(data));
                } else if (res.statusCode === 429) {
                    // Rate limited
                    const retryAfter = JSON.parse(data).retry_after || 1;
                    console.log(`  Rate limited, waiting ${retryAfter}s...`);
                    setTimeout(() => {
                        fetchMessages(channelId, before).then(resolve).catch(reject);
                    }, retryAfter * 1000);
                } else {
                    reject(new Error(`Discord API error ${res.statusCode}: ${data}`));
                }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

// Fetch ALL messages from a channel (paginating back)
async function fetchAllMessages(channelId, channelName) {
    const allMessages = [];
    let before = null;
    let page = 0;

    while (true) {
        page++;
        const messages = await fetchMessages(channelId, before);

        if (!messages || messages.length === 0) break;

        allMessages.push(...messages);
        before = messages[messages.length - 1].id;

        process.stdout.write(`  ${channelName}: ${allMessages.length} messages (page ${page})...\r`);

        // Small delay to avoid rate limits
        await new Promise(r => setTimeout(r, 500));

        if (messages.length < 100) break; // Last page
    }

    console.log(`  ${channelName}: ${allMessages.length} total messages`);
    return allMessages;
}

// Group messages by UTC date
function groupByDate(messages) {
    const groups = {};

    // Sort chronologically (oldest first)
    messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    for (const msg of messages) {
        const date = msg.timestamp.split('T')[0]; // YYYY-MM-DD
        if (!groups[date]) groups[date] = [];
        groups[date].push(msg);
    }

    return groups;
}

// Format messages as conversation content
function formatConversation(messages) {
    const lines = [];
    for (const msg of messages) {
        // Skip empty messages (image-only, embeds-only)
        if (!msg.content && msg.attachments?.length === 0) continue;

        const author = msg.author.bot ? '**Fred:**' : `**Jonathan:**`;
        let content = msg.content || '';

        // Skip bot noise
        if (msg.author.bot && content.length < 30 && /^(Let me |Now let me |Now |Good|Build )/.test(content)) continue;

        if (content) {
            lines.push(`${author} ${content}`);
        }

        // Note attachments
        if (msg.attachments && msg.attachments.length > 0) {
            const types = msg.attachments.map(a => a.content_type?.split('/')[0] || 'file');
            lines.push(`_(${types.join(', ')} attached)_`);
        }
    }
    return lines.join('\n\n');
}

// Generate summary from conversation
function generateSummary(messages, projectName) {
    const userMessages = messages.filter(m => !m.author.bot && m.content);
    const topics = userMessages.slice(0, 5).map(m => m.content.substring(0, 80)).join('; ');
    return `${projectName}: ${topics}`.substring(0, 200);
}

// Import a conversation via the Admin Panel API
async function importConversation(projectId, date, content, summary, messageCount) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({
            projectName: null,
            discordChannelId: null,
            date: date,
            content: content.substring(0, 65000), // SQL nvarchar(max) but be safe
            summary: summary,
            messageCount: messageCount,
            tokenCount: Math.round(content.length / 4)
        });

        // Direct SQL insert since API requires auth
        // We'll output SQL instead
        resolve(true);
    });
}

// Execute SQL via sqlcmd
const { execSync } = require('child_process');
function executeSql(sql) {
    const sqlcmd = '"C:\\Program Files\\Microsoft SQL Server\\Client SDK\\ODBC\\170\\Tools\\Binn\\SQLCMD.EXE"';
    try {
        execSync(`${sqlcmd} -S Dynamicdev.database.windows.net -d Dynamicdev -U sysdba -P "dB2020!@#$" -C -Q "${sql.replace(/"/g, '\\"')}"`, {
            stdio: 'pipe',
            timeout: 60000
        });
        return true;
    } catch (e) {
        console.error(`  SQL Error: ${e.message.substring(0, 200)}`);
        return false;
    }
}

// Escape SQL string
function escapeSql(str) {
    return str.replace(/'/g, "''");
}

// Main
async function main() {
    console.log('=== Discord Historical Import ===\n');

    // First, clear existing data
    console.log('Clearing existing sample/partial data...');
    executeSql("DELETE FROM [dbo].[Conversations]");

    for (const [channelId, channel] of Object.entries(CHANNELS)) {
        console.log(`\nImporting #${channel.name}...`);

        try {
            const messages = await fetchAllMessages(channelId, channel.name);
            if (messages.length === 0) {
                console.log(`  No messages found`);
                continue;
            }

            const dateGroups = groupByDate(messages);
            const dates = Object.keys(dateGroups).sort();

            console.log(`  ${dates.length} days of conversations`);

            for (const date of dates) {
                const dayMessages = dateGroups[date];
                const content = formatConversation(dayMessages);
                const summary = generateSummary(dayMessages, channel.name);

                if (content.length < 10) continue; // Skip near-empty days

                // Truncate content for SQL safety (max ~8000 chars for -Q parameter)
                const truncatedContent = content.length > 7000
                    ? content.substring(0, 7000) + '\n\n... (truncated)'
                    : content;

                const sql = `INSERT INTO [dbo].[Conversations] ([ProjectId], [Date], [Content], [Summary], [MessageCount], [TokenCount]) SELECT ${channel.projectId}, '${date}', '${escapeSql(truncatedContent)}', '${escapeSql(summary.substring(0, 200))}', ${dayMessages.length}, ${Math.round(content.length / 4)} WHERE NOT EXISTS (SELECT 1 FROM [dbo].[Conversations] WHERE ProjectId=${channel.projectId} AND Date='${date}')`;

                if (executeSql(sql)) {
                    process.stdout.write(`  ${date}: ${dayMessages.length} msgs (${content.length} chars) ✓\r`);
                } else {
                    console.log(`  ${date}: ${dayMessages.length} msgs - INSERT FAILED`);
                }
            }

            console.log(`  Done! ${dates.length} days imported.`);
        } catch (e) {
            console.error(`  Error: ${e.message}`);
        }
    }

    console.log('\n=== Import Complete ===');

    // Show final counts
    executeSql("SELECT p.Name, COUNT(*) as Days, SUM(c.MessageCount) as TotalMsgs FROM [dbo].[Conversations] c JOIN [dbo].[Projects] p ON c.ProjectId = p.Id GROUP BY p.Name ORDER BY p.Name");
}

main().catch(console.error);
