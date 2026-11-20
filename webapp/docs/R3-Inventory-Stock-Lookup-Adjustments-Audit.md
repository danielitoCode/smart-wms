# R3 — Auditoría de stock, lookup, ajustes y movimientos

**Estado:** `IN_PROGRESS` — lookup de item y contenido de bin integrados en la pantalla de inventario; cobertura añadida, validación CI del HEAD final pendiente.  
**Rama auditada:** `svelte-webapp`  
**HEAD de implementación:** `a001e4f0f260831212d8473766771385bef6b08d`  
**Alcance:** exclusivamente `webapp/`. Flask se inspecciona como fuente de contratos; no se modifica ni se exige que sus suites pasen.

## 1. Resumen ejecutivo

R3 tiene una base parcial en SvelteKit: listado de inventario, consulta por `item_id`, paginación/filtros, ciclo de conteo y un módulo de ajustes con historial, aprobación y ajuste directo. También existen endpoints Flask de lookup de item/bin y detalle de bin.

La pantalla de inventario ya integra lookup exacto de item por SKU/UPC/alias y consulta de contenido de bin por barcode/código. Ambos flujos exigen almacén activo autorizado, comprueban el contexto antes y después de cada respuesta y descartan resultados obsoletos al cambiar de almacén o iniciar otra consulta. El lookup de item usa su `item_id` para consultar el stock filtrado por el almacén seleccionado; el lookup de bin valida el `warehouse_id` devuelto por Flask antes de mostrar contenido. Sigue pendiente la validación CI del HEAD final. R3 no está completo: no hay preview de ajuste server-side ni ledger completo, y el ajuste directo permanece deshabilitado.

## 2. Contratos Flask observados

### 2.1 Consulta de inventario

**Ruta:** `GET /api/admin/inventory`  
**Archivo:** `api/routes/admin/admin_items.py::list_inventory`  
**Permiso:** `inventory` (decorador `require_admin_or_page_permission`).  
**Query params:** `page`, `per_page` (máximo 1000), `warehouse_id`, `item_id`, `bin_id`, `q`.  
**Búsqueda `q`:** SKU, nombre, UPC, MPN y código de bin.  
**Respuesta:** `inventory[]`, `total`, `page`, `per_page`, `pages`. Cada fila incluye `inventory_id`, `item_id`, `sku`, `item_name`, `bin_id`, `bin_code`, `zone_name`, `quantity_on_hand`, `quantity_allocated`, `quantity_available`, `committed_to_orders`, `lot_number`, `last_counted_at`.

**Semántica observada:**
- `quantity_available` es calculado por Flask como `quantity_on_hand - quantity_allocated`.
- `committed_to_orders` se devuelve como campo separado; el frontend no debe volver a restarlo ni inferir otra definición.
- La respuesta no incluye explícitamente `warehouse_id` en cada fila.
- No hay campos separados de staging, bloqueado/dañado o en tránsito en este DTO.
- El handler aplica filtros de consulta, pero no invoca explícitamente `check_warehouse_access` ni agrega `warehouse_scope_clause`. El filtro `warehouse_id` no constituye por sí solo enforcement de autorización.

**Clasificación:** contrato existente para lectura; `BACKEND_LIMITATION` en enforcement explícito de warehouse scope y en estados de stock no expuestos. Requiere `FRONTEND_GUARD_REQUIRED` para exigir almacén seleccionado/autorizado, descartar respuestas obsoletas y no presentar el filtro como frontera de seguridad.

### 2.2 Lookup de item por código

**Ruta:** `GET /api/lookup/item/<barcode>`  
**Archivo:** `api/routes/lookup.py::lookup_item`  
**Permiso:** sesión autenticada; no tiene grant de página explícito.  
**Búsqueda exacta:** SKU, UPC o elemento exacto de `barcode_aliases`.  
**Respuesta:** `item` con `item_id`, SKU, nombre, UPC y atributos básicos; `locations[]` con bin, tipo, zona, cantidades en mano/asignadas/disponibles y lote.

Para usuarios no ADMIN, Flask filtra las ubicaciones a `warehouse_ids` asignados. No recibe el almacén activo como filtro y las filas `locations[]` no devuelven `warehouse_id`; el frontend no puede demostrar a partir de esta respuesta qué ubicación corresponde al almacén actualmente seleccionado. El metadata del item es global.

