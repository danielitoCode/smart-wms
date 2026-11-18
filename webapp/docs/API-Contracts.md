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

### 3.2 Autorización efectiva de Users (F4.1.3–F4.1.5)

- El selector de almacenes consume `GET /api/admin/warehouses` mediante `ListManagedWarehousesUseCase` y el puerto de repositorio; el mapper convierte el DTO a `ManagedWarehouse`. Guarda IDs reales; la lista vacía es una revocación explícita, no un campo omitido.
- Los módulos móviles usan `allowed_functions`; el acceso web usa `page_keys`. Los overrides (por ahora `so-full-edit`) viajan en el mismo conjunto de permisos que las páginas y se reemplazan de forma atómica.
- Al promover un usuario a `ADMIN`, se eliminan grants USER antiguos de `user_page_permissions`. Si posteriormente se degrada a `USER`, no recupera privilegios obsoletos automáticamente.
- `require_auth` consulta la fila actual del usuario y sus permisos en cada petición. Cambios de rol, almacenes, grants y estado se aplican a la siguiente petición con el mismo JWT; una cuenta inactiva recibe 401, una petición a almacén revocado recibe 403 y una página revocada recibe 403.
- La interfaz no guarda permisos vacíos si falla la lectura inicial de permisos al editar, para evitar una revocación accidental por fallo de red/autorización.

**Cobertura añadida en `api/tests/test_admin.py`:** usuario sin almacenes; asignación múltiple; cambio de almacenes con JWT ya emitido; revocación de páginas; revocación de override; cuenta ADMIN con acceso completo; desactivación inmediata de sesión. La existencia del test no equivale a ejecución satisfactoria: el resultado de pytest y el chequeo Svelte deben registrarse tras ejecutarlos contra el entorno de pruebas aislado.

### 3.1 Contrato detallado de Users (F4.1)

| Método | Endpoint | Request | Response / semántica |
|---|---|---|---|
| GET | `/api/admin/users?page=1&per_page=50` | Query: `page >= 1`, `1 <= per_page <= 1000` | `{ users: ManagedUser[], total, page, per_page, pages }`; cada usuario contiene `user_id, username, full_name, role, warehouse_id, warehouse_ids, allowed_functions, is_active, must_change_password, created_at, last_login`. |
| GET | `/api/admin/users/warehouse-options` | — | `{ warehouses: [{ warehouse_id, warehouse_code, warehouse_name, is_active }], total }`; catálogo de asignación autorizado por `users`, independiente del permiso de navegación/CRUD `warehouses`. |
| POST | `/api/admin/users` | `CreateUserRequest`: username, password, full_name, role, warehouse_ids, warehouse_id legado opcional, allowed_functions, must_change_password opcional | Un usuario; HTTP 201. Contraseña validada por política y almacenada como hash. |
| PUT | `/api/admin/users/{user_id}` | `UpdateUserRequest` parcial: full_name, role, warehouse_id, warehouse_ids, allowed_functions, is_active, must_change_password, password | Usuario actualizado. Protege auto-desactivación/auto-degradación y último ADMIN activo. |
| DELETE | `/api/admin/users/{user_id}` | — | `{ message: "User deleted" }`; no permite autoeliminación ni borrar el último ADMIN activo. |
| GET | `/api/admin/users/{user_id}/permissions` | — | `{ user_id, role, page_keys, is_full_access }`; ADMIN recibe el catálogo completo y `is_full_access=true`. |
| PUT | `/api/admin/users/{user_id}/permissions` | `{ page_keys: string[] }` | Reemplaza el conjunto completo de grants de páginas + overrides; valida contra `ALL_PAGE_KEYS ∪ ALL_OVERRIDE_KEYS`. Para ADMIN es no-op y devuelve acceso completo. |

**Cambio obligatorio de contraseña:** `must_change_password` se puede establecer en creación y actualización. El valor se devuelve en listado/alta/edición. `require_auth` bloquea las demás rutas con `403 password_change_required` hasta que el usuario complete `POST /api/auth/change-password`; `GET /api/auth/me` expone el estado para la UI de autenticación.

**Semántica de almacenes:** `warehouse_ids` es la asignación autoritativa. En PUT, enviar `warehouse_ids: []` elimina todas las asignaciones y limpia también el campo legado `warehouse_id`; si hay almacenes, `warehouse_id` refleja el primero. El DTO frontend debe preservar la diferencia entre omitir `warehouse_ids` (no cambiar asignación) y enviar una lista vacía (revocarla).

**Límite del contrato:** Flask no declara `GET /api/admin/users/{user_id}`; la edición trabaja con el registro devuelto por el listado y la lectura de permisos usa el endpoint dedicado. No se añade una ruta de detalle ficticia en Svelte.

**Casos de uso Domain/Application:** `ListManagedUsersUseCase`, `CreateManagedUserUseCase`, `UpdateManagedUserUseCase`, `DeleteManagedUserUseCase`, `GetUserPagePermissionsUseCase` y `UpdateUserPagePermissionsUseCase`. Los dos últimos operan sobre grants completos; no modelan un CRUD genérico de roles.

**Catálogo de autorización para la UI (F4.1.3):** Svelte refleja las claves de `api/constants.py` `ALL_PAGE_KEYS` y `ALL_OVERRIDE_KEYS`. Las claves de override se muestran en un grupo separado, pero se envían en el mismo `page_keys` porque Flask las persiste en `user_page_permissions`. La prueba `userPermissionGroups.test.ts` fija el catálogo completo para detectar divergencias.

**Compatibilidad de almacenes:** la creación y actualización validan que todos los IDs existan. Clientes antiguos que envían solo `warehouse_id` se normalizan a `warehouse_ids=[warehouse_id]`; el campo múltiple sigue siendo la fuente autoritativa. La omisión de ambos campos no modifica asignaciones; `warehouse_ids: []` revoca todas.

**Revalidación de sesión:** `require_auth` vuelve a consultar en cada petición el estado activo, rol, almacenes y grants de páginas del usuario. Por tanto, una desactivación, cambio de rol, revocación de permisos o reasignación de almacenes se aplica al siguiente request con el mismo JWT, sin esperar al refresh/expiración del token. La UI no debe simular este control únicamente en cliente.

