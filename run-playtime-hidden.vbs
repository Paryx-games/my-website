Option Explicit

Dim files, shell, directory, collector, powershell, command
Set files = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")

directory = files.GetParentFolderName(WScript.ScriptFullName)
collector = files.BuildPath(directory, "playtime\playtime-collector.ps1")
powershell = "C:\Program Files\PowerShell\7\pwsh.exe"
If Not files.FileExists(powershell) Then powershell = "powershell.exe"

command = """" & powershell & """ -NoProfile -NonInteractive -File """ & collector & """"
shell.Run command, 0, True
