# Flask API contracts and frontend authorization matrix

Fuente de verdad: decoradores de rutas, esquemas Pydantic y middleware de Flask en esta rama. Los sufijos indicados se publican bajo `/api`. El inventario de rutas no equivale a una migración funcional: cada respuesta debe contrastarse con su DTO Svelte y un test de contrato antes de dar una feature por completa.

## 1. Sesión de navegador

| Método | Endpoint | Request DTO | Seguridad / efecto |
|---|---|---|---|
| POST | `/api/auth/login` | `LoginRequest` — `api/schemas/auth.py` | Público; rate limit por IP+usuario; emite cookie HttpOnly y cookie CSRF |
| POST | `/api/auth/logout` | CSRF si hay cookie válida | Sin cookie es no-op; con sesión válida exige CSRF y limpia cookies |
| GET | `/api/auth/me` | — | Auth; devuelve identidad, rol, almacenes, funciones, páginas, overrides, require_packing y must_change_password |
| POST | `/api/auth/refresh` | — | Auth; vuelve a comprobar usuario activo y renueva cookies |
| POST | `/api/auth/change-password` | `ChangePasswordRequest` | Auth; valida contraseña actual/política, cambia hash, elimina flag forzado y audita |

**Reglas globales:** las mutaciones con cookie requieren double-submit CSRF; 401 significa sesión/token inválido o cuenta inactiva; 403 significa CSRF, permiso o scope denegado. Con `must_change_password=true` solo se permiten `auth.me`, `auth.logout` y `auth.change_password`. Flask recarga estado activo, rol, almacenes y permisos desde DB en cada request; el JWT no es autoridad para grants actuales.

## 2. Endpoints operativos autenticados

Los endpoints siguientes usan `require_auth`. Para usuarios no ADMIN, el middleware limita los IDs explícitos de almacén a `warehouse_ids`. Si path, query y JSON body aportan `warehouse_id`, deben coincidir (400 si hay discrepancia); un almacén ajeno devuelve 403. Las consultas multi-almacén deben filtrar en SQL con `warehouse_scope_clause` o equivalente para no filtrar existencia de datos de otro almacén.

| Funcionalidad | Rutas | DTO de request |
|---|---|---|
| Dashboard | GET `/dashboard/productivity` (ADMIN); GET/PUT `/dashboard/preferences`; GET `/dashboard/received`; GET `/dashboard/shipping-health` | Preferencias definidas en route |
| Conteo cíclico operativo | POST `/inventory/cycle-count/create`; GET `/inventory/cycle-count/{count_id}`; POST `/inventory/cycle-count/submit` | `CreateCycleCountRequest`, `SubmitCycleCountRequest` — `schemas/cycle_count.py` |
| Lookup | GET `/lookup/item/{barcode}`, `/lookup/bin/{barcode}`, `/lookup/so/{barcode}`, `/lookup/item/search?q=`, `/lookup/bin/search?q=` | Parámetros URL/query; respuestas route-defined |
| Receiving | GET `/receiving/po/{barcode}`; POST `/receiving/receive`; POST `/receiving/cancel` | `ReceiveItemsRequest`, `CancelReceivingRequest` — `schemas/receiving.py` |
| Putaway | GET `/putaway/pending/{warehouse_id}`, `/putaway/staging-summary/{warehouse_id}`, `/putaway/suggest/{item_id}`; POST `/putaway/confirm`, `/putaway/update-preferred` | `schemas/putaway.py` |
| Picking | GET `/picking/active-batch`; POST `/picking/create-batch`, `/picking/wave-validate`, `/picking/wave-create`; GET `/picking/batch/{id}`, `/picking/batch/{id}/next`; POST `/picking/confirm`, `/picking/short`, `/picking/complete-batch`, `/picking/cancel-batch` | `schemas/pick_walks.py` |
| Packing | GET `/packing/order/{barcode}`; POST `/packing/verify`, `/packing/complete` | `schemas/pack_verification.py` |
| Shipping | GET `/shipping/order/{barcode}`; POST `/shipping/fulfill` | `schemas/shipping.py` |
| Movimiento interno | POST `/transfers/move` | `schemas/bin_transfer.py` |
| Almacenes para operación | GET `/warehouses/list` | — |

## 3. Admin endpoints y page grants

