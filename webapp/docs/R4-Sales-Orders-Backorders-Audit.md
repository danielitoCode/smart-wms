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


## 8. Implementación frontend — concurrencia y resultado de creación

**Implementado en `webapp/`:**

1. Listado: cada carga recibe una secuencia monotónica; se permite iniciar una carga nueva aunque otra siga pendiente. Solo la última respuesta puede cambiar filas, error, loadedOnce o loading.
2. Detalle: `open(id)` invalida solicitudes previas y `close()` invalida cualquier apertura pendiente. Las respuestas y errores obsoletos no sustituyen ni limpian el pedido seleccionado más reciente.
3. Refresh de detalle: la recarga tras mutaciones también usa la misma secuencia; una recarga antigua no puede pisar otro pedido abierto después.
4. Creación: el estado conserva el `SalesOrder` completo devuelto por POST, incluido `quantity_allocated`; reinicia la página a 1 y actualiza el listado sin descartar el detalle creado.
5. UI: al completar la creación se abre el detalle devuelto por Flask. La tabla muestra `Asignada` y `Pendiente de asignar` (ordered − allocated), sin presentar esa diferencia como stock disponible. La pantalla ya muestra cantidades recogidas, empacadas y enviadas por separado.
6. Pruebas de estado nuevas: respuesta de listado fuera de orden, loading con dos solicitudes, aperturas rápidas, error de detalle obsoleto, cierre con solicitud pendiente y conservación de asignaciones reales tras crear.

**Verificación:** Webapp CI se debe evaluar sobre el HEAD final de esta implementación. Los workflows iniciados por commits intermedios no se consideran evidencia de aceptación final.


## 9. Reconciliación Backorders, cancelaciones, historial y Fraud — pasada 2

**HEAD de partida:** `f52ef7fc6e29fa6f7207e2703d02b37c8d331228`.  
**Alcance:** comparación de React `admin/src/pages/Backorders.jsx` / `Fraud.jsx`, Flask `api/routes/admin/admin_orders.py` y `api/services/sales_order_service.py`, y módulos Svelte `backorders`, `fraud` y `audit-log`.

### 9.1 Backorders: paridad y reglas confirmadas

| Criterio | Contrato React/Flask | Svelte | Resultado |
|---|---|---|---|
| Waiting | `status=WAITING_STOCK`; orden ascendente por `backorder_opened_at` (más antiguo primero) | Misma tab y orden del servidor | `SUPPORTED` |
| Ready to ship | `status IN (OPEN, PICKED, PACKED)` y `backorder_opened_at IS NOT NULL` | Misma tab y estados | `SUPPORTED` |
| Líneas de cola | `quantity_ordered`, SKU/nombre; no es una suma de faltantes del padre | Muestra cantidad del BO, no vuelve a sumar faltantes del SO padre | `SUPPORTED` |
| Open PO | PO abierto/parcial más próximo por artículo y almacén; es una relación derivada, no un vínculo BO→PO | Muestra número, pendiente y fecha estimada; null se representa como ausencia de PO | `SUPPORTED` |
| Tiempo | `days_waiting` desde `backorder_opened_at`; ready expone `fulfillable_since` | Presenta ambos datos y fecha date-only sin desfase UTC | `SUPPORTED` |
| Búsqueda | React no consulta búsqueda servidor; la cola cargada se filtra en cliente | Filtra pedido, padre, cliente, SKU, nombre y número PO | `SUPPORTED` (ampliación local) |
| Paginación | GET no expone metadatos de paginación; devuelve la cola completa | No simula paginación | `BACKEND_LIMITATION` si el volumen exige paginar |

No existe una relación de base de datos entre un backorder y una PO que lo satisfaga. La etiqueta de PO debe seguir comunicando que se trata de una coincidencia derivada por artículo/almacén; no debe prometer que esa compra fue creada para ese BO.

### 9.2 Cancelación y liberación de inventario

El endpoint `POST /api/admin/sales-orders/{id}/cancel-backorder` exige permiso `sales-orders`, valida los motivos `found`, `customer_asked`, `refunded` y `other`, verifica que exista un hijo `order_type=backorder` y delega en `cancel_sales_order`.

El servicio compartido bloquea la fila SO con `FOR UPDATE` y aplica la regla según estado:

