# R8 — Administration, Users, Permissions and Configuration Audit

- **Branch:** `svelte-webapp`
- **Audited HEAD:** `5a2cb48adb09e2942f58eade176222744fb9b463`
- **Scope:** `webapp/` frontend; React `admin/` as parity reference; Flask `api/` as contract source.
- **Status:** `AUDIT_IN_PROGRESS / FRONTEND_HARDENING_REQUIRED / BACKEND_LIMITATIONS`
- **Backend changes:** none. This audit reads Flask routes/services/schemas only.
- **Acceptance boundary:** only frontend checks in `webapp/` certify the Svelte migration. Flask limitations are documented separately and are not repaired or tested as part of this frontend task.

## 1. Current frontend inventory

| R8 journey | Existing Svelte implementation | Initial assessment |
|---|---|---|
| Create/edit users | `feature/users`: UsersScreen, managed-users state, use cases, repository, DTO and mapper | Existing; review role/grant transitions, request races and partial saves |
| Assign roles and page grants | Permission groups mirror page/override catalog; separate permissions GET/PUT | Existing; ADMIN response semantics create a demotion hazard (see R8-FE-01) |
| Assign warehouses | User editor loads `/api/admin/users/warehouse-options`; sends `warehouse_ids` | Existing; server validates warehouse IDs on user mutations |
| Warehouse administration | `feature/warehouses`: warehouse/zone/bin CRUD and detail | Existing; admin warehouse collection/detail are not warehouse-scoped in Flask |
| Settings | `feature/settings`: typed known keys, validation, dirty draft, sensitive-change confirmation | Existing; settings are global, not warehouse-specific |
| Audit | `feature/audit-log`: filters, pagination, sorting and read-only detail | Existing; Flask endpoint returns cross-warehouse events without a warehouse filter |
| Imports | `feature/imports`: CSV/JSON parser, local preview, server execution, row errors and failed-row retry | Existing; no server preview or idempotency contract; per-row warehouse scope gap |
| Connectors/integrations | `feature/integrations`: catalog, per-warehouse credentials, test, sync status/actions | Existing; server masks stored credentials; verify audit and error redaction |

React reference pages include `admin/src/pages/Users.jsx`, `Settings.jsx`, `AuditLog.jsx`, `Imports.jsx`, and `Warehouses.jsx`. The Svelte implementation is already layered through Domain/Application/Data/UI for the reviewed features; do not rebuild these modules or duplicate existing abstractions.

## 2. Verified Flask contracts

### 2.1 Users and grants — `api/routes/admin/admin_users.py`

| Operation | Route | Server guard / behavior | Assessment |
|---|---|---|---|
| Warehouse options for user editor | `GET /api/admin/users/warehouse-options` | `require_auth` + page grant `users`; returns the full warehouse catalog for assignment | Supported for user administration |
| List users | `GET /api/admin/users` | `require_auth` + `users`; paginated, maximum 1000 per page | Supported |
| Create user | `POST /api/admin/users` | `users`; password policy/hash; duplicate username and warehouse IDs validated | Supported |
| Update user | `PUT /api/admin/users/{id}` | `users`; prevents self-demotion/deactivation and removal of last active ADMIN; synchronizes `warehouse_ids` and legacy `warehouse_id`; promotion to ADMIN deletes old page grants | Supported |
| Delete user | `DELETE /api/admin/users/{id}` | `users`; prevents self-delete and deleting last active ADMIN | Supported |
| Read page grants | `GET /api/admin/users/{id}/permissions` | `users`; ADMIN receives synthetic full catalog; USER receives persisted keys | Supported |
| Replace page grants | `PUT /api/admin/users/{id}/permissions` | `users`; validates keys against `ALL_PAGE_KEYS ∪ ALL_OVERRIDE_KEYS`; replaces full set; ADMIN is a no-op | Supported |

Important semantics:
- `allowed_pages`, `allowed_overrides`, `allowed_functions`, and warehouse assignments are distinct. Do not collapse them into one permission list.
- Flask refreshes role, page grants and warehouse IDs during authenticated requests. `allowed_functions` is returned by `/api/auth/me`, but R0 evidence says it is not a general server-side endpoint enforcement mechanism.
- Page-grant replacement is a separate request from user create/update; it is not atomic with the user mutation.
- User create/update/delete and page-grant replacement in this route file do not call `write_audit_log`. The imported audit helper is used later for inventory adjustments, not these user administration mutations.

