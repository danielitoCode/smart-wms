[CmdletBinding()]
param([string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path)

$ErrorActionPreference = "Stop"
$RuntimeDir = Join-Path $RepoRoot "webapp/e2e/.runtime"
$ProcessFile = Join-Path $RuntimeDir "processes.json"

if (Test-Path $ProcessFile) {
    $pids = Get-Content $ProcessFile -Raw | ConvertFrom-Json
    foreach ($id in @($pids.WebPid, $pids.ApiPid)) {
        if ($id) {
            $proc = Get-Process -Id ([int]$id) -ErrorAction SilentlyContinue
            if ($proc) {
                & taskkill.exe /PID ([int]$id) /T /F | Out-Null
            }
        }
    }
    Remove-Item $ProcessFile -Force
}

# Stop only the explicitly named E2E services. Keep the named volume intact.
docker compose -f (Join-Path $RepoRoot "docker-compose.r2-e2e.yml") -p smart-wms-r2-e2e stop
if ($LASTEXITCODE -ne 0) { throw "No se pudieron detener los servicios E2E." }
Write-Host "Flask/Vite y servicios E2E detenidos. El volumen PostgreSQL de pruebas se conserva."