**Límites persistidos:** `users.username` admite 50 caracteres y `users.full_name` 100; los schemas Pydantic y límites del formulario Svelte respetan esos máximos.

**Pruebas F4.1.5:** `api/tests/test_admin.py` cubre usuarios sin almacenes, asignación múltiple, revocación de grants, reasignación durante sesión, desactivación inmediata, ADMIN full-access, overrides, compatibilidad con `warehouse_id` legado, IDs inexistentes, cambios de rol con token existente, catálogo de almacenes bajo permiso `users` y cambio obligatorio de contraseña. Se añadieron nueve regresiones API para esos límites. En Svelte, `ManagedUserMapper.test.ts` (6 casos) y `userPermissionGroups.test.ts` (2 casos) cubren serialización de revocación, flags de cuenta y paridad del catálogo.



### Settings — contrato verificado en Flask

- `GET /api/admin/settings`: requiere sesión y `settings` page grant (ADMIN bypass). Devuelve `{ settings: [{ id, key, value, updated_at }] }` ordenado por clave. Devuelve únicamente filas persistidas en `app_settings`; los valores por defecto no se insertan ni se devuelven automáticamente.
- `GET /api/admin/settings/{key}`: misma autorización; devuelve `{ key, value }` o `404 { error: "Setting not found" }` si no existe.
- `PUT /api/admin/settings`: misma autorización, `UpdateSettingsRequest` (`schemas/settings.py`) exige `settings` como diccionario no vacío de valores string. Cada par se persiste con UPSERT en `app_settings` y `updated_at=NOW()`; por tanto, la actualización es parcial y conserva claves omitidas. Responde `{ message: "Settings updated" }`.
- El backend no aplica lista blanca de claves ni validación semántica general en este handler: Pydantic valida el tipo string, y existe una regla específica que impide desactivar `require_packing_before_shipping` si quedan pedidos PACKED (400). El cliente valida sus claves conocidas y valores, pero Flask sigue siendo autoridad de permisos.
- Defaults de compatibilidad de la UI React: `count_show_expected=true`, `require_packing_before_shipping=true`, `allow_over_receiving=true`, `default_receiving_bin=""`, `require_count_approval_separation=false`, `picking_ticket_company_name=""`, `picking_ticket_company_address=""`, `picking_ticket_logo_url=""`, `picking_ticket_returns_text=""`, `pos_activity_enabled=false`, `fraud_review_billing_shipping=false` y `dashboard_bubble_origins=[]`. Estos defaults son de frontend/consumidores; no son defaults SQL demostrados.

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


## 7. Dashboard (F4.2)

| Method | Endpoint | Query / body | Response contract and authorization |
|---|---|---|---|
| GET | `/api/v1/dashboard/productivity` | `start`, `end` (inclusive ISO dates), `warehouse_id` | ADMIN only; `range`, `events_visible`, `users[]` with `user_id, username, display_name, metrics, total`, `totals_per_event`. Each productivity user includes `user_id, username, display_name, metrics, total`; an empty period returns empty `users` and zero event totals. Maximum 90 days. |
| GET | `/api/v1/dashboard/preferences` | — | Authenticated; current user only. Returns `chart_order`, `default_range`, `default_view`, `updated_at`; defaults when no row exists. |
| PUT | `/api/v1/dashboard/preferences` | Partial `chart_order`, `default_range`, `default_view` | Authenticated; user ID comes from session, not body. Unknown/duplicate chart keys, invalid ranges/views and empty patches return 422. |
| GET | `/api/v1/dashboard/received` | `warehouse_id` required; optional inclusive `start/end` | Authenticated; returns `{warehouse_id, range, pos[]}`; each PO includes `po_id, po_number, vendor_name, status, units_received, lines_received, receive_events, receivers, last_received_at`. |
| GET | `/api/v1/dashboard/shipping-health` | `warehouse_id` required; optional inclusive `start/end` | Authenticated; returns `{warehouse_id, range, by_source[]}`; each source includes received/shipped counts, current `need_to_ship_today`, and up to 200 drill-down orders. Channel list is configured by `app_settings.dashboard_bubble_origins`; empty/malformed setting returns an empty array. |
| GET | `/api/admin/sales-orders` | `warehouse_id`, `local_pickup=true`, optional `q`, `status`, `per_page` | Auth + `sales-orders` page permission; list envelope `sales_orders,total,page,per_page,pages`. Local pickup filter matches `ship_method` containing `local` or `pickup`. |
| PUT | `/api/admin/sales-orders/{so_id}` | `{status:"SHIPPED"}` for pickup handoff | Auth + Sales Orders grant; SHIPPED transition only from PICKED/PACKED; tracking number waived only when ship method indicates pickup. UI also checks ADMIN or `so-full-edit` before enabling the action. |

Dashboard date presets use local calendar dates (not UTC ISO conversion): Today, Yesterday, Last 7d, Last 30d and inclusive Custom; the productivity endpoint caps the range at 90 days. `/api/admin/dashboard` is a separate admin summary endpoint (including pending transfer-order approvals), not the data source for the four React dashboard tabs.


### Audit Log — contrato Flask verificado