### 2.2 Settings and audit — same Flask route module

| Operation | Route | Server guard / behavior | Assessment |
|---|---|---|---|
| List settings | `GET /api/admin/settings` | `require_auth` + page grant `settings`; returns global settings | Supported, global scope |
| Get setting | `GET /api/admin/settings/{key}` | Same guard | Supported |
| Update settings | `PUT /api/admin/settings` | Same guard; schema validation; prevents disabling packing while PACKED orders exist | Supported, global scope |
| List audit log | `GET /api/admin/audit-log` | `require_auth` + `audit-log`; supports action/user/date/item filters, pagination and whitelisted sorting | Supported, but global/cross-warehouse |

Confirmed gaps:
- Audit query has no `warehouse_id` filter and does not apply `warehouse_scope_clause`; a non-ADMIN user with the `audit-log` page grant can receive events for warehouses not assigned to them.
- Settings are global and have no warehouse parameter/scope. They are not a per-warehouse configuration API.
- Settings mutations do not write a dedicated audit event in the inspected handler.
- The frontend must not pretend that a client-side filter after fetching global audit data provides data isolation.

### 2.3 Warehouse CRUD — `api/routes/admin/admin_warehouse.py`

- `GET /api/admin/warehouses`, `GET /api/admin/warehouses/{id}`, `POST /api/admin/warehouses`, `PUT /api/admin/warehouses/{id}`, and `DELETE /api/admin/warehouses/{id}` use `require_auth` + page grant `warehouses`.
- The collection and detail handlers do not apply `warehouse_scope_clause` or `check_warehouse_access`; the list returns all warehouses and detail returns zones for the requested warehouse.
- Zone/bin routes do apply warehouse checks/scope in the inspected handlers.
- Warehouse create/update/delete do not call `write_audit_log` in this module; the existing audit calls found here belong to inter-warehouse transfer.
- Until Flask scopes the administrative warehouse endpoints, Svelte must not expose the all-warehouse administration data to a non-ADMIN user merely because a page grant exists. The operational warehouse selector remains a separate scoped contract.

### 2.4 Imports — `api/routes/admin/admin_items.py`

- Real route: `POST /api/admin/import/{entity_type}`, guarded by `require_auth` + page grant `imports`.
- Supported types in the route: `items`, `bins`, `purchase-orders`, `sales-orders`, `inventory-adjustments`.
- Request accepts `records` (or a type-specific key), maximum 5000 records; each row is validated server-side and failures are returned as row-numbered errors.
- Svelte preview is local parsing only; there is no separate server preview/validate endpoint.
- The handler has no idempotency key/replay contract. Existing PO/SO imports can append another line to an existing order; inventory adjustment imports apply the delta again. A lost response after commit cannot safely be retried as a whole-file operation.
- Warehouse scope is not checked for every row's `warehouse_id`/resolved bin warehouse in the import handler. Middleware validation of a top-level `warehouse_id` does not validate warehouse IDs nested inside `records`. Non-ADMIN UI must not submit rows targeting unassigned warehouses; this client guard does not replace missing Flask enforcement.
- Inventory-adjustment import writes an audit event per successful adjustment. Other import types do not have equivalent per-row audit evidence in the inspected path.

### 2.5 Connectors — `api/routes/admin/admin_connectors.py`

- Connector catalog, config schema, credentials GET/POST/DELETE, test connection, sync status, sync reset and sync execution routes exist and require page grant `integrations`.
- Credential POST encrypts values through the credential vault and returns only configured key names. Credential GET returns `value: "****"` plus key/timestamps; plaintext is not returned. Connection testing retrieves credentials server-side.
- Connector requests carry `warehouse_id` in query/body; the shared `require_auth` middleware validates explicit warehouse IDs against the authenticated user's assignments.
- The inspected audit call is for sync-reset. Credential save/delete and connection-test handlers do not write an audit event in this route module.
- The frontend DTO currently models a masked `value` sentinel; UI maps it to a boolean configured state and does not render the credential value.

## 3. Findings and required frontend work

### R8-FE-01 — ADMIN synthetic full-access grants can become real USER grants on demotion

