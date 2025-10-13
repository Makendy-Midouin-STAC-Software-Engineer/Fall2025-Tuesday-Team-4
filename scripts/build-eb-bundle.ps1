$ErrorActionPreference = 'Stop'

# Determine project root (parent of this script directory)
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
Set-Location $projectRoot

$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$zipName = "ihike-backend-eb-$timestamp.zip"
$zipPath = Join-Path $projectRoot $zipName

# Locate 7-Zip if available
$sevenZip = $null
try {
  $sevenZip = (Get-Command 7z -ErrorAction Stop).Source
} catch {}
if (-not $sevenZip) {
  $candidates = @(
    'C:\\Program Files\\7-Zip\\7z.exe',
    'C:\\Program Files (x86)\\7-Zip\\7z.exe'
  )
  foreach ($c in $candidates) { if (Test-Path $c) { $sevenZip = $c; break } }
}

if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

$backendDir = Join-Path $projectRoot 'backend'

if ($sevenZip) {
  Push-Location $backendDir
  & $sevenZip a -tzip -mx=5 $zipPath * | Out-Null
  Pop-Location
} else {
  Compress-Archive -Path (Join-Path $backendDir '*') -DestinationPath $zipPath -Force
}

# Validate extracted bundle has expected root structure
$dest = Join-Path $projectRoot '__bundle_test'
if (Test-Path $dest) { Remove-Item $dest -Recurse -Force }
Expand-Archive -LiteralPath $zipPath -DestinationPath $dest -Force

Write-Host "Bundle: $zipPath"
Write-Host 'Bundle root contents:'
Get-ChildItem -Force $dest | Select-Object Name, PSIsContainer | Format-Table -AutoSize

$required = @('manage.py','requirements.txt','.ebextensions','.platform','ihike_backend','hiking')
$missing = @()
foreach ($name in $required) {
  if (-not (Test-Path (Join-Path $dest $name))) { $missing += $name }
}

if ($missing.Count -gt 0) {
  Write-Error ('Missing at bundle root: ' + ($missing -join ', '))
  exit 1
} else {
  Write-Host 'Bundle root looks OK'
}

exit 0


