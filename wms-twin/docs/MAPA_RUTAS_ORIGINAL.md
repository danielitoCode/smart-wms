# Mapa de contratos del backend original

Escribo este mapa a partir de los blueprints Flask, sus decoradores, esquemas Pydantic, cliente admin, cliente móvil y tablas PostgreSQL que inspeccioné en `main`. Es la referencia para portar funcionalidad sin adivinar rutas. No modifica ni sustituye el backend original.

## 1. Regla de compatibilidad

El contrato que debo reproducir no es solo la URL. Para cada operación tengo que igualar:

- método HTTP y ruta final después del prefijo del blueprint;
- parámetros de ruta, query y cuerpo;
- validación (incluyendo límites, enums y valores por defecto);
- forma JSON, claves, tipos, paginación y fechas;
- códigos HTTP y mensajes de error;
- cookies, JWT, CSRF, roles, permisos por página y alcance por almacén;
- efectos laterales: inventario, órdenes, auditoría, eventos, outbox, webhooks y estados;
- garantías de transacción, bloqueo, idempotencia y concurrencia.

Los decoradores `@require_auth`, `@require_admin_or_page_permission`, `@require_wms_token`, `@with_db` y `@validate_body` forman parte del contrato. No se deben eliminar por comodidad al portar una ruta.

## 2. Clientes y conmutación de backend

### Admin web

- Archivo: `admin/src/api.js`.
- Base: `const API_BASE = '/api'`.
- Envía `credentials: 'include'`.
- Lee `sentry_csrf` y envía `X-CSRF-Token` en POST/PUT/PATCH/DELETE.
- Si recibe 401 (salvo login/me) redirige a `/login`.
- Emite evento `sentry:permission-denied` cuando recibe 403 con `error=Permission denied` y `page_key`.

### App móvil

- Archivo: `mobile/src/api/client.js`.
- Base build-time: `EXPO_PUBLIC_API_URL`; fallback `http://localhost:5000`.
- Permite cambiar URL en runtime y la guarda bajo `sentry_api_url` en AsyncStorage.
- Lee `jwt_token` del almacenamiento seguro y lo envía como `Authorization: Bearer`.
- No depende de cookies CSRF.

### Alternancia

Puedo ejecutar Flask y Go en puertos distintos y alternar el upstream `/api` del proxy para admin. Para móvil puedo cambiar el API URL de deployment/configuración. Esta posibilidad de transporte no significa que el gemelo ya sea compatible: no se debe conmutar a él hasta cerrar autenticación y matriz de rutas.

## 3. Autenticación y autorización

| Elemento | Contrato original inspeccionado |
|---|---|
| Login | `POST /api/auth/login`; valida usuario activo y bcrypt |
| JWT | HS256; expira a las 8 horas; claims user_id, username, role, warehouse_id, warehouse_ids, iat, jti, exp |
| Admin cookie | `sentry_auth`, HttpOnly, SameSite=Strict, Secure cuando HTTPS, path=/ |
| CSRF cookie | `sentry_csrf`, legible por cliente, SameSite=Strict |
| CSRF header | `X-CSRF-Token`; doble envío en mutaciones por cookie |
| Mobile | Bearer JWT en Authorization |
| Logout | `POST /api/auth/logout`; CSRF cuando la cookie sigue siendo válida; logout sin cookie es no-op |
| Sesión actual | `GET /api/auth/me`; consulta usuario en DB y devuelve permisos efectivos |
| Refresh | `POST /api/auth/refresh` |
| Cambio de contraseña | `POST /api/auth/change-password`; fuerza actualización cuando `must_change_password` |
| Rate limit login | 5 intentos por combinación IP/usuario; bloqueo 15 min por defecto |
| Estado usuario | cada request protegido vuelve a consultar is_active, role, warehouse_ids, password_changed_at y must_change_password |
| Permisos de página | ADMIN bypass; USER carga `user_page_permissions` |
| Alcance almacén | combina path/query/body; rechaza valores discrepantes con 400 y acceso fuera de scope con 403 |
| WMS tokens | revocación mediante cache, Redis pubsub y PostgreSQL NOTIFY; TTL 60s como respaldo |

**No debo validar solo la firma JWT y confiar en el rol que trae el token.** El original actualiza estado y alcance del usuario en cada petición. El gemelo necesita una identidad local equivalente o una sincronización verificable antes de declarar paridad.

## 4. Blueprints y rutas registradas

Los prefijos se registran en `api/app.py`. Las rutas indicadas abajo se concatenan al prefijo de cada grupo.

### Autenticación, consultas y operaciones de almacén

