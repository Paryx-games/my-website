Option Explicit

Dim files, shell, directory, tracker, powershell, command
Set files = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")

directory = files.GetParentFolderName(WScript.ScriptFullName)
tracker = files.BuildPath(directory, "roblox-playtime-tracker.ps1")
powershell = "C:\Program Files\PowerShell\7\pwsh.exe"
If Not files.FileExists(powershell) Then powershell = "powershell.exe"

command = """" & powershell & """ -NoProfile -NonInteractive -File """ & tracker & """"
shell.Run command, 0, True
