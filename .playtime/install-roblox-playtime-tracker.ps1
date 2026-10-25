[CmdletBinding()]
param([switch]$StartNow)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$taskName = 'Paryx Roblox Playtime Tracker'
$script = Join-Path $PSScriptRoot 'roblox-playtime-tracker.ps1'
$launcher = Join-Path $PSScriptRoot 'run-roblox-playtime-hidden.vbs'
$legacyRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$legacyScript = Join-Path $legacyRoot 'roblox-playtime-tracker.ps1'
$legacyLauncher = Join-Path $legacyRoot 'run-roblox-playtime-hidden.vbs'
$preDotDirectory = Join-Path $legacyRoot 'playtime'
$preDotScript = Join-Path $preDotDirectory 'roblox-playtime-tracker.ps1'
$preDotLauncher = Join-Path $preDotDirectory 'run-roblox-playtime-hidden.vbs'
$executable = Join-Path $env:WINDIR 'System32\wscript.exe'
$arguments = '"' + $launcher + '"'
$existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($null -ne $existing) {
    $managed = @($existing.Actions | Where-Object {
        ((Split-Path $_.Execute -Leaf) -eq 'wscript.exe' -and
            $_.Arguments -in @($arguments, ('"' + $legacyLauncher + '"'), ('"' + $preDotLauncher + '"'))) -or
        ($_.Arguments -in @(
            ('-NoProfile -NonInteractive -WindowStyle Hidden -File "' + $script + '"'),
            ('-NoProfile -NonInteractive -WindowStyle Hidden -File "' + $legacyScript + '"'),
            ('-NoProfile -NonInteractive -WindowStyle Hidden -File "' + $preDotScript + '"')
        ) -and
            (Split-Path $_.Execute -Leaf) -in @('pwsh.exe', 'powershell.exe'))
    })
    if ($managed.Count -ne @($existing.Actions).Count) {
        throw 'A different task already uses this name. It was left unchanged.'
    }
}
$wasRunning = $null -ne $existing -and $existing.State -eq 'Running'
$oldTracker = if ($wasRunning) {
    $processes = @(Get-CimInstance Win32_Process)
    $launcherPids = @($processes | Where-Object {
        $_.Name -eq 'wscript.exe' -and $null -ne $_.CommandLine -and
        ($_.CommandLine.Contains($launcher) -or $_.CommandLine.Contains($legacyLauncher))
    } | Select-Object -ExpandProperty ProcessId)
    @($processes | Where-Object {
        $_.ParentProcessId -in $launcherPids -and $_.Name -in @('pwsh.exe', 'powershell.exe') -and $null -ne $_.CommandLine -and
        ($_.CommandLine.Contains($script) -or $_.CommandLine.Contains($legacyScript))
    } | Select-Object -ExpandProperty ProcessId)
} else { @() }
$collectorTask = Get-ScheduledTask -TaskName 'Playtime Collector' -ErrorAction SilentlyContinue
if ($null -ne $collectorTask) {
    $collectorLauncher = '"' + (Join-Path $PSScriptRoot 'run-playtime-hidden.vbs') + '"'
    $legacyCollectorLauncher = '"' + (Join-Path $legacyRoot 'run-playtime-hidden.vbs') + '"'
    $knownActions = @($collectorTask.Actions | Where-Object {
        (Split-Path $_.Execute -Leaf) -eq 'wscript.exe' -and
        $_.Arguments -in @($collectorLauncher, $legacyCollectorLauncher)
    })
    if ($knownActions.Count -ne @($collectorTask.Actions).Count) {
        throw 'The existing hourly collector task has an unexpected action. It was left unchanged.'
    }
}
if ($wasRunning) { Stop-ScheduledTask -TaskName $taskName }
$identity = [Security.Principal.WindowsIdentity]::GetCurrent().Name
$action = New-ScheduledTaskAction -Execute $executable -Argument $arguments -WorkingDirectory $PSScriptRoot
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $identity
$principal = New-ScheduledTaskPrincipal -UserId $identity -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit ([TimeSpan]::Zero) -MultipleInstances IgnoreNew -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null
foreach ($processId in $oldTracker) {
    $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
    if ($null -ne $process) { Stop-Process -Id $processId }
}
if ($StartNow -or $wasRunning) { Start-ScheduledTask -TaskName $taskName }
Write-Output "Registered $taskName for this Windows account."
