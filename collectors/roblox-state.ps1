. (Join-Path $PSScriptRoot 'roblox-log.ps1')

function ConvertTo-RobloxHashtable {
    param($Value)
    if ($Value -is [pscustomobject]) {
        $result = @{}
        foreach ($property in $Value.PSObject.Properties) { $result[$property.Name] = ConvertTo-RobloxHashtable $property.Value }
        return $result
    }
    return $Value
}

function Save-RobloxTrackerState {
    param([string]$Path, $State)
    [void][IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName([IO.Path]::GetFullPath($Path)))
    $temporary = "$Path.$PID.tmp"
    try {
        $snapshot = @{}
        foreach ($key in $State.Keys) { $snapshot[$key] = $State[$key] }
        if ($State.ContainsKey('Cursors')) {
            $snapshot.Cursors = @{}
            foreach ($client in $State.Cursors.Keys) {
                $cursor = $State.Cursors[$client]
                # Re-read unfinished lines after a restart instead of persisting raw log text.
                $snapshot.Cursors[$client] = @{ Offset = $cursor.Offset - [Text.Encoding]::UTF8.GetByteCount($cursor.Partial); Partial = '' }
            }
        }
        [IO.File]::WriteAllText($temporary, ($snapshot | ConvertTo-Json -Depth 10), [Text.UTF8Encoding]::new($false))
        Move-Item -LiteralPath $temporary -Destination $Path -Force
    }
    finally { if (Test-Path -LiteralPath $temporary) { Remove-Item -LiteralPath $temporary } }
}

function Add-RobloxTrackedTime {
    param($State, [string]$Client, [long]$At)
    if (-not $State.Active.ContainsKey($Client)) { return }
    $session = $State.Active[$Client]
    $end = [Math]::Max($session.Floor, $At)
    $delta = ($end - $session.At) / 1000.0
    $id = $session.UniverseId
    if (-not $State.Totals.ContainsKey($id)) { $State.Totals[$id] = 0.0 }
    $State.Totals[$id] = [Math]::Max(0.0, $State.Totals[$id] + $delta)
    $session.At = $end
}

function Update-RobloxTrackedEvent {
    param($State, [string]$Client, $Event, [long]$Floor)
    $at = $Event.At.ToUnixTimeMilliseconds()
    if ($at -lt $State.StartedAt) { return }
    if (-not $State.ContainsKey('LastEvents')) { $State.LastEvents = @{} }
    if ($State.LastEvents.ContainsKey($Client) -and $at -le $State.LastEvents[$Client]) { return }
    $State.LastEvents[$Client] = $at
    Add-RobloxTrackedTime $State $Client $at
    if ($Event.Kind -eq 'leave') { $State.Active.Remove($Client); return }
    # The collector follows one player. A replacement log/client cannot overlap its predecessor.
    foreach ($other in @($State.Active.Keys)) {
        if ($other -ne $Client) { Add-RobloxTrackedTime $State $other $at; $State.Active.Remove($other) }
    }
    $start = [Math]::Max($Floor, $at)
    $State.Active[$Client] = @{ UniverseId = $Event.UniverseId; At = $start; Floor = $start }
}

function Get-RobloxPlaytime {
    $path = if ($env:ROBLOX_STATE_PATH) { $env:ROBLOX_STATE_PATH } else { Join-Path $env:LOCALAPPDATA 'Paryx\PlaytimeCollector\roblox-state.json' }
    if (-not (Test-Path -LiteralPath $path)) { return @() }
    $state = ConvertTo-RobloxHashtable (Get-Content -LiteralPath $path -Raw | ConvertFrom-Json)
    if ($state.Version -ne 1 -or $state.Totals -isnot [hashtable]) { throw 'Unsupported Roblox tracker state.' }
    foreach ($entry in $state.Totals.GetEnumerator()) {
        $seconds = [double]$entry.Value
        if ($entry.Key -notmatch '^[1-9]\d*$' -or [double]::IsNaN($seconds) -or [double]::IsInfinity($seconds) -or $seconds -lt 0) { throw 'Invalid Roblox tracker counter.' }
        [pscustomobject]@{ GameId = $entry.Key; Minutes = [long][Math]::Floor($seconds / 60.0) }
    }
}