- **Ruta:** `GET /api/admin/audit-log` (cliente Svelte: `/api/admin/audit-log`).
- **Autorización:** `require_auth` + `require_admin_or_page_permission("audit-log")`; no existe filtro adicional por almacén en este handler.
- **Filtros admitidos:** `action_type`, `user_id`, `start_date`, `end_date`, `item_id`. No admite `entity_type`, `warehouse_id`, `from` ni `to`.
- **Paginación:** `page` (por defecto 1), `per_page` (por defecto 50, máximo 1000); respuesta `total`, `page`, `per_page`, `pages`. `pages` tiene mínimo 1 incluso sin resultados.
- **Orden:** `sort_by` admite `created_at`, `action_type`, `user_id`, `entity_type`; cualquier otro valor cae a `created_at`. `sort_direction=asc` produce ASC; cualquier otro valor produce DESC. Se añade `log_id DESC` como desempate.
- **DTO de cada entrada:** `log_id`, `action_type`, `entity_type`, `entity_id`, `entity_name`, `username`, `device_id`, `warehouse_id`, `warehouse_code`, `details`, `created_at`. Actor se entrega como `username` (puede ser nulo); no se devuelve `user_id` separado. `details` puede contener objetos heterogéneos, valores resueltos o nulos.
- **Detalle individual:** no existe GET por `log_id`; el detalle de UI se construye desde la entrada del listado. El historial por artículo usa `item_id` sobre el mismo endpoint.
- **Datos sensibles:** `api/services/audit_service.py` persiste el diccionario `details` tal como lo reciben los escritores; este endpoint no aplica una redacción general al serializarlo. El cliente Svelte redacta claves de credenciales y datos personales reconocibles antes de presentarlas. Esto protege la presentación UI, no sustituye la minimización/redacción en los escritores o en el servidor.


### 3.3 Contrato detallado de API Tokens (F4.5)

Todas las rutas están bajo `/api/admin` y requieren sesión de navegador más `require_admin_or_page_permission("api-tokens")`. No se debe usar el cliente de WMS token para estas operaciones.

| Método | Endpoint | Request / response |
|---|---|---|
| GET | `/scope-catalog` | `{ event_types: string[], endpoints: string[], inbound_resources: string[], source_systems: [{ source_system, kind }] }`; catálogos dinámicos desde `V150_CATALOG`, endpoints Flask registrados, recursos canónicos y allowlist de orígenes. |
| GET | `/tokens` | `{ tokens: [...] }`; lista ordenada por `created_at DESC`, sin plaintext ni hash. |
| POST | `/tokens` | `CreateTokenRequest`; devuelve 201 con `token_id, token_name, token, status, created_at, rotated_at, expires_at`. El campo `token` es secreto plaintext de un solo uso. |
| POST | `/tokens/{token_id}/rotate` | Sin body; reemplaza el hash y devuelve el nuevo `token` una sola vez. 404 si no existe; 400 si está revocado. |
| POST | `/tokens/{token_id}/revoke` | Sin body; devuelve `token_id, status, revoked_at`. 404 si no existe. |
| DELETE | `/tokens/{token_id}` | Eliminación física; 204 sin body; 404 si no existe. La auditoría conserva snapshot de scopes. |

**CreateTokenRequest — campos exactos:** `token_name` (1–128), `warehouse_ids: int[]`, `event_types: string[]` (máx. 64), `endpoints: string[]` (máx. 64), `connector_id?: string`, `expires_at?: datetime`, `source_system?: string`, `inbound_resources: string[]`, `mapping_override: boolean`, `mapping_overrides: Record<string, any>`. Los campos adicionales se prohíben (`extra="forbid"`).

**Reglas de scopes:** debe existir al menos un endpoint saliente o la pareja `source_system + inbound_resources`; ambos campos de entrada deben estar presentes juntos. `endpoints` e `inbound_resources` se validan contra allowlists. El handler comprueba existencia de warehouse IDs, event types y source system; las claves de `mapping_overrides` deben ser columnas canónicas de las tablas seleccionadas. `mapping_overrides` exige `mapping_override=true`. La UI debe usar catálogos; la validación Flask sigue siendo autoridad.

**Listado:** cada token devuelve `token_id, token_name, warehouse_ids, event_types, endpoints, connector_id, status, created_at, rotated_at, expires_at, revoked_at, last_used_at, rotation_status, source_system, inbound_resources, mapping_override, mapping_overrides_keys`. Nunca devuelve `token` ni `token_hash`. El DTO frontend usa `token_name`, no `name`; los arrays de scopes no se consolidan en un campo genérico.

**Almacenes:** `GET /api/admin/warehouses` requiere además el page grant `warehouses`. La pantalla de tokens puede funcionar sin ese permiso; si el catálogo de almacenes responde 403, se muestra el selector vacío sin bloquear listado, catálogo ni operaciones de tokens.

**Secreto y auditoría:** el servidor guarda solo `SHA256(pepper || plaintext)`; creación y rotación son las únicas respuestas que incluyen plaintext. Listado, mapper de dominio y audit log no deben retenerlo. Los eventos `TOKEN_ISSUE`, `TOKEN_ROTATE`, `TOKEN_REVOKE` y `TOKEN_DELETE` registran metadatos/snapshots de scopes, no el plaintext ni el hash. La invalidación de caché se ejecuta tras rotación, revocación y eliminación. La revocación se propaga entre workers mediante invalidación Redis y TTL de respaldo.


### 3.4 POS Activity — F4.6

- **Permiso:** ambas rutas requieren autenticación y `require_admin_or_page_permission("pos-activity")`.
- **Listado:** GET `/api/admin/pos/sales-orders`; parámetros admitidos `page`, `per_page` (máximo 200), `order_type` (`sale`, `refund`, `all`), `date` (YYYY-MM-DD, calendario `America/Denver`), `channel` (`counter`/`phone`), `status`, `terminal_id` y `cashier_id`. Respuesta `sales_orders,total,page,per_page,pages`.
- **Fila:** `so_id,so_number,status,order_type,channel,created_at,customer_name,customer_phone,external_txn_ref,warehouse_id,total_cents,cashier_id,terminal_id,payment_method`. `total_cents` es entero firmado; los refunds pueden ser negativos. El cajero/terminal/tender se deriva del audit log asociado a POS_CHECKOUT/POS_REFUND; puede ser null.
- **Resumen:** GET `/api/admin/pos/summary?date=YYYY-MM-DD`. Responde `tz,date,is_today,current_hour,today,yesterday,vs_yesterday_cents,pace,week,tenders,active_terminals`. KPI usa centavos; pace tiene 24 puntos; week incluye arrays `this` y `last` de 7 días y sus totales; tender incluye `method,cents,count`.
- **Fecha:** el backend ancla y limita fechas futuras en zona `America/Denver`. El cliente debe construir la fecha del calendario en esa zona, no usar `toISOString().slice(0,10)`.
- **Detalle:** no existe endpoint de detalle POS; se construye a partir de la fila del listado. La acción “Abrir Sales Order” navega al detalle administrativo por `so_id`.
- **Schemas:** `api/schemas/pos.py` valida POS checkout/refund y cart requests, no el DTO de estos GET administrativos. Para F4.6 el contrato principal está en `api/routes/admin/admin_pos.py`.

