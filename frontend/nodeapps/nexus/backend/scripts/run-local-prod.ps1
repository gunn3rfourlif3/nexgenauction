param(
  [int]$Port = 5007,
  [string]$EnvFileOverride = ''
)

# Resolve backend root and env file paths
$BackendRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$EnvFile = if ([string]::IsNullOrWhiteSpace($EnvFileOverride)) {
  Join-Path $BackendRoot ".env.production"
} else {
  $EnvFileOverride
}

# Basic checks
if (-not (Test-Path $EnvFile)) {
  Write-Error "Production env file not found: $EnvFile"
  Write-Host "Tip: Ensure backend/.env.production exists and contains MONGODB_URI, JWT_SECRET, FRONTEND_URL, etc."
  exit 1
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Error "Node.js not found in PATH. Please install Node.js and try again."
  exit 1
}

# Environment configuration for local run against production DB
$env:NODE_ENV = "development"            # keep dev mode for permissive CORS and non-fatal DB errors
$env:FORCE_DB_CONNECTION = "true"        # force DB connection in development mode
$env:BACKEND_PORT = "$Port"              # align with local preview proxy

Write-Host "Starting NexGenAuction backend (development mode) on port $Port"
Write-Host "Using env file: $EnvFile"
Write-Host "Backend root: $BackendRoot"

Push-Location $BackendRoot
try {
  # Preload dotenv and point to production env file
  node -r dotenv/config server.js dotenv_config_path="$EnvFile"
} finally {
  Pop-Location
}