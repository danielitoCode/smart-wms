# R0 — Auditoría de rutas, llamadas HTTP, autorización y warehouse scope

- **Estado:** `IN_PROGRESS`
- **Fecha:** 2026-11-19
- **Rama:** `svelte-webapp`
- **Alcance solicitado:** rutas React ↔ Svelte ↔ Flask; llamadas HTTP en UI; mutaciones, autorización y contexto de almacén.
- **Resultado:** se encontraron discrepancias funcionales y brechas de autorización/aislamiento que impiden cerrar R0.
- **Cambios funcionales:** ninguno en esta auditoría. Se documentan hallazgos antes de alterar contratos o rutas.

> Este informe separa evidencia confirmada de cobertura todavía incompleta. El conector de GitHub permitió leer archivos conocidos, pero no expuso un listado recursivo del árbol ni una búsqueda de código operativa en la rama. Por eso no se afirma que todos los archivos `.svelte` o todos los casos de uso del repositorio hayan sido enumerados. Los hallazgos reproducibles que siguen sí están respaldados por archivos y líneas concretas.

---

## 1. Rutas: React frente a Svelte

### 1.1 Referencia React

`admin/src/App.jsx` define las rutas principales del frontend React: dashboard en `/`; inventario; `/cycle-counts`; `/count-approvals`; receiving; purchase orders; putaway; sales orders; POS activity; fraud; backorders; returns con subrutas RMA/refunds; picking tickets y vistas de impresión; picking batches; items; vendors; datos maestros; users; API tokens; inbound; consumer groups; webhooks; channels; notifications; audit log; settings; imports; integrations; adjustments; inter-warehouse transfers y transfer orders.

React retiró las páginas administrativas independientes de picking/packing/shipping; el flujo operativo se había trasladado a scanners.

### 1.2 Rutas Svelte verificadas por lectura de archivos

Se encontraron wrappers Svelte para:

- `/dashboard`, `/inventory`, `/cycle-count`, `/receiving`, `/putaway`, `/items`.
- `/picking-tickets`, `/picking-batches`, `/picking`, `/packing`, `/shipping`.
- `/sales-orders`, `/customers`, `/warehouses`, `/data`.
- `/data/warehouses`, `/data/zones`, `/data/bins`, `/data/preferred-bins`.

Los wrappers de la mayoría de las pantallas delegan a un componente `*Screen.svelte`; no contienen por sí mismos llamadas HTTP.

### 1.3 Discrepancias confirmadas

| Caso | React | Navegación/política Svelte | Evidencia Svelte | Resultado |
|---|---|---|---|---|
| Conteo cíclico | `/cycle-counts` | `/cycle-count` | Existe `routes/(app)/cycle-count/+page.svelte`; no se encontró wrapper `cycle-counts` en la ruta consultada | Cambio de URL sin alias/redirect verificado |
| Pedidos de venta | `/sales-orders` | `/management/sales-orders` | Existe `routes/(app)/sales-orders/+page.svelte`; no existe el wrapper `management/sales-orders/+page.svelte` consultado | El enlace del menú no coincide con la pantalla existente |
| Compras | `/purchase-orders` | `/management/purchase-orders` | No se encontró wrapper en ninguna de esas dos rutas consultadas | Ruta anunciada en el menú sin página localizada |
| Clientes | No había página dedicada equivalente en React App | `/management/customers` | Existe `/customers`; no se encontró `/management/customers` | La ruta del menú no coincide con la pantalla existente |
| Aprobaciones | `/count-approvals` | `/management/count-approvals` | No se encontró wrapper en las dos rutas consultadas | Página anunciada sin destino localizado |
| Datos maestros | `/data/warehouses`, `/data/bins`, `/data/zones`, `/data/preferred-bins` | Conserva esos paths | Los cuatro wrappers existen | Correspondencia de rutas correcta; hay, sin embargo, un error de grants en bins (ver R0-ROUTE-02) |

El menú de `routes/(app)/+layout.svelte` enlaza a varias rutas `/management/*`, pero los wrappers consultados para sales-orders, purchase-orders, customers, count-approvals, vendors, adjustments, fraud, backorders y users no se encontraron. No debe darse por migrada una pantalla por el mero hecho de que exista un enlace en el menú o una regla en `AccessPolicy`.

**Acción requerida:** construir una matriz completa a partir del árbol real de rutas, eliminar enlaces sin destino, añadir redirects de compatibilidad para URLs React que deban conservarse y verificar cada ruta mediante pruebas de navegación directa y recarga.

