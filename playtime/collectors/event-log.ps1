$script:SteamPlaytimeNames = $null
$script:RobloxPlaytimeNames = $null
$script:SitePlaytimeTitles = $null

function Write-PlaytimeEvent {
    param([string]$Message, [string]$EventLog)
    Write-Host $Message
    $mutex = [Threading.Mutex]::new($false, 'Local\ParyxPlaytimeEvents')
    $locked = $false
    try {
        try { $locked = $mutex.WaitOne(5000) }
        catch [Threading.AbandonedMutexException] { $locked = $true }
        if (-not $locked) { throw 'The playtime event log is busy.' }
        [void][IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($EventLog))
        $line = '{0} {1}{2}' -f [DateTimeOffset]::Now.ToString('o'), $Message, [Environment]::NewLine
        [IO.File]::AppendAllText($EventLog, $line, [Text.UTF8Encoding]::new($false))
    }
    catch { Write-Warning 'Could not save the playtime event log.' }
    finally { if ($locked) { $mutex.ReleaseMutex() }; $mutex.Dispose() }
}

function Format-PlaytimeHours {
    param([long]$Minutes, [string]$Game)
    return [string]::Format(
        [Globalization.CultureInfo]::InvariantCulture,
        '+{0:0.00} hours on {1}',
        $Minutes / 60.0,
        $Game
    )
}

function Get-PlaytimeGameName {
    param([string]$Source, [string]$GameId)
    if ($Source -eq 'modrinth' -and $GameId -eq 'minecraft') { return 'Minecraft' }
    if ($Source -eq 'steam') {
        if ($null -eq $script:SteamPlaytimeNames) {
            $script:SteamPlaytimeNames = @{}
            $mapping = Get-Content -LiteralPath (Join-Path $PSScriptRoot '..\..\api\lib\playtime.ts') -Raw
            foreach ($match in [regex]::Matches($mapping, "\b(\d+):\s*'([a-z0-9-]+)'")) {
                $script:SteamPlaytimeNames[$match.Groups[1].Value] = $match.Groups[2].Value
            }
        }
        if ($script:SteamPlaytimeNames.ContainsKey($GameId)) {
            if ($null -eq $script:SitePlaytimeTitles) {
                $script:SitePlaytimeTitles = @{}
                $site = Get-Content -LiteralPath (Join-Path $PSScriptRoot '..\..\www\public\assets\games\games.js') -Raw
                foreach ($match in [regex]::Matches($site, 'id:\s*"(?<id>[a-z0-9-]+)",\s*title:\s*"(?<title>[^"]+)"')) {
                    $script:SitePlaytimeTitles[$match.Groups['id'].Value] = $match.Groups['title'].Value
                }
            }
            $mappedId = $script:SteamPlaytimeNames[$GameId]
            if ($script:SitePlaytimeTitles.ContainsKey($mappedId)) { return $script:SitePlaytimeTitles[$mappedId] }
            $slug = $script:SteamPlaytimeNames[$GameId].Replace('-', ' ')
            return [Globalization.CultureInfo]::GetCultureInfo('en-GB').TextInfo.ToTitleCase($slug)
        }
        return "Steam app $GameId"
    }
    if ($Source -eq 'roblox') {
        if ($null -eq $script:RobloxPlaytimeNames) {
            $script:RobloxPlaytimeNames = @{}
            $catalogue = (Get-Content -LiteralPath (Join-Path $PSScriptRoot '..\..\www\public\assets\games\roblox-games.js') -Raw) -replace '^\s*export const robloxGames = ', '' -replace ';\s*$', ''
            foreach ($game in ($catalogue | ConvertFrom-Json)) {
                $script:RobloxPlaytimeNames[[string]$game.roblox.universeId] = [string]$game.title
            }
        }
        if ($script:RobloxPlaytimeNames.ContainsKey($GameId)) { return $script:RobloxPlaytimeNames[$GameId] }
        return "Roblox universe $GameId"
    }
    return $GameId
}