- **Severity:** high.
- **Evidence:** Flask returns all page keys for an ADMIN from `GET /users/{id}/permissions` as a display convenience. `UsersScreen.openEdit` copies that response into `pageKeys`. If the operator changes the role from ADMIN to USER, the subsequent save can persist the entire catalog as explicit USER grants.
- **Required fix:** do not treat the ADMIN synthetic catalog as persisted grants. When opening an ADMIN account, keep editable USER grant selection empty (or separately preserve an explicitly documented prior USER grant snapshot, if one exists). Add a domain/UI regression test for ADMIN → USER demotion and ADMIN no-op semantics.

### R8-FE-02 — Global audit data must not be exposed to non-ADMIN users

- **Severity:** critical data isolation.
- **Evidence:** Flask audit route has page grant but no warehouse scope/filter.
- **Required fix:** Svelte route/navigation and the audit use-case boundary must fail closed for non-ADMIN until Flask provides scoped audit reads. Do not fetch all events and filter them in the browser. Record the backend dependency.

### R8-FE-03 — Administrative warehouse list/detail must not leak unassigned warehouses

- **Severity:** critical data isolation.
- **Evidence:** Flask administrative warehouse list/detail are page-grant guarded but not scoped.
- **Required fix:** until server scope is added, restrict the Svelte administrative warehouse-management screen and detail to ADMIN. Keep the separate operational selector using the scoped `/api/warehouses/list` contract. Add route/use-case tests for non-ADMIN denial.

### R8-FE-04 — Settings are global, not warehouse-specific

- **Severity:** high scope mismatch.
- **Evidence:** `/api/admin/settings` reads/writes global `app_settings`; no warehouse_id or warehouse filter.
- **Required fix:** label settings as global and prevent the UI from implying that values are scoped to the active warehouse. If product policy requires non-ADMIN delegation, document that these settings are global and require an explicit decision; do not synthesize per-warehouse settings.

### R8-FE-05 — Import warehouse scope and replay safety are incomplete

- **Severity:** critical integrity.
- **Evidence:** import route does not validate warehouse assignments per row and has no idempotency/replay token. PO/SO imports append lines to existing orders; adjustment imports reapply deltas.
- **Required fix:** frontend preflight constrains warehouse IDs to the active assigned warehouse and verifies bin/default_bin codes against the selected warehouse's operational bin catalog. It blocks when that catalog cannot be loaded. On uncertain network/timeout outcome, block same-file retry and require operator reconciliation. Clearly label local preview versus server validation. Flask per-row scope and idempotency remain backend dependencies.

### R8-FE-06 — Administrative mutations are not consistently audited server-side

- **Severity:** high accountability gap.
- **Evidence:** no audit writes in user CRUD/grant replacement, settings update, warehouse CRUD, or connector credential save/delete/test in the inspected handlers. Import audit exists only for inventory-adjustment rows; connector sync-reset has an audit write.
- **Required fix:** do not fabricate audit events in Svelte. Document each server-side audit gap and avoid presenting the audit screen as a complete ledger of every administrative action. Backend work is required for complete R8 acceptance.

### R8-FE-07 — User/grant mutations need session and UI-state reconciliation

- **Severity:** high correctness.
- **Evidence:** grants are replaced separately from user CRUD; authenticated Flask requests reload server grants, while the Svelte session is a client snapshot refreshed through `/api/auth/me`.
- **Required fix:** after changing the current user's own grants/role/warehouse assignments, refresh `/api/auth/me`, replace the session snapshot, re-evaluate route access and invalidate caches/selections for removed warehouses. For changes to another user, show that the target account's next authenticated request will observe server grants; do not claim immediate remote-browser invalidation without a server mechanism. Protect asynchronous permission loads from stale responses and make partial save state explicit.

## 4. Capability matrix

| Capability | Flask status | Svelte action |
|---|---|---|
| User list/create/update/delete | `SUPPORTED` | Enabled only under `users` page policy; surface server validation/conflicts |
| Page/override grant read/replace | `SUPPORTED` | Enabled; role-aware; refresh own session after self-change |
| Warehouse assignment | `SUPPORTED` | Use authoritative `warehouse_ids`; validate against returned options |
| Warehouse administrative CRUD | `PARTIAL` for non-ADMIN scope | ADMIN-only UI until scoped backend contract |
| Global settings | `SUPPORTED` global | Clearly label global; do not imply per-warehouse scope |
| Audit log | `PARTIAL` for non-ADMIN scope | ADMIN-only UI until scoped backend contract |
| CSV/JSON local preview | `SUPPORTED` client-side only | Label as local preview, not server validation |
| Import row validation/errors | `SUPPORTED` | Display row errors; no whole-file retry after uncertain outcome |
| Import idempotent replay | `NOT_SUPPORTED` | No automatic retry after uncertain outcome |
| Import per-row warehouse enforcement | `NOT_SUPPORTED` in inspected handler | Validate in UI and block unsafe non-ADMIN imports; backend remains blocker |
| Connector catalog/credentials/test/sync | `SUPPORTED` for explicit assigned warehouse IDs | Enabled with validated active warehouse context |
| Secret readback | `NOT_SUPPORTED` (masked only) | Display configured metadata only; never cache/render plaintext |
| Admin mutation audit coverage | `PARTIAL` | Never synthesize missing audit events |