---

## 2. Hallazgos de autorización y rutas

### R0-ROUTE-01 — Enlaces del menú sin wrapper Svelte localizado
- **Severidad:** alta (bloqueo funcional).
- **Evidencia:** `webapp/src/routes/(app)/+layout.svelte` contiene enlaces `/management/*`; `/sales-orders` sí tiene wrapper, pero `/management/sales-orders` no fue localizado. Lo mismo ocurre con rutas de compras, clientes y aprobaciones.
- **Impacto:** navegación que puede terminar en 404 aunque el menú muestre el módulo; la política de permisos no crea una página.
- **Resolución:** alinear href con wrappers reales o crear wrappers/redirects intencionales. No duplicar pantallas.

### R0-ROUTE-02 — El acceso a Bins exige indebidamente dos grants
- **Severidad:** media-alta (usuarios válidos quedan bloqueados).
- **Evidencia Svelte:** `routes/(app)/data/+layout.svelte` define Bins con `keys: ['bins', 'zones']` y filtra con `every`. `routes/(app)/data/+page.svelte` solo redirige a Bins cuando están presentes ambos grants; además, la rama de Zones aparece antes.
- **Contrato Flask:** `api/routes/admin/admin_warehouse.py` protege GET/POST/PUT/DELETE de bins con `require_admin_or_page_permission("bins")`; las rutas de zonas usan `"zones"`.
- **Impacto:** un usuario con grant `bins` pero sin `zones` no ve la pestaña y tampoco puede entrar desde `/data`, aunque Flask autoriza la operación de bins.
- **Resolución:** Bins debe exigir únicamente `bins`; la entrada `/data` debe seleccionar cualquier módulo autorizado sin requerir grants adicionales.

### R0-ROUTE-03 — El helper de páginas considera vacío como autorizado
- **Severidad:** riesgo de regresión.
- **Evidencia:** `AccessPolicy.ts::canAccessPages` devuelve true si `requiredKeys.length === 0`. El layout actual evita este caso para rutas desconocidas mediante `routeAccessPolicyForPath` (retorna null y el layout deniega), y scanner paths tienen política explícita `authenticated`.
- **Impacto:** cualquier consumidor futuro que invoque directamente `canAccessPages(..., [])` puede abrir acceso accidental.
- **Resolución:** sustituir el significado ambiguo de lista vacía por una política explícita (`authenticated`, `all`, `any`) y prohibir usar una lista vacía como bypass.

---

## 3. Llamadas HTTP en componentes Svelte

### Evidencia positiva en los archivos revisados

- `ApiClient.ts` concentra el `fetch` del navegador, cookies, CSRF, timeout, abort, normalización de errores y diagnóstico.
- `WarehouseRemoteDataSource`, `ReceivingRemoteDataSource`, `PutawayRemoteDataSource` y `InventoryRemoteDataSource` delegan las peticiones a `ApiClient`.
- Los wrappers de rutas revisados importan pantallas; las pantallas revisadas (`DashboardScreen`, `InventoryScreen`, `CycleCountScreen`, `ReceivingScreen`, `PutawayScreen`, `ItemsScreen`, `PickingScreen`, `PackingScreen`, `ShippingScreen`) delegan operaciones a estados/ViewModels.
- En los archivos de UI anteriores, `WarehousePicker.svelte`, `UiStatePanel.svelte` y el layout autenticado no se encontró una llamada directa a `fetch` ni a un cliente HTTP.

### Estado de la auditoría

- **No se encontró una llamada HTTP directa en los componentes inspeccionados.**
- **No se certifica todavía el repositorio completo.** La búsqueda de código de GitHub no devolvió resultados utilizables y no estuvo disponible el árbol recursivo de la rama; faltan enumerar todos los `.svelte`, `.ts` de UI y componentes compartidos.
- **Criterio de cierre:** búsqueda completa en `webapp/src` para `fetch(`, `XMLHttpRequest`, clientes HTTP, `apiClient`, imports de datasources/repositories y llamadas de red; cada coincidencia debe clasificarse. UI solo puede llamar a estado/caso de uso; Data/Infrastructure es la única capa autorizada para HTTP.

---

## 4. Auditoría de casos de uso mutables y warehouse scope

