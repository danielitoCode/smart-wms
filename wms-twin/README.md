# WMS Twin — backend gemelo sobre PrismaTec-Core

Servicio Go independiente. No reemplaza ni importa código del backend Flask original. PrismaTec-Core es una dependencia externa fijada en `go.mod` y `go.sum`.

## Estado

- [x] Nodo Core y listeners WMS/AIP separados.
- [x] Health WMS con contrato público original básico.
- [x] Persistencia genérica: un organismo por registro, episodios y bloques CID locales.
- [x] API técnica Bearer para CRUD genérico.
- [x] Invariantes puras de balance.
- [x] Ledger Core-backed para ajuste, reserva, liberación y movimiento.
- [x] Idempotencia por `operation_id`, reinicio y serialización local cubiertos por tests añadidos.
- [x] JWT HS256, cookies, CSRF, refresh/logout y lockout persistente; revocación individual por jti pendiente.
- [~] Roles, permisos por página y scopes por almacén en la capa actual; WMS token scopes y cobertura total de rutas pendientes.
- [ ] DTO/rutas compatibles y pruebas diferenciales.
- [x] Transferencia firmada de bloques CID + snapshots entre peers explícitos, con ACK y fencing de réplica.
- [ ] Quorum, autoridad por partición, reconciliación y failover seguro.
- [~] Primer corte de datos maestros (warehouses/zones/bins); demás flujos WMS pendientes.

**NO SUSTITUIBLE.** El ledger es un primer corte de dominio, no un backend equivalente.

## Arranque

Requiere Go 1.25+ y acceso inicial al proxy de módulos.

```bash
export WMS_TWIN_DATA_DIR="$HOME/.local/share/smart-wms-twin"
export WMS_TWIN_NODE_NAME="wms-node-local"
export WMS_TWIN_HTTP_ADDR=":5001"
export WMS_TWIN_AIP_ADDR=":8081"
export WMS_TWIN_API_TOKEN="$(openssl rand -hex 32)"
go mod download
go mod verify
go test ./...
go run ./cmd/wms-twin
```

WMS :5001; AIP :8081. No requiere PostgreSQL ni Redis. El original conserva sus dependencias.

## API técnica

Todas las rutas `/api/twin/*` requieren Bearer token:
- `GET /api/twin/inventory/balances`
- `POST /api/twin/inventory/adjust`
- `POST /api/twin/inventory/allocate`
- `POST /api/twin/inventory/release`
- `POST /api/twin/inventory/move`

Las mutaciones requieren `operation_id`. El mismo ID/comando es idempotente; el mismo ID con otro contenido devuelve 409. El movimiento envía solo identificadores de ubicación; el servidor lee balances autoritativos desde su ledger local.

## Límites

La serialización del ledger es por proceso y el agregado es global con un solo primario. El protocolo WMS sí transfiere bloques CID firmados antes del snapshot y tiene prueba LocalTransport de dos nodos; falta TCP/libp2p multi-proceso. No hay quorum ni failover seguro ante partición. DHT/GossipSub siguen como futuros en Core. No conectar el frontend original hasta completar autenticación y paridad. El historial no tiene compactación.

## Documentación

Leer `Guia.md`, `EstructuraBackendGo.md`, `NivelDeParidadConBackendOriginal.md`, `AUDITORIA_GEMELO.md`, `docs/CONTRATO_FRONTEND.md`, `docs/MAPA_RUTAS_ORIGINAL.md` y `docs/INVENTORY_LEDGER.md`.


## Estado de CI de la entrega de inventario

En el primer run posterior al ledger, el guard de alcance/documentación pasó, pero `go mod tidy -diff` falló antes de compilar. El grafo se está reconstruyendo en CI para obtener los archivos de módulo canónicos. No se debe interpretar el commit como validado hasta que el workflow completo termine en success.


## Última validación

El guard de alcance pasó y el módulo Go pudo resolverse y verificarse. El job se detuvo en gofmt antes de vet y race tests. Estoy recuperando fuentes formateadas desde un artefacto temporal; no marco el ledger como probado hasta que el siguiente CI completo termine en success.


## Corrección de calidad

El grafo Go canónico y el formato se recuperaron de un artefacto generado por Go 1.25 en CI. Se retiró el import no utilizado que detuvo vet. El workflow vuelve a ser estricto y no reescribe archivos. La implementación queda pendiente de la ejecución completa de vet y race tests.


## Validación

La ejecución `42893176180` terminó en success. Pasaron tidy diff, verificación de módulos, gofmt, vet y race tests. La implementación técnica queda validada en el alcance cubierto por esos tests; no equivale a paridad con el backend original.


## Último resultado de CI