| Prefijo | Rutas inspeccionadas |
|---|---|
| `/api/auth` | POST `/login`, POST `/logout`, GET `/me`, POST `/refresh`, POST `/change-password` |
| `/api/lookup` | GET `/item/<barcode>`, `/bin/<barcode>`, `/so/<barcode>`, `/item/search`, `/bin/search` |
| `/api/receiving` | GET `/po/<barcode>`; POST `/receive`, `/cancel` |
| `/api/putaway` | GET `/pending/<warehouse_id>`, `/staging-summary/<warehouse_id>`, `/suggest/<item_id>`; POST `/confirm`, `/update-preferred` |
| `/api/picking` | GET `/active-batch`, `/batch/<batch_id>`, `/batch/<batch_id>/next`; POST `/create-batch`, `/wave-validate`, `/wave-create`, `/confirm`, `/short`, `/complete-batch`, `/cancel-batch` |
| `/api/packing` | GET `/order/<barcode>`; POST `/verify`, `/complete` |
| `/api/shipping` | GET `/order/<barcode>`; POST `/fulfill` |
| `/api/inventory` | POST `/cycle-count/create`; GET `/cycle-count/<count_id>`; POST `/cycle-count/submit` |
| `/api/transfers` | POST `/move` |
| `/api/warehouses` | GET `/list` |

### Integraciones y eventos versionados

| Prefijo | Rutas inspeccionadas |
|---|---|
| `/api/v1/events` | GET `/`, POST `/ack`, GET `/types`, GET `/schema/<event_type>/<version>` |
| `/api/v1/snapshot` | GET `/inventory` |
| `/api/v1/inbound` | GET `/mapping-schema` |
| `/api/v1/dashboard` | GET `/productivity`, `/preferences`, `/received`, `/shipping-health`; PUT `/preferences` |
| `/api/v1/dockd` | GET `/orders/<so_number>`, `/items/<barcode>`; POST `/orders/<so_number>/ship`, `/orders/<so_number>/void-ship` |
| `/api/v1/pos` | GET `/availability`, `/sales-orders/<so_number>`; POST `/validate-cart`, `/checkout`, `/refund`, `/reference-orders` |

### Administración: prefijo `/api/admin`

| Grupo | Rutas inspeccionadas |
|---|---|
| Canales | POST/GET `/channels`; GET/PATCH/DELETE `/channels/<channel_id>`; GET `/channels/<channel_id>/dlq` |
| Registro de conectores | POST/GET `/connector-registry`; PATCH/DELETE `/connector-registry/<connector_id>` |
| Grupos de consumidores | POST/GET `/consumer-groups`; PATCH/DELETE `/consumer-groups/<consumer_group_id>` |
| Conectores | GET `/connectors`, `/connectors/<name>/config-schema`, `/connectors/<name>/credentials`, `/connectors/<name>/sync-status`; POST credenciales/test/sync-reset/sync; DELETE credenciales |
| Inbound | GET `/inbound/activity`, `/inbound/activity/<resource>/<inbound_id>` |
| Items | GET/POST `/items`; GET/PUT/DELETE `/items/<item_id>`; POST archive/import; GET `/inventory`; GET/POST `/preferred-bins`; PUT/DELETE `/preferred-bins/<preferred_bin_id>` |
| Notificaciones | GET/POST `/notification-webhooks`; PATCH/DELETE `/notification-webhooks/<webhook_id>`; POST rotate-url/test-send |
| Órdenes | CRUD purchase-orders; líneas PO; close/reopen; receipts/unreceive; source-systems; CRUD sales-orders; related/picking-ticket/mark-printed; dirección/memo/allocation; push/cancel/revert; admin-pick/admin-ship; partial-fulfill; backorders; RMA/returns; short-picks |
| Pick batches | GET `/pick-batches`; POST `/pick-batches/<batch_id>/delete` |
| POS | GET `/pos/sales-orders`, `/pos/summary` |
| Búsqueda | GET `/search` |
| Tokens WMS | GET `/scope-catalog`, `/tokens`; POST create/rotate/revoke; DELETE `/tokens/<token_id>` |
| Transfer orders | GET list/detail; POST cancel/import/start-picking/submit/approve/reject/short-close; DELETE transfer order |
| Usuarios y administración | GET/POST `/users`; PUT/DELETE `/users/<user_id>`; GET/PUT permissions; GET audit-log/dashboard/settings/cycle-counts/adjustments; PUT settings; POST adjustment review/direct |
| Proveedores | GET/POST `/vendors`; GET/PUT/DELETE `/vendors/<canonical_id>` (UUID) |
| Almacenes | GET/POST `/warehouses`; GET/PUT/DELETE `/warehouses/<id>`; CRUD zones y bins; POST/GET inter-warehouse transfers |
| Webhooks | POST/GET `/webhooks`; GET/PATCH/DELETE `/webhooks/<subscription_id>`; POST rotate-secret/replay/replay-batch; GET DLQ/stats/errors |

Este mapa es un inventario de rutas extraído del código. Antes de portar cada operación debo consultar su handler, esquema, servicios y tests específicos; la tabla no sustituye esa lectura.

