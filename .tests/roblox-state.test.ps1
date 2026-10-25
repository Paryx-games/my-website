Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '..\.playtime\collectors\roblox-state.ps1')
function Assert-Near($Actual, $Expected, $Message) {
    if ([Math]::Abs($Actual - $Expected) -gt 0.001) { throw "$Message (expected $Expected, got $Actual)" }
}
$directory = Join-Path ([IO.Path]::GetTempPath()) ('roblox-state-test-' + [Guid]::NewGuid().ToString('N'))
$path = Join-Path $directory 'state.json'
$oldPath = $env:ROBLOX_STATE_PATH
try {
    $state = @{ Version = 1; StartedAt = 0L; Totals = @{}; Active = @{}; Cursors = @{} }
    $join = [pscustomobject]@{ Kind = 'join'; At = [DateTimeOffset]::FromUnixTimeMilliseconds(1000); UniverseId = '123'; PlaceId = '456' }
    Update-RobloxTrackedEvent $state 'client' $join 0
    Add-RobloxTrackedTime $state 'client' 60500
    Assert-Near $state.Totals['123'] 59.5 'Fractional seconds preserved'
    $leave = [pscustomobject]@{ Kind = 'leave'; At = [DateTimeOffset]::FromUnixTimeMilliseconds(60000) }
    Update-RobloxTrackedEvent $state 'client' $leave 0
    Assert-Near $state.Totals['123'] 59 'Late disconnect corrects provisional time'
    $join.At = [DateTimeOffset]::FromUnixTimeMilliseconds(61000)
    Update-RobloxTrackedEvent $state 'client' $join 0
    if ($state.Games['123'].PlaceIds -notcontains '456') { throw 'Observed Roblox place IDs must be retained.' }
    $state.Games['123'].Name = 'Test experience'
    Add-RobloxTrackedTime $state 'client' 62500
    Save-RobloxTrackerState $path $state
    $restored = ConvertTo-RobloxHashtable (Get-Content -LiteralPath $path -Raw | ConvertFrom-Json)
    Assert-Near $restored.Totals['123'] 60.5 'Counters survive restart'
    $env:ROBLOX_STATE_PATH = $path
    $entries = @(Get-RobloxPlaytime)
    Assert-Near $entries[0].Minutes 1 'Floor only after all sessions are accumulated'
    if ($entries[0].Name -ne 'Test experience' -or $entries[0].PlaceIds -notcontains '456') {
        throw 'Roblox experience names and place IDs must be emitted with uploaded totals.'
    }
    $restored.Active.client.At = 100000
    $restored.Active.client.Floor = 100000
    Add-RobloxTrackedTime $restored 'client' 102000
    Assert-Near $restored.Totals['123'] 62.5 'Offline restart gap excluded'
    Update-RobloxTrackedEvent $restored 'client' $join 100000
    Assert-Near $restored.Totals['123'] 62.5 'Replayed log events do not change counters'
    Update-RobloxTrackedEvent $restored 'replacement-client' $join 100000
    Assert-Near $restored.Active.Count 1 'Replacement clients do not overlap'
    $restored.Cursors['client'] = @{ Offset = 50L; Partial = 'private log fragment' }
    Save-RobloxTrackerState $path $restored
    $saved = Get-Content -LiteralPath $path -Raw
    if ($saved.Contains('private log fragment')) { throw 'Raw log text must not be persisted' }
    $sanitized = ConvertTo-RobloxHashtable ($saved | ConvertFrom-Json)
    Assert-Near $sanitized.Cursors.client.Offset 30 'Unfinished lines resume from their beginning'
    Write-Output 'Roblox state tests passed: fractional counters, disconnect correction, persistence, restart gaps and client replacement.'
}
finally {
    $env:ROBLOX_STATE_PATH = $oldPath
    if (Test-Path -LiteralPath $path) { Remove-Item -LiteralPath $path }
    if (Test-Path -LiteralPath $directory) { Remove-Item -LiteralPath $directory }
}
