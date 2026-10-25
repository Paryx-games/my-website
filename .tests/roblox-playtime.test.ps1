Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '..\.playtime\test-roblox-playtime.ps1')

function Assert-Equal($Actual, $Expected, [string]$Message) {
    if ($Actual -ne $Expected) { throw "$Message (expected $Expected, got $Actual)" }
}
function New-JoinLine([string]$At, [string]$Place = '4991214437', [string]$Universe = '1718755273') {
    return "$At,1,abcd,6 [FLog::GameJoinLoadTime] Report game_join_loadtime: placeid:$Place, join_time:1, universeid:$Universe,"
}

$directory = Join-Path ([IO.Path]::GetTempPath()) ('roblox-playtime-test-' + [Guid]::NewGuid().ToString('N'))
[void][IO.Directory]::CreateDirectory($directory)
try {
    $tracker = @{
        StartedAt = [DateTimeOffset]::Parse('2026-10-17T12:00:00Z')
        Games = @{ '1718755273' = @{ Id = 'town'; Title = 'town' } }
        Active = @{}; Sessions = [Collections.Generic.List[object]]::new()
    }
    $old = ConvertFrom-RobloxSessionLine (New-JoinLine '2026-10-17T11:59:00Z')
    Add-RobloxTestEvent $tracker 'client' $old
    Assert-Equal $tracker.Sessions.Count 0 'Historical events excluded'
    $join = ConvertFrom-RobloxSessionLine (New-JoinLine '2026-10-17T12:00:10Z')
    Add-RobloxTestEvent $tracker 'client' $join
    Add-RobloxTestEvent $tracker 'client' $join
    Assert-Equal $tracker.Sessions.Count 1 'Duplicate join ignored'
    Assert-Equal $tracker.Sessions[0].GameId 'town' 'Known universe mapped'
    $noise = ConvertFrom-RobloxSessionLine '2026-10-17T12:00:20Z,1,abcd,6 [DFLog::SignalRCoreError] Disconnected - stop() called'
    Assert-Equal ($null -eq $noise) $true 'Unrelated disconnect ignored'
    $teleport = ConvertFrom-RobloxSessionLine (New-JoinLine '2026-10-17T12:01:10Z' '123' '1718755273')
    Add-RobloxTestEvent $tracker 'client' $teleport
    Assert-Equal $tracker.Sessions[0].Seconds 60 'Next join closes prior place'
    $leave = ConvertFrom-RobloxSessionLine '2026-10-17T12:01:40Z,1,abcd,6,Info [DFLog::NetworkClient] Client:Disconnect'
    Add-RobloxTestEvent $tracker 'client' $leave
    Add-RobloxTestEvent $tracker 'client' $leave
    Assert-Equal $tracker.Active.Count 0 'Repeated disconnect is harmless'
    $totals = @(Save-RobloxTestReport $tracker $directory ([DateTimeOffset]::Parse('2026-10-17T12:02:00Z')))
    Assert-Equal $totals.Count 1 'Places grouped into one universe'
    Assert-Equal $totals[0].Seconds 90 'Seconds retained across sub-minute sessions'
    Assert-Equal $totals[0].Minutes 1 'Floor only after aggregation'
    $report = Get-Content -LiteralPath (Join-Path $directory 'report.json') -Raw | ConvertFrom-Json
    Assert-Equal $report.Sessions.Count 2 'Session report readable'
    Assert-Equal @(Import-Csv -LiteralPath (Join-Path $directory 'sessions.csv')).Count 2 'CSV readable'

    $path = Join-Path $directory 'fixture.log'
    $cursor = @{ Offset = 0L; Partial = '' }
    $line = New-JoinLine '2026-10-17T12:03:00Z' '999' '888'
    [IO.File]::WriteAllText($path, $line.Substring(0, 45))
    Assert-Equal @(Read-RobloxLogEvents $path $cursor).Count 0 'Partial line waits for completion'
    [IO.File]::AppendAllText($path, $line.Substring(45) + "`n")
    $events = @(Read-RobloxLogEvents $path $cursor)
    Assert-Equal $events.Count 1 'Completed line parsed once'
    Assert-Equal $events[0].UniverseId '888' 'Unknown universe preserved'
    Assert-Equal @(Read-RobloxLogEvents $path $cursor).Count 0 'Repeated poll does not replay events'
    [IO.File]::WriteAllText($path, "2026-10-17T12:04:00Z,1 [FLog::SingleSurfaceApp] shutDown: (stage:UGCGame).`n")
    Assert-Equal @(Read-RobloxLogEvents $path $cursor)[0].Kind 'leave' 'Truncated log cursor resets'
    Add-RobloxTestEvent $tracker 'client' $events[0]
    Assert-Equal $tracker.Sessions[2].GameId '' 'Unknown experience remains unmapped'
    Assert-Equal $tracker.Active.Count 1 'Unknown experience still tracked'
    Write-Output 'Roblox tracker tests passed: joins, teleports, disconnects, deduplication, partial reads, truncation, unknown games and reports.'
}
finally {
    Get-ChildItem -LiteralPath $directory -File | Remove-Item
    Remove-Item -LiteralPath $directory
}
