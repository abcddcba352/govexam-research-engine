param([ValidateSet('start','status','stop')][string]$Action = 'status')
$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$workerScript = Join-Path $projectRoot 'server\runAutonomousResearch.ts'
$workerPattern = [regex]::Escape($workerScript)
$runningWorkers = @(Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" | Where-Object { $_.CommandLine -match $workerPattern })
if ($Action -eq 'stop') {
  foreach ($workerProcess in $runningWorkers) { Stop-Process -Id $workerProcess.ProcessId }
  Write-Output "Stopped $($runningWorkers.Count) GovExam research worker(s)."
  exit
}
if ($runningWorkers.Count -gt 0) {
  $runningWorkers | Select-Object @{Name='WorkerId';Expression={$_.ProcessId}}, @{Name='Status';Expression={'Running'}}
  exit
}
if ($Action -eq 'status') { Write-Output 'GovExam research worker is not running.'; exit }
$nodeRuntime = (Get-Command node -ErrorAction Stop).Source
$logDirectory = Join-Path $projectRoot 'work'
New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$outputLog = Join-Path $logDirectory "research-worker-$stamp.log"
$errorLog = Join-Path $logDirectory "research-worker-$stamp.error.log"
$startedWorker = Start-Process -FilePath $nodeRuntime -ArgumentList @('--import','tsx',('"' + $workerScript + '"')) -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput $outputLog -RedirectStandardError $errorLog -PassThru
[pscustomobject]@{WorkerId=$startedWorker.Id;Status='Started';OutputLog=$outputLog;ErrorLog=$errorLog}
