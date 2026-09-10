# Register a Windows Task Scheduler job for the production monitor.
#   powershell -ExecutionPolicy Bypass -File .\scripts\register-monitor-task.ps1
param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
  [string]$TaskName = 'PikoGame-ProductionMonitor',
  [int]$EveryMinutes = 5
)

$node = (Get-Command node -ErrorAction Stop).Source
$script = Join-Path $RepoRoot 'scripts\monitor-production.mjs'
$logDir = Join-Path $RepoRoot '.wrangler\monitor'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$stdout = Join-Path $logDir 'stdout.log'

$cmd = 'cmd.exe'
$arg = "/c cd /d `"$RepoRoot`" && `"$node`" `"$script`" >> `"$stdout`" 2>&1"
$action = New-ScheduledTaskAction -Execute $cmd -Argument $arg
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).Date -RepetitionInterval (New-TimeSpan -Minutes $EveryMinutes) -RepetitionDuration ([TimeSpan]::MaxValue)
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -MultipleInstances IgnoreNew

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Force | Out-Null
Write-Host "Registered task '$TaskName' every $EveryMinutes minute(s)."
Write-Host "Manual run:  node `"$script`""
Write-Host "Log file:    $stdout"
Write-Host "Remove with: Unregister-ScheduledTask -TaskName '$TaskName' -Confirm:`$false"