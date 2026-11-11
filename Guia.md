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


## Fase 04 — artículos, ubicaciones preferidas y proveedores

Estoy ampliando el catálogo con `items`, `preferred-bins` y `vendors`. Los artículos tienen IDs enteros reservados en el organismo de secuencias; los proveedores usan UUID canónico y UUID externo. Las ubicaciones preferidas se almacenan como un agregado único Core-backed, para que la reasignación de prioridades de un artículo quede en un solo append y mantenga la jerarquía 1..K sin empates.

Porté GET/POST/PUT/DELETE de items, POST `/items/{id}/archive`, GET/POST/PUT/DELETE de preferred bins y GET/POST/GET-by-id/PUT/DELETE de vendors bajo `/api/admin`. Los artículos incluyen búsqueda SKU/nombre/UPC/MPN/barcode aliases, categoría, activo y paginación; el listado calcula la ubicación predeterminada dando prioridad al preferred bin 1. Los preferred bins solo admiten bins `Pickable`.

Límites: el detalle de artículo devuelve balances sin `inventory_id` SQL; no hay historia de PO/SO para aplicar los bloqueos de borrado del original; el borrado de item se bloquea si quedan balances (incluso vacíos) o preferred mappings. Vendors aún no están vinculados a POs porque ese flujo no se ha portado. Las actualizaciones no reproducen completamente los valores JSON null de Pydantic. Validación CI pendiente.


## Validación de Fase 04

El commit de código `c32d3bed1ca754c681e19412d5c6614182ff1729` pasó WMS twin validation `42975654846`: guard de documentación/alcance, module verify, gofmt, vet y tests con `-race`. CI publicó el commit de formato `6b7d821277b29baf1754f3aa2038a1a85bf33a2d`, HEAD de la rama al documentar. La suite general `42975655011` seguía ejecutándose; no la marco como aprobada.


## Fase 05 — órdenes de compra

Porté el primer agregado operativo: Purchase Orders y sus líneas. El contrato usa las rutas originales bajo `/api/admin/purchase-orders`: colección GET/POST; detalle GET/PUT; líneas POST/PATCH/DELETE; acciones POST close/reopen. Las colecciones tienen paginación, filtro status/warehouse/q y ocultan ARCHIVED por defecto. El usuario no administrador solo consulta POs de sus almacenes autorizados.

Cada PO es un organismo Core con líneas embebidas; una mutación de línea y el recálculo de estado se guardan en un único append. IDs de PO y líneas usan secuencias Core-backed. Valido warehouse/item, PO number único, item único por PO, cantidades, coste y fechas ISO. Protejo la edición de POs CLOSED/ARCHIVED y no permito borrar una línea que ya tenga recibido.

Límite: esta fase no incluye receipts, recepción física, auditoría WMS equivalente, outbox/eventos, ni un flujo de compensación de inventario. Las líneas aún no tienen historial de receipts; no conecto el frontend. Validación CI pendiente.



## Fase de endurecimiento operativo — después del commit 18c389e

Abrí la rama `fix/wms-twin-operational-completion` desde el commit `18c389e691d25e8366516835402a6f5efcaf2e1d`. Mantengo los cuatro artefactos existentes en la raíz sin tratarlos como errores y no modifico el backend Flask.

Corregí defectos concretos que impedían confiar en las respuestas del gemelo:

- Sincronicé el test de Purchase Orders con la firma real de `AddLine`.
- Dockd ahora detiene el envío si el pedido no está en un estado válido o si falla el empaquetado. No informa `SHIP_VOIDED` cuando no existe una transición persistente que lo respalde.
- Inbound crea Purchase Orders mediante el repositorio persistente real. Ya no devuelve `ACCEPTED_SHADOW`.
- POS limita availability a un almacén y exige SKU. La validación del carrito considera cantidades acumuladas de líneas repetidas y propaga errores del catálogo.
- No presento checkout, refund, dispatch ni reference-orders como operaciones POS terminadas: responden como no implementadas hasta disponer del contrato de pago, compromiso de inventario, devolución y auditoría equivalente al original.
- RMA no se puede completar si no se ha definido y ejecutado la disposición del inventario devuelto.
- Los snapshots de inventario ahora se guardan como exportaciones versionadas con SHA-256 y lectura con verificación de integridad. No son todavía puntos de restauración transaccional del ledger.
- Los webhooks exigen HTTPS, secreto de al menos 32 bytes, bloquean destinos privados/loopback/link-local al conectar, fijan la IP resuelta para evitar una segunda resolución DNS y no siguen redirecciones.
- Los eventos conservan el estado de publicación y permiten reintentar publicaciones mesh pendientes.
- La auditoría comprueba secuencia, enlaces y hashes históricos antes de cada append. Si detecta corrupción, bloquea nuevas escrituras.
- La etiqueta del mesh ya no afirma Kademlia/GossipSub: el código actual es una tabla de peers con propagación TTL, no una implementación completa de esos protocolos.
- Recupero secuencias de RMA y suscripciones webhook desde los registros persistidos para evitar colisiones después de reiniciar.