Salvo excepción anotada, cada grupo usa `require_auth` + `require_admin_or_page_permission("<key>")`. ADMIN omite el grant; USER necesita la clave exacta en `user_page_permissions`. La denegación devuelve 403 `Permission denied` y `page_key`.

| Page key | Endpoints Flask (sufijo) | Request schema |
|---|---|---|
| `items` | GET/POST `/admin/items`; GET/PUT/DELETE `/admin/items/{id}`; POST `/admin/items/{id}/archive` | `schemas/items.py` |
| `preferred-bins` | Rutas de preferred bins declaradas en `admin_items.py` | `schemas/items.py` |
| `warehouses` | GET/POST `/admin/warehouses`; GET/PUT/DELETE `/admin/warehouses/{id}` | `schemas/warehouses.py` |
| `zones` | GET/POST `/admin/zones`; PUT/DELETE `/admin/zones/{id}` | `schemas/zones.py` |
| `bins` | GET/POST `/admin/bins`; GET/PUT/DELETE `/admin/bins/{id}` | `schemas/bins.py` |
| `vendors` | GET/POST `/admin/vendors`; GET/PUT/DELETE `/admin/vendors/{canonical_id}` | `schemas/vendors.py` |
| `purchase-orders` | GET/POST `/admin/purchase-orders`; GET/PUT detail; POST lines; PATCH/DELETE lines; POST close/reopen | `schemas/purchase_orders.py` |
| `receiving` | GET `/admin/purchase-orders/{id}/receipts`; POST `/admin/receipts/{id}/unreceive` | `schemas/receiving.py` |
| `sales-orders` | GET/POST list; GET/PUT detail; GET related/source-systems; PATCH address/allocation; POST cancel/revert/admin-pick/admin-ship/partial-fulfill/create-rma/receive-return; POST/PATCH/DELETE lines; GET available-bins/short-picks | `schemas/sales_orders.py`, `schemas/receiving.py` |
| `fraud` | PATCH sales-order memo; POST push-to-queue | `schemas/sales_orders.py` |
| `backorders` | GET `/admin/backorders`; cancel-backorder action on sales order (guarded by sales-orders) | `schemas/sales_orders.py` |
| `picking-tickets` | GET sales-order picking-ticket; POST sales-orders/mark-printed | `schemas/sales_orders.py` |
| `picking-batches` | GET `/admin/pick-batches`; POST `/admin/pick-batches/{id}/delete` | Route-defined |
| `transfer-orders` | GET list/detail; POST cancel/import/start-picking/short-close/approve/reject; DELETE detail; picker GET/submit uses auth + warehouse scope | `schemas/bin_transfer.py` |
| `users` | GET/POST `/admin/users`; PUT/DELETE detail; GET/PUT permissions | `schemas/users.py` |
| `audit-log` | GET `/admin/audit-log` | Query filters |
| `settings` | GET `/admin/settings`, GET setting detail, PUT settings | `schemas/settings.py` |
| `cycle-counts` | GET `/admin/cycle-counts` | Query filters |
| `adjustments` | GET pending/list; POST review/direct | `schemas/inventory_adjustments.py` |
| `api-tokens` | GET scope-catalog/list; POST create; POST rotate/revoke; DELETE token | `schemas/tokens.py` |
| `integrations` | GET connectors/config-schema/credentials/sync-status; POST credentials/test/sync-reset/sync; DELETE credentials | `schemas/connectors.py` |
| `consumer-groups` | CRUD connector-registry and consumer-groups | `schemas/consumer_groups.py` |
| `inbound` | GET inbound/activity and detail | `schemas/inbound.py` |
| `notifications` | CRUD notification-webhooks; POST rotate-url/test-send | `schemas/notification_webhooks.py` |
| `webhooks` | CRUD webhooks; GET DLQ/stats/errors; POST rotate-secret/replay/replay-batch | `schemas/webhooks.py` |
| `channels` | GET/POST list; GET/PATCH/DELETE detail; GET channel DLQ | `schemas/channels.py` |
| `pos-activity` | GET POS sales-orders and summary | `schemas/pos.py` |
| Sin page grant | GET `/admin/dashboard`, GET `/admin/search` | Auth only; dashboard exposes counts, global search still scope-filtered and click-through protected |

### API surfaces con WMS token (no usar el cliente de sesión web)

