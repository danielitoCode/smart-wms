[CmdletBinding()]
param([string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path)

$ErrorActionPreference = "Stop"
$RuntimeDir = Join-Path $RepoRoot "webapp/e2e/.runtime"
$ProcessFile = Join-Path $RuntimeDir "processes.json"
$ConfigFile = Join-Path $PSScriptRoot "config.json"
$r2Config = Get-Content $ConfigFile -Raw | ConvertFrom-Json
$apiPort = ([Uri]$r2Config.apiBaseUrl).Port
$webPort = ([Uri]$r2Config.webBaseUrl).Port

if (Test-Path $ProcessFile) {
    $pids = Get-Content $ProcessFile -Raw | ConvertFrom-Json

    foreach ($entry in @(
        @{ Id = $pids.ApiPid; Kind = "Flask" },
        @{ Id = $pids.WebPid; Kind = "Vite" }
    )) {
        if (!$entry.Id) { continue }

        $id = [int]$entry.Id
        $processInfo = Get-CimInstance Win32_Process -Filter "ProcessId = $id" -ErrorAction SilentlyContinue
        if (!$processInfo) { continue }

        $commandLine = [string]$processInfo.CommandLine
        $isExpected = $false
        if ($entry.Kind -eq "Flask") {
            $isExpected = ($commandLine -match "(?i)(^|\s)-m\s+flask(\s|$)") -and
                ($commandLine -match "(?i)--port\s+$apiPort")
        } else {
            $isExpected = ($processInfo.Name -ieq "cmd.exe") -and
                ($commandLine -match "(?i)npm\s+run\s+dev") -and
                ($commandLine -match "(?i)--mode\s+r2-e2e") -and
                ($commandLine -match "(?i)--port\s+$webPort")
        }

        if ($isExpected) {
            & taskkill.exe /PID $id /T /F | Out-Null
            Write-Host "Detenido $($entry.Kind) E2E (PID $id)."
        } else {
            Write-Warning "No se detuvo PID ${id}: ya no coincide con el comando esperado de $($entry.Kind). Se deja intacto."
        }
    }

    Remove-Item $ProcessFile -Force
}

# Stop only the explicitly named E2E Compose project. Keep its volume intact.
docker compose -f (Join-Path $RepoRoot "docker-compose.r2-e2e.yml") -p smart-wms-r2-e2e stop
if ($LASTEXITCODE -ne 0) { throw "No se pudieron detener los servicios E2E." }
Write-Host "Servicios E2E detenidos. El volumen PostgreSQL de pruebas se conserva."