### R0-AUTH-01 — Operaciones operativas carecen de enforcement de page/function grant en Flask
- **Severidad:** crítica si los grants deben restringir las acciones operativas.
- **Evidencia:** las rutas de `api/routes/receiving.py`, `putaway.py`, `inventory.py` (cycle counts), `picking.py`, `packing.py` y `shipping.py` usan `require_auth`; no se observó `require_admin_or_page_permission` ni un decorador de `allowed_functions` en las operaciones inspeccionadas.
- `/api/auth/me` expone `allowed_functions`, pero `require_auth` recarga role y warehouse_ids y page grants; no carga allowed_functions en `g.current_user` ni ejecuta un control funcional común.
- **Impacto:** el guard de Svelte puede ocultar o bloquear la pantalla por page grant, pero una llamada HTTP directa autenticada puede ejecutar una operación si supera el chequeo de almacén. La UI no es enforcement de servidor.
- **Resolución:** definir la matriz de funciones (receiving.lookup/receive/cancel; putaway.list/suggest/confirm/update-preferred; cycle-count.create/read/submit; picking/packing/shipping actions) y aplicar enforcement Flask antes de considerar esos grants una frontera de seguridad. No simular esta seguridad en Svelte.

### R0-WH-01 — Inventory GET puede consultar todos los almacenes
- **Severidad:** crítica (aislamiento de datos).
- **Evidencia:** `api/routes/admin/admin_items.py::list_inventory` tiene grant de página `inventory`, pero `warehouse_id` es opcional. La consulta agrega `inv.warehouse_id = :wid` solo si se proporciona el parámetro; no aplica `warehouse_scope_clause` cuando se omite.
- **Impacto:** un usuario autenticado con grant `inventory` puede llamar directamente `GET /api/admin/inventory` sin `warehouse_id` y obtener registros de todos los almacenes. El middleware solo comprueba IDs de almacén que se hayan enviado; si no hay ID, no hace un control de ámbito.
- **Hallazgo adicional:** la subconsulta `committed_to_orders` une sales_order_lines con sales_orders por SO e item, pero no restringe `so.warehouse_id = inv.warehouse_id`; el comprometido de una línea de inventario puede sumar pedidos de otros almacenes.
- **Resolución:** aplicar `warehouse_scope_clause("inv.warehouse_id")` en el SELECT y COUNT; exigir un almacén explícito cuando el caso de uso sea de detalle operativo; añadir filtro de warehouse al agregado de pedidos y pruebas de aislamiento entre dos almacenes.

### R0-WH-02 — Picking active-batch no queda limitado si falta warehouse_id
- **Severidad:** alta (lectura cross-warehouse).
- **Evidencia:** `api/routes/picking.py::active_batch` acepta `warehouse_id` opcional. Si se omite, asigna `None` y el SQL usa `(:warehouse_id IS NULL OR warehouse_id = :warehouse_id)`; no aplica `warehouse_scope_clause`.
- **Impacto:** un usuario autenticado puede obtener su lote activo sin restringirlo a los almacenes asignados. El cliente Svelte sí llama con el almacén activo, pero el endpoint debe ser seguro ante requests directas o clientes antiguos.
- **Resolución:** hacer obligatorio `warehouse_id` y validar asignación, o aplicar scope SQL incluso cuando no se envía. Añadir test de usuario asignado solo a WH-A frente a lote en WH-B.

### R0-WH-03 — Inventory UI usa catálogo administrativo y permite ausencia de contexto
- **Severidad:** alta (funcionalidad/aislamiento).
- **Evidencia:** `inventoryState.initialize()` usa `listAdminWarehouses.execute()` en lugar del catálogo operativo `/api/warehouses/list`; si no obtiene opciones puede continuar con `warehouseId` indefinido y ejecutar el listado. `InventoryRemoteDataSource.getOverview` omite `warehouse_id` cuando no está definido.
- **Impacto:** un usuario con grant inventory pero sin grant warehouses puede fallar al inicializar; si llega a llamar el listado sin warehouse_id, coincide con la brecha de backend R0-WH-01.
- **Resolución:** consumir el contexto operativo compartido; bloquear el listado si el caso de uso exige almacén y no existe uno autorizado; no permitir que el filtro UI sustituya la selección activa por un ID no validado.