**Ruta adicional:** `GET /api/lookup/item/search?q=` busca SKU/nombre/UPC (no aliases) y limita a 50; para usuarios no ADMIN limita los items a aquellos con inventario o preferred bin en almacenes asignados.

**Clasificación:** `SUPPORTED` para lookup exacto de código con ubicaciones autorizadas por usuario; `FRONTEND_GUARD_REQUIRED` para no atribuir ubicaciones a un almacén activo cuando el DTO no trae ese identificador. Lookup de nombre parcial debe respetar el límite/contrato real.

### 2.3 Lookup de bin y contenido

**Ruta:** `GET /api/lookup/bin/<barcode>`  
**Archivo:** `api/routes/lookup.py::lookup_bin`  
Busca por `bin_barcode` o `bin_code`, aplica `warehouse_scope_clause` en SQL y devuelve `bin` más `items[]` con SKU, nombre, UPC, cantidades en mano/asignadas/disponibles y lote. Un bin fuera del scope responde 404.

**Ruta alternativa:** `GET /api/admin/bins/{bin_id}`, grant `bins`; filtra el bin con `warehouse_scope_clause` y devuelve `bin` + `inventory[]`. El detalle por ID no debe usarse sin resolver y validar antes el contexto de almacén.

**Clasificación:** `SUPPORTED` para lookup barcode/código de bin y contenido dentro del scope de usuario. La UI de inventario aún no integra este flujo.

### 2.4 Ajustes y aprobación

**Rutas:**  
- `GET /api/admin/adjustments/list` — historial paginado, filtro opcional por `warehouse_id`, `adjustment_id`, estado `PENDING|APPROVED|REJECTED`; aplica `warehouse_scope_clause` tanto a la fila de ajuste como al bin.
- `GET /api/admin/adjustments/pending` — pendientes paginados y scope por almacén.
- `POST /api/admin/adjustments/direct` — ajuste directo que se aplica inmediatamente y queda `APPROVED`.
- `POST /api/admin/adjustments/review` — aprobación/rechazo de ajustes pendientes.

**Schema de ajuste directo (`DirectAdjustmentRequest`):**
- `item_id`, `bin_id`, `warehouse_id`: enteros positivos.
- `adjustment_type`: `ADD|REMOVE`.
- `quantity`: entero, mínimo 1 y máximo 1,000,000.
- `reason`: obligatorio, trim y máximo 500 caracteres.

El endpoint directo valida item/bin, verifica que el bin pertenece al almacén, exige el scope del bin, y aplica el delta en la misma transacción. `REMOVE` solo consume cantidad no asignada; si no alcanza responde 409. La operación usa advisory transaction lock por item/bin y bloqueos de fila, escribe `inventory_adjustments`, audit log y evento outbox, y responde 201 con el ajuste aplicado. No hay endpoint de preview ni un token/version de precondición entre preview y commit.

El endpoint de review bloquea cada ajuste con `FOR UPDATE`, rechaza decisiones repetidas/cerradas con 409, comprueba scope y separación de funciones para conteos cuando la configuración lo exige; la aprobación aplica stock y la decisión se audita en la transacción.

**Clasificación:** `SUPPORTED` para ajuste directo con los límites indicados y para revisión de ajustes pendientes. `BACKEND_LIMITATION` para ausencia de preview autoritativo. La UI actual expone el ajuste directo sin preview y sin confirmación explícita; es `FRONTEND_DEFECT` frente al DoD R3 y debe bloquearse hasta que el flujo seguro esté disponible. No debe reemplazarse por un cálculo local presentado como saldo oficial.

### 2.5 Auditoría y movimientos

**Ruta:** `GET /api/admin/audit-log`, grant `audit-log`, filtros `action_type`, `user_id`, fechas, `item_id` y paginación. Devuelve `entries[]`, actor, entidad, `warehouse_id`, detalles y fecha. La consulta inspeccionada no aplica `warehouse_scope_clause` ni exige/valida un almacén; no es seguro consumirla como feed de inventario para un usuario con scope limitado sin corregir el contrato Flask.

**Movimientos:** no se localizó en las rutas Flask inspeccionadas un endpoint de consulta de ledger/movimientos de inventario ni una ruta `inventory-movements`. El historial de ajustes no equivale al ledger completo: no contiene necesariamente recepciones, put-away, picks, transferencias y otros movimientos. Las rutas de transferencias entre almacenes muestran solo ese subconjunto y no sustituyen un ledger.