### Integrations — F5.1 contrato Flask verificado

Todas las rutas usan el prefijo `/api/admin` y requieren sesión autenticada más `require_admin_or_page_permission("integrations")`. Las credenciales se almacenan por conector + almacén; no existe endpoint para recuperar valores plaintext.

| Método | Endpoint | Query / body | Respuesta / semántica |
|---|---|---|---|
| GET | `/api/admin/connectors` | — | `{ connectors: [{ name, config_schema, capabilities }] }`; cada conector se instancia con configuración vacía para exponer schema/capacidades. |
| GET | `/api/admin/connectors/{connector_name}/config-schema` | — | `{ name, config_schema, capabilities }`; 404 si el conector no está registrado. |
| GET | `/api/admin/connectors/{connector_name}/credentials?warehouse_id={id}` | `warehouse_id` obligatorio, entero positivo | `{ connector, warehouse_id, credentials: [{ key, value: "****", created_at, updated_at }] }`. Nunca devuelve el secreto. Sin almacén: 400; conector inexistente: 404. |
| POST | `/api/admin/connectors/{connector_name}/credentials` | `{ warehouse_id, credentials: Record<string,string> }`; al menos una clave; almacén > 0 | Guarda/upsert de cada secreto cifrado; devuelve `{ message, connector, warehouse_id, keys }`, nunca valores. Limitado a 10/min. |
| POST | `/api/admin/connectors/{connector_name}/test` | `{ warehouse_id }` | Usa credenciales persistidas; devuelve `{ connector, warehouse_id, connected, message }`. Destino privado bloqueado: 400 `blocked_destination`. Limitado a 10/min. |
| DELETE | `/api/admin/connectors/{connector_name}/credentials` | Body obligatorio: `{ warehouse_id }` | Elimina todas las credenciales del conector para ese almacén; devuelve `{ message, connector, warehouse_id }`. |
| GET | `/api/admin/connectors/{connector_name}/sync-status?warehouse_id={id}` | `warehouse_id` obligatorio | `{ connector, warehouse_id, sync_states: SyncState[] }`; puede ser array vacío si nunca se ha registrado actividad. |
| POST | `/api/admin/connectors/{connector_name}/sync-reset` | `{ warehouse_id, sync_type? }`; sync_type: orders/items/inventory/fulfillment o null | Pasa filas `running` a `idle`, devuelve `{ message, connector, warehouse_id, sync_type, rows_reset }`; registra auditoría y limita a 10/min. |
| POST | `/api/admin/connectors/{connector_name}/sync/{sync_type}` | `{ warehouse_id }`; sync_type: orders/items/inventory/fulfillment | Encola Celery y responde HTTP 202 `{ message, task_id, connector, warehouse_id, sync_type }`; si ya hay ejecución activa devuelve 409. Limitado a 20/min. |

**Schema dinámico:** `config_schema` es un objeto indexado por clave; cada descriptor declara metadatos como `type`, `required`, `label` y `description`. Las capacidades válidas del contrato BaseConnector son `sync_orders`, `sync_items`, `sync_inventory` y `push_fulfillment`. No asumir que todos los conectores soportan todas las operaciones.

**SyncState:** `connector_name, warehouse_id, sync_type, sync_status, last_synced_at, last_success_at, last_error_at, last_error_message, consecutive_errors`. Estados observados: `idle`, `running`, `error`. El servicio mantiene una máquina de estados por conector/almacén/tipo; una ejecución duplicada se rechaza. Un `running` de más de una hora se considera obsoleto y puede ser retomado; los cierres de una ejecución antigua no pueden sobrescribir el `run_id` de una ejecución nueva. Tras tres errores consecutivos el estado pasa a `error` (sticky).

**Concurrencia y timeout:** Flask devuelve 409 cuando detecta una ejecución no obsoleta en curso. El worker Celery también aplica `DuplicateRunError` al adquirir estado, por lo que la comprobación del endpoint no es la única barrera. Los tasks reintentan excepciones hasta 3 veces con espera predeterminada de 30 segundos; el wrapper HTTP de BaseConnector aplica reintentos/backoff para 429/503 y circuit breaker. No hay un timeout HTTP uniforme declarado en estos handlers; los timeouts de red dependen de cada conector/llamada.

**Credenciales y seguridad:** `schemas/connectors.py` declara `SaveCredentialsRequest(warehouse_id > 0, credentials: Dict[str,str] no vacío)`, `TestConnectionRequest(warehouse_id > 0)` y `DeleteCredentialsRequest(warehouse_id > 0)`. El vault cifra cada valor con Fernet y requiere `SENTRY_ENCRYPTION_KEY`; los valores plaintext solo se descifran dentro del servicio para test/sync. El GET devuelve nombres de claves y máscara fija `****`; la UI no debe tratar esa máscara como valor editable ni volver a enviarla. Al guardar, solo se envían claves con nuevos valores. Los mensajes de conexión se sanitizan, limitan a 500 caracteres y eliminan patrones de secretos antes de llegar a la UI/estado.

**Límite funcional:** no existe un endpoint para borrar una credencial individual ni para leer el valor secreto; DELETE elimina todas las credenciales del conector en el almacén indicado. No existe endpoint para consultar el estado de una tarea Celery por `task_id`; la UI debe refrescar `sync-status` y no presentar el 202 como sincronización completada. El reset solo limpia estados `running`; no es una cancelación del worker.


## F5.2 — Consumer Groups y Connector Registry

Page grant: `consumer-groups`. Todas las rutas requieren `require_auth` y `require_admin_or_page_permission("consumer-groups")`. No existe scope de almacén en estos recursos.