### R0-WH-04 — Cycle Count no usa WarehouseSelectionState
- **Severidad:** alta (contexto incoherente; API sí valida asignación).
- **Evidencia:** `cycleCountState.svelte.ts` elige `warehouseIds[0] ?? 1`, permite editar manualmente el ID y `createCycleCount` valida solo que sea entero positivo. `submitCycleCount` carga y envía por count_id sin recibir warehouse scope. El estado no invoca `requireWarehouseId` ni usa generación del contexto compartido.
- **Contrato Flask:** `POST /api/inventory/cycle-count/create` valida el warehouse_id del body mediante middleware; GET detalle y POST submit derivan warehouse_id del conteo y llaman `check_warehouse_access`. No se observó page/function grant en estas rutas.
- **Impacto:** un operador asignado a varios almacenes puede crear el conteo en el primer almacén asignado aunque el contexto activo sea otro; el control server-side evita almacenes no asignados, pero no obliga a respetar el almacén activo ni el grant de función.
- **Resolución:** inyectar WarehouseSelectionState, eliminar fallback `1` y el input libre; resolver almacén activo al crear y verificar que el detalle pertenece al contexto al leer/enviar. Añadir tests de cambio de almacén y de grants.

### R0-WH-05 — Put-away no usa WarehouseSelectionState
- **Severidad:** alta (mutación de inventario fuera del contexto visible).
- **Evidencia:** `putawayState.svelte.ts` inicializa `warehouseIds[0] ?? 1`, ofrece `setWarehouseId` libre y la pantalla expone un input numérico manual. El estado no usa `requireWarehouseId` ni request generation.
- **Contrato Flask:** `pending/<warehouse_id>` y `staging-summary/<warehouse_id>` hacen `check_warehouse_access`; `confirm` deriva warehouse del bin origen, valida que destino pertenece al mismo warehouse y ejecuta `check_warehouse_access`. `update-preferred` también valida warehouse asignado y limita relaciones globales visibles.
- **Impacto:** el servidor evita warehouse no asignado y movimiento entre almacenes, pero un usuario asignado a varios almacenes puede ejecutar put-away o actualizar preferred-bin fuera del almacén actualmente seleccionado. Además, no hay enforcement de page/function grant en esos handlers.
- **Resolución:** inyectar contexto compartido, eliminar ID manual/fallback, validar que origen/destino pertenecen al almacén activo y cancelar respuestas al cambiar de almacén. Resolver por separado si `update-preferred` requiere grant `preferred-bins`/función administrativa.

### R0-WH-06 — Receiving no exige el warehouse activo
- **Severidad:** media-alta (consistencia operativa).
- **Evidencia:** `receivingState.svelte.ts` usa `beginScopedRequest` para descartar respuestas tardías, pero `lookup`, `submitReceive` y `cancelReceipts` no llaman `requireWarehouseId` ni comparan `detail.purchaseOrder.warehouseId` con el almacén activo.
- **Contrato Flask:** lookup/receive/cancel filtran PO/receipts con `warehouse_scope_clause` y validan que los bins de recepción pertenezcan al warehouse de la PO. Esto restringe a almacenes asignados, no al almacén activo de la sesión.
- **Impacto:** un usuario con varias asignaciones puede recibir o cancelar recibos de otro almacén asignado mientras el selector muestra uno diferente.
- **Resolución:** verificar warehouse de PO contra el contexto activo antes de recibir/cancelar; invalidar detalle al cambiar de almacén; mantener el scope SQL server-side.

### R0-WH-07 — Dashboard de productividad tiene contrato incompatible con usuarios no ADMIN
- **Severidad:** media (fallo funcional por rol).
- **Evidencia:** Svelte expone Dashboard en la navegación y carga `GetProductivityUseCase`; `api/routes/dashboard.py::productivity` usa `require_role("ADMIN")`. Los otros datos de dashboard tienen contratos diferentes; preferencias son por usuario y usan `require_auth`.
- **Impacto:** un usuario USER que supere el guard de la página recibe 403 al abrir la pestaña de productividad. La ruta y el catálogo de page grants no describen esta restricción por rol.
- **Resolución:** decidir si productividad es solo ADMIN (y ocultar/deshabilitar esa pestaña con mensaje claro) o ampliar el endpoint a usuarios autorizados con warehouse scope. No convertir un 403 en estado vacío.

### R0-AUTH-02 — Picking/Packing/Shipping client scope frente a servidor
- **Severidad:** alta (contrato y aislamiento).
- **Evidencia positiva:** Picking, Packing y Shipping UI consultan `requireWarehouseId`; los estados de Packing/Shipping comparan el warehouse del pedido con el seleccionado y envían warehouse_id en operaciones mutables. Flask Packing/Shipping aplica `warehouse_scope_clause` y filtro contextual cuando llega warehouse_id.
- **Pendiente:** el servidor permite omitir el contexto explícito y se limita al conjunto de almacenes asignados. Determinar si ese comportamiento es válido para clientes scanner antiguos o si cada operación debe exigir el warehouse activo.
- **Autorización:** siguen aplicando R0-AUTH-01; los handlers no implementan una política general de allowed_functions.