- `/api/v1/events*` y `/api/v1/snapshot/*`: token outbound con endpoint slugs explícitos.
- `/api/v1/inbound/*`: token ligado a source system y recursos de entrada permitidos.
- `/api/v1/dockd/*`: scope aislado `dockd.dispatch`.
- `/api/v1/pos/*`: scope aislado `pos.dispatch`.
- `/api/inbound/mapping-schema`: endpoint de descubrimiento sin decorador de sesión en el archivo inspeccionado.

## 4. DTO backend → frontend

Los request DTO Pydantic y los response DTO JSON son contratos diferentes. La forma de respuesta se define en cada `jsonify`; no asumir que coincide con el esquema de entrada.

| Backend | Svelte DTO / mapper |
|---|---|
| `schemas/auth.py` | `core/feature/auth/data/dto/AuthDto.ts`, `AuthMapper.ts` |
| `schemas/items.py` + respuestas de `admin_items.py` | `core/feature/items/data/dto/ItemDto.ts`, `ItemMapper.ts` |
| `schemas/warehouses.py`, `zones.py`, `bins.py` | `core/feature/warehouses/data/dto/WarehouseDto.ts`, `WarehouseMutationDto.ts`, `WarehouseMapper.ts` |
| `schemas/receiving.py`, `purchase_orders.py` | `core/feature/receiving/data/dto/ReceivingDto.ts` |
| `schemas/putaway.py` | `core/feature/putaway/data/dto/PutawayDto.ts` |
| `schemas/pick_walks.py` | `core/feature/picking/data/dto/PickingDto.ts` |
| `schemas/pack_verification.py` | `core/feature/packing/data/dto/PackingDto.ts` |
| `schemas/shipping.py` | `core/feature/shipping/data/dto/ShippingDto.ts` |

Para cada feature, completar con tests: campos obligatorios/opcionales, nulabilidad, envelope, paginación, errores/status HTTP, permiso y efectos secundarios. El inventario aquí localiza los contratos; no sustituye esos tests.

## 5. Matriz de regresión de permisos y almacenes

| ID | Escenario | Resultado esperado |
|---|---|---|
| P-01 | ADMIN abre página admin | Pasa el gate de página |
| P-02 | USER sin grant llama GET `/admin/items` | 403 `Permission denied`, `page_key=items` |
| P-03 | USER con grant `items` llama listado | Pasa page gate; se mantienen otros controles |
| P-04 | USER tiene `bins`, no `zones`, abre `/data/bins` | UI deniega porque requiere ambos grants |
| P-05 | USER con warehouses+zones+bins abre detalle de almacén | UI permite ruta |
| P-06 | USER asignado a almacén 4 solicita almacén 4 | Permitido |
| P-07 | USER asignado a almacén 4 solicita almacén 9 | 403 |
| P-08 | path warehouse 4 + body warehouse 9 | 400 mismatch antes del handler |
| P-09 | USER sin almacenes asignados solicita ID explícito | 403 |
| P-10 | ADMIN solicita cualquier warehouse ID | Scope bypass |
| P-11 | sessionStorage conserva 99, asignación actual [4,8] | Descarta 99 y selecciona 4 (o ID guardado válido) |
| P-12 | Se revoca grant/asignación con JWT aún vigente | Siguiente request aplica DB actualizada |
| P-13 | USER con must_change_password llama endpoint normal | 403 `password_change_required` |
| P-14 | Mutación cookie sin CSRF válido | 403 CSRF |
| P-15 | Usuario inactivo o JWT invalidado por cambio de password | 401 |
| P-16 | WMS token con slug/recurso/dirección incorrectos | 401 token inválido o 403 scope violation |

**Límite de seguridad:** el frontend solo mejora UX; Flask es la frontera de autorización. Ocultar una ruta o menú no protege un endpoint.

## 6. Reglas para cerrar contratos

1. Registrar método, path, query/path params y schema Pydantic.
2. Registrar response JSON real, incluyendo wrappers, arrays, paginación y nullability.
3. Registrar códigos de error y significado; no traducir 403 como sesión expirada.
4. Registrar page key / role guard y si hay alcance de almacén.
5. Registrar side effects: inventario, estado de pedido, auditoría, eventos, notificaciones.
6. Añadir test de contrato en Svelte con fixtures del backend y verificar DTO/mapper.
7. Si la operación no existe, documentar bloqueo; no simular persistencia en frontend.