**Clasificación:** `BACKEND_LIMITATION` / contrato futuro requerido para `GetInventoryMovements`. `UNVERIFIED_CONTRACT` hasta que Flask exponga y documente un feed completo, filtrado por warehouse scope y con orden/cursor estable. No reconstruir movimientos a partir del audit log actual ni de diferencias entre snapshots.

## 3. Estado SvelteKit localizado

| Capacidad | Implementación localizada | Evaluación inicial |
|---|---|---|
| Listado/consulta stock | `core/feature/inventory`: entidad, DTO, mapper, datasource, repository, SearchInventory/GetItemInventory/GetInventoryOverview y pantalla | Parcial: búsqueda de texto e item barcode integrados; stock consultado con `item_id` y warehouse activo |
| Warehouse context | `inventoryState.svelte.ts` toma `warehouseSelection`, carga bins y cancela resultados obsoletos por generación | Parcial: debe revisarse el listado admin de almacenes y el scope real del endpoint |
| Bin barcode | `core/feature/warehouses`: BinLookupRemoteDataSource, repository y LookupBinByBarcodeUseCase | Integrado en pantalla; valida warehouse_id y muestra líneas/stock devueltos por Flask |
| Ajustes | `core/feature/inventory-adjustments`: entidad, policy, use cases, DTO, datasource, repository, estado y pantalla | Parcial: historial/review disponibles; CTA de ajuste directo deshabilitada por ausencia de preview server-side |
| Movimientos | No se localizó caso de uso/endpoint de feed completo | No soportado por el contrato observado |
| Auditoría | endpoint de audit log existe, pero no aplica warehouse scope en el handler inspeccionado | No consumir como historial scoped de R3 hasta resolver contrato seguro |

La pantalla `InventoryScreen.svelte` presenta en mano/disponible/lote/estado y paginación. No debe inferir staging ni tránsito. La pantalla `InventoryAdjustmentsScreen.svelte` usa IDs numéricos para item/bin y permite abrir el formulario de ajuste directo; no muestra preview autoritativo y su creación invoca directamente `CreateDirectAdjustmentUseCase`.

## 4. Brechas y clasificación

| Hallazgo | Clasificación | Acción |
|---|---|---|
| Listado de inventario sin enforcement explícito de warehouse scope en handler | BACKEND_LIMITATION + FRONTEND_GUARD_REQUIRED | Contexto obligatorio y pruebas de aislamiento UI; no afirmar seguridad server-side |
| Filas de inventario no devuelven warehouse_id | BACKEND_LIMITATION | No atribuir fila a almacén si no se puede demostrar por respuesta |
| Lookup item exacto no acepta warehouse activo ni devuelve warehouse_id en locations | FRONTEND_GUARD_REQUIRED / BACKEND_LIMITATION | No mezclar ubicaciones; documentar contrato futuro con warehouse_id |
| Inventory list no busca barcode_aliases | BACKEND_LIMITATION | Usar lookup exacto existente para código; no inventar alias query en endpoint inventory |
| No hay preview de ajuste | BACKEND_LIMITATION | Deshabilitar ajuste directo UI; contrato futuro para preview con stock/version y límites |
| Ajuste directo es inmediato; la UI no confirma impacto | FRONTEND_DEFECT | Bloquear CTA/formulario hasta preview real y confirmación explícita |
| No hay ledger completo / GetInventoryMovements | BACKEND_LIMITATION / UNVERIFIED_CONTRACT | Documentar endpoint futuro; no reconstruir desde audit log |
| Audit log no aplica warehouse scope | BACKEND_LIMITATION | No integrarlo como feed de R3 para usuarios scoped |
| Estados staging/en tránsito no están separados en DTO de inventario | BACKEND_LIMITATION | Mostrar solo estados/cantidades entregados por Flask |
| Integración UI de item/bin barcode y contenido de bin | FRONTEND_DEFECT | Implementada en `InventoryScreen.svelte`; pruebas de warehouse scope, errores y respuestas obsoletas añadidas |

## 5.1 Implementación completada en la iteración de lookup

