[CmdletBinding()]
param(
    [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
)

$ErrorActionPreference = "Stop"
$ComposeFile = Join-Path $RepoRoot "docker-compose.r2-e2e.yml"
$RuntimeDir = Join-Path $RepoRoot "webapp/e2e/.runtime"
$ConfigFile = Join-Path $PSScriptRoot "config.json"
New-Item -ItemType Directory -Force -Path $RuntimeDir | Out-Null

if (!(Test-Path $ConfigFile -PathType Leaf)) {
    throw "No existe la configuración compartida R2 E2E: $ConfigFile"
}
$r2Config = Get-Content $ConfigFile -Raw | ConvertFrom-Json
$apiUri = [Uri]$r2Config.apiBaseUrl
$webUri = [Uri]$r2Config.webBaseUrl
if ($apiUri.Scheme -ne "http" -or $webUri.Scheme -ne "http" -or
    $apiUri.Host -notin @("127.0.0.1", "localhost") -or
    $webUri.Host -notin @("127.0.0.1", "localhost")) {
    throw "La configuración R2 E2E debe usar HTTP y loopback; no se permiten endpoints externos."
}
$ApiBaseUrl = $r2Config.apiBaseUrl.TrimEnd("/")
$WebBaseUrl = $r2Config.webBaseUrl.TrimEnd("/")
$ApiPort = $apiUri.Port
$WebPort = $webUri.Port

# Always use the repository-local backend environment. Never resolve Python
# through PATH: developer shells may point to unrelated tools/agents.
$PythonExe = Join-Path $RepoRoot "api/.venv/Scripts/python.exe"
if (!(Test-Path $PythonExe -PathType Leaf)) {
    throw "No existe el Python del proyecto: $PythonExe. Créalo con: python -m venv .\\api\\.venv; después instala .\\api\\requirements.txt."
}
$pythonCheck = & $PythonExe -W ignore::DeprecationWarning -c "from importlib.metadata import version; import cryptography, sys; print('Python E2E:', sys.executable); print('Flask:', version('flask')); print('Cryptography:', cryptography.__version__)" 2>&1
if ($LASTEXITCODE -ne 0) {
    throw "El entorno api/.venv no tiene las dependencias necesarias o no puede importarlas: $pythonCheck"
}

function Test-TcpPort([int]$Port) {
    $client = [System.Net.Sockets.TcpClient]::new()
    try { $client.Connect("127.0.0.1", $Port); return $true }
    catch { return $false }
    finally { $client.Dispose() }
}

function Get-HttpStatusCode([string]$Url) {
    $request = [System.Net.HttpWebRequest]::Create($Url)
    $request.Method = "GET"
    $request.Timeout = 3000
    $request.ReadWriteTimeout = 3000
    $request.AllowAutoRedirect = $false
    try {
        $response = $request.GetResponse()
        try { return [int]$response.StatusCode }
        finally { $response.Close() }
    } catch [System.Net.WebException] {
        if ($_.Exception.Response) {
            $status = [int]$_.Exception.Response.StatusCode
            $_.Exception.Response.Close()
            return $status
        }
        return 0
    }
}

# Do not adopt or terminate unrelated listeners. A busy endpoint is a hard
# preflight failure, with its owner left untouched for the developer to inspect.
foreach ($port in @($ApiPort, $WebPort)) {
    if (Test-TcpPort $port) {
        throw "El puerto R2 E2E $port ya está ocupado. No se detendrá ningún proceso existente. Identifica su PID/libera el puerto y vuelve a ejecutar."
    }
}

docker compose -f $ComposeFile -p smart-wms-r2-e2e up -d --wait db redis
if ($LASTEXITCODE -ne 0) { throw "No se pudo iniciar el PostgreSQL/Redis aislado." }

docker compose -f $ComposeFile -p smart-wms-r2-e2e exec -T db psql -v ON_ERROR_STOP=1 -U sentry -d sentry_test -f /seed-data/03-test-users.sql
if ($LASTEXITCODE -ne 0) { throw "No se pudieron preparar las cuentas sintéticas R2 E2E." }

# Save and restore the caller's environment. Only the child Flask/Vite processes
# receive the isolated database and API settings.
$environmentKeys = @(
    "DATABASE_URL", "REDIS_URL", "CELERY_BROKER_URL", "CELERY_RESULT_BACKEND",
    "DISPATCHER_ENABLED", "API_BIND_HOST", "JWT_SECRET", "SENTRY_ENCRYPTION_KEY",
    "SENTRY_TOKEN_PEPPER", "SENTRY_PUBSUB_HMAC_KEY", "VITE_API_PROXY_TARGET", "VITE_API_BASE_URL"
)
$previousEnvironment = @{}
foreach ($name in $environmentKeys) {
    $previousEnvironment[$name] = [Environment]::GetEnvironmentVariable($name, "Process")
}
function Restore-CallerEnvironment {
    foreach ($name in $environmentKeys) {
        $value = $previousEnvironment[$name]
        if ($null -eq $value) {
            Remove-Item "Env:$name" -ErrorAction SilentlyContinue
        } else {
            Set-Item "Env:$name" $value
        }
    }
}

$api = $null
$web = $null
$apiOut = Join-Path $RuntimeDir "flask.stdout.log"
$apiErr = Join-Path $RuntimeDir "flask.stderr.log"
$webOut = Join-Path $RuntimeDir "vite.stdout.log"
$webErr = Join-Path $RuntimeDir "vite.stderr.log"

try {
    $env:DATABASE_URL = "postgresql://sentry:sentry@127.0.0.1:55432/sentry_test"
    $env:REDIS_URL = "redis://:r2-e2e-local-only@127.0.0.1:56379/0"
    $env:CELERY_BROKER_URL = $env:REDIS_URL
    $env:CELERY_RESULT_BACKEND = $env:REDIS_URL
    $env:DISPATCHER_ENABLED = "false"
    $env:API_BIND_HOST = $apiUri.Host
    $env:JWT_SECRET = "R2_E2E_ONLY_JWT_SECRET_NEVER_USE_IN_PRODUCTION_2026"
    $env:SENTRY_ENCRYPTION_KEY = (& $PythonExe -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())").Trim()
    if (!$env:SENTRY_ENCRYPTION_KEY) { throw "No se pudo generar la clave Fernet efímera para el proceso E2E." }
    $env:SENTRY_TOKEN_PEPPER = "R2_E2E_ONLY_TOKEN_PEPPER_NEVER_USE_IN_PRODUCTION"
    $env:SENTRY_PUBSUB_HMAC_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

    # Truncate old logs first: a previous Flask run on :55000 must never be
    # mistaken for the process started by this configuration on :56000.
    foreach ($log in @($apiOut, $apiErr, $webOut, $webErr)) {
        Set-Content -Path $log -Value "" -Encoding UTF8
    }

    $api = Start-Process -FilePath $PythonExe -ArgumentList @(
        "-m", "flask", "--app", "app:create_app", "run",
        "--host", $apiUri.Host, "--port", [string]$ApiPort
    ) -WorkingDirectory (Join-Path $RepoRoot "api") -PassThru -RedirectStandardOutput $apiOut -RedirectStandardError $apiErr

    # Windows removes process environment variables assigned an empty string.
    # The dedicated Vite mode file supplies the empty API base URL.
    $env:VITE_API_BASE_URL = ""
    $env:VITE_API_PROXY_TARGET = $ApiBaseUrl
    $web = Start-Process -FilePath "cmd.exe" -ArgumentList @(
        "/c", "npm run dev -- --mode r2-e2e --host $($webUri.Host) --port $WebPort"
    ) -WorkingDirectory (Join-Path $RepoRoot "webapp") -PassThru -RedirectStandardOutput $webOut -RedirectStandardError $webErr

    $deadline = (Get-Date).AddSeconds(90)
    $apiStatus = 0
    $webStatus = 0
    $proxyStatus = 0
    while ((Get-Date) -lt $deadline) {
        if ($api.HasExited) { throw "Flask terminó durante el arranque. Revisa $apiErr" }
        if ($web.HasExited) { throw "Vite terminó durante el arranque. Revisa $webErr" }

        if ((Test-TcpPort $ApiPort) -and (Test-TcpPort $WebPort)) {
            $apiStatus = Get-HttpStatusCode "$ApiBaseUrl/api/auth/me"
            $webStatus = Get-HttpStatusCode "$WebBaseUrl/login"
            if ($apiStatus -in @(200, 401, 403) -and $webStatus -eq 200) {
                $proxyStatus = Get-HttpStatusCode "$WebBaseUrl/api/auth/me"
                if ($proxyStatus -eq $apiStatus) { break }
            }
        }
        Start-Sleep -Seconds 2
    }

    if ($apiStatus -notin @(200, 401, 403) -or $webStatus -ne 200 -or $proxyStatus -ne $apiStatus) {
        throw "Health check R2 E2E falló. API directa=$apiStatus; Web /login=$webStatus; API vía proxy=$proxyStatus. Revisa los cuatro logs en $RuntimeDir."
    }

    @{ ApiPid = $api.Id; WebPid = $web.Id } | ConvertTo-Json | Set-Content (Join-Path $RuntimeDir "processes.json")

} catch {
    if ($web -and !$web.HasExited) { & taskkill.exe /PID $web.Id /T /F | Out-Null }
    if ($api -and !$api.HasExited) { & taskkill.exe /PID $api.Id /T /F | Out-Null }
    throw
} finally {
    Restore-CallerEnvironment
}

Write-Host ""
Write-Host "R2.11 E2E local listo y verificado:" -ForegroundColor Green
Write-Host "  Webapp:   $WebBaseUrl"
Write-Host "  Flask:    $ApiBaseUrl"
Write-Host "  Postgres: 127.0.0.1:55432 / sentry_test (volumen aislado)"
Write-Host "  Redis:    127.0.0.1:56379 (aislado)"
Write-Host "  Health:   Flask $apiStatus; Vite /login $webStatus; proxy /api/auth/me $proxyStatus"
Write-Host "  Usuarios: admin/admin, r2_user/admin, r2_limited/admin"
Write-Host "  Logs:     $RuntimeDir"
Write-Host "Para detener procesos locales: scripts/r2-e2e/Stop-R2E2E.ps1"
Write-Host "La base aislada se conserva; NO se ejecutó down -v."