- `WAITING_STOCK`: no tiene reserva de inventario que liberar; se cambia el estado y se registra auditoría.
- `OPEN`: libera `quantity_allocated` y elimina tareas/relaciones pendientes del batch.
- `PICKED/PACKED`: devuelve las cantidades recogidas al bin de recepción predeterminado y limpia cantidades picked/packed y estado de línea.
- `SHIPPED`: rechaza cancelación; el camino correcto es void-ship.
- `CANCELLED`: el servicio compartido es idempotente. El wrapper específico rechaza un pedido ya cancelado cuando lo observa antes de delegar.
- Motivo `refunded`: después del unwind se etiqueta el BO como `REFUNDED`.

La cancelación registra `CANCEL` en `audit_log`, emite `backorder.cancelled` al outbox y genera notificación diferida tras commit. Cancelar el pedido padre hace cascade sobre sus backorders hijos no terminales. La operación específica no cancela el pedido padre.

**Limitaciones backend que siguen abiertas:**

- El GET `/admin/backorders` solo filtra por el `warehouse_id` suministrado; no aplica `warehouse_scope_clause`. Un filtro enviado por Svelte no es autorización.
- El POST `cancel-backorder` no aplica warehouse scope al leer/estampar el motivo antes de invocar el servicio. El servicio sí bloquea la fila para la transición, pero eso no sustituye autorización por almacén. Un cliente puede invocar directamente el endpoint con un ID ajeno.
- El wrapper comprueba el estado antes de delegar y actualiza `cancellation_reason` antes del bloqueo del servicio. En llamadas concurrentes, el servicio evita una segunda transición/auditoría, pero el wrapper puede haber actualizado el motivo antes de que el servicio detecte el estado terminal. Requiere prueba/fix backend para certificar idempotencia completa del motivo.
- No existe un endpoint separado de preview/release. La liberación se ejecuta como parte transaccional de cancelación en el servicio compartido; el frontend no recalcula inventario.

**Guardas frontend añadidas en esta pasada:** la cancelación vuelve a recuperar el detalle autoritativo (GET detalle SO con warehouse scope), compara el almacén real con el almacén autorizado de la fila, valida padre/estado y bloquea doble submit en el estado. Esto reduce errores y acciones obsoletas desde la UI, pero queda clasificado como `FRONTEND_GUARD_REQUIRED`; no soluciona el bypass directo del endpoint Flask.

### 9.3 Historial de backorder

Se integró en el feature Backorders el endpoint existente `GET /api/admin/sales-orders/{id}/audit-history?page=&per_page=`:

- Requiere permiso `fraud` o `audit-log`; no se debe asumir que `backorders` o `sales-orders` por sí solos conceden acceso.
- Verifica warehouse scope del SO antes de consultar eventos.
- Filtra por `entity_type='SO'`, `entity_id` y `warehouse_id` del pedido.
- Ordena `created_at DESC, log_id DESC`; permite `per_page` de 1 a 100.
- La UI Svelte muestra eventos, actor, fecha, detalles y paginación cuando el usuario tiene uno de esos permisos.

Este historial es la auditoría asociada al pedido; no es un ledger completo de movimientos de inventario. No se reconstruyen movimientos a partir de snapshots ni de eventos incompletos.

### 9.4 Fraud: contrato real frente a interpretación

La página React `Fraud.jsx` es una **bandeja de revisión manual de pedidos retenidos**, no un motor de scoring:

| Operación | Contrato Flask | Permiso/scope | Resultado |
|---|---|---|---|
| Listar | `GET /api/admin/sales-orders?status=FRAUD_REVIEW&warehouse_id=…`; respuesta `sales_orders` + paginación | `fraud` o `sales-orders`; warehouse scope en listado | `SUPPORTED` |
| Detalle | `GET /api/admin/sales-orders/{id}`; cabecera, líneas y tareas | Permiso de pedidos/fraude y warehouse scope | `SUPPORTED` |
| Leer historial | `GET /api/admin/sales-orders/{id}/audit-history`; entradas paginadas | `fraud` o `audit-log`; warehouse scope | `SUPPORTED` |
| Guardar memo | `PATCH /api/admin/sales-orders/{id}/memo`; `memo` y `expected_memo` opcional | `fraud`; warehouse scope; 409 si cambió el memo esperado | `SUPPORTED` |
| Liberar a preparación | `POST /api/admin/sales-orders/{id}/push-to-queue`; solo acepta `FRAUD_REVIEW`, cambia a `OPEN` y escribe auditoría | `fraud`; warehouse scope y bloqueo de fila; 409 para otro estado | `SUPPORTED` |