## 5. Verification baseline

At audited HEAD `5a2cb48adb09e2942f58eade176222744fb9b463`:

- Webapp CI [45033065919](https://github.com/danielitoCode/smart-wms/actions/runs/45033065919): **FAIL** in `Typecheck (svelte-check + TypeScript)`; dependency installation succeeded. Build and frontend suites were skipped.
- The two reported typecheck errors are outside R8:
  - `src/lib/components/TransactionList.svelte:68`: invalid template expression `{render iconSvg(t.icon)}`.
  - `src/routes/lab/transaction-list/+page.svelte:2`: `TransactionList.svelte` has no default export, while the route imports one.
- Lockfile Version Check [45033065970](https://github.com/danielitoCode/smart-wms/actions/runs/45033065970): SUCCESS.
- Dependency Audit [45033065967](https://github.com/danielitoCode/smart-wms/actions/runs/45033065967): SUCCESS.
- gitleaks [45033065917](https://github.com/danielitoCode/smart-wms/actions/runs/45033065917): SUCCESS.
- No local tests are claimed. No backend test result is used as frontend acceptance evidence.

## 6. Execution order

1. **R8.1 — User/grant safety:** fix ADMIN synthetic grants on demotion; add regression tests; protect stale permission requests and partial saves.
2. **R8.2 — Data isolation:** ADMIN-only frontend guards for global audit and unscoped administrative warehouse list/detail; test route, navigation and use-case boundaries.
3. **R8.3 — Settings contract:** label global scope; validate known keys and server errors; test sensitive confirmation and discard/save behavior.
4. **R8.4 — Imports:** add assigned-warehouse preflight, row-to-bin/zone consistency checks where data is available, and uncertain-outcome retry barrier. Keep unsupported idempotency explicitly disabled.
5. **R8.5 — Connectors/secrets:** verify warehouse-generation invalidation, no plaintext retention/logging, and no stale response writes after warehouse changes; document audit gaps.
6. **R8.6 — Administrative audit coverage:** represent only server-recorded events; document backend additions needed for user, grant, settings, warehouse and credential mutations.
7. **R8.7 — React parity and regression:** compare every route/action/validation/state; add Domain/Application/Data/UI/Integration tests and run all required Webapp CI jobs on final HEAD.

**R8 closure rule:** frontend implementation can be marked complete only when all frontend guards, tests and CI pass. Integral R8 acceptance remains blocked where Flask does not enforce warehouse scope or record administrative audit events. Do not modify Flask/Python in this migration.

## 7. Implementación R8.1 y R8.2 (22-11-2026)

### R8.1 — usuarios y grants

- `editableUserPageGrantKeys` trata la respuesta sintética `ADMIN/isFullAccess` como catálogo de visualización, nunca como grants persistidos. Al abrir un ADMIN, la selección editable queda vacía; al pasar a USER no se convierte el catálogo completo en permisos explícitos.
- `UsersScreen` descarta respuestas tardías de carga de permisos mediante una generación local y verifica que el usuario abierto siga siendo el mismo antes de actualizar el formulario.
- Después de modificar la cuenta propia o sus grants, el frontend vuelve a consultar `/api/auth/me` mediante `revalidatePermissions` y sincroniza el selector/contexto de almacén. Si el reemplazo de grants falla después de guardar la cuenta, el formulario permanece abierto y el error se conserva; no se presenta la operación como atómica.
- Prueba unitaria `src/test/unitTest/feature/users/domain/UserPageGrantPolicy.test.ts` cubre USER con grants persistidos, ADMIN con catálogo sintético y carga fallida. La protección de rutas/contexto se cubre en `src/test/unitTest/feature/auth/domain/AccessPolicy.test.ts`.
- Límite restante: Flask ejecuta la mutación de cuenta y el PUT de grants como requests separados. El frontend no puede garantizar atomicidad ni invalidar inmediatamente la sesión de otro navegador que ya esté abierto.

### R8.2 — aislamiento de auditoría y administración de almacenes

- `routeAccessPolicyForPath` devuelve política `admin` para `/management/audit-log`, `/warehouses` y `/data/warehouses` (incluidos sus descendientes). El shell deniega el render para USER aunque posea el page grant correspondiente.
- La navegación oculta Audit log y administración de almacenes a no-ADMIN. La página de datos maestros no se habilita únicamente por el grant `warehouses`.
- `resolveWarehouseSelection` y `canSelectWarehouse` ya no interpretan el page grant `warehouses` como permiso para ampliar el selector operativo a todo el catálogo. ADMIN conserva selección global; USER solo puede seleccionar IDs asignados y presentes en el catálogo operativo devuelto por el servidor.
- No se filtran en cliente registros globales de auditoría ni se consulta el listado administrativo global de almacenes para ocultar filas después: las rutas se bloquean antes de montar sus pantallas.
- Pruebas añadidas: ADMIN/USER para rutas, audit-log incluso con su grant, `/warehouses` y `/data/warehouses`, landing `/data`, selector USER limitado a `warehouseIds` y selector ADMIN global.

**Estado de estos bloques:** `R8.1_FRONTEND_HARDENING_IMPLEMENTED` y `R8.2_FRONTEND_GUARDS_IMPLEMENTED`. La ejecución CI del HEAD que incluya estos cambios sigue siendo obligatoria; no se declara aún verificado.

**Dependencias backend no resueltas:** las rutas Flask de audit-log y administración de almacenes siguen sin aislamiento por almacén. Por eso la restricción ADMIN-only es una mitigación frontend temporal, no una corrección de autorización del servidor. No se modificó Flask/Python.

## 8. Implementación R8.3 y R8.4 (22-11-2026)

### R8.3 — configuración global

- La pantalla declara explícitamente que `/api/admin/settings` representa configuración global, no configuración por almacén. No se ofrece un selector que sugiera persistencia por warehouse.
- El formulario queda bloqueado hasta que GET `/api/admin/settings` termina correctamente. Si la carga falla, se muestra el error y una acción de reintento; no se pueden editar defaults locales ni enviarlos accidentalmente al servidor.
- Se conserva el draft tipado por claves conocidas, validación antes de guardar, confirmación para cambios sensibles, descarte y manejo de errores HTTP. El PUT envía únicamente las claves modificadas.
- Pruebas añadidas en `src/test/unitTest/feature/settings/domain/SettingValidation.test.ts`: booleanos, ID de bin, URL segura, JSON de canales, claves desconocidas y defaults no mutables.
- El backend no expone configuración por almacén. Esa capacidad queda fuera del contrato actual y no se simula en Svelte.

### R8.4 — importaciones

- La plantilla se adapta al almacén activo para `warehouse_id` y código de almacén; la plantilla de productos no propone cantidad inicial ni default_bin ficticios.
- Preflight antes del POST: almacén activo válido; `warehouse_id` positivo y coincidente con el almacén activo en bins/órdenes; para ajustes y productos con bin/cantidad inicial, descarga paginada del catálogo de bins del almacén y validación de pertenencia de cada `bin`/`default_bin`.
- Si el catálogo de bins no puede verificarse o el almacén cambia durante la comprobación, se bloquea la importación. El control es frontend; Flask sigue siendo la frontera de autorización y aún no valida por fila la relación warehouse/bin.
- Se aplica el límite local de 10 MiB al archivo y al JSON serializado, además del límite de 5.000 filas del parser/caso de uso.
- Se elimina el reintento automático de filas fallidas. Tras una respuesta parcial, se exige revisar los datos antes de preparar otro archivo. Si la petición falla sin resultado confirmado, el job queda `unknown` y no se permite reenviar ese archivo.
- Pruebas añadidas en `src/test/unitTest/feature/imports/domain/ImportWarehouseScopePolicy.test.ts`: IDs de almacén, contexto no asignado, catálogo de bins, ajustes, stock inicial y default_bin.
- Limitaciones Flask: no hay clave de idempotencia ni garantía de replay; no existe validación server-side por fila de la relación warehouse/bin. La vista previa sigue siendo local; validación final solo ocurre al ejecutar la petición.

**Estado de estos bloques:** `R8.3_FRONTEND_HARDENING_IMPLEMENTED` y `R8.4_FRONTEND_GUARDS_IMPLEMENTED`. Pendiente CI Webapp completo sobre HEAD definitivo.



## 9. R8.5 — integraciones y secretos

**Estado:** `FRONTEND_HARDENING_IMPLEMENTED / CI_PENDING / BACKEND_AUDIT_GAP`.

- El contrato Flask de credenciales es de escritura y metadatos: POST cifra cada valor con el vault y devuelve solo nombres de claves; GET devuelve `value: "****"` y timestamps; no existe lectura de plaintext. El mapper Svelte convierte la respuesta en `CredentialMetadata` y descarta el campo `value`; ni el dominio ni la pantalla conservan el valor devuelto por GET.
- El formulario solo envía valores nuevos no vacíos. Los campos sensibles usan `type=password` y `autocomplete=new-password`; la detección por nombre (`secret|token|key|password|credential`) prevalece incluso si el schema marca `secret: false`. Después de guardar se vacía el draft; al cambiar conector/almacén y al destruir la pantalla también se descarta.
- Credenciales, prueba de conexión, estado, reset y sync se consultan/ejecutan con `warehouse_id` explícito. Flask valida ese ID frente a los almacenes asignados del usuario en el middleware; Svelte invalida las respuestas de una selección anterior mediante `epoch` y detiene el polling al cambiar de almacén/conector.
- No se implementa ni se simula readback de secretos. El operador puede reemplazar una clave dejando el campo vacío para conservar la existente, o eliminar todas las claves del conector para el almacén actual.
- Pruebas: `IntegrationsData.test.ts` verifica que ni siquiera una respuesta inesperada con plaintext se incorpora al modelo de dominio; `integrationsState.test.ts` cubre respuestas obsoletas, cambio de almacén, errores de conexión, 409 y polling; `integrationsScreen.test.ts` cubre el enmascaramiento y la limpieza del draft.
- Límite de Flask: save/delete credentials y test connection no escriben audit log en `admin_connectors.py`; `sync-reset` sí escribe `SYNC_RESET`. El disparo manual de sync no escribe audit log en ese handler. El frontend no crea eventos locales para suplirlo.

## 10. R8.6 — matriz de auditoría y limitaciones Flask

La matriz se refiere a eventos persistidos por Flask en `audit_log`, no a mensajes de UI ni a eventos de dominio/webhooks. La inspección cubre las rutas administrativas actuales y las llamadas explícitas a `write_audit_log` en sus módulos.

| Área / operación mutante | Endpoint Flask | ¿Escribe audit_log en el handler? | Evidencia / limitación | Tratamiento Svelte |
|---|---|---:|---|---|
| Crear/editar/eliminar usuario | `POST/PUT/DELETE /api/admin/users` | No | `admin_users.py` no escribe evento en esos handlers | No fabricar evento; indicar que el ledger no cubre esta mutación |
| Reemplazar grants de usuario | `PUT /api/admin/users/{id}/permissions` | No | Lectura y reemplazo existen; operación separada del CRUD | Refrescar sesión propia; registrar brecha de auditoría |
| Actualizar ajustes globales | `PUT /api/admin/settings` | No | Configuración global, sin scope por almacén | Etiquetar global; no mostrarlo como cambio auditado |
| CRUD de almacenes | `POST/PUT/DELETE /api/admin/warehouses` | No | Rutas sin warehouse scope en el módulo inspeccionado | UI ADMIN-only como mitigación temporal; falta enforcement server-side |
| CRUD de zonas y bins | `POST/PUT/DELETE /api/admin/zones`, `/api/admin/bins` | No | No hay `write_audit_log` en esos handlers; los writes de transferencia en el mismo módulo son operaciones distintas | No inferir que CRUD de ubicaciones queda auditado por el log de transferencias |
| Importar artículos, bins, órdenes | `POST /api/admin/import/{entity_type}` | No | En el handler inspeccionado no hay evento por fila para items, bins, purchase-orders ni sales-orders | Mostrar resultado/errores de importación, sin crear eventos sintéticos |
| Importar ajustes de inventario | Mismo endpoint, tipo `inventory-adjustments` | Sí, por ajuste aplicado | El handler escribe evento para cada ajuste exitoso; no convierte otros tipos en auditados | Presentar solo el evento que el servidor efectivamente persiste |
| Guardar/eliminar credenciales | `POST/DELETE /api/admin/connectors/{name}/credentials` | No | POST cifra y devuelve claves; GET solo devuelve máscara; handlers save/delete sin evento audit | No conservar plaintext ni inventar auditoría |
| Probar conexión | `POST /api/admin/connectors/{name}/test` | No | Usa credenciales del vault en servidor; sin evento audit en handler | Mostrar resultado operativo, no evento de auditoría |
| Encolar sincronización | `POST /api/admin/connectors/{name}/sync/{type}` | No | Respuesta incluye task ID; el handler no registra audit_log | Mostrar tarea/estado, no afirmar que la acción quedó auditada |
| Restablecer estado de sync | `POST /api/admin/connectors/{name}/sync-reset` | Sí | Escribe `SYNC_RESET` con connector, sync_type y rows_reset | Evento visible solo cuando el GET de audit lo devuelve |
| Leer registro de auditoría | `GET /api/admin/audit-log` | No aplica | Tiene page grant, pero no warehouse filter/scope | Ruta y navegación ADMIN-only; no descargar y filtrar datos globales en cliente |

### Limitaciones transversales que bloquean la aceptación integral

1. **Cobertura incompleta de mutaciones:** usuarios/grants, settings, warehouses/zones/bins, varios tipos de importación y operaciones de credenciales/conexión/sync no tienen eventos explícitos en los handlers inspeccionados. La cobertura del log no es un ledger completo de administración.
2. **Aislamiento del audit log:** Flask no ofrece filtro ni scope por almacén para `GET /api/admin/audit-log`. La política ADMIN-only en Svelte reduce exposición desde esta UI, pero no sustituye autorización del servidor.
3. **Aislamiento del CRUD de almacenes:** list/detail y mutaciones administrativas no aplican scope por warehouse en Flask. La pantalla se restringe a ADMIN hasta que el backend imponga ese límite.
4. **Importaciones:** falta validación server-side por fila de warehouse/bin e idempotency key/replay; los guards de Svelte no son una frontera de seguridad.
5. **Configuración:** `/api/admin/settings` es global; no existe variante por warehouse.
6. **Credenciales:** el servidor cifra y enmascara correctamente el readback, pero no registra save/delete/test; tampoco debe devolver plaintext para habilitar edición de secretos.
7. **Sesiones:** las mutaciones de usuario y grants son requests separados; no existe invalidación inmediata de otra sesión ya abierta. La sesión propia se refresca con `/api/auth/me`.

### Trabajo backend necesario para cerrar R8 integral

- Añadir eventos audit transaccionales para create/update/delete user, replace grants, settings update, warehouse/zone/bin CRUD, importaciones de items/bins/PO/SO, credentials save/delete, test connection y sync enqueue; definir explícitamente qué lecturas no requieren evento.
- Incluir actor, acción estable, entidad/ID, warehouse cuando aplique, correlación/request ID y metadata redactada. Nunca registrar passwords, tokens, API keys, credential payloads ni secretos de webhook.
- Añadir warehouse scope/filter al audit-log y a CRUD administrativo de warehouses/zones/bins, con pruebas de aislamiento para usuarios asignados y no asignados.
- Añadir idempotencia y validación por fila warehouse/bin en importaciones.
- Definir atomicidad de update user + grants y mecanismo de revocación/invalidación de sesiones remotas.
- Añadir pruebas Flask/PostgreSQL que verifiquen tanto la presencia del evento como la ausencia de secretos en audit details.

**Criterio R8.6:** matriz documentada y frontend no fabrica evidencia. La cobertura integral queda `BLOCKED_BACKEND` hasta que los handlers Flask implementen y prueben los eventos y scopes anteriores. No se modificó Flask/Python.

### Nota de redacción del audit log

- `AuditLogMapper` aplica redacción recursiva en Svelte para nombres de campos sensibles (password, secret, token, authorization, cookie, credential, api key, private key y datos personales como email/teléfono/dirección). Esto protege la representación en esta UI, pero es una defensa de presentación: `services/audit_service.py::write_audit_log` serializa `details` directamente y no aplica redacción server-side. Flask debe redactar antes de persistir y antes de devolver detalles; el cliente no puede garantizar que otros consumidores no reciban esos valores.