- **LookupBarcode:** `LookupBarcodeUseCase` → `InventoryRepository` → `InventoryRemoteDataSource` → `GET /api/lookup/item/<barcode>`. El mapper expone solo identidad del item al dominio; las ubicaciones globales de la respuesta de lookup no se atribuyen directamente al almacén activo.
- **GetBinContents:** `LookupBinByBarcodeUseCase` existente → `BinLookupRepository` → `GET /api/lookup/bin/<barcode>`. La respuesta incluye `bin.warehouse_id` y `items[]`; se compara el almacén devuelto con el almacén seleccionado antes de presentar los contenidos.
- **Contexto:** los dos flujos llaman `warehouseSelection.requireWarehouseId()`, exigen coincidencia con el contexto local, y consultan stock del item con `warehouse_id` y del bin con `warehouse_id` + `bin_id`.
- **Respuestas obsoletas:** usan `beginWarehouseScopedRequest`, generación de almacén y `requestVersion`; al cambiar de almacén o comenzar una consulta posterior, la respuesta anterior no puede sobrescribir el estado visible.
- **Errores:** los 400/403/404/409 se normalizan mediante `toUserMessage`; se bloquea la búsqueda sin almacén autorizado y se rechaza un bin cuyo `warehouse_id` no coincide.
- **UI:** dos controles de escaneo/búsqueda en `InventoryScreen.svelte`; muestra identidad del producto y stock filtrado por almacén, o contenido de bin con SKU, cantidades reales y lote. No sintetiza staging ni tránsito.

**Pruebas añadidas:**
- `feature/inventory/data/ItemBarcodeLookup.test.ts`: ruta exacta, encoding y mapping.
- `feature/inventory/domain/usecase/LookupBarcodeUseCase.test.ts`: normalización y validación de códigos.
- `feature/inventory/ui/inventoryState.test.ts`: almacén enviado al caso de uso, bin fuera del almacén rechazado, error de lookup, descarte de respuestas tardías y limpieza de resultados al cambiar de almacén.
- Se reutilizan las pruebas existentes de `BinLookupRemoteDataSource`, `BinLookupRepositoryImpl`, `BinLookupUseCases` y `WarehouseRequestScope`.
## 5. Plan de implementación R3

1. **Domain:** consolidar SearchInventory, GetItemStock, GetBinContents y LookupBarcode con modelos que distingan campos presentes/ausentes; no representar cantidades no expuestas como cero. Definir resultado de movimientos como no soportado hasta contrato verificable.
2. **Application:** validar warehouse context, permisos `inventory`/ `bins`/ `adjustments`, cancelar/inutilizar respuestas de contexto anterior y normalizar 400/403/404/409.
3. **Data:** contrastar DTO/mappers con las rutas anteriores; implementar item lookup exacto, bin lookup y contenido con los endpoints existentes. No asumir warehouse_id donde Flask no lo devuelve.
4. **UI:** búsqueda por SKU/nombre y barcode exacto de item; detalle de item con filas por bin/lote; escaneo/lookup de bin y su contenido; estados de stock solo con datos reales; motivo/ajuste directo deshabilitado mientras no exista preview; mostrar el gap de ledger/auditoría scoped.
5. **Consistencia:** tras una mutación confirmada por Flask, invalidar y volver a consultar inventario, detalle, bin y ajustes; no hacer optimistic stock update. Tratar 409 como conflicto y recargar. En consultas de lookup, descartar cualquier respuesta de generación anterior.
6. **Pruebas:** Domain/Application/Data/Integration/UI para query, barcode exacto y alias, scope/cambio de almacén, múltiples lotes por bin, estados ausentes, paginación, permisos, errores 400/403/404/409, motivo y límites, doble envío/review concurrente y controles deshabilitados cuando preview/ledger no existen.
7. **Verificación:** ejecutar exclusivamente `webapp` (check, build, suites por capas, integración, regresión y coverage) sobre el HEAD definitivo. Las suites Python quedan fuera del DoD de frontend. En esta iteración la ejecución CI correspondiente al HEAD de implementación sigue pendiente de resultado.

## 6. Criterio de cierre R3

R3 no se declara `VERIFIED` hasta demostrar:
- búsqueda por SKU/nombre y lookup por barcode con DTO real;
- stock por item/bin/lote y cantidades coherentes con Flask;
- contexto/permiso de almacén y limpieza de respuestas al cambiar de almacén;
- contenido de bin desde escaneo;
- ningún ajuste directo ejecutable sin preview autoritativo, motivo, validación y confirmación;
- cambios reflejados únicamente después de respuesta satisfactoria del servidor;
- ledger/movimientos mostrados solo si existe contrato scoped completo; de lo contrario, acción claramente no disponible;
- pruebas frontend completas y CI Webapp verde en el HEAD final.

**No se modificó Flask.** Las limitaciones anteriores permanecen como dependencias del servidor y no deben ocultarse ni simularse desde SvelteKit.
