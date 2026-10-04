Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '..\playtime-collector.ps1')
function Assert-Equal($actual, $expected, $message) {
    if ($actual -ne $expected) { throw "$message (expected $expected, got $actual)" }
}
function Get-SteamPlaytime { return @([pscustomobject]@{ GameId = '526870'; Minutes = $script:SteamMinutes }) }
function Get-ModrinthPlaytime { return @([pscustomobject]@{ GameId = 'minecraft'; Minutes = 125 }) }
$script:SteamMinutes = 60
$script:UploadCount = 0
$script:FailOnce = $false
$script:ConflictOnce = $false
$script:LastUpload = $null
function Invoke-RestMethod {
    param($Uri, $Method, $ContentType, $Headers, $Body, $TimeoutSec)
    $script:UploadCount++
    Assert-Equal $Headers.Authorization 'Bearer test-only-collector-token' 'Bearer token'
    $script:LastUpload = $Body | ConvertFrom-Json
    if ($script:FailOnce) { $script:FailOnce = $false; throw 'Simulated offline' }
    if ($script:ConflictOnce) { $script:ConflictOnce = $false; return [pscustomobject]@{ok=$true;accepted=$false;replayed=$false;lastSequence=100} }
    return [pscustomobject]@{ok=$true;accepted=$true;replayed=$false;lastSequence=$script:LastUpload.sequence}
}
$directory = Join-Path ([IO.Path]::GetTempPath()) ("paryx-collector-test-" + [Guid]::NewGuid().ToString('N'))
[IO.Directory]::CreateDirectory($directory) | Out-Null
$config = Join-Path $directory 'config.json'
$stateFile = Join-Path $directory 'state.json'
$oldToken = $env:PLAYTIME_UPLOAD_TOKEN
try {
    $env:PLAYTIME_UPLOAD_TOKEN = 'test-only-collector-token'
    [IO.File]::WriteAllText($config, '{"Endpoint":"http://127.0.0.1:9999/playtime","CollectorId":"test-pc"}')
    Invoke-PlaytimeCollector -Configuration $config -StateFile $stateFile | Out-Null
    Assert-Equal $script:UploadCount 1 'Initial upload'
    Assert-Equal $script:LastUpload.entries.Count 2 'Both sources included'
    Assert-Equal $script:LastUpload.entries[0].minutes 125 'Minutes are not converted to hours'
    Invoke-PlaytimeCollector -Configuration $config -StateFile $stateFile | Out-Null
    Assert-Equal $script:UploadCount 1 'Unchanged snapshots are skipped'
    Invoke-PlaytimeCollector -Configuration $config -StateFile $stateFile -Force | Out-Null
    Assert-Equal $script:UploadCount 2 'Forced refresh resends unchanged totals'
    $script:SteamMinutes = 61
    $script:FailOnce = $true
    $failed = $false
    try { Invoke-PlaytimeCollector -Configuration $config -StateFile $stateFile | Out-Null } catch { $failed = $true }
    Assert-Equal $failed $true 'Offline upload must fail'
    $state = Get-Content -LiteralPath $stateFile -Raw | ConvertFrom-Json
    Assert-Equal $state.Pending.sequence 3 'Pending sequence persisted before upload'
    Invoke-PlaytimeCollector -Configuration $config -StateFile $stateFile | Out-Null
    Assert-Equal $script:LastUpload.sequence 3 'Retry uses the original sequence'
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
    foreach ($path in @($config, $stateFile)) { if (Test-Path -LiteralPath $path) { Remove-Item -LiteralPath $path } }
    Remove-Item -LiteralPath $directory
}
