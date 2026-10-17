[CmdletBinding()]
param([switch]$StartNow)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$taskName = 'Paryx Roblox Playtime Tracker'
$script = Join-Path $PSScriptRoot 'roblox-playtime-tracker.ps1'
$engine = (Get-Command pwsh -ErrorAction SilentlyContinue)
$executable = if ($null -ne $engine) { $engine.Source } else { (Get-Command powershell.exe).Source }
$arguments = '-NoProfile -NonInteractive -WindowStyle Hidden -File "' + $script + '"'
$existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($null -ne $existing -and @($existing.Actions | Where-Object Arguments -ne $arguments).Count) {
    throw 'A different task already uses this name. It was left unchanged.'
}
$identity = [Security.Principal.WindowsIdentity]::GetCurrent().Name
$action = New-ScheduledTaskAction -Execute $executable -Argument $arguments -WorkingDirectory $PSScriptRoot
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $identity
$principal = New-ScheduledTaskPrincipal -UserId $identity -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit ([TimeSpan]::Zero) -MultipleInstances IgnoreNew -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null
if ($StartNow) { Start-ScheduledTask -TaskName $taskName }
Write-Output "Registered $taskName for this Windows account."
