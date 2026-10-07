Set shell = CreateObject("WScript.Shell")

shell.Run """C:\Program Files\PowerShell\7\pwsh.exe"" -NoProfile -NonInteractive -ExecutionPolicy Bypass -File ""C:\Projects\GitHub\Personal\My Website\playtime-collector.ps1""", 0, False