| Método | Endpoint | Request | Response / semántica |
|---|---|---|---|
| GET | `/api/admin/connector-registry` | — | `{ connectors: ConnectorRegistry[] }`; cada fila: `connector_id, display_name, created_at, updated_at`. |
| POST | `/api/admin/connector-registry` | `{ connector_id, display_name }`; ID 1–64, nombre 1–128; extras prohibidos | Connector; 201. Duplicado: 409 `duplicate_connector_id`. |
| PATCH | `/api/admin/connector-registry/{connector_id}` | `{ display_name }` (1–128); no acepta cambio de ID | Connector actualizado; 404 `connector_not_found`. |
| DELETE | `/api/admin/connector-registry/{connector_id}` | — | 200 `{ connector_id, deleted: true }`; 404 inexistente; 409 `connector_in_use` con cantidades `consumer_groups` y `webhook_subscriptions`. |
| GET | `/api/admin/consumer-groups` | — | `{ consumer_groups: ConsumerGroup[] }`; cada fila: `consumer_group_id, connector_id, last_cursor, last_heartbeat, subscription, created_at, updated_at`. |
| POST | `/api/admin/consumer-groups` | `{ consumer_group_id, connector_id, subscription?, acknowledge_replay? }`; IDs 1–64; extras prohibidos | ConsumerGroup; 201. ID duplicado: 409 `duplicate_consumer_group_id`; FK de conector inválida: 400 `unknown_connector_id`; tombstone sin reconocimiento: 409 `replay_would_skip_history`. |
| PATCH | `/api/admin/consumer-groups/{consumer_group_id}` | `{ subscription }` solamente | ConsumerGroup actualizado; 400 `no_fields_to_update`; 404 `consumer_group_not_found`. Connector y cursor son inmutables desde esta API. |
| DELETE | `/api/admin/consumer-groups/{consumer_group_id}` | — | 204; 404 `consumer_group_not_found`. Guarda tombstone con cursor, connector, fecha y autor para proteger frente a replay accidental. |

`schemas/consumer_groups.py` define `SubscriptionFilter` estricto: `event_types: string[]` y `warehouse_ids: integer[]`, opcionales y con máximo 64 elementos cada uno. Claves desconocidas, tipos erróneos y valores que no sean arrays se rechazan mediante 400. Un objeto vacío `{}` representa ausencia de filtro. En persistencia se omiten campos null.

**Semántica de estado:** el DTO de consumer group no contiene un campo `status`. La UI presenta cursor y heartbeat reales; “Con heartbeat” / “Sin heartbeat” es una etiqueta derivada exclusivamente de la presencia de `last_heartbeat`, no un estado operativo ni una garantía de que el consumidor esté vivo ahora.

**Eliminaciones:** eliminar un grupo es destructivo porque el consumidor vuelve a leer desde el inicio si se recrea. La UI exige confirmación y el backend conserva tombstone; recrear el mismo ID requiere `acknowledge_replay: true`. Eliminar un conector requiere confirmación y el backend bloquea con 409 si tiene grupos o webhooks asociados. El frontend no debe borrar dependencias automáticamente.

**Auditoría:** create/update/delete de ambos recursos escriben eventos de auditoría. El DELETE de consumer group devuelve 204 sin body. La respuesta del registry y del grupo es un DTO directo; los listados usan wrappers separados.



## F5.3 — Webhooks

Page grant: `webhooks`. Todos los endpoints admin requieren sesión y `require_admin_or_page_permission("webhooks")`. Las rutas siguientes se publican bajo `/api`.

| Método | Endpoint | Request / respuesta |
|---|---|---|
| GET | `/api/admin/webhooks` | `{ webhooks: Webhook[] }`; incluye stats agregadas de 24 h. |
| GET | `/api/admin/webhooks/{subscription_id}` | Detalle con la misma forma del listado; UUID inválido 400, inexistente 404. |
| POST | `/api/admin/webhooks` | `connector_id`, `display_name`, `delivery_url`, `subscription_filter?`, `rate_limit_per_second?` (1–100, default 50), `pending_ceiling?` (default 10000), `dlq_ceiling?` (default 1000), `acknowledge_url_reuse?`. 201 y plaintext `secret` + `secret_generation=1`, mostrado una sola vez. |
| PATCH | `/api/admin/webhooks/{subscription_id}` | Campos parciales: `display_name`, `delivery_url`, `subscription_filter`, `rate_limit_per_second`, `pending_ceiling`, `dlq_ceiling`, `status=active|paused`, `acknowledge_url_reuse`. Campos extra prohibidos. |
| POST | `/api/admin/webhooks/{subscription_id}/rotate-secret` | Genera nuevo secreto primario. El anterior pasa a generación 2 y se acepta durante 24 h. El nuevo plaintext se devuelve una sola vez. Revoked: 400. |
| DELETE | `/api/admin/webhooks/{subscription_id}` | Revocación lógica por defecto: `status=revoked`, conserva historial. |
| DELETE | `/api/admin/webhooks/{subscription_id}?purge=true` | Purga irreversible de suscripción, secretos e historial de entregas; crea tombstone URL. Si hay pending/in_flight: 409 `live_deliveries_block_hard_delete` + `live_count`. |
| GET | `/api/admin/webhooks/{subscription_id}/dlq?limit=50&offset=0` | `deliveries,total,limit,offset`; limit 1–500. Cada entrega incluye contexto parcial del evento. Una DLQ vacía devuelve 200 y lista vacía. |
| POST | `/api/admin/webhooks/{subscription_id}/replay/{delivery_id}` | Replay individual; 201 con `original_delivery_id` y `replayed_delivery_id`. Rechaza delivery ajena, inexistente o suscripción revoked. |
| POST | `/api/admin/webhooks/{subscription_id}/replay-batch` | Body `{ filter, acknowledge_large_replay }`; filtros: status dlq/failed/succeeded, event_type, warehouse_id, completed_at_from/to. 201 con impacto y recuentos. |
| GET | `/api/admin/webhooks/{subscription_id}/stats?window=24h` | Ventanas 1h/6h/24h/7d; counters, tasa, percentiles, top errors, lag. Caché 30 s. |
| GET | `/api/admin/webhook-errors?limit=50&offset=0&subscription_id=&error_kind=&from=&to=` | Errores failed/dlq con catálogo servidor: short_message, description, triage_hint y lista error_kinds. limit 1–500. |

