Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '..\.playtime\playtime-collector.ps1')
function Assert-Equal($actual, $expected, $message) {
    if ($actual -ne $expected) { throw "$message (expected $expected, got $actual)" }
}
function Get-SteamPlaytime { return @([pscustomobject]@{ GameId = '526870'; Minutes = $script:SteamMinutes }) }
function Get-ModrinthPlaytime { return @([pscustomobject]@{ GameId = 'minecraft'; Minutes = 125 }) }
function Get-RobloxPlaytime { return @([pscustomobject]@{ GameId = '1718755273'; Minutes = $script:RobloxMinutes; Name = 'town'; PlaceIds = $script:RobloxPlaceIds }) }
$script:SteamMinutes = 60
$script:RobloxMinutes = 2
$script:UploadCount = 0
$script:FailOnce = $false
$script:ConflictOnce = $false
$script:LastUpload = $null
$script:RobloxPlaceIds = @('1718755273')
function Invoke-RestMethod {
    param($Uri, $Method, $ContentType, $Headers, $Body, $TimeoutSec)
    $script:UploadCount++
    Assert-Equal $Headers.Authorization "Bearer $env:PLAYTIME_UPLOAD_TOKEN" 'Collector sends the configured bearer token'
    $script:LastUpload = $Body | ConvertFrom-Json
    if ($script:FailOnce) { $script:FailOnce = $false; throw 'Simulated offline' }
    if ($script:ConflictOnce) { $script:ConflictOnce = $false; return [pscustomobject]@{ok=$true;accepted=$false;replayed=$false;lastSequence=100} }
    return [pscustomobject]@{ok=$true;accepted=$true;replayed=$false;lastSequence=$script:LastUpload.sequence}
}
$directory = Join-Path ([IO.Path]::GetTempPath()) ("paryx-collector-test-" + [Guid]::NewGuid().ToString('N'))
[IO.Directory]::CreateDirectory($directory) | Out-Null
$config = Join-Path $directory 'config.json'
$stateFile = Join-Path $directory 'state.json'
$eventLogPath = Join-Path $directory 'game-time-collector.log'
$oldToken = $env:PLAYTIME_UPLOAD_TOKEN
try {
    $env:PLAYTIME_UPLOAD_TOKEN = 'test-only-collector-token'
    [IO.File]::WriteAllText($config, '{"Endpoint":"http://127.0.0.1:9999/playtime","CollectorId":"test-pc"}')
    Write-PlaytimeCheck 'check finished successfully.' $eventLogPath
    $checkLines = @(Get-Content -LiteralPath $eventLogPath)
    if ($checkLines[0] -notmatch '^\d{4}-\d{2}-\d{2}T\S+ CHECK check finished successfully\.$') {
        throw 'A successful upload check must be logged with its own CHECK state.'
    }
    Write-PlaytimeCheck 'check finished successfully.' $eventLogPath
    $checkLines = @(Get-Content -LiteralPath $eventLogPath)
    Assert-Equal $checkLines.Count 1 'Repeated upload check is deduplicated'
    Invoke-PlaytimeCollector -Configuration $config -StateFile $stateFile | Out-Null
    Assert-Equal $script:UploadCount 1 'Initial upload'
    Assert-Equal $script:LastUpload.entries.Count 3 'All sources included'
    Assert-Equal $script:LastUpload.entries[0].minutes 125 'Minutes are not converted to hours'
    $robloxUpload = $script:LastUpload.entries | Where-Object source -eq roblox
    Assert-Equal $robloxUpload.metadata.name 'town' 'Roblox game names are uploaded'
    Assert-Equal $robloxUpload.metadata.placeIds[0] '1718755273' 'Roblox place IDs are uploaded'
    $script:RobloxPlaceIds = @()
    $emptyPlaceIds = @(Get-CollectorEntries | Where-Object source -eq roblox)
    Assert-Equal $emptyPlaceIds[0].metadata.placeIds.Count 0 'Roblox games without place IDs remain uploadable'
    $script:RobloxPlaceIds = @('1718755273')
    $initialLog = Get-Content -LiteralPath (Join-Path $directory 'game-time-collector.log') -Raw
    if ($initialLog -notmatch 'initial totals: .*h \d{2}m on Minecraft, .*h \d{2}m on town, .*h \d{2}m on Satisfactory') {
        throw 'The first acknowledged upload must log readable game totals.'
    }
    $logAfterInitialUpload = $initialLog
    Assert-Equal (Get-PlaytimeGameName steam 284160) 'BeamNG.drive' 'Steam names follow the website catalogue'
    Invoke-PlaytimeCollector -Configuration $config -StateFile $stateFile | Out-Null
    Assert-Equal $script:UploadCount 1 'Unchanged snapshots are skipped'
    Assert-Equal (Get-Content -LiteralPath (Join-Path $directory 'game-time-collector.log') -Raw) $logAfterInitialUpload 'Unchanged snapshots do not log'
    Invoke-PlaytimeCollector -Configuration $config -StateFile $stateFile -Force | Out-Null
    Assert-Equal $script:UploadCount 2 'Forced refresh resends unchanged totals'
    $script:SteamMinutes = 61
    $script:RobloxMinutes = 5
    $script:FailOnce = $true
    $failed = $false
    try { Invoke-PlaytimeCollector -Configuration $config -StateFile $stateFile | Out-Null } catch { $failed = $true }
    Assert-Equal $failed $true 'Offline upload must fail'
    $state = Get-Content -LiteralPath $stateFile -Raw | ConvertFrom-Json
    Assert-Equal $state.Pending.sequence 3 'Pending sequence persisted before upload'
    Invoke-PlaytimeCollector -Configuration $config -StateFile $stateFile | Out-Null
    Assert-Equal $script:LastUpload.sequence 3 'Retry uses the original sequence'
    $eventLog = Get-Content -LiteralPath (Join-Path $directory 'game-time-collector.log') -Raw
    if ($eventLog -notmatch 'UPLOAD acknowledged: \+0h 03m on town \(total: 0h 05m\), \+0h 01m on Satisfactory \(total: 1h 01m\)\.') {
        throw 'Acknowledged per-game changes must share the event log.'
    }
    $state = Get-Content -LiteralPath $stateFile -Raw | ConvertFrom-Json
    Assert-Equal ($null -eq $state.Pending) $true 'Acknowledged pending batch cleared'
    $script:SteamMinutes = 62
    $script:ConflictOnce = $true
    Invoke-PlaytimeCollector -Configuration $config -StateFile $stateFile | Out-Null
    Assert-Equal $script:LastUpload.sequence 101 'Conflicting/restored sequence advances safely'
    function Get-SteamPlaytime { return @([pscustomobject]@{ GameId = '526870'; Minutes = 240 }, [pscustomobject]@{ GameId = '999999'; Minutes = 30 }) }
    $library = @(Get-CollectorEntries)
    Assert-Equal @($library | Where-Object source -eq steam).Count 2 'Collector sends all Steam AppIds for backend filtering'
    Write-Output 'Collector tests passed: minute units, unchanged data, offline retry, Steam identifiers and sequence recovery.'
} finally {
    $env:PLAYTIME_UPLOAD_TOKEN = $oldToken
    foreach ($path in @($config, $stateFile, (Join-Path $directory 'game-time-collector.log'))) { if (Test-Path -LiteralPath $path) { Remove-Item -LiteralPath $path } }
    Remove-Item -LiteralPath $directory
}
