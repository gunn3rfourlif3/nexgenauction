param(
  [Parameter(Mandatory=$true)]
  [string]$ArchivePath,
  [int]$Port = 3100
)

Write-Host "Setting up local production build from archive: $ArchivePath" -ForegroundColor Cyan

$Root = Split-Path -Parent $PSScriptRoot
$BuildDir = Join-Path $Root "frontend_build"
$ToolsDir = Join-Path $Root "tools"
$ServerScript = Join-Path $ToolsDir "serve-build.js"

if (!(Test-Path $ArchivePath)) {
  Write-Error "Archive file not found: $ArchivePath"
  exit 1
}

if (!(Test-Path $BuildDir)) {
  New-Item -ItemType Directory -Path $BuildDir | Out-Null
}

Write-Host "Clearing existing build directory..." -ForegroundColor Yellow
Get-ChildItem -Path $BuildDir -Force | Remove-Item -Recurse -Force

Write-Host "Extracting archive into $BuildDir ..." -ForegroundColor Yellow
if ($ArchivePath.ToLower().EndsWith(".zip")) {
  Expand-Archive -LiteralPath $ArchivePath -DestinationPath $BuildDir -Force
} else {
  tar -xzf $ArchivePath -C $BuildDir
}

Write-Host "Starting static server on port $Port ..." -ForegroundColor Green
$env:PORT = "$Port"
$env:BUILD_DIR = $BuildDir
node $ServerScript