## 5. Contratos de datos maestros ya inspeccionados

### Warehouse

- Crear: `warehouse_code` 1–32, `warehouse_name` 1–256, `address` opcional hasta 512.
- Actualizar: los mismos campos opcionales más `is_active`.
- Listado: `warehouses`, `total`, `page`, `per_page`, `pages`; orden por `warehouse_id`.
- Duplicado de `warehouse_code`: 400.
- No se borra si hay stock, bins o zones: 400.

### Zone

- Crear: `warehouse_id > 0`, `zone_code` 1–32, `zone_name` 1–128, `zone_type` en RECEIVING/STORAGE/PICKING/STAGING/SHIPPING.
- Unicidad: `(warehouse_id, zone_code)`.
- No se borra si tiene bins: 409.
- Listado admite filtro `warehouse_id` y paginación.

### Bin

- Crear: zone_id/warehouse_id positivos; code 1–64; barcode 1–128; type en Staging/PickableStaging/Pickable; secuencias no negativas; coordenadas opcionales.
- Unicidad: `(warehouse_id, bin_code)`.
- Listado filtra warehouse_id, zone_id, bin_type y texto `q` sobre code/barcode.
- Delete devuelve 409 si hay inventario con quantity_on_hand > 0 o preferred-bin mappings.

### Item

- Crear: SKU 1–128, nombre 1–256; description 1000; UPC 128; MPN 64; category 128; weight_lbs 0–99999; default_bin_id positivo opcional.
- Update permite reorder_point/reorder_qty no negativos e is_active.
- SKU único; UPC duplicado se rechaza.
- Detalle incluye item, inventory y preferred_bins.
- La tabla items contiene además barcode_aliases, dimensiones, tracking por lote/serie, timestamps y external_id.

### Inventario

- La fila se identifica por `inventory_id`, no por item_id.
- La unicidad SQL es `(item_id, bin_id, lot_number)`; el mismo artículo en un bin puede tener varias filas por lote.
- quantity_available se calcula como on_hand - allocated.
- No debo reducir stock por debajo de lo reservado.

## 6. Infraestructura y pruebas originales

- Backend: Flask + SQLAlchemy.
- Persistencia original: PostgreSQL; Redis participa en invalidación rápida de tokens y otros flujos.
- Celery/Redis se usan en tareas y procesos asíncronos.
- La suite original vive en `api/tests/`; hay pruebas de auth/CSRF, concurrencia, IDOR/scope, inventario, receiving, picking, shipping, transfer orders, events/outbox, webhooks, tokens, conectores, auditoría y migraciones.
- `api/tests/conftest.py` exige `TEST_DATABASE_URL` separado de `DATABASE_URL`. Nunca debo ejecutar pruebas originales contra una base real.
- Para paridad crearé fixtures de request/response y pruebas diferenciales, sin importar los modelos SQLAlchemy al gemelo.

## 7. Hallazgos técnicos que condicionan la arquitectura Core

En la revisión de PrismaTec-Core confirmé estas capacidades y límites:

1. `core.Node` administra identidad persistente, organismos, bus de eventos, pulses, auditoría local, provenance, transporte y servicio de replicación.
2. `network.Transport` soporta TCP/libp2p y mensajes dirigidos; la configuración acepta mapa NodeID → dirección de peer.
3. `network/NETWORK_LIBP2P.md` deja DHT y GossipSub como trabajo futuro. No puedo afirmar que Kademlia/GossipSub estén implementados en este commit.
4. `replication.Snapshot` transporta el organismo (incluye memoria/episodios), no los bytes de los bloques CID referenciados. `AppendEpisode` guarda los bytes en el block store local. Por tanto, la replicación Core actual no garantiza que otro nodo pueda leer esos bloques.
5. El CID por defecto del block store Core es `cid1:` + SHA-256; existe un helper para IPFS CIDv1, pero no equivale a un daemon IPFS ni a una red de pinning.
6. `RootCID` se deriva del manifiesto estable del organismo; no es un hash mutable de todo su estado operativo.
7. La recuperación de réplica aumenta epoch y registra fencing, pero el documento de autoridad de Core reconoce que la detección actual de primaria offline es orientada a liveness, no quorum seguro ante partición de dos nodos.
8. Mind y Zyrion están implementados como paquetes Go: Zyrion produce 0/1/2 epistemológico; Mind observa, evalúa y propone; Bridge consulta policy antes de ejecutar. No son un autorizador sustituto del control de acceso WMS.
9. El audit log Core observado es JSONL local con buffer; no es equivalente por sí solo a la cadena SHA-256 de auditoría del WMS original.

Estos límites se convierten en tareas explícitas del gemelo. No los oculto detrás de la palabra “descentralizado”. El ledger actual sigue siendo un agregado global con un primario; el protocolo de bloques no aporta quorum ni consenso.