**Schema de filtros:** `schemas/webhooks.py` usa `SubscriptionFilter` estricto de `services/webhook_dispatcher/subscription_filter.py`: `event_types: string[]`, `warehouse_ids: integer[]`, `aggregate_external_id_allowlist: UUID[]`. No acepta claves extra. Los arrays vacíos son rechazados por el handler; omitir la clave significa no filtrar esa dimensión. Los event types y warehouse IDs se contrastan contra los catálogos persistidos. La URL debe ser HTTP(S), HTTPS por defecto; SSRF/private destinations se rechazan en servidor. Los techos pending/DLQ no pueden superar hard caps configurados.

**Estado:** `active`, `paused`, `revoked`. PATCH solo acepta active/paused; revoked es terminal y solo se alcanza mediante DELETE lógico. Una suscripción revoked no se puede editar, reanudar, rotar ni recibir replay. Cambiar límites de una suscripción pausada por ceiling no la reanuda automáticamente; se requiere PATCH `status=active`.

**Secret:** jamás se incluye en GET/list/detail ni en DTO de dominio. Create y rotate son las únicas respuestas que incluyen plaintext. Rotación mantiene la generación anterior durante 24 h; una segunda rotación sustituye la anterior generación 2. La UI debe mostrar y permitir copiar el valor recién emitido, y luego ocultarlo.

**Replay batch:** Flask serializa batches concurrentes por suscripción con `SELECT FOR UPDATE`, aplica throttling de 60 s por suscripción y presupuesto global, hard cap configurable (409 `batch_size_above_hard_cap`, reintento con `acknowledge_large_replay=true`), y pending ceiling no eludible (409 `replay_would_exceed_pending_ceiling`). También puede responder 429 `replay_batch_throttled` o `replay_batch_global_throttled`. Los registros de evento eliminados se cuentan como `matched_without_event_data` y no se pueden re-dispatch.

**Permisos cruzados:** el endpoint `GET /api/admin/connector-registry` pertenece a F5.2 y exige el page grant `consumer-groups`, no `webhooks`. Por ello, un usuario que solo tenga `webhooks` puede listar/administrar suscripciones pero recibir 403 al consultar el catálogo de conectores. La pantalla no bloquea la lista en ese caso y permite introducir manualmente un `connector_id`; Flask valida su existencia al crear la suscripción (400 `connector_not_found`). La solución estructural sería exponer un lookup de conectores para `webhooks` o compartir permiso de lectura, pero no se modifica Flask en esta migración.\n\n**Limitaciones confirmadas del backend:** no existe endpoint para recuperar plaintext o historial de secretos; no existe endpoint individual de detalle de una delivery ni un endpoint de payload completo de `integration_events` desde DLQ. La respuesta DLQ solo ofrece event_type, timestamp, aggregate_external_id, warehouse_id y source_txn_id. Replay individual inserta una entrega pending nueva, conserva la original y no mueve el cursor. A diferencia del replay batch, el handler individual no toma lock de suscripción ni mantiene una clave idempotente/deduplicación por delivery; las peticiones repetidas/concurrentes pueden generar más de una entrega. La UI bloquea dobles clics mientras la petición está en curso, pero la garantía global requiere una mejora backend y no se simula en Svelte.




## F5.6 — Imports (contrato Flask verificado)

### Importación genérica de catálogos

- **Permiso:** sesión autenticada y require_admin_or_page_permission("imports").
- **Endpoint único:** POST /api/admin/import/{entity_type}. No es multipart ni recibe archivos: recibe JSON.
- **Tipos admitidos exactamente:** items, bins, purchase-orders, sales-orders, inventory-adjustments. Cualquier otro tipo devuelve 400. No se debe inferir que todos los catálogos WMS admiten importación.
- **Request canónico:** { "records": [{...}] }. Flask también admite como alternativa la clave del tipo o su variante con guiones sustituidos por guiones bajos, pero Svelte envía siempre records.
- **Límite:** máximo 5.000 registros por petición; 5.001 devuelve 400. El límite global de cuerpo de Flask es 10 MiB (MAX_CONTENT_LENGTH); no existe un límite de bytes específico para el importador.
- **Respuesta HTTP 200:** { message, total, imported, skipped, errors: [{ row, error }] }. Los números de fila son 1-based. Los errores de validación y reglas por fila se agregan y el resto de filas continúa; la operación hace commit de las filas procesadas y puede devolver éxito parcial. No existe created/updated.
- **Errores de petición:** tipo no admitido, body/records ausente o vacío y más de 5.000 registros responden 400. Un fallo HTTP/global no equivale a un resultado parcial.
- **Validación:** api/schemas/csv_import.py define un schema Pydantic independiente para cada tipo. Los campos extra se ignoran; los campos de texto protegidos rechazan prefijos de fórmula (=, +, -, @, tab y CR). Las filas inválidas se informan en errors.

| Tipo | Campos esenciales y semántica específica |
|---|---|
| items | sku obligatorio; nombre mediante item_name o name; SKU y UPC duplicados se omiten como error de fila. Cantidad inicial solo crea inventario si se proporciona un default_bin válido. |
| bins | bin_code obligatorio; requiere zone_id o zone resoluble. warehouse_id opcional y derivable de la zona; bin_code duplicado dentro del almacén se omite. |
| purchase-orders | po_number y sku obligatorios; cantidad positiva y warehouse_id por fila o en la cabecera del request. Cada registro crea una línea; si existe la PO, agrega una nueva línea. |
| sales-orders | so_number y sku obligatorios; cantidad positiva y warehouse_id por fila o en la cabecera. Cada registro crea una línea; si existe el pedido, agrega una línea. Admite los campos de dirección estructurada definidos en el schema. |
| inventory-adjustments | sku, warehouse (código), bin (código) y qty no cero obligatorios. Aplica el cambio de existencias inmediatamente y crea un ajuste APPROVED con motivo CORRECTION; cantidades negativas verifican stock suficiente. No es una simulación ni una importación pendiente de aprobación. |

