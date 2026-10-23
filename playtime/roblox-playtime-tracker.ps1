[CmdletBinding()]
param(
    [string]$LogDirectory = (Join-Path $env:LOCALAPPDATA 'Roblox\logs'),
    [string]$StatePath = (Join-Path $env:LOCALAPPDATA 'Paryx\PlaytimeCollector\roblox-state.json'),
    [ValidateRange(30, 86400)][int]$UploadIntervalSeconds = 300,
    [switch]$NoUpload,
    [switch]$Once
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'collectors\roblox-state.ps1')
. (Join-Path $PSScriptRoot 'collectors\event-log.ps1')

function Get-RobloxTrackerName {
    param([string]$UniverseId, [hashtable]$Names, [hashtable]$Attempted)
    if ($Names.ContainsKey($UniverseId)) { return $Names[$UniverseId] }
    if (-not $Attempted.ContainsKey($UniverseId)) {
        $Attempted[$UniverseId] = $true
        try {
            $response = Invoke-RestMethod -Uri "https://games.roblox.com/v1/games?universeIds=$UniverseId" -TimeoutSec 5
            $game = @($response.data | Where-Object { [string]$_.id -eq $UniverseId })
            if ($game.Count -and -not [string]::IsNullOrWhiteSpace($game[0].name)) {
                $Names[$UniverseId] = [string]$game[0].name
                return $Names[$UniverseId]
            }
        }
        catch { Write-Warning "Name lookup unavailable for universe $UniverseId." }
    }
    return 'Unknown experience'
}

function Write-RobloxTrackerLeave {
    param($State, $Session, [string]$Reason, [hashtable]$Names, [hashtable]$Attempted, [string]$EventLog)
    $name = Get-RobloxTrackerName $Session.UniverseId $Names $Attempted
    $place = if ($Session.ContainsKey('PlaceId')) { $Session.PlaceId } else { 'unknown' }
    $duration = if ($Session.ContainsKey('StartedTotal') -and $State.Totals.ContainsKey($Session.UniverseId)) {
        ' - {0:N1}s' -f [Math]::Max(0.0, ([double]$State.Totals[$Session.UniverseId] - [double]$Session.StartedTotal))
    } else { '' }
    $message = "LEFT   {0} - place {1}, universe {2}{3} ({4})" -f $name, $place, $Session.UniverseId, $duration, $Reason
    Write-PlaytimeEvent $message $EventLog
}

function Get-RobloxUploadSummary {
    param($State, [hashtable]$Names, [hashtable]$Attempted)
    $initial = -not $State.ContainsKey('LastUploadTotals')
    $snapshot = @{}
    $changes = [Collections.Generic.List[string]]::new()
    foreach ($entry in ($State.Totals.GetEnumerator() | Sort-Object Key)) {
        $minutes = [long][Math]::Floor([double]$entry.Value / 60.0)
        $snapshot[$entry.Key] = $minutes
        $previous = if (-not $initial -and $State.LastUploadTotals.ContainsKey($entry.Key)) {
            [long]$State.LastUploadTotals[$entry.Key]
        } else { 0L }
        $increase = [Math]::Max(0L, $minutes - $previous)
        if ($increase -eq 0) { continue }
        $name = Get-RobloxTrackerName $entry.Key $Names $Attempted
        $changes.Add((Format-PlaytimeHours $increase $name))
    }
    $label = if ($initial) { 'current tracked totals' } else { 'new tracked time' }
    $description = if ($changes.Count) { "$label`: $($changes -join ', ')" } else { 'no new whole Roblox minutes' }
    return [pscustomobject]@{ Description = $description; Totals = $snapshot }
}