## Límites que mantengo explícitos

Esta rama todavía no convierte el gemelo en sustituto del original. POS requiere portar el contrato de tender/venta/refund; RMA requiere disposición por línea y destino de stock; Dockd void requiere reversión de fulfillment; webhooks necesitan outbox durable, política de reintentos/DLQ y cifrado de secretos en reposo; snapshots necesitan restauración validada; mesh requiere DHT Kademlia y GossipSub reales o mantener la clasificación experimental. Inbound aún necesita idempotencia y el contrato de mapeo/origen completo.

Añadí pruebas unitarias de rechazo SSRF, checksum de snapshots y manipulación de la cadena de auditoría. No declaro esas pruebas ni el resto de la suite como aprobadas hasta que GitHub Actions ejecute el commit de esta rama. No afirmo que se haya ejecutado gofmt, vet o race tests localmente.


## Ajustes posteriores de validación

Los snapshots usan filas tipadas con enteros para que la verificación SHA-256 no dependa de conversiones float64 al deserializar JSON. Añadí el scope `events.publish` y la ruta `POST /api/v1/events/retry-pending` para que un operador autorizado pueda reintentar publicaciones pendientes. La verificación de auditoría también libera el bloqueo cuando una re-verificación completa confirma que la cadena volvió a ser válida. El CI de la rama sigue siendo la autoridad para validar formato, vet y race tests.


## Cierre funcional de las integraciones — POS, Dockd, RMA, Webhooks, Snapshots, Inbound y Mesh

En esta fase amplié el endurecimiento inicial para que las operaciones principales produzcan efectos persistentes y puedan recuperarse después de fallos.

### POS

- El checkout acepta una clave de idempotencia, almacén, líneas con artículo/SKU/bin/cantidad, precios en centavos, impuestos, envío, caja, terminal y referencia externa de transacción.
- Valido que subtotal, impuestos, envío, total, líneas y tenders cuadren. Para tarjeta guardo únicamente marca, últimos cuatro dígitos, código de autorización y referencia externa; no acepto ni persisto PAN/CVV.
- Cada línea debe pertenecer a un bin activo y pickable del almacén autorizado. Agrupo cantidades repetidas por artículo/bin y verifico disponibilidad agregada.
- El checkout de mostrador descuenta inventario; el pedido telefónico reserva inventario. Cada movimiento usa un operation_id estable.
- Persisto el registro de la venta y el progreso de la saga. Si un movimiento falla después de otros ya aplicados, marco COMPENSATING, revierto los movimientos confirmados con IDs de compensación y cierro como FAILED. Una repetición de una operación completada devuelve la misma venta.
- Dispatch de pedido telefónico libera la reserva y descuenta existencias; persiste la clave de despacho y recupera el resultado si el proceso cae después de completar el shipment.
- Refund admite devolución parcial o total por artículo/bin, verifica la venta original, el método de pago, la ventana de 90 días, las cantidades restantes y la conciliación monetaria de la devolución completa. El inventario devuelto se repone con operation_id idempotente.

**Límite importante:** el gemelo registra la referencia de la devolución externa; no ejecuta por sí mismo una operación contra un adquirente/banco. La equivalencia de DTO/status con todas las variantes del POS Flask todavía debe probarse con fixtures reales.

### Dockd y RMA