---

## 5. Resumen de mutaciones revisadas

| Feature | Mutaciones observadas | Control frontend de warehouse | Control Flask observado | Estado |
|---|---|---|---|---|
| Receiving | receive, cancel receipts | Generación/cancelación de request; no exige warehouse activo ni compara PO | `require_auth` + SQL scope por warehouses asignados + validación de bins/PO | Parcial |
| Cycle Count | create, submit | ID manual; fallback primer asignado o 1; sin contexto compartido | create valida ID por middleware; detalle/submit derivan y comprueban warehouse | Parcial; sin page/function grant |
| Put-away | confirm, update preferred | ID manual; fallback primer asignado o 1; sin contexto compartido | check_warehouse_access; valida bin origen/destino y scope de preferred bins | Parcial; sin page/function grant |
| Inventory | filtros y lecturas | usa active ID si existe, pero inicializa con catálogo admin y permite undefined | page grant inventory; listado no aplica warehouse SQL scope si falta ID | Riesgo crítico |
| Picking | create batch, wave, confirm, short, complete | requireWarehouseId y warehouse_id en los casos revisados | require_auth + validación warehouse en operaciones; active-batch opcional sin SQL scope | Parcial |
| Packing | verify, complete | requireWarehouseId y pedido comparado con almacén | require_auth + warehouse_scope_clause + filtro contextual opcional | Parcial |
| Shipping | fulfill | requireWarehouseId y pedido comparado con almacén | require_auth + warehouse_scope_clause + filtro contextual opcional | Parcial |
| Dashboard | update preferences, mark pickup, update pickup | el tab de datos usa warehouseId; mutaciones de pickup no reciben warehouseId | preferencias por usuario; pickup usa endpoints admin sales-orders | Falta completar matriz de permisos |

---

## 6. Llamadas HTTP: regla de arquitectura

El diseño observado de `ApiClient → RemoteDataSource → Repository → UseCase → UI State → Screen` es correcto como dirección general. La inspección de los archivos muestreados no encontró HTTP directo en las pantallas. Aun así, deben quedar prohibidos en UI:
- `fetch`, `XMLHttpRequest`, Axios u otro cliente HTTP;
- importar RemoteDataSource o Repository desde componentes;
- construir URLs/endpoints dentro de `+page.svelte`, screens o componentes.

La búsqueda completa debe ejecutarse localmente o mediante una búsqueda de código con branch explícita y registrarse con ruta y línea para cada coincidencia.

---

## 7. Orden de resolución recomendado

1. **P0 — Backend inventory isolation:** aplicar SQL scope y filtrar committed orders por el warehouse de la fila.
2. **P0 — Picking active-batch:** exigir warehouse_id o aplicar scope obligatorio.
3. **P1 — Authorization model:** decidir y aplicar allowed_functions/page grants en endpoints operativos. Mantener el fail-closed de Svelte, pero no depender de él como seguridad.
4. **P1 — Warehouse context:** integrar Cycle Count, Put-away, Receiving e Inventory al WarehouseSelectionState; eliminar fallbacks a warehouse 1 y entradas manuales de ID cuando el flujo debe respetar contexto activo.
5. **P1 — Route parity:** corregir hrefs y wrappers; añadir redirects de URLs React que se mantengan.
6. **P1 — Data/Bins grants:** alinear la pestaña y el redirect al grant bins, independiente de zones.
7. **P2 — Dashboard productivity:** acordar política por rol y hacer coincidir UI con Flask.
8. **P2 — Exhaustividad de HTTP:** obtener el árbol completo de `webapp/src` y ejecutar búsqueda global con branch explícita; inspeccionar cada coincidencia.
9. Añadir tests Flask para aislamiento/403/404 y tests Svelte de ruta, grants, cambio de almacén y mutación bloqueada.
10. Ejecutar check/test/build y CI en el HEAD definitivo antes de marcar R0 `VERIFIED`.

**Criterio de cierre:** no cerrar R0 hasta resolver P0/P1, demostrar cobertura de rutas y componentes con inventario completo, y ejecutar las pruebas. Este informe no modifica el estado a `VERIFIED`.
