[CmdletBinding()]
param(
    [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
)

$ErrorActionPreference = "Stop"
$ComposeFile = Join-Path $RepoRoot "docker-compose.r2-e2e.yml"
$RuntimeDir = Join-Path $RepoRoot "webapp/e2e/.runtime"
New-Item -ItemType Directory -Force -Path $RuntimeDir | Out-Null

function Test-TcpPort([int]$Port) {
    $client = [System.Net.Sockets.TcpClient]::new()
    try { $client.Connect("127.0.0.1", $Port); return $true }
    catch { return $false }
    finally { $client.Dispose() }
}

foreach ($port in @(55432, 56379, 55000, 5173)) {
    if (Test-TcpPort $port) {
        throw "El puerto $port ya está ocupado. No se detendrá ningún proceso existente. Libéralo o ajusta los puertos antes de continuar."
    }
}

docker compose -f $ComposeFile -p smart-wms-r2-e2e up -d --wait db redis
if ($LASTEXITCODE -ne 0) { throw "No se pudo iniciar el PostgreSQL/Redis aislado." }

# Flask reads the repository .env for non-DB secrets. These process-level
# overrides always win over .env and point the API only at the disposable DB.
$env:DATABASE_URL = "postgresql://sentry:sentry@127.0.0.1:55432/sentry_test"
$env:REDIS_URL = "redis://:r2-e2e-local-only@127.0.0.1:56379/0"
$env:CELERY_BROKER_URL = $env:REDIS_URL
$env:CELERY_RESULT_BACKEND = $env:REDIS_URL
$env:DISPATCHER_ENABLED = "false"
$env:API_BIND_HOST = "127.0.0.1"
$env:JWT_SECRET = "R2_E2E_ONLY_JWT_SECRET_NEVER_USE_IN_PRODUCTION_2026"
$env:SENTRY_ENCRYPTION_KEY = "t5hPIEVn_O41qfiMqAiPEnwzQh68o3Es46YfSOBvEK8="
$env:SENTRY_TOKEN_PEPPER = "R2_E2E_ONLY_TOKEN_PEPPER_NEVER_USE_IN_PRODUCTION"
$env:SENTRY_PUBSUB_HMAC_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

$apiOut = Join-Path $RuntimeDir "flask.stdout.log"
$apiErr = Join-Path $RuntimeDir "flask.stderr.log"
$webOut = Join-Path $RuntimeDir "vite.stdout.log"
$webErr = Join-Path $RuntimeDir "vite.stderr.log"

$api = Start-Process -FilePath "python" -ArgumentList @(
    "-m", "flask", "--app", "app:create_app", "run",
    "--host", "127.0.0.1", "--port", "55000"
) -WorkingDirectory (Join-Path $RepoRoot "api") -PassThru -RedirectStandardOutput $apiOut -RedirectStandardError $apiErr

$env:VITE_API_PROXY_TARGET = "http://127.0.0.1:55000"
$web = Start-Process -FilePath "cmd.exe" -ArgumentList @(
    "/c", "npm run dev -- --host 127.0.0.1 --port 5173"
) -WorkingDirectory (Join-Path $RepoRoot "webapp") -PassThru -RedirectStandardOutput $webOut -RedirectStandardError $webErr

$deadline = (Get-Date).AddSeconds(90)
while ((Get-Date) -lt $deadline) {
    if ($api.HasExited) { throw "Flask terminó durante el arranque. Revisa $apiErr" }
    if ($web.HasExited) { throw "Vite terminó durante el arranque. Revisa $webErr" }
    if ((Test-TcpPort 55000) -and (Test-TcpPort 5173)) { break }
    Start-Sleep -Seconds 2
}
if (!(Test-TcpPort 55000) -or !(Test-TcpPort 5173)) {
    throw "Timeout esperando Flask/Vite. Revisa los logs en $RuntimeDir"
}

@{ ApiPid = $api.Id; WebPid = $web.Id } | ConvertTo-Json | Set-Content (Join-Path $RuntimeDir "processes.json")
Write-Host ""
Write-Host "R2.11 E2E local listo:" -ForegroundColor Green
Write-Host "  Webapp:   http://127.0.0.1:5173"
Write-Host "  Flask:    http://127.0.0.1:55000"
Write-Host "  Postgres: 127.0.0.1:55432 / sentry_test (volumen aislado)"
Write-Host "  Redis:    127.0.0.1:56379 (aislado)"
Write-Host "  Usuarios: admin/admin, r2_user/admin, r2_limited/admin"
Write-Host "  Logs:     $RuntimeDir"
Write-Host "Para detener procesos locales: scripts/r2-e2e/Stop-R2E2E.ps1"
Write-Host "La base aislada se conserva; NO se ejecutó down -v."