function Invoke-RobloxTracker {
    param([string]$Logs, [string]$Path, [int]$UploadInterval, [bool]$Offline, [bool]$SinglePoll)
    $hash = [Security.Cryptography.SHA256]::Create()
    try { $key = [BitConverter]::ToString($hash.ComputeHash([Text.Encoding]::UTF8.GetBytes([IO.Path]::GetFullPath($Path)))).Replace('-', '') }
    finally { $hash.Dispose() }
    $mutex = [Threading.Mutex]::new($false, "Local\ParyxRoblox-$key")
    $locked = $false
    try {
        try { $locked = $mutex.WaitOne(0) } catch [Threading.AbandonedMutexException] { $locked = $true }
        if (-not $locked) { Write-Output 'Roblox tracker already running.'; return }
        $now = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
        if (Test-Path -LiteralPath $Path) {
            $state = ConvertTo-RobloxHashtable (Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json)
            if ($state.Version -ne 1) { throw 'Unsupported Roblox tracker state. Existing totals were preserved.' }
            # Resume the identity, but never invent playtime while the tracker was stopped.
            foreach ($active in $state.Active.Values) { $active.At = $now; $active.Floor = $now }
        }
        else {
            $state = @{ Version = 1; StartedAt = $now; UpdatedAt = $now; Totals = @{}; Active = @{}; Cursors = @{} }
            if (Test-Path -LiteralPath $Logs) {
                foreach ($file in (Get-ChildItem -LiteralPath $Logs -Filter '*_Player_*_last.log' -File | Where-Object Name -NotMatch 'CrashHandler')) {
                    $state.Cursors[$file.FullName] = @{ Offset = $file.Length; Partial = '' }
                }
                $running = @(Get-Process -Name RobloxPlayerBeta -ErrorAction SilentlyContinue)
                if ($running.Count -eq 1) {
                    $currentLog = Get-ChildItem -LiteralPath $Logs -Filter '*_Player_*_last.log' -File |
                        Where-Object { $_.Name -notmatch 'CrashHandler' -and $_.LastWriteTimeUtc -ge $running[0].StartTime.ToUniversalTime() } |
                        Sort-Object LastWriteTimeUtc -Descending | Select-Object -First 1
                    if ($null -ne $currentLog) {
                        $cursor = @{ Offset = 0L; Partial = '' }
                        $recent = @(Read-RobloxLogEvents $currentLog.FullName $cursor | Where-Object { $_.At.UtcDateTime -ge $running[0].StartTime.ToUniversalTime() })
                        if ($recent.Count -and $recent[-1].Kind -eq 'join') {
                            $state.Active[$currentLog.FullName] = @{
                                UniverseId = $recent[-1].UniverseId; PlaceId = $recent[-1].PlaceId
                                At = $now; Floor = $now
                            }
                        }
                        $state.Cursors[$currentLog.FullName] = $cursor
                    }
                }
            }
        }
        $lastUpload = 0L
        $uploadProcess = $null
        $uploadReported = $true
        $uploadSnapshot = @{}
        $floor = $now
        $gameNames = @{}
        $nameAttempts = @{}
        $eventLog = Join-Path ([IO.Path]::GetDirectoryName([IO.Path]::GetFullPath($Path))) 'game-time-collector.log'
        $cataloguePath = Join-Path $PSScriptRoot '..\www\public\assets\games\roblox-games.js'
        $catalogue = (Get-Content -LiteralPath $cataloguePath -Raw) -replace '^\s*export const robloxGames = ', '' -replace ';\s*$', ''
        foreach ($game in ($catalogue | ConvertFrom-Json)) {
            $gameNames[[string]$game.roblox.universeId] = [string]$game.title
        }
        if (-not $state.ContainsKey('Games')) { $state.Games = @{} }
        $knownUniverseIds = @($state.Totals.Keys) + @($state.Active.Values | ForEach-Object { [string]$_.UniverseId }) |
            Sort-Object -Unique
        foreach ($universeId in $knownUniverseIds) {
            if (-not $state.Games.ContainsKey($universeId)) {
                $name = Get-RobloxTrackerName $universeId $gameNames $nameAttempts
                $state.Games[$universeId] = @{ Name = $name; PlaceIds = @() }
            }
            elseif ([string]::IsNullOrWhiteSpace([string]$state.Games[$universeId].Name) -or $state.Games[$universeId].Name -eq 'Unknown experience') {
                $name = Get-RobloxTrackerName $universeId $gameNames $nameAttempts
                $state.Games[$universeId].Name = $name
            }
            foreach ($active in @($state.Active.Values | Where-Object { [string]$_.UniverseId -eq $universeId })) {
                if ([string]$active.PlaceId -notin @($state.Games[$universeId].PlaceIds)) {
                    $state.Games[$universeId].PlaceIds = @($state.Games[$universeId].PlaceIds) + [string]$active.PlaceId
                }
            }
        }
        Write-Output "Roblox tracker active. State: $Path"
        do {
            $now = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
            if ($now - $state.UpdatedAt -gt 15000) {
                # Suspend/resume and long stalls must not turn into hours of fabricated playtime.
                $floor = $now
                foreach ($active in $state.Active.Values) { $active.At = $now; $active.Floor = $now }
            }
            $events = [Collections.Generic.List[object]]::new()
            if (Test-Path -LiteralPath $Logs) {
                $files = @(Get-ChildItem -LiteralPath $Logs -Filter '*_Player_*_last.log' -File | Where-Object Name -NotMatch 'CrashHandler')
                foreach ($file in $files) {
                    if (-not $state.Cursors.ContainsKey($file.FullName)) { $state.Cursors[$file.FullName] = @{ Offset = 0L; Partial = '' } }
                    try {
                        foreach ($event in @(Read-RobloxLogEvents $file.FullName $state.Cursors[$file.FullName])) {
                            $events.Add([pscustomobject]@{ Client = $file.FullName; Event = $event })
                        }
                    }
                    catch [IO.IOException] { Write-Warning 'Roblox log temporarily unavailable; retrying.' }
                }
                foreach ($old in @($state.Cursors.Keys)) {
                    if ($old -notin @($files | ForEach-Object FullName)) {
                        $state.Cursors.Remove($old)
                        if ($state.Active.ContainsKey($old)) {
                            Write-RobloxTrackerLeave $state $state.Active[$old] 'log removed' $gameNames $nameAttempts $eventLog
                            $state.Active.Remove($old)
                        }
                    }
                }
            }
            foreach ($item in ($events | Sort-Object { $_.Event.At })) {
                $client = $item.Client
                $event = $item.Event
                $eventTime = $event.At.ToUnixTimeMilliseconds()
                if ($eventTime -lt $state.StartedAt -or
                    ($state.ContainsKey('LastEvents') -and $state.LastEvents.ContainsKey($client) -and
                        $eventTime -le $state.LastEvents[$client])) { continue }
                $before = @{}
                foreach ($key in $state.Active.Keys) { $before[$key] = $state.Active[$key] }
                Update-RobloxTrackedEvent $state $client $event $floor
                foreach ($key in $before.Keys) {
                    if (-not $state.Active.ContainsKey($key) -or
                        -not [object]::ReferenceEquals($before[$key], $state.Active[$key])) {
                        $reason = if ($event.Kind -eq 'leave') { 'disconnect' } else { 'next join' }
                        Write-RobloxTrackerLeave $state $before[$key] $reason $gameNames $nameAttempts $eventLog
                    }
                }
                if ($event.Kind -eq 'join' -and $state.Active.ContainsKey($client)) {
                    $name = Get-RobloxTrackerName $event.UniverseId $gameNames $nameAttempts
                    $state.Games[$event.UniverseId].Name = $name
                    $message = "JOINED {0} - place {1}, universe {2}" -f $name, $event.PlaceId, $event.UniverseId
                    Write-PlaytimeEvent $message $eventLog
                }
            }
            $players = @(Get-Process -Name RobloxPlayerBeta -ErrorAction SilentlyContinue)
            foreach ($client in @($state.Active.Keys)) {
                if ($players.Count -eq 1) { Add-RobloxTrackedTime $state $client $now }
                elseif ($players.Count -eq 0) {
                    Write-RobloxTrackerLeave $state $state.Active[$client] 'player exited' $gameNames $nameAttempts $eventLog
                    $state.Active.Remove($client)
                }
                else { $state.Active[$client].At = $now; $state.Active[$client].Floor = $now }
            }
            $state.UpdatedAt = $now
            Save-RobloxTrackerState $Path $state
            if ($null -ne $uploadProcess -and $uploadProcess.HasExited -and -not $uploadReported) {
                $uploadReported = $true
                if ($uploadProcess.ExitCode -eq 0) {
                    $state.LastUploadTotals = $uploadSnapshot
                    Save-RobloxTrackerState $Path $state
                    Write-PlaytimeCheck 'check finished successfully.' $eventLog
                }
                else {
                    Write-PlaytimeEvent 'UPLOAD check failed; it will retry on the next interval.' $eventLog
                }
            }
            if (-not $Offline -and ($now - $lastUpload) -ge ($UploadInterval * 1000) -and ($null -eq $uploadProcess -or $uploadProcess.HasExited)) {
                $oldPath = $env:ROBLOX_STATE_PATH
                try {
                    $env:ROBLOX_STATE_PATH = $Path
                    if ($null -ne $uploadProcess) { $uploadProcess.Dispose() }
                    $engine = (Get-Process -Id $PID).Path
                    $script = Join-Path $PSScriptRoot 'playtime-collector.ps1'
                    $summary = Get-RobloxUploadSummary $state $gameNames $nameAttempts
                    $uploadProcess = Start-Process -FilePath $engine -ArgumentList @('-NoProfile', '-NonInteractive', '-File', ('"' + $script + '"')) -WindowStyle Hidden -PassThru
                    $lastUpload = $now
                    $uploadSnapshot = $summary.Totals
                    $uploadReported = $false
                    Write-PlaytimeEvent "UPLOAD triggered: $($summary.Description)." $eventLog
                }
                catch {
                    $uploadProcess = $null
                    Write-PlaytimeEvent 'UPLOAD could not start; it will retry on the next interval.' $eventLog
                    $lastUpload = $now
                }
                finally { $env:ROBLOX_STATE_PATH = $oldPath }
            }
            if ($SinglePoll) { break }
            Start-Sleep -Seconds 2
        } while ($true)
    }
    finally { if ($locked) { $mutex.ReleaseMutex() }; $mutex.Dispose() }
}

if ($MyInvocation.InvocationName -ne '.') {
    Invoke-RobloxTracker $LogDirectory $StatePath $UploadIntervalSeconds $NoUpload.IsPresent $Once.IsPresent
}
