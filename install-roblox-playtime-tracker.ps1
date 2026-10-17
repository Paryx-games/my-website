[CmdletBinding()]
param([switch]$StartNow)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$taskName = 'Paryx Roblox Playtime Tracker'
$script = Join-Path $PSScriptRoot 'roblox-playtime-tracker.ps1'
$launcher = Join-Path $PSScriptRoot 'run-roblox-playtime-hidden.vbs'
$executable = Join-Path $env:WINDIR 'System32\wscript.exe'
$arguments = '"' + $launcher + '"'
$existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($null -ne $existing) {
    $managed = @($existing.Actions | Where-Object {
        ($_.Execute -eq $executable -and $_.Arguments -eq $arguments) -or
        ($_.Arguments -eq ('-NoProfile -NonInteractive -WindowStyle Hidden -File "' + $script + '"') -and
            (Split-Path $_.Execute -Leaf) -in @('pwsh.exe', 'powershell.exe'))
    })
    if ($managed.Count -ne @($existing.Actions).Count) {
        throw 'A different task already uses this name. It was left unchanged.'
    }
}
$wasRunning = $null -ne $existing -and $existing.State -eq 'Running'
$oldTracker = if ($wasRunning) {
    @(Get-CimInstance Win32_Process | Where-Object {
        $_.Name -in @('pwsh.exe', 'powershell.exe') -and
        $_.CommandLine -like "*-File `"$script`"*"
    } | Select-Object -ExpandProperty ProcessId)
} else { @() }
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
