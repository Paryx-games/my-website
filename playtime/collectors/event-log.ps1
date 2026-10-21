$script:SteamPlaytimeNames = $null
$script:RobloxPlaytimeNames = $null
$script:SitePlaytimeTitles = $null
$script:LastCheckMessage = $null
$script:LastCheckLoggedAt = [DateTimeOffset]::MinValue

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
    catch { Write-Warning "Could not save the playtime event log: $($_.Exception.Message)" }
    finally { if ($locked) { $mutex.ReleaseMutex() }; $mutex.Dispose() }
}

function Write-PlaytimeCheck {
    param([string]$Message, [string]$EventLog)
    # Routine checks repeat every few minutes, so only log a change or an hourly heartbeat.
    $now = [DateTimeOffset]::Now
    if ($Message -eq $script:LastCheckMessage -and ($now - $script:LastCheckLoggedAt) -lt [TimeSpan]::FromHours(1)) { return }
    $script:LastCheckMessage = $Message
    $script:LastCheckLoggedAt = $now
    Write-PlaytimeEvent "CHECK $Message" $EventLog
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
            # Cache only after a successful load, so a failure is retried on the next call.
            $names = @{}
            try {
                $mapping = Get-Content -LiteralPath (Join-Path $PSScriptRoot '..\..\api\lib\playtime.ts') -Raw
                foreach ($match in [regex]::Matches($mapping, "\b(\d+):\s*'([a-z0-9-]+)'")) {
                    $names[$match.Groups[1].Value] = $match.Groups[2].Value
                }
            }
            catch {
                Write-Warning "Could not load the Steam playtime names: $($_.Exception.Message)"
                return "Steam app $GameId"
            }
            $script:SteamPlaytimeNames = $names
        }
        if ($script:SteamPlaytimeNames.ContainsKey($GameId)) {
            $titles = $script:SitePlaytimeTitles
            if ($null -eq $titles) {
                $titles = @{}
                try {
                    $site = Get-Content -LiteralPath (Join-Path $PSScriptRoot '..\..\www\public\assets\games\games.js') -Raw
                    foreach ($match in [regex]::Matches($site, 'id:\s*"(?<id>[a-z0-9-]+)",\s*title:\s*"(?<title>[^"]+)"')) {
                        $titles[$match.Groups['id'].Value] = $match.Groups['title'].Value
                    }
                    $script:SitePlaytimeTitles = $titles
                }
                catch { Write-Warning "Could not load the site game titles: $($_.Exception.Message)" }
            }
            $mappedId = $script:SteamPlaytimeNames[$GameId]
            if ($titles.ContainsKey($mappedId)) { return $titles[$mappedId] }
            $slug = $script:SteamPlaytimeNames[$GameId].Replace('-', ' ')
            return [Globalization.CultureInfo]::GetCultureInfo('en-GB').TextInfo.ToTitleCase($slug)
        }
        return "Steam app $GameId"
    }
    if ($Source -eq 'roblox') {
        if ($null -eq $script:RobloxPlaytimeNames) {
            $names = @{}
            try {
                $catalogue = (Get-Content -LiteralPath (Join-Path $PSScriptRoot '..\..\www\public\assets\games\roblox-games.js') -Raw) -replace '^\s*export const robloxGames = ', '' -replace ';\s*$', ''
                foreach ($game in ($catalogue | ConvertFrom-Json)) {
                    $names[[string]$game.roblox.universeId] = [string]$game.title
                }
            }
            catch {
                Write-Warning "Could not load the Roblox game catalogue: $($_.Exception.Message)"
                return "Roblox universe $GameId"
            }
            $script:RobloxPlaytimeNames = $names
        }
        if ($script:RobloxPlaytimeNames.ContainsKey($GameId)) { return $script:RobloxPlaytimeNames[$GameId] }
        return "Roblox universe $GameId"
    }
    return $GameId
}