React carga hasta 100 filas y permite editar memo y enviar a cola; Svelte usa páginas de 50, detalle, historial y control optimista `expected_memo`. No hay contrato de score, modelo, explicación de riesgo ni decisión automatizada en las rutas inspeccionadas. Por tanto:

- `FraudReview` significa revisión manual/estado de retención.
- No mostrar porcentaje, nivel, reason code ni recomendación de riesgo no devueltos por Flask.
- `push-to-queue` es una transición explícita de `FRAUD_REVIEW` a `OPEN`, no un cálculo de riesgo ni un despacho inmediato.

### 9.5 Matriz de aceptación actualizada

| Criterio | Estado | Evidencia / pendiente |
|---|---|---|
| Tabs, estados, orden y cantidades de backorders | `SUPPORTED` | React + Flask contrastados |
| Open PO derivado y fechas | `SUPPORTED` | Consulta Flask por item/warehouse; no vínculo BO→PO |
| Detalle BO, padre y progreso por línea | `SUPPORTED` | Detalle SO y mapper existente |
| Cancelación por motivo, estado y release | `SUPPORTED` con guardas FE | Servicio transaccional; probar concurrency real |
| Doble submit en UI | `IMPLEMENTED_UNVERIFIED` | Estado FE rechaza segunda llamada |
| Historial por pedido | `IMPLEMENTED_UNVERIFIED` | Endpoint y permisos verificados; nueva UI + pruebas pendientes de CI |
| Fraud manual list/detail/memo/push | `SUPPORTED` | Rutas y comportamiento React/Flask contrastados |
| Fraud score/assessment | `NOT_SUPPORTED` | No existe contrato probado; no inventar |
| Warehouse scope de GET Backorders | `BACKEND_LIMITATION` | Falta enforcement server-side |
| Warehouse scope de cancel-backorder | `BACKEND_LIMITATION` | Falta enforcement server-side |
| Historial global de inventario | `NOT_SUPPORTED` en este endpoint | El historial SO no sustituye ledger de inventario |
| Regresión y criterios completos | `PENDING_CI` | Debe ejecutarse en el HEAD final de esta entrega |

**Decisión:** reconciliación funcional y contratos de Fraud documentados; historial por pedido y guardas de cancelación implementados en frontend. R4 permanece `IN_PROGRESS` hasta verificar CI final y resolver/aceptar formalmente los gaps backend de warehouse scope y concurrencia del wrapper de cancelación.

## 10. R4.1 — Reparación de CI frontend

**HEAD de partida:** `00bc8b93239c82aa5c7237b8442a1f184f62f295`.

### 10.1 Guard de warehouseId nullable

La implementación actual de `BackorderDetailScreen.svelte`:
- excluye del estado cancelable los pedidos con `warehouseId === null`;
- repite la validación en `submitCancel()` como defensa antes de la llamada;
- resuelve el scope autorizado y solo invoca `vm.cancel(..., order.warehouseId)` después de estrechar el tipo a `number`;
- muestra un mensaje localizado cuando falta el almacén.

El workflow **Webapp CI** de ese HEAD terminó correctamente en el job `Typecheck · Build · Test`. Por tanto, typecheck, build y tests frontend pasaron en ese commit.

### 10.2 Gitleaks

La ejecución sobre ese HEAD detectó `generic-api-key` en el historial, en `wms-twin/doc/API_ENDPOINTS_FRONTEND.md:76`, originado en `03169fe385a187aa797661272d025b7b945faa75`. La inspección de la línea histórica confirma que el valor es un JWT de ejemplo truncado literalmente con `...`; no es una credencial completa utilizable.

Se añadió una allowlist exacta y anclada en `.gitleaks.toml` para ese único placeholder. No se excluyó el archivo ni se debilitó la regla genérica. La verificación final requiere que el nuevo workflow de Gitleaks termine en verde en el HEAD que contiene esta excepción.