- Dockd persiste el shipment antes y después de cambiar la orden. Void exige motivo y clave de idempotencia, guarda VOIDING antes de revertir el estado y puede terminar la reversión tras un reinicio.
- El void devuelve la orden al estado previo al envío y pone QuantityShipped a cero. No introduce mercancía en inventario: una devolución física debe entrar por RMA.
- RMA deriva las cantidades retornables de las líneas enviadas. ReceiveLine registra cada recepción con operation_id y exige disposición RESTOCK, SCRAP o HOLD. RESTOCK necesita bin activo del mismo almacén y suma existencias al ledger; SCRAP/HOLD quedan registrados sin incrementar disponible. Complete exige que todas las cantidades esperadas estén recibidas y dispuestas.

### Webhooks

- Los eventos generan registros de outbox por suscripción y event_id estable.
- Un worker supervisado por el contexto del runtime procesa la cola. Reintenta errores de red, HTTP 429 y 5xx con backoff exponencial; los 4xx permanentes y el máximo de 12 intentos terminan en DEAD (DLQ).
- Expuse consulta de deliveries y reintento manual de una entrada DEAD.
- Los secretos nuevos se cifran con AES-256-GCM. Configuro `SENTRY_ENCRYPTION_KEY` o `WMS_WEBHOOK_ENCRYPTION_KEY` con una clave base64 de 32 bytes. El worker migra secretos antiguos en texto claro antes de procesar entregas. Las respuestas no exponen secreto ni ciphertext.
- Se mantiene la defensa SSRF: HTTPS, sin proxy de entorno, sin redirects y conexión a IP pública validada.

### Snapshots e Inbound

- Snapshot Restore verifica SHA-256, consistencia de Available y expected_ledger_version. La restauración es una sola escritura del organismo ledger y admite operation_id idempotente. Si la versión cambió, devuelve conflicto en vez de sobrescribir trabajo posterior.
- Inbound usa source_system + resource + external_id como identidad externa, guarda fingerprint y external_version, devuelve el resultado previo ante repetición exacta y rechaza payload distinto bajo la misma versión. Añadí resolución por warehouse_code y SKU y mapeo de atributos de item, sales order y purchase order. Si el registro de idempotencia no alcanzó a persistirse tras crear el agregado, recupera por claves naturales cuando el payload canónico coincide.

### Mesh

- Cuando PrismaTec-Core entrega un transporte LibP2P con Host(), arranco el DHT Kademlia real de go-libp2p-kad-dht y GossipSub de go-libp2p-pubsub. Incluí bootstrap, lookup de peers, anuncio/provisión de CID, búsqueda de providers, join/subscribe y publicación por topics.
- En transportes TCP/locales que no exponen un host libp2p se conserva el fallback peer-table + TTL fan-out. Ese fallback no se etiqueta como DHT ni GossipSub.
- Los eventos remotos recibidos por el topic `wms.events` se persisten y deduplican por event_id.

### Validación

Añadí pruebas unitarias para checkout/replay, refund/restock/replay, dispatch telefónico, void/replay, RMA restock/disposición, outbox de webhooks, idempotencia inbound, snapshot restore y recepción remota de eventos. La validación definitiva depende de los workflows de GitHub Actions; no marco el corte como validado hasta leer sus resultados.


### Ajustes de recuperación y arranque de red

- Snapshot Restore ahora crea y conserva un snapshot de respaldo del estado actual antes de modificar el ledger. El endpoint devuelve `backup_snapshot_id`; el registro de operación conserva ese ID y el resultado para que un retry no cree otro respaldo ni repita el restore.
- El runtime no continúa silenciosamente si se configuró LibP2P y falla el arranque de Kademlia/GossipSub: `StartBackground` devuelve el error y Runtime.New detiene el nodo.
- Para activar DHT/GossipSub, el Core debe arrancar con transporte libp2p: `PRISMATEC_TRANSPORT=libp2p` y `PRISMATEC_NETWORK_ADDR` como multiaddr, por ejemplo `/ip4/0.0.0.0/tcp/4001`. Si se usa TCP `host:port` o no hay red configurada, queda el adapter TTL y no se anuncia Kademlia/GossipSub.
- El worker de eventos reconcilia periódicamente todos los eventos persistidos con el outbox de webhooks usando el timestamp original. Así una caída entre la persistencia del evento y la creación de deliveries no pierde permanentemente la notificación; la creación es idempotente por subscription/event_id.


### Conciliación de devoluciones y RMA

