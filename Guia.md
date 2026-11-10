# Guía de trabajo del backend gemelo WMS

Escribo esta guía para que cualquier desarrollador o agente de IA pueda continuar el trabajo sin depender de conversaciones externas. Mantengo el backend Flask original intacto y desarrollo el gemelo exclusivamente en `wms-twin/`, sobre PrismaTec-Core como dependencia externa.

## Estado real

- Rama: `feat/wms-prismatec-genesis`; `main` permanece intacta.
- Gemelo: primer runtime Go funcional, Core Node, AIP separado, persistencia episódica/CID y API técnica.
- No hay paridad de negocio ni autenticación compatible; el gemelo NO sustituye al original.
- No agrego PostgreSQL/SQLite al gemelo.
- No copio ni vendo PrismaTec-Core en este repositorio.

## Requisitos

Git, Go 1.25+, conexión inicial a GitHub/GOPROXY y openssl. El gemelo no requiere PostgreSQL ni Redis. El backend original conserva sus requisitos actuales.

## Actualizar el clon con verificación previa

Si la rama local ya existe:

```bash
git switch feat/wms-prismatec-genesis
git status --short --branch
```

No usar `git switch --track` si ya existe localmente. Para actualizar con validación antes del fast-forward:

```bash
bash scripts/safe-update-wms-twin.sh
```

El script exige árbol limpio, descarga main y la rama gemela, rechaza cambios fuera del alcance permitido, crea un worktree temporal, ejecuta `go mod tidy`, `go mod verify`, `gofmt`, `go vet` y `go test -race`; solo si todo pasa realiza `git merge --ff-only`. No borra ni sobrescribe cambios locales.

GitHub Actions valida pushes y PRs. Para que los checks bloqueen la aceptación hay que configurarlos como obligatorios en Branch protection / Rulesets; Actions no intercepta por sí solo un `git pull` local.

## Arranque del gemelo

Desde la raíz:

```bash
export WMS_TWIN_DATA_DIR="$HOME/.local/share/smart-wms-twin"
export WMS_TWIN_NODE_NAME="wms-node-local"
export WMS_TWIN_HTTP_ADDR=":5001"
export WMS_TWIN_AIP_ADDR=":8081"
export WMS_TWIN_API_TOKEN="$(openssl rand -hex 32)"
cd wms-twin
go mod tidy
go mod verify
go test ./...
go run ./cmd/wms-twin
```

WMS escucha en 5001; AIP Core en 8081. Endpoints: `/api/health`, `/healthz`, `/aip/v1/info` y `/api/twin/*`. La API técnica exige Bearer token. `WMS_TWIN_DATA_DIR` contiene identidad, organismos y bloques CID; no borrarlo para resolver fallos.

## Backend original simultáneo

El original sigue ejecutándose con su stack Flask/PostgreSQL/Redis y su despliegue original, normalmente API en 5000. No compartir puertos, secretos ni directorios de datos con el gemelo.

## Alternar frontend

- Admin usa `API_BASE='/api'`, cookies `sentry_auth`/`sentry_csrf` y header `X-CSRF-Token`. Se puede cambiar upstream del reverse proxy entre :5000 y :5001 sin reescribir componentes.
- Mobile usa `EXPO_PUBLIC_API_URL` y permite guardar URL en runtime.
- No enviar tráfico funcional al gemelo todavía: no implementa JWT/cookies/CSRF, roles, permisos ni rutas WMS originales. La conmutación actual solo sirve para health y pruebas técnicas.

## Pruebas

```bash
cd wms-twin
go test ./...
go test -race -count=1 ./...
go vet ./...
gofmt -l .
go test ./internal/corestore -run TestRecordsPersistThroughCoreCIDStore -v
go test ./internal/domain/inventory -v
go test ./internal/httpapi -v
go test ./internal/runtime -v
```

Smoke:

```bash
curl -fsS http://127.0.0.1:5001/api/health
curl -fsS http://127.0.0.1:8081/healthz
curl -fsS http://127.0.0.1:8081/aip/v1/info
curl -fsS -H "Authorization: Bearer $WMS_TWIN_API_TOKEN" http://127.0.0.1:5001/api/twin/info
```

La suite del backend original usa `TEST_DATABASE_URL` separada de `DATABASE_URL`; nunca ejecutarla contra datos reales.

## Diagnóstico

| Error | Qué revisar |
|---|---|
| Go version | `go version`, debe ser 1.25+ |
| Descarga Core | `go env GOPROXY`, conectividad y `go mod tidy` |
| DataDir | permisos, espacio libre y ruta `WMS_TWIN_DATA_DIR` |
| Puerto ocupado | `ss -ltnp | grep -E '5001|8081'` |
| 401 / 503 | Bearer token y variable `WMS_TWIN_API_TOKEN` |
| CID | conservar DataDir, revisar logs y reproducir test |
| gofmt | ejecutar `gofmt -w .` dentro de `wms-twin`, revisar diff y repetir CI |
| tests | atender el primer fallo real; no saltar pruebas |

## Dónde continuar

1. Congelar mapa completo de rutas, DTO, middleware, errores y tests originales.
2. Implementar auth equivalente: JWT HS256, cookies HttpOnly, CSRF, refresh/logout, cambio de contraseña, lockout y revocación.
3. Portar warehouses, zones, bins e items.
4. Crear agregado Inventory con atomicidad, idempotencia, autoridad y fencing.
5. Portar receiving, putaway, picking, packing, shipping, cycle counts y transfers.
6. Portar administración, usuarios, tokens WMS, connectors, events, snapshots, POS, dockd e inbound.
7. Pruebas diferenciales, E2E, concurrencia, recuperación y particiones.

El mapa inicial está en `wms-twin/docs/MAPA_RUTAS_BACKEND_ORIGINAL.md`; la integración frontend en `wms-twin/docs/CONTRATO_FRONTEND.md`. Cada commit actualiza esta guía, estructura, paridad y auditoría. Un agente nuevo debe leer esos documentos antes de tocar código.