La ejecución 42895311390 pasó guard de alcance, grafo de módulos, gofmt y vet. Pasaron inventoryledger, corestore, domain/inventory, replication y runtime. httpapi detectó que el middleware aceptaba un token sin el esquema Bearer; el defecto está corregido en la rama y queda pendiente de nueva ejecución. No considero esta entrega validada hasta que CI termine en success.


## Seguridad de identidad — fase 02 en curso

Se añadieron primitives aisladas para JWT HS256, CSRF double-submit y validación de password. No hay todavía endpoints de login/logout/refresh ni persistencia de usuarios; el Bearer técnico sigue siendo el único mecanismo HTTP activo. La especificación contractual y el orden de implementación están en [FASE_02_SEGURIDAD.md](docs/FASE_02_SEGURIDAD.md). No conectar el frontend hasta cerrar la fase completa.


## Identidad persistente — primer bloque interno

El paquete `internal/application/identity` persiste usuarios en organismos Core y usa bcrypt. Incluye normalización/duplicidad de username, autenticación interna, cambio de contraseña y DTO público sin hash. Aún no hay importador del backend original ni endpoints HTTP; el Bearer técnico sigue siendo el único guard activo. La fase continúa incompleta.


## Validación del repositorio de identidad

El corte `d8c2c02e17c667620cccdf6dcb017a83f33e575c` pasó la ejecución CI `42897626723`: tidy diff, module verify, gofmt, vet y race tests; el guard documental/alcance también pasó. El workflow publicó el formato final en `e0d2e20dea760ad99f71c1376d97a4896f28c284`. La autenticación HTTP sigue pendiente.


## Autenticación HTTP disponible en el gemelo

Se implementaron `/api/auth/login`, `logout`, `me`, `refresh` y `change-password`, con JWT HS256, cookies HttpOnly/CSRF, estado vivo de usuario, lockout persistente y wrappers de page/warehouse permissions. El runtime acepta `JWT_SECRET` y un `WMS_TWIN_BOOTSTRAP_USERS_FILE` con hashes bcrypt (modo 0600). No hay aún rutas WMS de negocio portadas ni gestión HTTP de usuarios; el frontend sigue sin estar habilitado para este gemelo.


## Importación de usuarios

El bootstrap de identidades es reanudable: no sobrescribe IDs existentes y añade los faltantes, por lo que puede recuperarse de una importación parcial. El archivo JSON debe contener hashes bcrypt, con permisos 0600 o más restrictivos. El coste bcrypt para hashes nuevos es 12.


## Validación de auth y bootstrap

El corte `5d8d334bb24dc21bf2609f8c8089092297563de8` pasó WMS twin validation `42899616129`, incluidos tidy diff, module verify, gofmt, vet, race tests y guard documental. El formato final quedó en `2720ed7d70fb69e46422c3338dc354f15d30cc3a`. La auditoría global npm/pip del repositorio continúa fallando en componentes admin/mobile/Python, separada de esta validación Go.


## Validación automatizada de Fase 03

WMS twin validation `42974486856` terminó correctamente. Pasaron guard de alcance y documentación, verificación del módulo, gofmt, vet y tests con detector de carreras. El commit final de formato es `ccf1934b2640feb45df852d515316be73d408de1`.

La suite general de pruebas del repositorio aún estaba ejecutándose al registrar esta actualización. Esta validación no autoriza cambiar el frontend ni declara el gemelo completo.


## Fase 04 — artículos, ubicaciones preferidas y proveedores

El gemelo incorpora rutas de catálogo extendido:
- `/api/admin/items` (GET/POST), `/items/{id}` (GET/PUT/DELETE), `/items/{id}/archive` (POST).
- `/api/admin/preferred-bins` (GET/POST), `/preferred-bins/{id}` (PUT/DELETE).
- `/api/admin/vendors` (GET/POST), `/vendors/{canonical_id}` (GET/PUT/DELETE).

Las ubicaciones preferidas solo aceptan bins Pickable y mantienen prioridades contiguas. Los proveedores usan UUID. Consulta `docs/FASE_04_CATALOGO_EXTENDIDO.md`. El gemelo continúa sin ser sustituto: faltan workflows operativos y pruebas diferenciales.


## Estado CI de Fase 04

WMS twin validation `42975654846` terminó en success, incluidos vet y tests con detector de carreras. El commit final con formato es `6b7d821277b29baf1754f3aa2038a1a85bf33a2d`. La suite general del repositorio `42975655011` seguía ejecutándose al registrar.


## Fase 05 — Purchase Orders disponibles

El gemelo ya expone administración de órdenes de compra y líneas bajo `/api/admin/purchase-orders`, con estado OPEN/PARTIAL/RECEIVED/CLOSED/ARCHIVED, close/reopen, validación de referencias a warehouse/items y autorización por almacén. No incluye todavía recepción, cancelación, receipts ni putaway. Consulta `docs/FASE_05_PURCHASE_ORDERS.md`.
