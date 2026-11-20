# R4 — Sales Orders, availability, reservations, backorders and customer projection

**Status:** \`IN_PROGRESS\` — initial repository and contract reconnaissance; no R4 implementation changes in this kickoff.  
**Branch:** \`svelte-webapp\`  
**Scope:** \`webapp/\` only. Flask is inspected for contract alignment; backend changes are out of scope.  
**Baseline HEAD:** \`f7437043b693d8cba4bf12aef60ade668c86e8d1\`

## 1. Objective

Complete the R4 business journey: list and inspect sales orders, create/update only where supported, understand server-calculated stock availability, preserve atomic reservations, handle partial fulfillment/backorders without duplicate quantities, and keep Customers read-only where no canonical customer API exists.

Traceability: F3.1 Sales Orders, F3.2 Backorders, F6.2 Customers, Inventory, Warehouse and Fraud (only where a real fraud assessment contract exists).

## 2. Existing Svelte implementation found

The branch already contains substantial feature-first/Clean Architecture modules:

- \`core/feature/sales-orders\`: DTOs, mapper, remote datasource, repository, use cases, dependency composition, list/detail screens and state.
- \`core/feature/backorders\`: DTOs, mapper, remote datasource, repository, scope policy, use cases, queue/detail screens and state.
- \`core/feature/customers\`: read projection/search from sales-order records, DTOs, mapper, repository, use cases and screen.
- Unit tests exist for Sales Orders, Backorders and Customers data/domain paths.

This is not a greenfield feature. The next pass must compare each existing use case and screen against React and the exact Flask contract before adding or changing code.

## 3. Flask contracts confirmed during kickoff

### 3.1 Sales order list and detail

- \`GET /api/admin/sales-orders\`
  - Requires authentication and \`sales-orders\` or \`fraud\` page permission.
  - Uses \`warehouse_scope_clause("so.warehouse_id")\` before calculating count/page results.
  - Supports page/per_page (up to 1000), status (including comma-separated statuses), warehouse_id, q, order_type, exclude_post_fulfillment, hide_printed, include_primary_bin, include_line_count and local_pickup.
  - Returns \`sales_orders[]\` and server pagination metadata.
- \`GET /api/admin/sales-orders/{so_id}\`
  - Requires the same permission family.
  - Applies \`warehouse_scope_clause("so.warehouse_id")\`.
  - Returns \`sales_order\`, \`lines[]\` and \`pick_tasks[]\`.

Svelte already has list/detail DTOs and maps these responses. Verify all optional projections, filters and pagination against the current React behavior and Flask response before changing them.

### 3.2 Sales order creation and reservations

- \`POST /api/admin/sales-orders\`
  - Requires \`sales-orders\` permission and validates \`CreateSalesOrderRequest\`.
  - Requires a positive warehouse ID and at least one line; each line has positive item ID and quantity (max 1,000,000).
  - Checks item existence and duplicate sales-order number.
  - Inserts the order and lines.
  - In the same request/transaction, iterates inventory rows for the selected item and warehouse, locks rows with \`FOR UPDATE\`, and increments \`quantity_allocated\` up to available stock. Partial allocation is permitted.
  - Returns the created order detail.

Important: this is not a separate preview/reserve API. The server performs a partial-or-full allocation during order creation. The frontend must use returned allocation quantities and must not calculate or claim a reservation before the server response.

**Potential scope gap to verify:** the inspected create handler uses the submitted \`warehouse_id\` and inventory rows for that warehouse, but no explicit \`warehouse_scope_clause\` or equivalent per-user warehouse authorization check was visible in the handler. Verify middleware/service-level enforcement and add a dedicated finding if none exists. A UI-selected warehouse is not a security boundary.

### 3.3 Sales order editing

- \`PUT /api/admin/sales-orders/{so_id}\` updates header fields under a row lock and has role/override-dependent status restrictions.
- \`PATCH /api/admin/sales-orders/{so_id}/address\` updates structured billing/shipping fields.
- Line add/update/delete and allocation have separate routes.
- Update schema supports defined header fields; it is not an unrestricted patch.
- Non-admin edit policy observed in the handler: without the \`so-full-edit\` override, only OPEN orders; with override, non-SHIPPED orders. ADMIN has a broader edit path.
- The frontend must preserve field allowlists and server authorization; do not treat UI validation as authoritative.

The update handler's warehouse scope must be checked separately from the GET detail handler. Do not infer that read scope automatically protects every mutation route.

### 3.4 Backorders

- \`GET /api/admin/backorders?tab=waiting|ready-to-ship&warehouse_id=...\`
  - Requires authentication and \`backorders\` permission.
  - Returns queue entries with order identity, warehouse, status, customer, item lines, waiting duration and fulfillment timestamps; may include the soonest expected open PO for an item in the same warehouse.
  - The inspected handler applies the optional caller-supplied \`warehouse_id\` filter but does **not** call \`warehouse_scope_clause\` on the backorder query.
  - The subsequent item and PO queries are based on the selected SO IDs/warehouse IDs.

**Confirmed backend limitation:** the backorder queue lacks explicit server-side warehouse-scope enforcement in the inspected handler. The optional query filter is not authorization. Svelte must not rely on it to protect cross-warehouse data. This requires a backend task outside the current frontend-only migration, and the limitation must remain visible.

- \`POST /api/admin/sales-orders/{bo_so_id}/cancel-backorder\` exists and accepts a cancellation reason. Verify its own scope, parent-order constraints, status transitions, inventory release and idempotency before treating cancellation as fully supported.

### 3.5 Customers

The current Svelte Customers feature builds a read-only projection from global search and sales-order list/detail endpoints. No canonical administrative customer CRUD API was established in this kickoff. Keep Customers read-only; do not introduce create/update/delete actions or imply that a page-local deduplicated list is a globally canonical customer registry.

### 3.6 Fraud

Sales-order listing can be authorized by \`fraud\` permission as well as \`sales-orders\`, but that does not establish a dedicated fraud assessment API or authorize Svelte to calculate risk. Verify the actual fraud routes/DTO before integrating an assessment. Until verified, show only server-provided order fields and do not invent a score or decision.

## 4. Initial risk register

| ID | Finding | Classification | Required action |
|---|---|---|---|
| R4-BE-01 | Backorder list handler filters by requested warehouse but lacks explicit warehouse-scope enforcement | \`BACKEND_LIMITATION\` | Record server-side scope requirement; frontend guard is not security |
| R4-BE-02 | Sales-order creation handler's explicit warehouse authorization is not yet verified | \`UNVERIFIED_CONTRACT\` | Inspect middleware/service and test unauthorized warehouse create |
| R4-BE-03 | Sales-order mutation routes may have different scope guarantees from GET detail | \`UNVERIFIED_CONTRACT\` | Audit update, line, allocation, cancel and backorder mutation handlers individually |
| R4-BE-04 | Creation performs partial allocation in the same transaction; no separate preview contract observed | \`SUPPORTED\` with frontend consistency requirement | Trust returned allocation; no local reservation simulation |
| R4-BE-05 | Customer registry is a read projection, not canonical CRUD | \`BACKEND_LIMITATION\` | Keep read-only and label scope/limitations |
| R4-BE-06 | Fraud permission on SO list does not prove a fraud assessment contract | \`UNVERIFIED_CONTRACT\` | Inspect fraud routes and React usage before exposing assessments |

## 5. Work sequence

1. **Contract and parity audit:** inspect React Sales Orders/Backorders/Customers behavior; enumerate every Flask route, schema, permission, warehouse scope, response and side effect.
2. **Domain/Application:** verify order status/line/allocation invariants, backorder parent-child relationships, cancellation/release rules and warehouse context. Reuse existing use cases; do not duplicate shared inventory rules.
3. **Data/Infrastructure:** reconcile DTOs/mappers with current Flask responses, including nullable fields, filters, pagination and error codes.
4. **UI:** verify list/detail/create/edit/cancel flows, allocation display, backorder queues/details, customer read-only projection and forbidden/not-supported/conflict states.
5. **Integrity:** prove no duplicate allocation, over-reservation, double cancellation, cross-warehouse access or stale-response overwrite. Unit tests alone do not prove backend concurrency.
6. **Regression:** run Webapp check, build, layer suites, integration, full regression and feature coverage on the final HEAD. Backend/Python suites remain outside the frontend DoD.

## 6. R4 acceptance gates

- List and detail filters, projections and pagination match Flask and the relevant React behavior.
- Every read and mutation is checked against the active authorized warehouse; server-side scope gaps are explicitly documented and never described as secured by the UI.
- Creation uses the server's atomic allocation result; no frontend stock reservation or availability estimate is treated as authoritative.
- Editing/cancellation/line changes respect actual status and permission rules.
- Backorder quantities and parent-child relationships reconcile; cancellation/release cannot be repeated or applied to another warehouse.
- Customer screens remain read-only unless a canonical customer API is verified.
- Fraud information is displayed only if a real server assessment contract is confirmed.
- Tests cover success, empty, validation, 400/401/403/404/409, pagination, warehouse switching, stale responses and duplicate submissions.
- Webapp CI is green on the exact final commit.

**Kickoff decision:** R4 can proceed in the Svelte frontend with documented backend dependencies. The confirmed backorder warehouse-scope gap and the unverified create/mutation scope guarantees must be resolved or explicitly guarded before R4 can be declared operationally verified. No Flask code was changed.


## 7. Auditoría de contratos y paridad — pasada 1

**HEAD inspeccionado:** `282a62e50e582cba3c49e9827b100b8575800ba8`.  
**Fuentes principales:** React `admin/src/pages/SalesOrders.jsx`, `admin/src/pages/Backorders.jsx`, `admin/src/components/SalesOrderModal.jsx`; Flask `api/routes/admin/admin_orders.py`, `api/schemas/sales_orders.py`, `api/services/sales_order_service.py`; Svelte feature modules `sales-orders`, `backorders` y `customers`.

### 7.1 Confirmaciones Flask

| Recorrido | Contrato comprobado | Resultado |
|---|---|---|
| Listado SO | GET valida page/per_page, limita per_page a 1000, filtra status (lista separada por coma), warehouse_id, q y flags; aplica warehouse_scope_clause antes del count y de la página | `SUPPORTED` |
| Detalle SO | GET aplica warehouse_scope_clause y devuelve cabecera, líneas y pick_tasks | `SUPPORTED` |
| Crear SO | POST requiere permiso sales-orders, valida schema, comprueba existencia de item y número duplicado; crea pedido y asigna stock parcialmente en la transacción | `SUPPORTED` con reserva autoritativa del servidor |
| Editar cabecera | PUT bloquea fila con FOR UPDATE y restringe por rol/estado; sin override no-admin solo OPEN; con so-full-edit no SHIPPED; ADMIN tiene ruta más amplia | `SUPPORTED`, pero sin scope de almacén visible en el handler |
| Editar dirección | PATCH bloquea fila y aplica regla de estado, pero no tiene decorador de permiso de página ni warehouse_scope_clause visible | `BACKEND_LIMITATION` / autorización incompleta a verificar en middleware |
| Líneas | POST/PATCH/DELETE bloquean SO y comprueban estado/consistencia de cantidades; el handler no aplica warehouse_scope_clause | `BACKEND_LIMITATION` |
| Cancelar SO | POST delega en cancel_sales_order compartido, que registra auditoría y deshace efectos según estado; el handler no aplica warehouse_scope_clause | `BACKEND_LIMITATION` de scope |
| Cancelar backorder | POST valida reason, parent_so_id y order_type, delega en cancel service, relabela REFUNDED si aplica y devuelve audit_log_id; no se ve scope de almacén | `BACKEND_LIMITATION` de scope |
| Cola backorders | GET valida tab y filtra por warehouse_id solo si el cliente lo envía; no aplica warehouse_scope_clause | `BACKEND_LIMITATION` confirmada |

**Hallazgo crítico de seguridad:** en los handlers inspeccionados de PUT cabecera, PATCH dirección, edición de líneas, cancelación y cancel-backorder no aparece enforcement explícito del warehouse scope equivalente al GET de detalle. El frontend puede ocultar/deshabilitar acciones fuera del almacén activo, pero eso no impide que un cliente manipule directamente el ID. La aceptación «un pedido de otro almacén no se puede mutar» no puede certificarse hasta que Flask aplique scope en cada mutación. Esto queda fuera del alcance actual `webapp/`; no se modificará Flask en esta fase.

**Creación y almacén:** el handler POST crea usando el `warehouse_id` enviado, pero no se observa comprobación explícita de que el usuario tenga acceso a ese almacén. El item se valida por existencia, no se encontró comprobación de estado activo en este handler. Ambos puntos quedan como `UNVERIFIED_CONTRACT` / posible gap backend, no como validación frontend resuelta.

### 7.2 React ↔ Svelte: diferencias y defectos demostrados

1. **Listado React:** status + búsqueda, 50 por página, `exclude_post_fulfillment=true`, paginación real desde Flask. Svelte ya pasa los mismos filtros base y consume `total/page/per_page/pages`; el datasource soporta filtros adicionales del contrato.
2. **Carrera en listado Svelte:** `salesOrdersState.load()` retorna inmediatamente si `loading` ya es true y no usa request epoch. Un cambio de filtro/página/almacén durante una petición puede descartarse; si se permite solapamiento desde otros puntos, una respuesta antigua puede reemplazar datos nuevos. Clasificación: `FRONTEND_DEFECT`.
3. **Carrera al abrir detalle Svelte:** `open(id)` no invalida solicitudes previas mediante secuencia. Dos aperturas rápidas pueden permitir que el detalle anterior termine último y sustituya el seleccionado. Clasificación: `FRONTEND_DEFECT`.
4. **Creación Svelte:** el use case valida número, warehouse ID, líneas, cantidades y duplicados; el repositorio mapea a POST y recibe el detalle creado. No se debe calcular disponibilidad ni asignación local. El estado actual descarta el objeto devuelto y recarga listado; conviene seleccionar/refrescar el detalle devuelto para confirmar las cantidades realmente asignadas.
5. **Líneas:** el schema y handler rechazan cantidades no positivas y el backend bloquea reducir por debajo de picked/shipped; al reducir bajo allocated libera la diferencia. No se encontró soporte para líneas duplicadas: el handler add-line las rechaza y el create use case también las rechaza.
6. **Backorders:** Svelte consulta la cola con warehouse_id, carga detalle mediante endpoint SO separado y calcula pending como ordered − shipped. La lista del backend informa qty ordenada de cada línea de backorder, no un ledger de faltantes calculado por cliente. No sumar faltantes de padre e hijo ni inventar una reserva adicional. La seguridad cross-warehouse de la cola sigue bloqueada por el gap backend.
7. **Customers:** la feature Svelte deriva clientes de búsqueda global y pedidos; no se encontró API administrativa canónica de CRUD. Se mantiene read-only.
8. **Fraud:** no se declara evaluación de riesgo en el flujo SO hasta completar la inspección de rutas/DTO de Fraud y confirmar cómo React la muestra. El permiso alternativo de listado no es una evaluación.

### 7.3 Matriz de riesgos actualizada

| ID | Hallazgo | Clasificación | Gate |
|---|---|---|---|
| R4-BE-01 | Backorders GET carece de warehouse_scope_clause | `BACKEND_LIMITATION` | No certificar aislamiento de cola |
| R4-BE-02 | Crear SO no demuestra autorización del warehouse_id recibido ni validación de item activo | `UNVERIFIED_CONTRACT` | No tratar selector/UI como seguridad |
| R4-BE-03 | PUT cabecera, PATCH address, líneas y cancelación no muestran warehouse scope en handler | `BACKEND_LIMITATION` | No certificar mutación cross-warehouse |
| R4-BE-04 | Creación reserva parcialmente en transacción y devuelve detalle | `SUPPORTED` | Mostrar cantidades asignadas del servidor |
| R4-FE-01 | Listado Svelte no protege contra carga concurrente/obsoleta | `FRONTEND_DEFECT` | Añadir epoch/cancelación lógica y pruebas |
| R4-FE-02 | Apertura de detalle Svelte puede ser sobrescrita por respuesta antigua | `FRONTEND_DEFECT` | Añadir request sequence y pruebas |
| R4-FE-03 | El estado create descarta el detalle devuelto por POST | `FRONTEND_DEFECT` de confirmación UX | Conservar resultado del servidor y asignaciones |
| R4-BE-05 | Customers no tiene CRUD canónico demostrado | `BACKEND_LIMITATION` | Read-only |
| R4-BE-06 | No se ha demostrado assessment de Fraud para el detalle SO | `UNVERIFIED_CONTRACT` | No inventar score/decisión |

### 7.4 Próximo bloque de implementación

1. Corregir R4-FE-01 y R4-FE-02 en `salesOrdersState.svelte.ts`; pruebas de estado para cambios rápidos de filtro/warehouse y aperturas consecutivas.
2. Preservar el detalle creado devuelto por POST, verificando cómo la pantalla presenta las cantidades `quantity_allocated` y las líneas de faltante.
3. Completar auditoría de Fraud, historial/audit-history y cancelación/liberación de reservas; verificar cada endpoint y respuesta antes de habilitar acciones.
4. Reconciliar Backorders con React: tabs, orden, cantidades, open PO derivado, estados, cancelación y recarga posterior.
5. No cerrar R4 hasta que los gaps backend de warehouse scope estén corregidos fuera de este alcance o aceptados formalmente como bloqueo explícito. Una guard de UI no satisface la aceptación de seguridad.
