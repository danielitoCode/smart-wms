# Guía de trabajo del backend gemelo WMS

Escribo esta guía para que cualquier desarrollador o agente de IA pueda arrancar, probar, diagnosticar y continuar el proyecto sin depender de conversaciones externas. Mantengo el backend Flask original intacto y desarrollo el gemelo exclusivamente en `wms-twin/`, consumiendo PrismaTec-Core como dependencia externa fijada a una versión concreta.

## Estado real

- Rama: `feat/wms-prismatec-genesis`; no trabajo sobre `main`.
- El runtime Go arranca un nodo PrismaTec-Core, expone AIP en un listener separado y mantiene una API WMS técnica.
- Cada registro genérico WMS tiene su propio organismo `wms.{kind}.{id}`; las versiones son episodios y los datos son bloques CID locales.
- El primer agregado de inventario persistente permite ajustar, reservar, liberar y mover stock con un solo append del ledger por operación, idempotencia y serialización dentro de un proceso. Cada registro WMS tiene su propio organismo Core; el ledger de inventario es un agregado global separado.
- El endpoint de inventario es técnico (`/api/twin/inventory/*)); todavía no equivale a las rutas Flask originales.
- El gemelo **NO ES SUSTITUIBLE**. Ya implementa una primera capa JWT/cookies/CSRF y rutas maestras de warehouses/zones/bins; siguen pendientes las rutas restantes, la paridad diferencial y la validación operativa multi-nodo.
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

**Estado distribuido:** añadí un protocolo WMS que transfiere bloques CID firmados con Ed25519, espera ACK y luego envía el snapshot del organismo. El receptor valida NodeID, allowlist, firma, timestamp, tamaño, CID, Primary, epoch y secuencia antes de adoptar. Una prueba con dos nodos y LocalTransport cubre contenido, RootCID, fencing y tombstone. La sincronización vuelve a enviar el historial completo; los peers son explícitos. No hay quorum, Kademlia ni GossipSub en la revisión Core fijada. El ledger actual sigue siendo un agregado global de un solo primario; no habilito varios escritores ni failover automático ante partición.

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

La suite Flask original usa su configuración de pruebas y `TEST_DATABASE_URL`; nunca la ejecuto contra datos reales. GitHub Actions ejecuta guard de documentación/alcance, `go mod tidy -diff`, `go mod verify`, gofmt, vet y tests con race detector. Si los tests pasan, el job de push publica un commit de formato exclusivamente Go; en PR no escribe en la rama.

## Diagnóstico

| Síntoma | Comprobación |
|---|---|
| Rama local ya existe | `git switch feat/wms-prismatec-genesis`, no `--track` |
| Rama no avanza | `git fetch origin`, revisar `git branch -vv` y usar script seguro |
| Go incompatible | `go version`; usar Go 1.25+ |
| Descarga Core falla | `go env GOPROXY`, conectividad y `go mod download` |
| Puerto ocupado | `ss -ltnp | grep -E '5001|8081'` |
| 503 API técnica | falta `WMS_TWIN_API_TOKEN` o hay replicación pendiente; si `local_commit=true`, el dato ya existe localmente y debo reintentar con el mismo ID |
| 401 API técnica | comprobar prefijo Bearer y token |
| 409 inventario | stock disponible insuficiente o conflicto idempotente |
| 422 inventario | identidad, cantidad u operación inválida |
| Error CID | conservar DataDir, logs y reproducir test; no borrar bloques |
| Test concurrente falla | repetir con `-race`; investigar pérdida de actualización |

## Dónde continuar

1. Ejecutar CI de la replicación firmada y ampliar pruebas TCP multi-proceso, reconexión, firma inválida, CID corrupto, epoch viejo y peer no autorizado.
2. Diseñar autoridad por partición, quorum y reconciliación; no habilitar failover de dos nodos ni múltiples escritores.
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


## Validación satisfactoria del ledger — 2026-11-10

La ejecución GitHub Actions `42893176180`, sobre el commit `4b3880fe9a0dfec329cc88c8a2e08709454ecf14`, terminó en success. Pasaron guard documental/alcance, `go mod tidy -diff`, `go mod verify`, `gofmt -l`, `go vet ./...` y `go test -race -count=1 ./...`. Esta evidencia cubre el código y escenarios automatizados del corte actual; no demuestra paridad Flask ni consistencia multi-nodo.


## Resultado de CI de replicación y corrección de autenticación — 2026-11-10

La ejecución 42895311390 pasó el guard de documentación/alcance, verificación del grafo de módulos, formato Go y vet. La suite race ejecutó los paquetes: inventoryledger, corestore, domain/inventory, replication y runtime pasaron. El paquete httpapi falló porque el middleware aceptaba un token desnudo sin el esquema Bearer. Ya identifiqué el detonante y estoy endureciendo el parser para exigir Authorization: Bearer <token>, con prueba específica. El commit de formato automático no se publicó porque la suite no terminó en success.


## Avance de fase 02 — 2026-11-10

Añadí `internal/security/auth` con primitives de JWT HS256, CSRF double-submit y validación de password. Esta entrega es fundacional: todavía no hay login ni middleware de sesión integrado, no existe repositorio de usuarios y el Bearer técnico sigue siendo el único guard activo. La especificación y los criterios están en `wms-twin/docs/FASE_02_SEGURIDAD.md`. El CI debe ejecutar vet y race tests; no declaro estos tests ejecutados localmente.


## Identidad Core-backed — primer repositorio

El repositorio de usuarios está en `wms-twin/internal/application/identity`. Persiste un organismo por usuario, mantiene hash bcrypt, permisos y grants, normaliza username, rechaza duplicados en el primario local y soporta autenticación/cambio de contraseña. El DTO público no expone el hash. Todavía no hay importador desde PostgreSQL, endpoints HTTP, lockout, middleware de sesión ni cookies. La asignación de IDs y la unicidad solo están serializadas dentro del proceso primario. Ver `wms-twin/docs/FASE_02_SEGURIDAD.md`.


## Evidencia de CI y prueba manual — 2026-11-10

El commit `d8c2c02e17c667620cccdf6dcb017a83f33e575c` terminó en success en WMS twin validation, ejecución `42897626723`. Pasaron guard documental/alcance, `go mod tidy -diff`, `go mod verify`, gofmt, vet y `go test -race -count=1 ./...`. El workflow publicó después el commit de formato `e0d2e20dea760ad99f71c1376d97a4896f28c284`.

También recibí y registro la prueba manual del operador: crear `WH-001` respondió 201; leerlo respondió 200 con el mismo ContentCID y RootCID; `/api/health` devolvió `{"service":"sentry-wms","status":"ok"}`; AIP `/healthz` respondió 200 con cuerpo vacío; el nodo informó `organisms: 1`. Todavía falta que el operador reinicie el proceso y confirme que `WH-001` sigue disponible. La prueba de reinicio ya existe en tests del store, pero no sustituyo con ella la comprobación del entorno local.


## Autenticación HTTP — primer contrato conectado

Incorporé `/api/auth/login`, `logout`, `me`, `refresh` y `change-password`. La API emite JWT HS256 con los claims del original, instala `sentry_auth` HttpOnly y `sentry_csrf` legible, verifica CSRF en mutaciones con cookie y consulta en cada request el estado persistido del usuario. También aplica expiración, invalidación por `password_changed_at`, forced password change, permisos de página y warehouse scope con detección de discrepancias entre path/query/body.

El lockout de 5 intentos/15 minutos (configurable) persiste como organismos Core. Para importar usuarios existentes, configuro `WMS_TWIN_BOOTSTRAP_USERS_FILE` con un JSON de usuarios que contenga hashes bcrypt, nunca passwords en claro; el archivo debe tener permisos 0600 o más restrictivos. Variables: `JWT_SECRET` (mínimo 32 bytes), `WMS_TWIN_MAX_LOGIN_ATTEMPTS`, `WMS_TWIN_LOGIN_LOCKOUT_MINUTES` y `WMS_TWIN_REQUIRE_PACKING`.

**Límite importante:** estas protecciones ya están disponibles como handlers/wrappers, pero aún no he portado los endpoints de negocio Flask ni conectado todos esos wrappers a rutas WMS equivalentes. `/api/twin/*` continúa usando el Bearer técnico. Falta auditoría equivalente de cambio de password, gestión HTTP de usuarios, refresh/revocación completa y fixtures diferenciales.


## Corrección de bootstrap y coste bcrypt — 2026-11-10

Endurecí el importador para que sea idempotente y reanudable: al arrancar con `WMS_TWIN_BOOTSTRAP_USERS_FILE`, los usuarios cuyos IDs ya existen se omiten sin sobrescribirlos y se incorporan los que faltan. Si una importación queda parcial por un fallo de almacenamiento/replicación, el siguiente arranque puede continuar. El fichero se vuelve a validar en cada arranque y exige modo 0600 o más restrictivo. Los hashes nuevos usan coste bcrypt 12, igual al valor por defecto de `bcrypt.gensalt()` del backend Python.


## Validación CI de autenticación y bootstrap — 2026-11-10

El commit `5d8d334bb24dc21bf2609f8c8089092297563de8` pasó WMS twin validation en la ejecución `42899616129`: guard documental/de alcance, tidy diff, module verify, gofmt, vet y race tests. El workflow publicó el formato final en `2720ed7d70fb69e46422c3338dc354f15d30cc3a`.

La ejecución general `Dependency Audit` `42899616007` sigue fallando en npm-audit de admin/mobile y pip-audit del backend Python; no es el workflow de validación del gemelo ni una prueba de regresión de Go. La suite general `Tests` aún estaba ejecutándose al registrar esta nota.


## Validación de Fase 03

El commit de código `bb645444a830cee3b244a3f9d576b4d2b9e3433c` pasó WMS twin validation `42974486856`: guard de documentación/alcance, module verify, gofmt, vet y tests con `-race`. El workflow publicó el commit de formato `ccf1934b2640feb45df852d515316be73d408de1`, que es el HEAD actual de la rama al documentar. La suite general del repositorio `42974487059` seguía ejecutándose; no la marco como aprobada.