**No hay endpoints de ImportJob:** Flask no ofrece GET de listado/historial, GET detalle, POST create-job, validate/dry-run, execute separado ni get-errors independiente. La importación se ejecuta directamente en el POST anterior. Tampoco existe informe descargable generado por servidor. Svelte mantiene un estado de ejecución efímero en cliente y puede generar un CSV local con los errores devueltos; no debe presentarlo como un informe persistido.

**Reintento:** no existe endpoint dedicado ni clave idempotente del importador. La UI puede reenviar exclusivamente las filas que el servidor devolvió como omitidas (errors) para evitar repetir filas ya confirmadas en una respuesta parcial. No debe reintentar automáticamente una petición cuyo resultado se perdió por timeout/desconexión: el servidor pudo haber hecho commit y el resultado sería desconocido.

### Importación de órdenes de traslado (endpoint distinto; no es un catálogo genérico)

POST /api/admin/transfer-orders/import requiere page grant transfer-orders, no imports. Body estricto: source_warehouse_code, destination_warehouse_code, records (1–5.000 objetos { sku, quantity }) y notes opcional. Responde 201 con la orden creada y shortages; errores de cabecera/filas pueden responder 422, almacén desconocido 404 y almacenes iguales 422. Resuelve SKU, valida las filas y reserva inventario en origen; las faltas de stock se aceptan parcialmente mediante committed_qty y se informan en shortages. Esta operación crea una Transfer Order y no debe mezclarse con el POST genérico ni ofrecerse bajo su permiso.


## F5.7 — Inbound Activity: contrato verificado

**Admin observability (read-only):** ambos endpoints requieren sesión autenticada y `require_admin_or_page_permission("inbound")`.

| Método | Endpoint | Query / respuesta | Semántica |
|---|---|---|---|
| GET | `/api/admin/inbound/activity` | `source_system`, `resource`, `status`, `since`, `until`, `page`, `per_page` → `{ rows, page, per_page, limit, total, has_next }` | Unión de cinco tablas staging: sales_orders, items, customers, vendors y purchase_orders. Máximo 500 filas por página. Orden: received_at DESC, resource, inbound_id. |
| GET | `/api/admin/inbound/activity/{resource}/{inbound_id}` | Detalle con metadatos, `source_payload`, `canonical_payload`, `source_payload_retained` | 400 resource desconocido; 404 fila inexistente. |

**Valores reales y filtros:**
- `resource` es el tipo de recurso inbound; no existe un filtro independiente `event_type` en este contrato.
- `status` solo admite `applied` y `superseded`.
- `since` y `until` son timestamps ISO; `since > until` devuelve 400.
- `source_system` es la clave del sistema externo ligada al WMS token que ingirió la fila. La fila también expone `ingested_via_token_id`; ni el token plaintext ni su hash se incluyen.
- El catálogo de source systems está en `GET /api/admin/scope-catalog`, pero requiere permiso `api-tokens`, no `inbound`. La pantalla inbound usa filtro exacto por texto y no depende de un permiso adicional ni presenta el catálogo como disponible.

**Semántica de estado — no confundir recepción con aplicación:**
- `applied` se inserta al completar mapping, upsert de la entidad canónica, relación de cross-system mapping y auditoría dentro de la transacción.
- Una nueva versión aplicada cambia la fila anterior a `superseded`; esa fila también fue aplicada históricamente.
- Reenvío idéntico (`source_system + external_id + external_version`) responde 200 idempotente con el inbound_id y canonical_id existentes; no crea una fila duplicada.
- Lock ocupado responde 409 `lock_held` con Retry-After: 1. Versión obsoleta responde 409 `stale_version`. Lookup cruzado no resuelto responde 409 `cross_system_lookup_miss`; errores de mapping responden 422 `mapping_apply_error`; el límite de body responde 413 `body_too_large`.
- **Límite funcional:** los errores/rechazos no se persisten en staging. No existe endpoint admin de intentos fallidos, errores, replay o retry. Por tanto esta pantalla no puede mostrar una DLQ ni el historial completo de intentos. El reintento lo realiza el sistema origen; la idempotencia evita duplicar la fila si el primer POST sí se confirmó.

**Payload y privacidad:**
- El detalle devuelve source y canonical payload, con redacción recursiva server-side de claves reconocidas como password, secret, token, authorization, api key, email, teléfono, dirección, identificadores fiscales, nombre y datos de tarjeta.
- `source_payload_retained=false` indica que el payload fuente fue eliminado por retención; la UI no debe reconstruirlo.
- La redacción se aplica al payload, no es una garantía de anonimización de todos los campos de metadatos.
- Los endpoints no tienen warehouse scope: la prueba Flask confirma que el grant `inbound` expone un feed global y que las tablas staging no tienen warehouse_id. El permiso `inbound` debe tratarse como acceso a datos de integración de todos los almacenes; no se debe insinuar aislamiento por almacén.

**Integración:** la correlación a la entidad canónica se hace mediante `canonical_id` y el tipo se deriva de `resource`. La ruta de detalle directa depende del módulo canónico; si no hay una ruta verificable, la UI abre el módulo y lo identifica explícitamente como navegación general, no como enlace al registro exacto.

**Pruebas backend existentes (no ejecutadas por el alcance frontend):** `api/tests/test_admin_inbound.py` cubre paginación, filtros, permiso, detalle, redacción recursiva y payload eliminado por retención; `api/tests/test_inbound_*_endpoint.py` y `api/tests/test_inbound_*.py` cubren procesamiento, idempotencia y fallos del POST inbound. No se declara aquí su resultado de ejecución.


## F6.1 — Fraud / Control de fraude

**Contratos Flask verificados en `api/routes/admin/admin_orders.py` y `api/schemas/sales_orders.py`:**

