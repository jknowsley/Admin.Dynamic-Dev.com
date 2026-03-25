# Import Discord conversations to Admin Panel database
# This reads messages from Discord channels and imports them into the Conversations table

param(
    [int]$MessageLimit = 100
)

$sqlcmd = "C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\SQLCMD.EXE"
$server = "Dynamicdev.database.windows.net"
$database = "Dynamicdev"
$user = "sysdba"
$password = "dB2020!@#`$"

# Channel to Project mapping
$channelProjects = @{
    "1476196683032563824" = @{ Name = "General"; Id = 1 }
    "1476208136061718660" = @{ Name = "MINTED-CORE"; Id = 2 }
    "1476208105036714054" = @{ Name = "MINTED"; Id = 3 }
    "1476208017191075945" = @{ Name = "Burkson"; Id = 4 }
    "1476208077979123783" = @{ Name = "Logenix"; Id = 5 }
    "1476208047390199980" = @{ Name = "Aegis"; Id = 6 }
    "1486436449829261412" = @{ Name = "OpenClaw"; Id = 8 }
}

Write-Host "Discord Conversation Import" -ForegroundColor Cyan
Write-Host "===========================" -ForegroundColor Cyan

foreach ($channelId in $channelProjects.Keys) {
    $project = $channelProjects[$channelId]
    Write-Host "`nProcessing channel: $($project.Name) ($channelId)" -ForegroundColor Yellow
    
    # This would need to use the OpenClaw message tool to read messages
    # For now, outputting what would be done
    Write-Host "  Would read $MessageLimit messages from Discord channel"
    Write-Host "  Group by date and format content"
    Write-Host "  Insert into Conversations table with ProjectId = $($project.Id)"
}

Write-Host "`nNote: This script needs to be run via OpenClaw to access Discord API" -ForegroundColor Magenta
