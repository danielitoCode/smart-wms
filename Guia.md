# Guía de trabajo del backend gemelo WMS

Escribo esta guía para que cualquier desarrollador o agente de IA pueda arrancar, probar, diagnosticar y continuar el proyecto sin depender de conversaciones externas. Mantengo el backend Flask original intacto y desarrollo el gemelo exclusivamente en `wms-twin/`, consumiendo PrismaTec-Core como dependencia externa fijada a una versión concreta.

## Estado real

- Rama: `feat/wms-prismatec-genesis`; no trabajo sobre `main`.
- El runtime Go arranca un nodo PrismaTec-Core, expone AIP en un listener separado y mantiene una API WMS técnica.
- Cada registro genérico WMS tiene su propio organismo `wms.{kind}.{id}`; las versiones son episodios y los datos son bloques CID locales.
- El primer agregado de inventario persistente permite ajustar, reservar, liberar y mover stock con un solo append del estado del ledger por operación, idempotencia y serialización dentro de un proceso.
- El endpoint de inventario es técnico (`/api/twin/inventory/*)); todavía no equivale a las rutas Flask originales.
- El gemelo **NO ES SUSTITUIBLE**. No implementa todavía login JWT/cookies/CSRF, permisos ni los flujos WMS completos.
- No agrego PostgreSQL, SQLite ni Redis al gemelo. El backend original conserva su infraestructura.
- No copio ni vendo el código de PrismaTec-Core dentro de este repositorio.

## Requisitos

Git y Go 1.25.0 o superior. Necesito acceso inicial al proxy de módulos Go y a GitHub para descargar dependencias. OpenSSL sirve para generar el token de la API técnica.

El módulo Core está fijado en `wms-twin/go.mod` y `wms-twin/go.sum`. No uso `go get @latest` en un despliegue reproducible.

## Rama y actualización segura

La rama local ya existe si Git informa que no puede crearla. En ese caso:

```bash
git switch feat/wms-prismatec-genesis
git status --short --branch
```

Para actualizar sin integrar cambios antes de validarlos:

```bash
bash scripts/safe-update-wms-twin.sh
```

El script exige árbol limpio, descarga `main` y la rama gemela, verifica el alcance permitido, crea un worktree temporal, valida el módulo Go, formato, vet y tests con race detector y solo entonces aplica `git merge --ff-only`. Si una validación falla, no actualiza tu rama local. No uses `git switch --track` cuando la rama local ya exista. Si hay cambios locales, no los borres: haz commit o guárdalos y revisa qué contienen.

GitHub Actions valida pushes y PRs. Para bloquear la aceptación de PRs, los checks deben configurarse como obligatorios en Branch protection/Rulesets. Actions no intercepta un `git pull` local; para eso utilizo el script anterior.

## Arranque del gemelo

Desde la raíz:

```bash
export WMS_TWIN_DATA_DIR="$HOME/.local/share/smart-wms-twin"
export WMS_TWIN_NODE_NAME="wms-node-local"
export WMS_TWIN_HTTP_ADDR=":5001"
export WMS_TWIN_AIP_ADDR=":8081"
export WMS_TWIN_API_TOKEN="$(openssl rand -hex 32)"
cd wms-twin
go mod download
go mod verify
go test ./...
go run ./cmd/wms-twin
```

- API técnica WMS: `http://127.0.0.1:5001`.
- Health WMS: `GET /api/health`.
- Health Core: `GET http://127.0.0.1:8081/healthz`.
- AIP Core: `http://127.0.0.1:8081/aip/v1`.
- Datos persistentes: `WMS_TWIN_DATA_DIR`.

Cada nodo necesita su propio DataDir. No compartas un directorio entre procesos concurrentes. Conserva ese directorio para reinicios y diagnóstico; no lo borres para resolver errores de lectura.

## API técnica del gemelo

Todas las rutas `/api/twin/*` requieren `Authorization: Bearer $WMS_TWIN_API_TOKEN`.

| Método | Ruta | Función |
|---|---|---|
| GET | `/api/twin/info` | Identidad y estado del nodo Core |
| GET/POST | `/api/twin/records/{kind}` | Consulta/creación de registros técnicos |
| GET/PUT/PATCH/DELETE | `/api/twin/records/{kind}/{id}` | Consulta y mutación de registros técnicos |
| GET | `/api/twin/inventory/balances` | Proyección de balances |
| POST | `/api/twin/inventory/adjust` | Ajuste de existencia |
| POST | `/api/twin/inventory/allocate` | Reserva de existencia |
| POST | `/api/twin/inventory/release` | Liberación de reserva |
| POST | `/api/twin/inventory/move` | Movimiento entre ubicaciones |

Las mutaciones requieren un `operation_id` estable. Repetir el mismo ID y comando devuelve el resultado original; reutilizarlo con otro contenido devuelve conflicto. En un movimiento, el servidor carga las existencias desde el ledger: el cliente solo envía identificadores de origen/destino y cantidad, no balances autoritativos.

**Límite:** el mutex garantiza serialización dentro de una instancia. No es un protocolo de consenso entre nodos. Core replica snapshots de organismos, pero el snapshot no transporta los bytes de los bloques CID. La revisión fijada de Core deja Kademlia DHT y GossipSub como trabajo futuro y usa por defecto `cid1:` SHA-256 en un block store local. No se debe declarar inventario distribuido ni activar varios escritores hasta resolver transferencia autenticada de bloques, autoridad por partición, fencing efectivo y reconciliación probada. El historial de idempotencia aún no tiene compactación.

## Backend original simultáneo

El original conserva Flask, PostgreSQL, Redis y los procesos auxiliares. Mantengo separados puertos (original normalmente :5000; gemelo :5001; AIP :8081), secretos y directorios de datos. El gemelo no necesita PostgreSQL ni Redis para el corte actual.

## Alternar frontend

Admin usa `API_BASE = '/api'`, cookies `sentry_auth` y `sentry_csrf`, y `X-CSRF-Token`. Mobile usa `EXPO_PUBLIC_API_URL` y Bearer JWT.

Para alternar admin sin reescribir componentes, mantengo el mismo origen y cambio el upstream `/api` del reverse proxy: Flask :5000 o Go :5001. Mobile cambia su URL base en configuración de deployment/runtime. **No conecto todavía los frontends de producción al gemelo:** el Bearer técnico no sustituye el JWT de usuario, cookies/CSRF ni los contratos de negocio.

## Pruebas

Desde `wms-twin/`:

```bash
go mod verify
test -z "$(gofmt -l .)"
go vet ./...
go test ./...
go test -race -count=1 ./...
go test ./internal/application/inventoryledger -v
go test ./internal/httpapi -v
```

Smoke:

```bash
curl -fsS http://127.0.0.1:5001/api/health
curl -fsS http://127.0.0.1:8081/healthz
curl -fsS http://127.0.0.1:8081/aip/v1/info
curl -fsS -H "Authorization: Bearer $WMS_TWIN_API_TOKEN" http://127.0.0.1:5001/api/twin/info
curl -fsS -H "Authorization: Bearer $WMS_TWIN_API_TOKEN" http://127.0.0.1:5001/api/twin/inventory/balances
```

La suite Flask original usa su configuración de pruebas y `TEST_DATABASE_URL`; nunca la ejecuto contra datos reales. GitHub Actions ejecuta guard de documentación/alcance, `go mod tidy -diff`, `go mod verify`, `gofmt`, `go vet` y `go test -race`.

## Diagnóstico

| Síntoma | Comprobación |
|---|---|
| Rama local ya existe | `git switch feat/wms-prismatec-genesis`, no `--track` |
| Rama no avanza | `git fetch origin`, revisar `git branch -vv` y usar script seguro |
| Go incompatible | `go version`; usar Go 1.25+ |
| Descarga Core falla | `go env GOPROXY`, conectividad y `go mod download` |
| Puerto ocupado | `ss -ltnp | grep -E '5001|8081'` |
| 503 API técnica | falta `WMS_TWIN_API_TOKEN` |
| 401 API técnica | comprobar prefijo Bearer y token |
| 409 inventario | stock disponible insuficiente o conflicto idempotente |
| 422 inventario | identidad, cantidad u operación inválida |
| Error CID | conservar DataDir, logs y reproducir test; no borrar bloques |
| Test concurrente falla | repetir con `-race`; investigar pérdida de actualización |

## Dónde continuar

1. Resolver la brecha de replicación CID: snapshots de Core no transfieren los bytes de los bloques.
2. Implementar configuración de peers y pruebas TCP/libp2p; no declarar DHT/GossipSub disponibles hasta que existan.
3. Portar autenticación JWT/cookies/CSRF, lockout, revocación y permisos sin reducir controles.
4. Portar warehouses, zones, bins, items, vendors y preferred bins con DTO/errores exactos.
5. Completar autoridad/fencing del inventario antes de activar varios escritores.
6. Portar receiving, put-away, picking, packing, shipping, transfers, cycle counts, ajustes, órdenes, RMA y POS.
7. Completar WMS tokens/scopes, eventos/outbox, consumer groups, snapshots, inbound, Dockd, connectors y webhooks.
8. Ejecutar pruebas diferenciales original vs gemelo y E2E de reinicio, concurrencia, recuperación y particiones.

Antes de cada entrega actualizo esta guía, `EstructuraBackendGo.md`, `NivelDeParidadConBackendOriginal.md`, `AUDITORIA_GEMELO.md` y los documentos específicos afectados. El siguiente desarrollador o agente debe leer esos documentos y `wms-twin/docs/MAPA_RUTAS_ORIGINAL.md`.


## Incidencia de validación de dependencias — 2026-11-10

La primera ejecución del workflow después de incorporar el ledger falló en `go mod tidy -diff`, antes de formato, vet y tests. El guard de documentación y alcance sí pasó. La salida detallada del diff no está disponible en la respuesta del conector, así que no atribuyo todavía una causa específica. Para recuperar el grafo exacto voy a generar temporalmente un artefacto con `go.mod` y `go.sum` producidos por Go 1.25 en CI. Después incorporaré esos archivos al repositorio y volveré a una comprobación no mutante `go mod tidy -diff`. Hasta entonces el ledger no está validado.


## Seguimiento de CI — normalización de fuentes

En el commit `9695a825`, `go mod tidy` y `go mod verify` terminaron correctamente y generaron el artefacto temporal `wms-twin-module-metadata`. El job se detuvo después porque encontró archivos Go sin formato; vet y race tests no se ejecutaron. Estoy haciendo que CI normalice las fuentes en su workspace temporal y publique un artefacto para incorporar el formato real al commit. La validación final volverá a ser estricta y no modificará archivos.


## Corrección de CI — 2026-11-10

La ejecución `42892797788` confirmó que `go mod tidy`, `gofmt` temporal y `go mod verify` pasaron. `go vet` detectó un import no utilizado en el test del ledger y por eso no ejecutó la suite race. Ya incorporo el `go.mod` generado por Go 1.25, publico los archivos formateados, retiro el import y vuelvo a un workflow estricto: `go mod tidy -diff`, `gofmt -l`, vet y race tests sin modificar el workspace. El resultado de la nueva ejecución queda pendiente.