| Método | Endpoint | Permiso | Contrato / comportamiento |
|---|---|---|---|
| GET | `/api/admin/sales-orders` | `sales-orders` OR `fraud` | Bandeja con `status=FRAUD_REVIEW`; admite `warehouse_id`, `q`, `page`, `per_page` (1–1000). Respuesta `sales_orders, total, page, per_page, pages`. El servidor restringe siempre por almacenes autorizados. |
| GET | `/api/admin/sales-orders/{so_id}` | `sales-orders` OR `fraud` | Devuelve `sales_order`, `lines` y `pick_tasks`; aplica scope SQL y devuelve 404 para pedido inexistente o de otro almacén. |
| PATCH | `/api/admin/sales-orders/{so_id}/memo` | `fraud` | Body `{memo, expected_memo?}`; máximo 4000. Cadena vacía limpia a NULL. Si se envía `expected_memo` y el valor actual difiere, responde 409 `memo_conflict` sin sobrescribir. Bloqueo `FOR UPDATE` y auditoría `SO_MEMO_EDITED`. |
| POST | `/api/admin/sales-orders/{so_id}/push-to-queue` | `fraud` | Solo desde `FRAUD_REVIEW`; cambia a `OPEN`. Bloqueo `FOR UPDATE`, auditoría `SO_FRAUD_CLEARED`; otro estado o repetición devuelve 409. |
| GET | `/api/admin/sales-orders/{so_id}/audit-history` | `fraud` OR `audit-log` | Historial paginado por pedido; `page`, `per_page` (1–100). Verifica primero el scope del pedido y filtra también por `entity_type=SO`, `entity_id` y almacén real. No concede acceso al feed global de auditoría. |

**Seguridad y concurrencia:**
- El listado y detalle compartidos aceptan `sales-orders` OR `fraud`; las mutaciones de fraude requieren exclusivamente `fraud`.
- Para usuarios no ADMIN, el listado, detalle, memo, retorno a cola e historial se limitan a `current_user.warehouse_ids`. Un pedido ajeno y uno inexistente producen 404 en endpoints por pedido.
- El memo combina `FOR UPDATE` con control optimista opcional mediante `expected_memo`; dos operadores que partan de la misma versión no se pisan silenciosamente: el segundo recibe 409.
- El retorno a cola es una transición única; la repetición no genera una segunda auditoría.
- La lectura del historial usa una ruta específica de Sales Order. El grant `audit-log` también puede leerlo, pero el grant `sales-orders` por sí solo no.

**Svelte:**
- La bandeja consume la respuesta paginada real y ofrece navegación de páginas.
- El detalle carga el historial de auditoría paginado, mostrando acción, usuario, fecha y detalles.
- El cliente envía `expected_memo` con el valor leído al cargar la fila; Flask sigue siendo la autoridad para scope y concurrencia.

**Pruebas backend en `api/tests/test_fraud_review.py`:** además de las regresiones existentes de grants y almacenes, se añadieron casos para memo obsoleto/409 sin overwrite, historial con permiso Fraud, historial cross-warehouse, denegación a `sales-orders` sin grant de auditoría, retorno duplicado y serialización real del bloqueo de fila con dos conexiones PostgreSQL. La evidencia de CI debe comprobarse sobre el HEAD definitivo.

**Gate F6.1:** implementación backend y UI ampliada; cierre condicionado a ejecución satisfactoria de pruebas específicas y regresión global, más typecheck/build de Webapp.

## 6.2 Customers — proyección read-only (F6.2)

No existe en Flask un recurso administrativo independiente de clientes ni rutas CRUD. La pantalla Svelte se alimenta exclusivamente de información derivada de Sales Orders.

| Método | Endpoint | Respuesta relevante | Seguridad / límites |
|---|---|---|---|
| GET | `/api/admin/search?q={q}&warehouse_id={id?}` | `{ query, warehouse_id, results: [{ type, id, label, sublabel }] }`; hit customer: `type=customer`, `id=customer_name`, `label=customer_name`, `sublabel="{n} orders"` | Auth; sin page grant para el typeahead; mínimo 2 caracteres; hasta 10 hits por tipo y 50 resultados totales. Customer se calcula con DISTINCT/GROUP BY sobre `sales_orders.customer_name`; el ID de hit es el nombre, no un customer_id. |
| GET | `/api/admin/sales-orders?page={page}&per_page={per_page}&warehouse_id={id?}` | `{ sales_orders: [...], total, page, per_page, pages }`; listado incluye `so_id, so_number, customer_name, customer_phone, customer_address, warehouse_id`, fechas/estado/total y campos estructurados billing/shipping | Auth + `sales-orders` o `fraud`; warehouse_scope_clause; page >= 1; per_page 1..1000. Svelte usa 50 por página. La lista NO incluye customer_id ni customer_email. |
| GET | `/api/admin/sales-orders?q={customerName}&page={page}&per_page={perPage}&warehouse_id={id?}` | Mismo envelope paginado de Sales Orders | `q` busca `so_number ILIKE q OR customer_name ILIKE q`, no es filtro exacto de cliente. Svelte filtra por nombre normalizado; `total/pages` pueden incluir falsos positivos por número de pedido. |
| GET | `/api/admin/sales-orders/{so_id}` | `{ sales_order: { customer_name, customer_phone, customer_email, customer_address, warehouse_id, billing_address_*, shipping_address_* ... } }` | Auth + `sales-orders` o `fraud`; verifica warehouse scope del pedido. El email solo se obtiene del detalle individual, no del listado. |

**Reglas de proyección:**
- Identidad de frontend por nombre normalizado, no canónica. Nombres iguales pueden representar clientes distintos; el contrato actual no permite resolverlo con certeza.
- Direcciones son snapshots asociados a pedidos. No hay entidad de dirección maestra del cliente.
- La paginación de la lista corresponde a pedidos fuente; los clientes se deduplican únicamente dentro de la página recibida, por lo que pueden repetirse entre páginas.
- La búsqueda global devuelve máximo 10 hits customer por consulta; no es un endpoint de listado paginado.
- No añadir mutaciones de Customer. Una administración independiente exige primero un contrato Flask y persistencia canónica.
