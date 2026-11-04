$url = "https://josephsocialmedia2-spec.github.io/joseph-link-in-bio-Copia/gestione/mattino/"
$taskName = "Case247 - Regia social mattutina"
$script = Join-Path $env:LOCALAPPDATA "Case247-Mattino.ps1"
Set-Content -LiteralPath $script -Value ('Start-Process "' + $url + '"') -Encoding UTF8
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument ('-NoProfile -File "' + $script + '"')
$daily = New-ScheduledTaskTrigger -Daily -At "02:00"
$logon = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger @($daily,$logon) -Description "Apre la checklist mattutina quando la sessione Windows e disponibile" -Force
Write-Host "Configurato. Per aprire subito: $url"
Start-Process $url