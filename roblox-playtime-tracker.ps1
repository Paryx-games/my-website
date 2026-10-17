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
                            $state.Active[$currentLog.FullName] = @{ UniverseId = $recent[-1].UniverseId; At = $now; Floor = $now }
                        }
                        $state.Cursors[$currentLog.FullName] = $cursor
                    }
                }
            }
        }
        $lastUpload = 0L
        $uploadProcess = $null
        $floor = $now
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
                    if ($old -notin @($files | ForEach-Object FullName)) { $state.Cursors.Remove($old); $state.Active.Remove($old) }
                }
            }
            foreach ($item in ($events | Sort-Object { $_.Event.At })) { Update-RobloxTrackedEvent $state $item.Client $item.Event $floor }
            $players = @(Get-Process -Name RobloxPlayerBeta -ErrorAction SilentlyContinue)
            foreach ($client in @($state.Active.Keys)) {
                if ($players.Count -eq 1) { Add-RobloxTrackedTime $state $client $now }
                elseif ($players.Count -eq 0) { $state.Active.Remove($client) }
                else { $state.Active[$client].At = $now; $state.Active[$client].Floor = $now }
            }
            $state.UpdatedAt = $now
            Save-RobloxTrackerState $Path $state
            if (-not $Offline -and ($now - $lastUpload) -ge ($UploadInterval * 1000) -and ($null -eq $uploadProcess -or $uploadProcess.HasExited)) {
                $lastUpload = $now
                $oldPath = $env:ROBLOX_STATE_PATH
                try {
                    $env:ROBLOX_STATE_PATH = $Path
                    if ($null -ne $uploadProcess) { $uploadProcess.Dispose() }
                    $engine = (Get-Process -Id $PID).Path
                    $script = Join-Path $PSScriptRoot 'playtime-collector.ps1'
                    $uploadProcess = Start-Process -FilePath $engine -ArgumentList @('-NoProfile', '-NonInteractive', '-File', ('"' + $script + '"')) -WindowStyle Hidden -PassThru
                }
                catch { Write-Warning 'Playtime upload failed; saved totals will retry on the next upload interval.' }
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