**Estado R4.1:** `IMPLEMENTED_UNVERIFIED` hasta la finalización satisfactoria de Gitleaks sobre el nuevo HEAD. No se tocaron archivos Flask/Python.


## 11. R4.2 — Pruebas frontend de Backorders

**HEAD verificado:** `cd343913a88168ef180b79a74c227354b3767015`.

Se incorporó `src/test/unitTest/feature/backorders/ui/backordersState.test.ts` con siete pruebas de estado para carreras de cola/detalle/historial, paginación, doble submit, error de cancelación y ausencia de mutación optimista de inventario. Se ampliaron además las pruebas de `BackorderUseCases.test.ts` para todos los estados cancelables y todos los motivos permitidos.

La regresión frontend completa pasó: 200 archivos, 871 tests. Webapp CI y Gitleaks están en verde para este HEAD.

**Criterio de liberación:** Svelte no tiene un endpoint independiente de release. La liberación es un efecto de la operación transaccional `cancel-backorder` del servidor; el frontend envía la intención, espera la respuesta y no modifica cantidades localmente. Por tanto, no se añade una simulación local de liberación.

**Concurrencia:** se verifica la protección de doble submit y las carreras de peticiones dentro de una instancia del frontend. La atomicidad del motivo, el aislamiento cross-warehouse y la concurrencia entre clientes siguen sin poder certificarse desde el cliente y permanecen como bloqueos backend de R4.3.

**Estado R4.2:** cobertura frontend ampliada y regresión verificada; cierre funcional global pendiente de los bloqueos formales R4.3 y de la matriz final.


## 12. R4.2 — cierre de implementación frontend

**Código implementado en:** `0351dab45ac5ca9d5dffe44e8a7dda60fd55805d`.  
**CI final:** pendiente de confirmar en el HEAD documental definitivo.

Se completa la pasada frontend con estos cambios:

1. Retry y refresh de la cola ya no llaman directamente a `vm.load(selection?.warehouseId ?? null, ...)`; inicialización, retry y refresh tras cancelación comparten `loadQueue()` y el resolver de scope. Un no-admin sin selección queda bloqueado antes de la consulta.
2. La política `isBackorderCancelableStatus` es única y se usa en Domain/use case, listado y detalle. Se limita a `WAITING_STOCK`, `OPEN`, `PICKED` y `PACKED`.
3. La lista solo expone cancelar si el usuario tiene permiso, la fila pertenece al scope actualmente seleccionado/autorizado y el estado admite cancelación. Un cambio de almacén invalida el diálogo y submit vuelve a validar.
4. El detalle vuelve a validar almacén y estado justo antes de cancelar. El diálogo deja de renderizarse si la orden ya no es cancelable.
5. Tests adicionales cubren la política compartida y errores HTTP 400/403/404/409; los tests anteriores cubren concurrencia de cargas, detalle/historial, paginación, doble submit y no mutación local del inventario.
6. Se corrigió la semántica de mutaciones Sales Orders: una respuesta satisfactoria del endpoint no se convierte en fallo de la mutación porque falle el refresh posterior. `refreshError` distingue el aviso de sincronización del error real de operación; cubre update, address, líneas, allocation, admin ship y cancel.

### Matriz R4.2 — estado frontend

| Criterio | Estado | Evidencia |
|---|---|---|
| Estados cancelables y motivos | `IMPLEMENTED` | Domain policy + UseCase tests |
| Scope en carga inicial/retry/refresh | `IMPLEMENTED` | Resolver común `loadQueue()` |
| Modal y cambio de almacén | `IMPLEMENTED` | Invalida modal y revalida submit |
| Errores HTTP 400/403/404/409 | `TESTED` | Tests `backordersState` |
| Historial y paginación | `IMPLEMENTED` | Data/domain/UI state y tests previos |
| Doble submit / carreras UI | `TESTED` | State tests previos |
| Liberación inventario | `SERVER_OWNED` | Solo endpoint transaccional; sin simulación FE |
| Scope cross-warehouse / atomicidad cross-client | `BLOCKED_BACKEND` | R4-BE-01/02/03 sin enforcement Flask demostrado |

**Cierre:** R4.2 está completa para Svelte. R4.3 sigue bloqueada por las limitaciones backend documentadas; el cierre frontend no certifica la seguridad del endpoint ante llamadas directas ni concurrencia entre clientes.

