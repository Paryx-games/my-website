function ConvertFrom-RobloxSessionLine {
    param([string]$Line)

    if ($Line -notmatch '^(?<time>\d{4}-\d\d-\d\dT[^,]+),') { return }
    $timestamp = [DateTimeOffset]::MinValue
    if (-not [DateTimeOffset]::TryParse($Matches.time, [ref]$timestamp)) { return }

    # Use the engine's completed join report, not launch requests or game-authored output.
    if ($Line -match '\[FLog::GameJoinLoadTime\] Report game_join_loadtime:.*?placeid:(?<place>\d+),.*?universeid:(?<universe>\d+),') {
        return [pscustomobject]@{
            Kind = 'join'; At = $timestamp
            PlaceId = $Matches.place; UniverseId = $Matches.universe
        }
    }
    if ($Line -match '\[DFLog::NetworkClient\] Client:Disconnect|\[FLog::SingleSurfaceApp\] shutDown:') {
        return [pscustomobject]@{ Kind = 'leave'; At = $timestamp }
    }
}

function Read-RobloxLogEvents {
    param([string]$Path, $Cursor)
    $stream = [IO.File]::Open($Path, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::ReadWrite -bor [IO.FileShare]::Delete)
    try {
        if ($stream.Length -lt $Cursor.Offset) { $Cursor.Offset = 0L; $Cursor.Partial = '' }
        [void]$stream.Seek($Cursor.Offset, [IO.SeekOrigin]::Begin)
        $reader = [IO.StreamReader]::new($stream)
        try {
            $chunk = $Cursor.Partial + $reader.ReadToEnd()
            $Cursor.Offset = $stream.Position
            $lines = $chunk.Split([char]10)
            $Cursor.Partial = $lines[$lines.Length - 1]
            for ($index = 0; $index -lt $lines.Length - 1; $index++) {
                ConvertFrom-RobloxSessionLine $lines[$index].TrimEnd([char]13)
            }
        }
        finally { $reader.Dispose() }
    }
    finally { $stream.Dispose() }
}
