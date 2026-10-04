[CmdletBinding()]
param(
    [string]$ConfigPath = (Join-Path $PSScriptRoot 'playtime-collector.local.json'),
    [string]$StatePath = (Join-Path $env:LOCALAPPDATA 'Paryx\PlaytimeCollector\state.json'),
    [switch]$DryRun,
    [switch]$ForceUpload
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function ConvertFrom-SteamVdf {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Path
    )

    if (-not (Test-Path -LiteralPath $Path)) {
        throw "VDF file not found: $Path"
    }

    $root = @{}
    $stack = [Collections.Generic.Stack[hashtable]]::new()
    $stack.Push($root)
    $pendingKey = $null

    foreach ($rawLine in [IO.File]::ReadLines($Path)) {
        $line = $rawLine.Trim()

        if (-not $line -or $line.StartsWith('//')) {
            continue
        }

        if ($line -eq '{') {
            if ($null -eq $pendingKey) {
                throw "Malformed VDF in '$Path': opening brace without a key."
            }

            $child = @{}
            $stack.Peek()[$pendingKey] = $child
            $stack.Push($child)
            $pendingKey = $null
            continue
        }

        if ($line -eq '}') {
            if ($stack.Count -le 1) {
                throw "Malformed VDF in '$Path': unexpected closing brace."
            }

            [void]$stack.Pop()
            $pendingKey = $null
            continue
        }

        $matches = [regex]::Matches($line, '"((?:\\.|[^"])*)"')

        if (-not $matches.Count) {
            continue
        }

        $values = @(
            $matches | ForEach-Object {
                $_.Groups[1].Value.
                Replace('\\', '\').
                Replace('\"', '"')
            }
        )

        if ($values.Count -ge 2) {
            $stack.Peek()[$values[0]] = $values[1]
            $pendingKey = $null
            continue
        }

        $key = $values[0]

        if ($line.Contains('{')) {
            $child = @{}
            $stack.Peek()[$key] = $child
            $stack.Push($child)
            $pendingKey = $null
        }
        else {
            $pendingKey = $key
        }
    }

    if ($stack.Count -ne 1) {
        throw "Malformed VDF in '$Path': unterminated section."
    }

    return $root
}

# Return cumulative MINUTES for currently installed Steam games.
function Get-SteamPlaytime {
    $steamPath = $null

    try {
        $steamPath = (Get-ItemProperty -LiteralPath 'HKCU:\Software\Valve\Steam' -ErrorAction Stop).SteamPath
    }
    catch {}

    if ([string]::IsNullOrWhiteSpace($steamPath)) {
        try {
            $steamPath = (Get-ItemProperty -LiteralPath 'HKLM:\SOFTWARE\WOW6432Node\Valve\Steam' -ErrorAction Stop).InstallPath
        }
        catch {}
    }

    if ([string]::IsNullOrWhiteSpace($steamPath)) {
        try {
            $steamPath = (Get-ItemProperty -LiteralPath 'HKLM:\SOFTWARE\Valve\Steam' -ErrorAction Stop).InstallPath
        }
        catch {}
    }

    if ([string]::IsNullOrWhiteSpace($steamPath) -or -not (Test-Path -LiteralPath $steamPath)) {
        return @()
    }

    $steamPath = [IO.Path]::GetFullPath($steamPath)
    $activeUser = $null

    try {
        $activeUser = [string](Get-ItemPropertyValue `
                -LiteralPath 'HKCU:\Software\Valve\Steam' `
                -Name 'ActiveUser' `
                -ErrorAction Stop)
    }
    catch {}

    if ([string]::IsNullOrWhiteSpace($activeUser) -or $activeUser -eq '0') {
        $userdataPath = Join-Path $steamPath 'userdata'

        if (-not (Test-Path -LiteralPath $userdataPath)) {
            throw 'Steam is installed but no userdata directory could be found.'
        }

        $users = @(
            Get-ChildItem -LiteralPath $userdataPath -Directory |
            Where-Object { $_.Name -match '^\d+$' }
        )

        if ($users.Count -eq 1) {
            $activeUser = $users[0].Name
        }
        else {
            throw 'Steam is installed, but the active Steam account could not be determined.'
        }
    }

    $localConfig = Join-Path $steamPath "userdata\$activeUser\config\localconfig.vdf"

    if (-not (Test-Path -LiteralPath $localConfig)) {
        throw "Steam local playtime data could not be found for account $activeUser."
    }

    $local = ConvertFrom-SteamVdf -Path $localConfig

    try {
        $apps = $local['UserLocalConfigStore']['Software']['Valve']['Steam']['apps']
    }
    catch {
        throw 'Steam localconfig.vdf does not contain the expected apps section.'
    }

    if ($null -eq $apps -or $apps -isnot [hashtable]) {
        throw 'Steam localconfig.vdf does not contain readable playtime data.'
    }

    $libraryPaths = [Collections.Generic.HashSet[string]]::new(
        [StringComparer]::OrdinalIgnoreCase
    )

    [void]$libraryPaths.Add($steamPath)

    $libraryFoldersPath = Join-Path $steamPath 'steamapps\libraryfolders.vdf'

    if (Test-Path -LiteralPath $libraryFoldersPath) {
        $libraryVdf = ConvertFrom-SteamVdf -Path $libraryFoldersPath
        $folders = $libraryVdf['libraryfolders']

        if ($folders -is [hashtable]) {
            foreach ($entry in $folders.GetEnumerator()) {
                if ($entry.Value -isnot [hashtable]) {
                    continue
                }

                $path = [string]$entry.Value['path']

                if (-not [string]::IsNullOrWhiteSpace($path)) {
                    [void]$libraryPaths.Add([IO.Path]::GetFullPath($path))
                }
            }
        }
    }

    $installedAppIds = [Collections.Generic.HashSet[string]]::new()

    foreach ($library in $libraryPaths) {
        $steamApps = Join-Path $library 'steamapps'

        if (-not (Test-Path -LiteralPath $steamApps)) {
            continue
        }

        foreach ($manifest in Get-ChildItem -LiteralPath $steamApps -Filter 'appmanifest_*.acf' -File) {
            if ($manifest.Name -match '^appmanifest_(\d+)\.acf$') {
                $appId = $Matches[1]

                # Steamworks Common Redistributables is not a game.
                if ($appId -eq '228980') {
                    continue
                }

                [void]$installedAppIds.Add($appId)
            }
        }
    }

    $result = [Collections.Generic.List[object]]::new()

    foreach ($appId in $installedAppIds) {
        $minutes = [long]0

        if ($apps.ContainsKey($appId)) {
            $app = $apps[$appId]

            if ($app -isnot [hashtable]) {
                throw "Steam returned malformed local data for app $appId."
            }

            if ($app.ContainsKey('Playtime')) {
                $rawPlaytime = [string]$app['Playtime']
                $parsed = [long]0

                if (-not [long]::TryParse($rawPlaytime, [ref]$parsed) -or $parsed -lt 0) {
                    throw "Steam returned an invalid Playtime value for app $appId."
                }

                $minutes = $parsed
            }
        }

        $result.Add([pscustomobject]@{
                GameId  = $appId
                Minutes = $minutes
            })
    }

    return @(
        $result.ToArray() |
        Sort-Object { [long]$_.GameId }
    )
}

# Return combined cumulative Modrinth playtime in MINUTES.
function Get-ModrinthPlaytime {
    $database = Join-Path $env:APPDATA 'ModrinthApp\app.db'

    if (-not (Test-Path -LiteralPath $database)) {
        return @()
    }

    $sqlite = Get-Command 'sqlite3' -ErrorAction SilentlyContinue

    if ($null -eq $sqlite) {
        throw 'Modrinth was found, but sqlite3 is not available on PATH.'
    }

    $query = @'
SELECT COALESCE(
    SUM(
        CAST(submitted_time_played AS INTEGER) +
        CAST(recent_time_played AS INTEGER)
    ),
    0
)
FROM instances;
'@

    $output = @(
        & $sqlite.Source -batch -noheader $database $query 2>&1
    )

    if ($LASTEXITCODE -ne 0) {
        throw "Failed to read Modrinth playtime: $($output -join ' ')"
    }

    if ($output.Count -ne 1) {
        throw 'Modrinth returned an unexpected result while reading playtime.'
    }

    $seconds = [long]0

    if (-not [long]::TryParse(([string]$output[0]).Trim(), [ref]$seconds) -or $seconds -lt 0) {
        throw 'Modrinth returned an invalid cumulative playtime value.'
    }

    $minutes = [long][Math]::Floor($seconds / 60.0)

    return @(
        [pscustomobject]@{
            GameId  = 'minecraft'
            Minutes = $minutes
        }
    )
}

function Save-CollectorState {
    param([string]$Path, [object]$State)

    $directory = [IO.Path]::GetDirectoryName([IO.Path]::GetFullPath($Path))
    [IO.Directory]::CreateDirectory($directory) | Out-Null
    $temporary = "$Path.$PID.tmp"

    try {
        [IO.File]::WriteAllText(
            $temporary,
            ($State | ConvertTo-Json -Depth 12),
            [Text.UTF8Encoding]::new($false)
        )

        Move-Item -LiteralPath $temporary -Destination $Path -Force
    }
    finally {
        if (Test-Path -LiteralPath $temporary) {
            Remove-Item -LiteralPath $temporary
        }
    }
}

function Get-CollectorEntries {
    $entries = [Collections.Generic.List[object]]::new()
    $seen = [Collections.Generic.HashSet[string]]::new()

    foreach ($source in @('steam', 'modrinth')) {
        try {
            $result = @(switch ($source) {
                    'steam' { Get-SteamPlaytime }
                    'modrinth' { Get-ModrinthPlaytime }
                })
        }
        catch {
            Write-Warning "$source extraction failed; previous server totals will be preserved."
            continue
        }

        foreach ($item in $result) {
            $id = [string]$item.GameId
            $minutes = $item.Minutes

            if (
                $id -notmatch '^[a-z0-9-]+$' -or
                $minutes -is [string] -or
                $minutes -is [bool] -or
                $null -eq $minutes
            ) {
                throw "Invalid $source entry. Return a GameId and numeric cumulative Minutes."
            }

            $number = [double]$minutes

            if (
                [double]::IsNaN($number) -or
                [double]::IsInfinity($number) -or
                $number -lt 0 -or
                $number -gt 100000000 -or
                $number -ne [Math]::Floor($number)
            ) {
                throw "Invalid $source minutes. Use a nonnegative whole number of minutes."
            }

            if (-not $seen.Add("${source}:$id")) {
                throw "Duplicate $source entry for $id."
            }

            $entries.Add([pscustomobject][ordered]@{
                    gameId  = $id
                    source  = $source
                    minutes = [long]$number
                })
        }
    }

    return @(
        $entries.ToArray() |
        Sort-Object source, gameId
    )
}

function Send-CollectorPending {
    param(
        [object]$Config,
        [object]$State,
        [string]$Path,
        [string]$Token
    )

    if ($null -eq $State.Pending) {
        return
    }

    for ($attempt = 0; $attempt -lt 2; $attempt++) {
        try {
            $response = Invoke-RestMethod `
                -Uri $Config.Endpoint `
                -Method Post `
                -ContentType 'application/json' `
                -Headers @{ Authorization = "Bearer $Token" } `
                -Body ($State.Pending | ConvertTo-Json -Depth 12 -Compress) `
                -TimeoutSec 30
        }
        catch {
            throw 'Playtime upload failed. The pending batch is saved and will retry on the next run.'
        }

        if (-not $response.ok -or $null -eq $response.lastSequence) {
            throw 'Unexpected API response; pending batch retained.'
        }

        if (-not $response.accepted -and -not $response.replayed) {
            # Recover safely if the local sequence was restored from an older backup.
            $State.Sequence = [Math]::Max(
                [long]$response.lastSequence,
                [long]$State.Pending.sequence
            ) + 1

            $State.Pending.sequence = $State.Sequence

            Save-CollectorState -Path $Path -State $State
            continue
        }

        $State.LastPayloadHash = $State.PendingHash
        $State.Pending = $null
        $State.PendingHash = ''

        Save-CollectorState -Path $Path -State $State

        Write-Output 'Playtime upload acknowledged.'
        return
    }

    throw 'Server sequence advanced again; pending batch retained for the next run.'
}

function Invoke-PlaytimeCollector {
    param(
        [string]$Configuration,
        [string]$StateFile,
        [switch]$Preview,
        [switch]$Force
    )

    if ($Preview) {
        $entries = @(Get-CollectorEntries)

        [pscustomobject]@{
            entries = $entries
        } | ConvertTo-Json -Depth 8

        return
    }

    $config = Get-Content -LiteralPath $Configuration -Raw | ConvertFrom-Json
    $endpoint = [Uri]$config.Endpoint

    if (
        -not $endpoint.IsAbsoluteUri -or
        (
            $endpoint.Scheme -ne 'https' -and
            -not (
                $endpoint.Scheme -eq 'http' -and
                $endpoint.IsLoopback
            )
        )
    ) {
        throw 'The upload endpoint must use HTTPS (HTTP is allowed only on localhost).'
    }

    if ([string]::IsNullOrWhiteSpace($config.CollectorId)) {
        throw 'CollectorId is required.'
    }

    $token = $env:PLAYTIME_UPLOAD_TOKEN

    if ([string]::IsNullOrWhiteSpace($token)) {
        $secure = ConvertTo-SecureString $config.ProtectedUploadToken
        $token = [Net.NetworkCredential]::new('', $secure).Password
    }

    if ([string]::IsNullOrWhiteSpace($token)) {
        throw 'Upload token is required.'
    }

    $stateHash = [Security.Cryptography.SHA256]::Create()

    try {
        $mutexId = (
            [BitConverter]::ToString(
                $stateHash.ComputeHash(
                    [Text.Encoding]::UTF8.GetBytes(
                        [IO.Path]::GetFullPath($StateFile)
                    )
                )
            )
        ).Replace('-', '')
    }
    finally {
        $stateHash.Dispose()
    }

    $mutex = [Threading.Mutex]::new(
        $false,
        "Local\ParyxPlaytime-$mutexId"
    )

    $locked = $false

    try {
        try {
            $locked = $mutex.WaitOne(0)
        }
        catch [Threading.AbandonedMutexException] {
            $locked = $true
        }

        if (-not $locked) {
            Write-Output 'Another collector run is active; skipping.'
            return
        }

        if (Test-Path -LiteralPath $StateFile) {
            $state = Get-Content -LiteralPath $StateFile -Raw | ConvertFrom-Json

            if ($state.CollectorId -ne $config.CollectorId) {
                throw 'This state belongs to another collector.'
            }
        }
        else {
            $state = [pscustomobject]@{
                CollectorId     = $config.CollectorId
                Sequence        = [long]0
                LastPayloadHash = ''
                Pending         = $null
                PendingHash     = ''
            }
        }

        if ($null -ne $state.Pending) {
            $activeEntries = @($state.Pending.entries | Where-Object { $_.source -in @('steam', 'modrinth') })
            if ($activeEntries.Count -ne @($state.Pending.entries).Count) {
                $state.LastPayloadHash = ''
                $state.PendingHash = ''
                if ($activeEntries.Count) { $state.Pending.entries = $activeEntries } else { $state.Pending = $null }
                Save-CollectorState -Path $StateFile -State $state
            }
        }
        Send-CollectorPending `
            -Config $config `
            -State $state `
            -Path $StateFile `
            -Token $token

        $entries = @(Get-CollectorEntries)

        if (-not $entries.Count) {
            Write-Output 'No playtime data extracted; no upload sent.'
            return
        }

        $hashAlgorithm = [Security.Cryptography.SHA256]::Create()

        try {
            $hash = (
                [BitConverter]::ToString(
                    $hashAlgorithm.ComputeHash(
                        [Text.Encoding]::UTF8.GetBytes(
                            (ConvertTo-Json -InputObject $entries -Depth 8 -Compress)
                        )
                    )
                )
            ).Replace('-', '')
        }
        finally {
            $hashAlgorithm.Dispose()
        }

        if ($hash -eq $state.LastPayloadHash -and -not $Force) {
            Write-Output 'Playtime unchanged; no upload needed.'
            return
        }

        $state.Sequence = [long]$state.Sequence + 1
        $state.PendingHash = $hash

        $state.Pending = [pscustomobject]@{
            collectorId = $config.CollectorId
            sequence    = $state.Sequence
            entries     = $entries
        }

        Save-CollectorState -Path $StateFile -State $state

        Send-CollectorPending `
            -Config $config `
            -State $state `
            -Path $StateFile `
            -Token $token
    }
    finally {
        if ($locked) {
            $mutex.ReleaseMutex()
        }

        $mutex.Dispose()
        $token = $null
    }
}

if ($MyInvocation.InvocationName -ne '.') {
    Invoke-PlaytimeCollector `
        -Configuration $ConfigPath `
        -StateFile $StatePath `
        -Preview:$DryRun `
        -Force:$ForceUpload
}
