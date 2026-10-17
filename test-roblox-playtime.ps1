[CmdletBinding()]
param(
    [string]$LogDirectory = (Join-Path $env:LOCALAPPDATA 'Roblox\logs'),
    [string]$OutputDirectory = (Join-Path $env:LOCALAPPDATA ('Paryx\PlaytimeCollector\RobloxTests\' + [Guid]::NewGuid().ToString('N'))),
    [ValidateRange(1, 86400)]
    [int]$DurationSeconds = 900
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'collectors\roblox-log.ps1')

function Close-RobloxTestSession {
    param($Tracker, [string]$Client, [DateTimeOffset]$At, [string]$Reason)
    if (-not $Tracker.Active.ContainsKey($Client)) { return }
    $session = $Tracker.Active[$Client]
    $session.EndedAt = $At.ToUniversalTime().ToString('o')
    $session.Seconds = [Math]::Max(0.0, ($At - [DateTimeOffset]::Parse($session.StartedAt)).TotalSeconds)
    $session.EndReason = $Reason
    $Tracker.Active.Remove($Client)
    Write-Host ("LEFT   {0} - {1:N1}s ({2})" -f $session.Title, $session.Seconds, $Reason)
}

function Add-RobloxTestEvent {
    param($Tracker, [string]$Client, $Event)
    if ($Event.At -lt $Tracker.StartedAt) { return }
    if ($Event.Kind -eq 'leave') {
        Close-RobloxTestSession $Tracker $Client $Event.At 'disconnect'
        return
    }
    if ($Tracker.Active.ContainsKey($Client)) {
        $active = $Tracker.Active[$Client]
        if ($active.PlaceId -eq $Event.PlaceId -and [DateTimeOffset]::Parse($active.StartedAt) -eq $Event.At) { return }
        Close-RobloxTestSession $Tracker $Client $Event.At 'next-join'
    }
    $title = "Unknown experience (universe $($Event.UniverseId))"
    $gameId = ''
    if ($Tracker.Games.ContainsKey($Event.UniverseId)) {
        $title = $Tracker.Games[$Event.UniverseId].Title
        $gameId = $Tracker.Games[$Event.UniverseId].Id
    }
    $session = [pscustomobject][ordered]@{
        GameId = $gameId; Title = $title; UniverseId = $Event.UniverseId
        PlaceId = $Event.PlaceId; StartedAt = $Event.At.ToUniversalTime().ToString('o')
        EndedAt = $null; Seconds = 0.0; EndReason = $null
    }
    $Tracker.Sessions.Add($session)
    $Tracker.Active[$Client] = $session
    Write-Host ("JOINED {0} - place {1}, universe {2}" -f $title, $Event.PlaceId, $Event.UniverseId)
}

function Save-RobloxTestReport {
    param($Tracker, [string]$Directory, [DateTimeOffset]$At)
    foreach ($session in $Tracker.Active.Values) {
        $session.Seconds = [Math]::Max(0.0, ($At - [DateTimeOffset]::Parse($session.StartedAt)).TotalSeconds)
    }
    $totals = @($Tracker.Sessions | Group-Object UniverseId | ForEach-Object {
        $seconds = ($_.Group | Measure-Object Seconds -Sum).Sum
        [pscustomobject]@{
            Title = $_.Group[0].Title; GameId = $_.Group[0].GameId
            UniverseId = $_.Name; Seconds = [Math]::Round($seconds, 1)
            Minutes = [Math]::Floor($seconds / 60); Sessions = $_.Count
        }
    })
    $report = [ordered]@{
        Version = 1; TestStartedAt = $Tracker.StartedAt.ToString('o'); UpdatedAt = $At.ToString('o')
        ActiveSessions = $Tracker.Active.Count; Totals = $totals; Sessions = @($Tracker.Sessions.ToArray())
        Notes = 'Local test only. Connected time includes AFK. No historical baseline or uploads. Process-exit timing is approximate.'
    }
    $path = Join-Path $Directory 'report.json'
    $temporary = "$path.tmp"
    [IO.File]::WriteAllText($temporary, ($report | ConvertTo-Json -Depth 8), [Text.UTF8Encoding]::new($false))
    Move-Item -LiteralPath $temporary -Destination $path -Force
    if ($Tracker.Sessions.Count) {
        $Tracker.Sessions | Export-Csv -LiteralPath (Join-Path $Directory 'sessions.csv') -NoTypeInformation -Encoding UTF8
    }
    return $totals
}

function Invoke-RobloxPlaytimeTest {
    param([string]$Logs, [string]$Output, [int]$Duration)
    [void][IO.Directory]::CreateDirectory($Output)
    $games = @{}
    $cataloguePath = Join-Path $PSScriptRoot 'www\public\assets\games\roblox-games.js'
    $catalogue = (Get-Content -LiteralPath $cataloguePath -Raw) -replace '^\s*export const robloxGames = ', '' -replace ';\s*$', ''
    foreach ($game in ($catalogue | ConvertFrom-Json)) {
        $games[[string]$game.roblox.universeId] = @{ Id = $game.id; Title = $game.title }
    }
    $cursors = @{}
    if (Test-Path -LiteralPath $Logs) {
        foreach ($file in (Get-ChildItem -LiteralPath $Logs -Filter '*_Player_*_last.log' -File | Where-Object Name -NotMatch 'CrashHandler')) {
            $cursors[$file.FullName] = @{ Offset = $file.Length; Partial = '' }
        }
    }
    $tracker = @{
        StartedAt = [DateTimeOffset]::UtcNow; Games = $games; Active = @{}
        Sessions = [Collections.Generic.List[object]]::new()
    }
    $attemptedNames = @{}
    $lastPoll = $tracker.StartedAt
    Write-Host "Roblox playtime test running for $Duration seconds. Press Ctrl+C to stop early."
    Write-Host 'Join games AFTER starting this test. Leave each game before joining the next.'
    Write-Host 'Use one Roblox client at a time for this test.'
    Write-Host "Reports: $Output"
    Write-Host 'Reports save every two seconds. No playtime is uploaded.'
    try {
        do {
            $events = [Collections.Generic.List[object]]::new()
            if (Test-Path -LiteralPath $Logs) {
                foreach ($file in (Get-ChildItem -LiteralPath $Logs -Filter '*_Player_*_last.log' -File | Where-Object Name -NotMatch 'CrashHandler')) {
                    if (-not $cursors.ContainsKey($file.FullName)) { $cursors[$file.FullName] = @{ Offset = 0L; Partial = '' } }
                    try {
                        foreach ($event in @(Read-RobloxLogEvents $file.FullName $cursors[$file.FullName])) {
                            $events.Add([pscustomobject]@{ Client = $file.FullName; Event = $event })
                        }
                    }
                    catch [IO.IOException] { Write-Warning 'A Roblox log is temporarily unavailable; retrying next poll.' }
                }
            }
            foreach ($item in ($events | Sort-Object { $_.Event.At })) {
                Add-RobloxTestEvent $tracker $item.Client $item.Event
            }
            if (-not (Get-Process -Name RobloxPlayerBeta -ErrorAction SilentlyContinue)) {
                foreach ($client in @($tracker.Active.Keys)) {
                    $sessionStart = [DateTimeOffset]::Parse($tracker.Active[$client].StartedAt)
                    $end = if ($lastPoll -gt $sessionStart) { $lastPoll } else { $sessionStart }
                    Close-RobloxTestSession $tracker $client $end 'player-exited (estimated)'
                }
            }
            # Names are optional; detection and reports still work offline.
            foreach ($session in $tracker.Sessions) {
                $id = $session.UniverseId
                if ($tracker.Games.ContainsKey($id) -or $attemptedNames.ContainsKey($id)) { continue }
                $attemptedNames[$id] = $true
                try {
                    $response = Invoke-RestMethod -Uri "https://games.roblox.com/v1/games?universeIds=$id" -TimeoutSec 5
                    $data = @($response.data | Where-Object { [string]$_.id -eq $id })
                    if ($data.Count -and -not [string]::IsNullOrWhiteSpace($data[0].name)) {
                        $tracker.Games[$id] = @{ Id = ''; Title = [string]$data[0].name }
                        foreach ($matching in $tracker.Sessions) {
                            if ($matching.UniverseId -eq $id) { $matching.Title = [string]$data[0].name }
                        }
                        Write-Host "IDENTIFIED universe $id as $($data[0].name)"
                    }
                }
                catch { Write-Warning "Name lookup unavailable for universe $id; its IDs and timing are still recorded." }
            }
            $lastPoll = [DateTimeOffset]::UtcNow
            Save-RobloxTestReport $tracker $Output $lastPoll | Out-Null
            if (($lastPoll - $tracker.StartedAt).TotalSeconds -ge $Duration) { break }
            Start-Sleep -Seconds 2
        } while ($true)
    }
    finally {
        $end = [DateTimeOffset]::UtcNow
        foreach ($client in @($tracker.Active.Keys)) { Close-RobloxTestSession $tracker $client $end 'test-stopped' }
        $totals = @(Save-RobloxTestReport $tracker $Output $end)
        $totals | Format-Table Title, Seconds, Minutes, Sessions -AutoSize | Out-Host
        Write-Host "Saved report: $(Join-Path $Output 'report.json')"
    }
}

if ($MyInvocation.InvocationName -ne '.') {
    Invoke-RobloxPlaytimeTest -Logs $LogDirectory -Output $OutputDirectory -Duration $DurationSeconds
}