El refund parcial ya no acepta un importe arbitrario: calcula el importe por cantidad a partir del total de línea original y el acumulado ya devuelto. El envío se devuelve por separado mediante `shipping_refund_cents`; la SO permanece PARTIALLY_REFUNDED hasta que artículos y cargos queden conciliados. RMA descuenta cantidades ya devueltas por POS y las cantidades comprometidas por RMAs anteriores que no estén cancelados. Así no puedo abrir dos expedientes que reclamen las mismas unidades.


### Cancelación segura de devoluciones

Añadí una compensación explícita al cancelar un RMA que ya recibió mercancía con disposición RESTOCK. La cancelación pasa primero a CANCELLING, revierte cada movimiento de inventario con un operation_id determinista y persiste el avance receipt por receipt. Si el proceso cae, la siguiente llamada reanuda la compensación; si el stock ya fue consumido y no se puede retirar, la cancelación queda pendiente y devuelve el error en lugar de fingir que terminó. Los movimientos SCRAP y HOLD no se alteran.


### Últimos endurecimientos de POS y webhooks

En las devoluciones POS consolido las líneas repetidas del mismo artículo/ubicación antes de ejecutar el movimiento de inventario. Esto evita que dos renglones compartan el mismo operation_id y el segundo quede tratado como replay de la primera cantidad. En webhooks amplié el bloqueo de destinos SSRF para incluir redes especiales y de documentación, además de redes privadas, loopback y link-local.


### Anulación de despacho POS y reexpedición

Al anular un despacho POS, el gemelo recupera el inventario que se descontó durante la expedición. Si era una orden telefónica, restablece también la reserva que existía antes del despacho; en una venta POS normal no crea una reserva artificial. La operación se identifica por despacho y ubicación, guarda el progreso en el envío y se puede reintentar sin duplicar unidades. Tras la anulación, la orden telefónica vuelve al estado pagado/no expedido y puede despacharse con una nueva clave de idempotencia.


## Cierre operativo del gemelo — rama de preparación para pruebas

En este corte cerré varios huecos de idempotencia y recuperación que encontré al revisar el código completo:

- En el void de un envío POS, ahora revierto el inventario que el checkout/dispatch había comprometido. Persisto el estado intermedio y la lista de ubicaciones revertidas; los IDs deterministas hacen que una recuperación después de una caída no duplique stock.
- No permito anular un pedido telefónico que aún no completó su dispatch, ni anular una venta con devoluciones parciales sin conciliarlas primero.
- En POS serializo dispatch y consolido las filas repetidas del mismo artículo/bin en un refund para que cada movimiento de inventario tenga un único operation_id.
- El restore de snapshot crea primero un respaldo y el endpoint devuelve su identificador. El cliente debe guardar `backup_snapshot_id` antes de considerar finalizada la restauración.
- Amplié el mapping inbound: item incluye UPC/MPN/categoría/descripción/peso/bin por defecto/reorder point/reorder quantity/activo; sales order incluye barcode/cliente/notas y líneas; purchase order incluye barcode/proveedor/fecha/notas y líneas con coste y número. Cuando el recurso ya existe por clave natural, comparo los campos mapeados y no lo doy por recuperado si el payload difiere.
- Cuando se activa idempotencia inbound, exijo source_system, external_id y external_version. Una misma versión con payload distinto se rechaza; una versión diferente también queda en conflicto hasta que definamos el contrato de supersession del ERP.
- El worker de webhooks informa fallos de persistencia y ejecución. Los mensajes se entregan con semántica at-least-once; no afirmo exactly-once entre nodos.
- El arranque ya no trae una clave JWT fija ni credenciales demo implícitas. Exijo JWT_SECRET de al menos 32 caracteres y solo creo operator/admin de demo cuando activo explícitamente `WMS_TWIN_ALLOW_DEMO_BOOTSTRAP=true`.

Para validar esta rama primero ejecutaré CI y la suite Go. Después comenzaré las pruebas reales en un único nodo y con datos aislados. El procesador de pagos externo, la actualización de recursos con external_version más nueva y la coordinación HA del worker siguen siendo integraciones/contratos pendientes; no las disfrazo como terminadas.


La prueba de cancelación RMA verifica el saldo neto en cero, no la ausencia física de la fila del balance. El ledger conserva balances históricos con cantidad cero, por lo que la aserción correcta es OnHand=0 y Allocated=0.
