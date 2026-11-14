# Plan de acción para completar la migración React → SvelteKit

**Proyecto:** `danielitoCode/smart-wms`  
**Rama:** `svelte-webapp`  
**Ámbito:** frontend SvelteKit en `webapp`, comparado con el frontend React original y el backend Flask.  
**Objetivo:** alcanzar paridad funcional y contractual sin duplicar capacidades retiradas ni inventar endpoints.

> Este documento convierte el plan de alineación en tareas ejecutables. Los endpoints y capacidades deben contrastarse siempre con el código Flask y sus schemas antes de implementarse. Una ruta mencionada como candidata no debe considerarse contrato confirmado sin esa verificación.

---

## 1. Orden de ejecución

| Fase | Alcance | Condición de salida |
|---|---|---|
| 0 | Auth, permisos, contexto de almacén, HTTP, traducciones, CI | Seguridad y contratos transversales estables |
| 1 | Items, Vendors, Warehouses, Zones, Bins, Preferred Bins | Catálogos maestros completos |
| 2 | Inventory, Cycle Counts, Adjustments, Approvals, Purchase Orders, Receiving, Putaway, Inbound Activity | Flujo de compras e inventario probado |
| 3 | Sales Orders, Backorders, Picking Tickets/Batches, Returns, RMA, Refunds, Transfer Orders, transferencias entre almacenes y operaciones de escáner | Flujos de ventas y movimientos probados |
| 4 | Users, Dashboard, Settings, Audit Log, API Tokens, POS Activity | Administración alineada |
| 5 | Integrations, Consumer Groups, Webhooks, Channels, Notifications, Imports | Integraciones alineadas y secretos protegidos |
| 6 | Fraud, Customers y regresión final | Excepciones justificadas y migración cerrada |

No comenzar un feature si sus dependencias directas están inestables. Cada feature se implementa y revisa como entrega vertical independiente.

---

# 2. Fase 0 — Plataforma transversal

## F0.1 Auth / Autenticación

1. **Domain**
   - Definir User, Role, Permission, WarehouseAssignment y Session.
   - Modelar sesión inválida, usuario inactivo, permiso insuficiente y cambio obligatorio de contraseña.
   - Definir reglas de acceso a rutas protegidas.
2. **Application**
   - Implementar `LoginUseCase`, `EnsureAuthenticatedUseCase`, `RefreshSessionUseCase`, `LogoutUseCase`, `ChangePasswordUseCase` y `LoadCurrentUserUseCase`.
3. **Data / Infrastructure**
   - Contrastar login, `/me`, refresh, logout y cambio de contraseña con Flask.
   - Verificar cookies HttpOnly, CSRF, respuestas 401/403 y estructura de usuario, roles, permisos y almacenes.
4. **UI**
   - Completar login, cambio obligatorio de contraseña, expiración y recuperación de sesión.
   - Restaurar la ruta solicitada después de autenticarse.
   - Evitar estados intermedios incorrectos al perder sesión.
5. **Pruebas**
   - Sesión válida e inválida; usuario inactivo; contraseña obligatoria; CSRF inválido.
   - Permiso revocado con sesión/JWT vigente.
   - Cambio de almacén durante una sesión.

**Cierre:** los escenarios originales de React funcionan en Svelte y Flask conserva la autoridad de autenticación.

## F0.2 Authorization / Permisos

1. Crear catálogo único de permisos usando los `page_key` reales de Flask.
2. Comparar rutas React, rutas Svelte y decoradores Flask.
3. Resolver discrepancias como `count-approvals` frente a `adjustments` y `fraud` frente a `sales-orders`.
4. Distinguir permisos de página, lectura, mutación y aprobación.
5. Comprobar permisos en los casos de uso para UX, sin sustituir la autorización del backend.
6. Revisar menús, botones, enlaces directos, modales y acciones.
7. Verificar revocación de permisos sin depender de una renovación manual del JWT.
8. Crear matriz automatizable página → acción → permiso → endpoint.

**Pruebas obligatorias:** ADMIN; USER sin permiso; solo lectura; permiso revocado; acceso directo por URL; petición HTTP directa sin autorización.

**Cierre:** la UI nunca concede acceso que Flask no autoriza.

## F0.3 Warehouse Context / Contexto de almacén

1. Centralizar el almacén activo en un contexto global.
2. Cargar almacenes autorizados desde el usuario autenticado.
3. Validar que el almacén elegido pertenezca a `warehouse_ids`.
4. Descartar IDs persistidos que ya no estén autorizados.
5. Propagar contexto a los casos de uso que lo necesiten.
6. Invalidar consultas y resultados anteriores al cambiar de almacén.
7. Cancelar peticiones pendientes del contexto anterior.
8. Evitar que respuestas tardías sobrescriban datos del almacén actual.
9. No confiar en el ID enviado por la UI.
10. Verificar autorización de registro y alcance SQL en Flask.
11. Evitar filtraciones mediante búsquedas y filtros.
12. Verificar transferencias que involucren dos almacenes.

**Cierre:** ejecutar y ampliar la regresión P-01 a P-16 de `API-Contracts.md`.

## F0.4 Cliente HTTP compartido

1. Unificar construcción de URLs y serialización de parámetros.
2. Mantener cookies y CSRF.
3. Normalizar errores y distinguir 400, 401, 403, 404, 409, 422 y 500.
4. Definir timeout, cancelación y política de reintentos segura.
5. Controlar solicitudes concurrentes y respuestas obsoletas.
6. Registrar diagnóstico sin cookies, tokens ni secretos.
7. Verificar que todas las features usan el cliente compartido.
8. Prohibir llamadas HTTP directas desde pantallas.

## F0.5 Traducciones y CI

1. Italiano como idioma principal; español e inglés completos.
2. Detectar claves faltantes y textos de negocio hardcodeados.
3. Separar suites Domain, Application, Infrastructure, UI e Integration.
4. Ejecutar cada suite independientemente.
5. Medir cobertura por feature, no solo global.
6. Hacer obligatoria la regresión relevante en CI.

**Gate de Fase 0:** CI verde, matriz de permisos probada, contexto de almacén validado y contratos transversales documentados.

---

# 3. Fase 1 — Datos maestros

## F1.1 Items / Productos

**Referencias:** [React Items.jsx](https://github.com/danielitoCode/smart-wms/blob/svelte-webapp/admin/src/pages/Items.jsx) · [Flask admin_items.py](https://github.com/danielitoCode/smart-wms/blob/svelte-webapp/api/routes/admin/admin_items.py)

1. **Domain:** completar Item, SKU, UPC, MPN, categoría, estado, tracking, dimensiones, peso e invariantes de unicidad.
2. **Application:** List, Detail, Create, Update, Archive, Restore (si existe), Delete y Search.
3. **Data:** contrastar GET/POST `/admin/items`, GET/PUT detalle, archive y DELETE con Flask. Conservar `total`, `page`, `per_page`, `pages`. Corregir el mapper del wrapper `{ item, inventory, preferred_bins }`.
4. **UI:** listado paginado; filtros Active/Archived/All; búsqueda por SKU, nombre, UPC, MPN y alias; detalle; alta/edición; archivado/restauración; eliminación con explicación de restricciones.
5. **Pruebas:** duplicados SKU/UPC; valores fuera de límites; producto con stock e historial; wrapper de detalle; paginación; permisos y almacenes.

**Cierre:** paridad CRUD y búsqueda con React, respetando las restricciones reales de Flask.

## F1.2 Vendors / Proveedores

1. **Domain:** entidad Vendor, identificador canónico, estado, contacto y direcciones según Flask.
2. **Application:** List, Detail, Create, Update y Delete/Deactivate según contrato.
3. **Data:** contrastar GET/POST `/admin/vendors` y GET/PUT/DELETE por `canonical_id`. No sustituir el identificador canónico por otro ID.
4. **UI:** listado paginado, búsqueda, filtro Active/Inactive/All, alta, edición, detalle y confirmación de desactivación/eliminación.
5. **Pruebas:** duplicados, proveedor inexistente, estado, paginación, errores y permiso `vendors`.

**Brecha a cerrar:** filtros y paginación de la lógica de datos deben estar disponibles en la pantalla.

## F1.3 Warehouses / Almacenes

1. **Domain:** Warehouse con código, nombre, dirección, estado y relaciones.
2. **Application:** List, Detail, Create, Update y Delete.
3. **Data:** contrastar GET/POST `/admin/warehouses` y GET/PUT/DELETE detalle; verificar campos admitidos.
4. **UI:** listado, detalle, formularios, estado y relaciones con zonas/bins.
5. **Pruebas:** CRUD, relaciones, asignaciones de usuarios, restricciones de eliminación y cambio de almacén activo.

## F1.4 Zones / Zonas

1. **Domain:** Zone, pertenencia obligatoria a Warehouse, código, tipo e invariantes.
2. **Application:** List, Create, Update, Delete y consulta por almacén.
3. **Data:** contrastar GET/POST `/admin/zones` y PUT/DELETE detalle. No inventar endpoint de detalle.
4. **UI:** filtro por almacén, alta/edición, bins asociados y bloqueo de selección entre almacenes.
5. **Pruebas:** almacén inexistente, zona ajena, eliminación con ubicaciones y permiso `zones`.

## F1.5 Bins / Ubicaciones

1. **Domain:** Bin con código, zona, almacén, tipo, estado y capacidad si aplica.
2. **Application:** List, Detail, Create, Update, Delete y Search.
3. **Data:** contrastar CRUD `/admin/bins` y lookups `/lookup/bin/search?q=` y `/lookup/bin/{barcode}`. Separar catálogo administrativo de búsqueda operativa.
4. **UI:** tabla, filtros, búsqueda por código, formularios, ocupación y filtros por zona/almacén.
5. **Pruebas:** código duplicado, zona/almacén ajenos, ubicación con stock y lookup limitado por almacén.

## F1.6 Preferred Bins

1. **Domain:** relación Item-Bin, prioridad y restricciones de almacén.
2. **Application:** List, Add, UpdatePriority y Remove.
3. **Data:** verificar rutas, IDs y DTO reales declarados en `admin_items.py`.
4. **UI:** selector de producto, almacén y bin; búsqueda por código; orden de prioridad; edición y eliminación.
5. **Pruebas:** item inexistente, bin de otro almacén, prioridades repetidas y eliminación de relación.

**Gate de Fase 1:** los módulos consumidores reciben catálogos completos y DTO consistentes.

---

# 4. Fase 2 — Inventario y compras

## F2.1 Inventory / Inventario

1. **Domain:** stock por item/bin/warehouse; disponible, reservado y comprometido según contrato; movimientos e invariantes.
2. **Application:** GetInventory, GetItemInventory, SearchInventory, GetInventoryMovements y exportación solo si existe.
3. **Data:** contrastar endpoints operativos y administrativos; validar filtros y cantidades.
4. **UI:** tabla, filtros, paginación, detalle por item/ubicación e indicadores de stock bajo.
5. **Pruebas:** stock cero/negativo según reglas, reservas, concurrencia, cambio de almacén y aislamiento.

## F2.2 Cycle Counts / Conteos cíclicos

1. **Domain:** CycleCount, estados, cantidades esperadas/contadas y reglas de envío/aprobación.
2. **Application:** List, Create, Detail, Submit y Cancel solo si existe.
3. **Data:** contrastar `GET /admin/cycle-counts`, `POST /inventory/cycle-count/create`, `GET /inventory/cycle-count/{count_id}` y submit.
4. **UI:** listado administrativo, detalle, estado, escáner y diferencias.
5. **Pruebas:** conteo vacío/duplicado/enviado, diferencias y almacén no autorizado.

## F2.3 Adjustments / Ajustes

1. **Domain:** Adjustment, tipo, motivo, estado y diferencia.
2. **Application:** List, Pending, CreateDirect, Review, Approve y Reject.
3. **Data:** contrastar endpoints pending/list, review/direct y `schemas/inventory_adjustments.py`.
4. **Backend:** resolver el almacén del ajuste antes de mutar; aplicar `warehouse_scope_clause`; rechazar IDs de almacenes ajenos.
5. **UI:** bandeja por estado, detalle, motivo, diferencias y aprobación/rechazo confirmados.
6. **Pruebas:** usuario del almacén correcto/ajeno, inexistente, aprobación concurrente/repetida y estado cerrado.

**Cierre:** autorización del registro concreto, no solo del botón.

## F2.4 Count Approvals / Aprobaciones

1. **Domain:** política, tolerancias y transiciones.
2. **Application:** ListPending, Approve, Reject y Detail.
3. **Data:** determinar si usa endpoints de cycle counts o adjustments; no duplicar contratos. Alinear `count-approvals` con la clave real.
4. **UI:** pendientes, detalle, diferencias, historial y motivo de rechazo.
5. **Pruebas:** sin permiso, otro almacén, revisado previamente, aprobación repetida y concurrencia.

## F2.5 Purchase Orders / Órdenes de compra

1. **Domain:** PurchaseOrder, líneas, estados y cantidades pedidas/recibidas/pendientes.
2. **Application:** List, Detail, Create, Update, AddLine, UpdateLine, DeleteLine, Close y Reopen si existen.
3. **Data:** contrastar GET/POST listado, GET/PUT detalle, operaciones de líneas y close/reopen.
4. **UI:** listado paginado, filtros por estado/proveedor/fecha, alta/edición, líneas, recepciones y cierre.
5. **Pruebas:** sin líneas, cantidad inválida, línea recibida, cierre con recepción pendiente, reapertura y concurrencia.

## F2.6 Receiving / Recepción

1. **Domain:** Receipt/ReceiptLine, cantidades, diferencias y reglas de cancelación/reversión.
2. **Application:** FindPOByBarcode, ReceiveItems, CancelReceiving, ListReceipts y UnreceiveReceipt.
3. **Data:** contrastar `/receiving/po/{barcode}`, `/receiving/receive`, `/receiving/cancel`, receipts de PO y unreceive.
4. **UI:** recepción por código, detalle, entrada por línea, diferencias, confirmación e historial.
5. **Pruebas:** parcial/completa, exceso, orden cerrada, cancelación, reversión y consistencia de inventario.

## F2.7 Putaway / Ubicación de mercancía

1. **Domain:** PutawayTask, staging, destino y reglas de ubicación.
2. **Application:** Pending, StagingSummary, SuggestDestination, ConfirmPutaway y UpdatePreferredBin.
3. **Data:** contrastar `/putaway/pending/{warehouse_id}`, `staging-summary`, `suggest/{item_id}`, `confirm` y `update-preferred`.
4. **UI:** pendientes, sugerencias, confirmación por barcode y feedback.
5. **Pruebas:** bin incompatible, cantidad excesiva, tarea completada, almacén distinto y doble confirmación.

## F2.8 Inbound Activity / Actividad entrante

1. **Domain:** evento, origen, estado, errores y referencias.
2. **Application:** List, Detail y Filter.
3. **Data:** contrastar GET `/admin/inbound/activity` y schemas inbound.
4. **UI:** tabla, filtros, payload seguro, errores y enlaces a registros.
5. **Pruebas:** payload incompleto, fallido/procesado, paginación y datos sensibles.

**Gate de Fase 2:** probar Purchase Order → Receiving → Putaway → Inventory y Cycle Count → Adjustment → Approval → Inventory, incluyendo discrepancias y reversión.

---

# 5. Fase 3 — Ventas y movimientos

## F3.1 Sales Orders / Órdenes de venta

**Referencias:** [React SalesOrders.jsx](https://github.com/danielitoCode/smart-wms/blob/svelte-webapp/admin/src/pages/SalesOrders.jsx) · [Flask admin_orders.py](https://github.com/danielitoCode/smart-wms/blob/svelte-webapp/api/routes/admin/admin_orders.py)

1. **Domain:** SalesOrder, líneas, direcciones, asignaciones, fulfillment, devoluciones y transiciones de estado.
2. **Application:** List, Detail, Create, Update, UpdateAddress, UpdateAllocation, Add/Update/DeleteLine, Cancel, Revert, AdminPick, AdminShip, PartialFulfill, RelatedOrders, AvailableBins y ShortPicks.
3. **Data:** contrastar GET/POST `/admin/sales-orders`, detalle, related/source-systems, address/allocation, cancel/revert/admin-pick/admin-ship/partial-fulfill, líneas, available-bins y short-picks.
4. Comparar cada request/response con `schemas/sales_orders.py`.
5. Separar DTO de listado, detalle, creación, edición, líneas y fulfillment.
6. Eliminar campos arbitrarios usados para ocultar incompatibilidades.
7. **UI:** listado/filtros/paginación; detalle; direcciones; líneas; disponibilidad/asignación; picking; envío; fulfillment parcial; pedidos relacionados; cancelación/reversión.
8. **Pruebas:** sin líneas, asignación parcial, stock insuficiente, dirección incompleta, cancelado, fulfillment parcial, concurrencia, almacén no autorizado y respuestas con nulos/ausencias.

**Cierre:** cada operación React tiene caso de uso y prueba de contrato; acciones con efectos distintos no se consideran equivalentes.

## F3.2 Backorders / Pedidos pendientes

1. **Domain:** Backorder, cantidad pendiente, estado y relación con SalesOrder.
2. **Application:** List, Detail y Cancel.
3. **Data:** GET `/admin/backorders` y acción de cancelación de backorder; verificar efectos sobre líneas, reservas y pedido.
4. **UI:** bandeja, filtros, detalle, cancelación confirmada y enlace al pedido original.
5. **Pruebas:** sin disponibilidad, parcialmente resuelto, cancelación repetida, pedido cancelado y scope.

## F3.3 Picking Tickets / Tickets

1. **Domain:** PickingTicket, pedido, líneas, cantidades y estado de impresión.
2. **Application:** GetTicket, List solo si existe, MarkPrinted y GetAllPrintableTickets si el backend lo permite.
3. **Data:** contrastar GET ticket de Sales Order y POST mark-printed.
4. **UI:** listado equivalente a React, ticket individual, impresión individual/masiva y reimpresión.
5. **Pruebas:** inexistente, sin líneas preparables, ya impreso, fallo al marcar, impresión individual/masiva y URL directa.

Referencias: [PickingTickets.jsx](https://github.com/danielitoCode/smart-wms/blob/svelte-webapp/admin/src/pages/PickingTickets.jsx), [PickingTicketPrint.jsx](https://github.com/danielitoCode/smart-wms/blob/svelte-webapp/admin/src/pages/PickingTicketPrint.jsx), [PickingTicketPrintAll.jsx](https://github.com/danielitoCode/smart-wms/blob/svelte-webapp/admin/src/pages/PickingTicketPrintAll.jsx).

## F3.4 Picking Batches / Lotes

1. **Domain:** PickingBatch, pedidos, estado, fecha y tickets.
2. **Application:** List, Detail y Delete solo si está permitido.
3. **Data:** contrastar GET `/admin/pick-batches` y POST delete.
4. **UI:** listado, detalle, pedidos asociados, estado y eliminación confirmada.
5. **Pruebas:** lote vacío/activo/completado, pedidos en proceso, eliminación repetida y permisos.

No confundir batches administrativos con endpoints operativos de escáner.

## F3.5 Returns / Devoluciones

1. **Domain:** Return/ReturnLine, cantidades, estado, recepción y motivo.
2. **Application:** List, Detail, Create y Receive; Update solo si existe.
3. **Data:** contrastar create-RMA, receive-return y schemas de receiving/sales_orders.
4. **UI:** listado, detalle, creación RMA, recepción, estado e historial.
5. **Pruebas:** devolución parcial/completa, exceso, RMA inexistente, recepción duplicada e inventario.

## F3.6 RMA

1. **Domain:** autorización, número, estado, motivo y líneas.
2. **Application:** Create, Get, List, Receive y Cancel solo si existe endpoint.
3. **Data:** confirmar si RMA comparte entidad Return; separar DTO de autorización y recepción.
4. **UI:** bandeja, detalle, estado, artículos autorizados y recepción.
5. **Pruebas:** duplicado, inválido, artículos no autorizados, recepción parcial y transiciones.

## F3.7 Refunds / Reembolsos

1. **Domain:** Refund, importe, pedido/devolución y estado.
2. **Application:** consulta de reembolsos y detalle.
3. **Data:** confirmar lectura administrativa en Flask; no crear mutación Svelte si pertenece al POS.
4. **UI:** listado, detalle, relación con devolución y mensaje si debe ejecutarse en POS.
5. **Pruebas:** importe, parcial, duplicado, RMA asociado e inconsistencias.

Mantener separación entre consulta administrativa y ejecución del reembolso.

## F3.8 Transfer Orders / Transferencias internas

1. **Domain:** TransferOrder, líneas, origen, destino, estados y aprobación.
2. **Application:** List, Detail, Create, Import, StartPicking, SubmitPickerResult, ShortClose, Approve, Reject, Cancel y Delete si existe.
3. **Data:** contrastar GET lista/detalle, cancel/import/start-picking/short-close/approve/reject, DELETE y picker GET/submit; revisar `schemas/bin_transfer.py`.
4. **UI:** listado, filtros, creación, líneas, preparación, diferencias, aprobación/rechazo y cancelación.
5. **Pruebas:** origen=destino, stock insuficiente, preparación parcial, aprobación repetida, cancelación tras picking, acceso a ambos almacenes y concurrencia.

## F3.9 Inter-warehouse Transfers / Movimientos entre almacenes

1. **Domain:** movimiento, origen/destino, líneas, cantidades, estados e invariantes.
2. **Application:** List, Detail si existe, Create e historial.
3. **Data:** contrastar GET `/admin/inter-warehouse-transfers` y POST `/admin/inter-warehouse-transfer`; completar DTO y mappers.
4. **Backend:** validar `from_warehouse_id` y `to_warehouse_id`; aplicar scope SQL; impedir acceso por ID ajeno; usar transacción y evitar dobles movimientos por reintentos.
5. **UI:** listado con filtros origen/destino; creación con almacenes autorizados; validación, estado y detalle.
6. **Pruebas:** acceso a ambos, solo origen, solo destino, ninguno; listado multi-almacén; fallo transaccional, reintento y consistencia.

## F3.10 Picking / Packing / Shipping operativos

React retiró páginas administrativas independientes al trasladar el flujo operativo a escáneres. No reconstruirlas como pendientes de paridad.

1. Mantener los flujos de escáner en Svelte.
2. Contrastar `picking`, `packing` y `shipping` con schemas Flask.
3. Verificar batches, waves, confirmación, short pick y finalización.
4. Verificar packing, validación de productos y finalización.
5. Verificar shipping y fulfillment.
6. Mantener warehouse context.
7. Probar lecturas repetidas, códigos inválidos, pedidos incompletos y concurrencia.

Endpoints operativos a verificar: `/picking/active-batch`, `create-batch`, `wave-validate`, `wave-create`, `confirm`, `short`, `complete-batch`; `/packing/order/{barcode}`, `verify`, `complete`; `/shipping/order/{barcode}` y `fulfill`.

**Gate de Fase 3:** Sales Order → Allocation → Picking → Shipping; Sales Order → Backorder; Sales Order → RMA → Return → Refund; Transfer Order → Picking → Approval → Inventory.

---

# 6. Fase 4 — Administración y supervisión

## F4.1 Users / Usuarios

1. **Domain:** User, Role, estado, almacenes asignados y overrides de permisos.
2. **Application:** List, Get, Create, Update, Delete, GetPermissions y UpdatePermissions.
3. **Data:** contrastar GET/POST `/admin/users`, PUT/DELETE detalle y GET/PUT permissions; revisar `schemas/users.py`.
4. **UI:** listado, búsqueda, alta/edición, almacenes, permisos, estado y cambio obligatorio de contraseña.
5. **Pruebas:** sin almacenes, múltiples almacenes, admin, inactivo, revocación y cambio de asignación en sesión.

## F4.2 Dashboard

React incluye productividad, recepción, salud de marketplace/envíos y recogida local. La falta de vistas equivalentes es brecha real.

1. **Domain:** métricas, eventos, rangos de fecha y preferencias.
2. **Application:** GetProductivity, GetReceivedToday, GetShippingHealth, GetPreferences y UpdatePreferences.
3. **Data:** contrastar `/dashboard/productivity`, `/dashboard/preferences`, `/dashboard/received`, `/dashboard/shipping-health` y `/admin/dashboard` si corresponde.
4. **UI:** productividad por usuario, gráficos/tabla, rangos Today/Yesterday/Last 7d/Last 30d/Custom, reordenamiento, vista gráfica/tabular, recepción, salud de envíos, Local Pickup y CSV si existe.
5. **Pruebas:** zona horaria, sin actividad, permisos, cambio de almacén, preferencias, exportación y datos parciales.

Referencia: [React Dashboard.jsx](https://github.com/danielitoCode/smart-wms/blob/svelte-webapp/admin/src/pages/Dashboard.jsx).

## F4.3 Settings / Configuración

1. **Domain:** Settings, tipos y reglas.
2. **Application:** GetSettings, GetSetting y UpdateSettings.
3. **Data:** contrastar GET listado/detalle y PUT; revisar `schemas/settings.py`.
4. **UI:** categorías, controles por tipo, validación y confirmación de cambios sensibles.
5. **Pruebas:** valor inválido, clave desconocida, actualización parcial, permisos y persistencia.

## F4.4 Audit Log / Auditoría

1. **Domain:** AuditEvent, actor, acción, recurso y fecha.
2. **Application:** List, Filter y Detail solo si existe.
3. **Data:** GET `/admin/audit-log`; validar filtros, paginación y DTO heterogéneos.
4. **UI:** tabla, filtros, detalle, paginación y contexto.
5. **Pruebas:** actor/metadata ausentes, paginación, orden/fechas y datos sensibles.

## F4.5 API Tokens

1. **Domain:** ApiToken, scopes, expiración y revocación.
2. **Application:** List, ScopeCatalog, Create, Rotate, Revoke y Delete.
3. **Data:** contrastar scope catalog/list, create, rotate/revoke y DELETE; revisar `schemas/tokens.py`.
4. **UI:** listado, selector de scopes, secreto visible una sola vez, rotación, revocación y advertencias.
5. **Pruebas:** scopes inválidos, token revocado, rotación, secreto no recuperable y logs sin secretos.

## F4.6 POS Activity

1. **Domain:** venta, transacción, usuario/terminal y resumen.
2. **Application:** ListPOSSales, GetPOSSummary y FilterPOSActivity.
3. **Data:** contrastar GET `/admin/pos/sales-orders` y `/admin/pos/summary`; revisar `schemas/pos.py`.
4. **UI:** listado, filtros, resumen, detalle y relación con Sales Orders.
5. **Pruebas:** venta anulada/incompleta, paginación, fechas y permisos.

---

# 7. Fase 5 — Integraciones

## F5.1 Integrations

1. **Domain:** Connector, Credential, SyncStatus y configuración.
2. **Application:** ListConnectors, GetConfigSchema, GetCredentials, SaveCredentials, TestConnection, GetSyncStatus, ResetSync, ExecuteSync y DeleteCredentials.
3. **Data:** contrastar GET connectors/config-schema/credentials/sync-status; POST credentials/test/sync-reset/sync; DELETE credentials; revisar `schemas/connectors.py`.
4. **UI:** catálogo, formulario dinámico por schema, secretos ocultos, test, estado y sincronización.
5. **Pruebas:** credenciales inválidas, desconexión, concurrencia, timeout, borrado y secretos no visibles.

## F5.2 Consumer Groups

1. **Domain:** ConsumerGroup, ConnectorRegistry, estado y configuración.
2. **Application:** CRUD separado de registry y consumer groups.
3. **Data:** contrastar rutas y `schemas/consumer_groups.py`.
4. **UI:** listados separados, formularios, estado, relación con conectores y eliminación confirmada.
5. **Pruebas:** duplicados, conector inexistente, grupo en uso y estado inválido.

## F5.3 Webhooks

1. **Domain:** Webhook, Secret, Delivery y DLQ.
2. **Application:** CRUD, RotateSecret, GetDLQ, GetStats, GetErrors, ReplayEvent y ReplayBatch.
3. **Data:** contrastar CRUD, DLQ/stats/errors, rotate-secret y replay; revisar `schemas/webhooks.py`.
4. **UI:** listado/detalle, eventos, estado, rotación, estadísticas, errores y replay.
5. **Pruebas:** secreto rotado, duplicados, replay fallido/concurrente, DLQ vacía y permisos.

## F5.4 Channels

1. **Domain:** Channel, configuración, estado y DLQ.
2. **Application:** List, Get, Create, Update, Delete y GetDLQ.
3. **Data:** contrastar GET/POST listado, GET/PATCH/DELETE detalle y DLQ; revisar `schemas/channels.py`.
4. **UI:** listado, detalle, configuración, estado, errores y DLQ.
5. **Pruebas:** inexistente, configuración inválida, eliminación en uso y DLQ.

## F5.5 Notifications

1. **Domain:** NotificationWebhook, URL, secreto y estado.
2. **Application:** List, Create, Update, Delete, RotateURL y Test.
3. **Data:** contrastar CRUD, rotate-url y test-send; revisar `schemas/notification_webhooks.py`.
4. **UI:** configuración, rotación, envío de prueba y resultado.
5. **Pruebas:** URL inválida, fallo de envío, rotación, credenciales y permisos.

## F5.6 Imports

1. **Domain:** ImportJob, Source, Result y errores por fila.
2. **Application:** List, Detail, Create si existe, Validate, Execute y GetErrors.
3. **Data:** localizar endpoints reales; verificar formatos, límites, respuestas y errores. No asumir que un endpoint admite todos los catálogos.
4. **UI:** tipo, archivo, validación, vista previa, ejecución, errores por fila e informe descargable si existe.
5. **Pruebas:** archivo vacío/formato inválido, duplicados, error parcial, tamaño y reintento.

## F5.7 Inbound Activity — cierre de integración

1. Relacionar eventos con source systems.
2. Filtrar por origen, tipo, estado y fecha.
3. Verificar detalle y payload.
4. Mostrar errores y correlación con entidades creadas.
5. Proteger información sensible.
6. Probar duplicados, fallidos y reintentos.
7. No presentar como procesado un evento solamente recibido.

**Gate de Fase 5:** contratos verificables, secretos protegidos y estados de integración inequívocos.

---

# 8. Fase 6 — Complementarios y cierre

## F6.1 Fraud / Control de fraude

1. **Domain:** FraudCase, pedido, estado, memo e historial.
2. **Application:** List, Detail, UpdateMemo y PushOrderToQueue.
3. **Data:** contrastar PATCH memo de Sales Order y POST push-to-queue; revisar `schemas/sales_orders.py`.
4. **Backend:** comprobar almacén del pedido; no confiar únicamente en `sales-orders`; mantener auditoría.
5. **UI:** bandeja, filtros, detalle, memo, retorno a cola e historial.
6. **Pruebas:** pedido de otro almacén, inexistente, memo vacío, acción duplicada, permiso Fraud y cambio concurrente.

## F6.2 Customers / Clientes

**Feature nuevo en Svelte:** conservarlo como ampliación, pero no contabilizarlo como paridad React si no había capacidad equivalente.

1. **Domain:** Customer, identidad, contacto, direcciones y pedidos.
2. **Application:** SearchCustomers, ListCustomers, GetCustomerDetail y GetCustomerOrders.
3. **Data:** documentar la proyección derivada de Sales Orders; eliminar la dependencia de recuperar hasta 1.000 pedidos; usar paginación real disponible. No inventar CRUD.
4. **UI:** listado, búsqueda, detalle, historial y direcciones.
5. **Pruebas:** muchos pedidos, ninguno, paginación, datos incompletos y duplicados.

**Decisión:** si se necesita administración independiente de clientes, confirmar primero que Flask soporta esa capacidad. En caso contrario, mantener proyección de solo lectura.

---

# 9. Reglas transversales por feature

## 9.1 Domain

- Entidades completas e invariantes.
- Value Objects cuando aporten reglas reales.
- Enumeraciones alineadas con Flask.
- Transiciones válidas y errores de dominio específicos.
- Pruebas sin HTTP ni DOM.
- Ninguna dependencia de Data, UI o infraestructura.
- No limitarse a copiar el JSON de Flask como entidad.

## 9.2 Application

- Un caso de uso identificable por operación significativa.
- Validar entradas y coordinar repositorios.
- Aplicar políticas locales sin duplicar autoridad del backend.
- Errores tipados, cancelación y concurrencia.
- No importar DTO HTTP ni componentes Svelte.
- No concentrar lógica de negocio en pantallas.

Ejemplo de estructura:

```text
sales-orders/
  application/
    usecase/
      ListSalesOrdersUseCase.ts
      GetSalesOrderDetailUseCase.ts
      CreateSalesOrderUseCase.ts
      UpdateSalesOrderUseCase.ts
      CancelSalesOrderUseCase.ts
      AdminPickSalesOrderUseCase.ts
      AdminShipSalesOrderUseCase.ts
```

## 9.3 Data / Infrastructure

Cada feature debe incluir DTO request/response, mapper explícito, RemoteDataSource, repositorio concreto, contrato Flask, errores, paginación, filtros, cancelación y pruebas HTTP.

Reglas:
- Interpretar wrappers reales, por ejemplo `{ item, inventory, preferred_bins }`.
- No asumir que toda respuesta es una entidad directa.
- No importar archivos inexistentes ni crear ciclos.
- No usar `any`, casts o tipos genéricos para esconder contratos rotos.
- No reutilizar DTO de operaciones distintas sin demostrar equivalencia.
- No duplicar endpoints en varios clientes.

## 9.4 UI / Presentation

Cada pantalla debe contemplar:
1. Loading inicial y de acciones.
2. Empty state.
3. Error state y autorización.
4. Confirmaciones destructivas.
5. Validación de formularios.
6. Paginación, filtros y ordenamiento.
7. Accesibilidad y responsive.
8. Traducciones.
9. Prevención de doble envío.
10. Feedback de resultado.

Las pantallas coordinan presentación y casos de uso; no contienen contratos HTTP manuales ni reglas de negocio.

---

# 10. Definition of Done — checklist de cierre

Un feature solo se cierra cuando todos los puntos aplicables están acreditados.

- [ ] **React:** inventario completo de operaciones y capacidades originales.
- [ ] **React:** comparación de filtros, formularios, validaciones y estados.
- [ ] **React:** acciones migradas o sustituidas con justificación.
- [ ] **Domain:** entidades, invariantes y reglas verificadas.
- [ ] **Application:** casos de uso completos, tipados y desacoplados.
- [ ] **Infrastructure:** endpoints contrastados con Flask.
- [ ] **Infrastructure:** DTO, mappers y errores verificados.
- [ ] **Security:** permisos de página y acción alineados.
- [ ] **Security:** alcance de almacén probado en lectura y escritura.
- [ ] **Concurrency:** cambio de almacén, cancelación y respuestas obsoletas controlados.
- [ ] **UI:** listado, detalle, formularios y acciones completos.
- [ ] **UI:** loading, empty, error y confirmaciones implementados.
- [ ] **i18n:** italiano, español e inglés completos.
- [ ] **Tests:** Domain y Application aprobados.
- [ ] **Tests:** Infrastructure y contratos HTTP aprobados.
- [ ] **Tests:** UI e integración aprobados.
- [ ] **Regression:** flujos relacionados comprobados.
- [ ] **Documentation:** MigrationPlan y API-Contracts actualizados.
- [ ] **Review:** sin imports rotos, código muerto ni tipos ambiguos.

Si una operación no existe en Flask, documentarla como bloqueada o retirada con justificación; nunca simularla.

---

# 11. Estrategia de pruebas global

| Suite | Verifica | Dependencias |
|---|---|---|
| Domain | Entidades, invariantes y transiciones | Ninguna infraestructura |
| Application | Casos de uso | Repositorios fake/mock |
| Infrastructure | DTO, mappers, HTTP y errores | Cliente HTTP simulado |
| UI | Interacciones y estados | Casos de uso simulados |
| Integration | Flujos entre módulos y Flask | Backend de pruebas |

## Regresiones de negocio obligatorias

- Purchase Order → Receiving → Putaway → Inventory.
- Cycle Count → Adjustment → Approval → Inventory.
- Sales Order → Allocation → Picking → Shipping.
- Sales Order → Backorder → Resolución.
- Sales Order → RMA → Return → Refund.
- Transfer Order → Picking → Approval → Inventory.
- Inter-warehouse Transfer → stock de origen y destino.
- User → Permissions → Warehouse Context → Operaciones.
- Webhook → Inbound Activity → Procesamiento.
- POS Activity → Sales Order → Fraud.

Una feature que funciona aislada puede fallar al integrarse con otra; estas pruebas son parte del cierre.

---

# 12. Medición comparable del progreso

Mantener la misma metodología entre auditorías. El porcentaje se calcula por capacidades funcionales, no por archivos, líneas de código ni componentes.

Para cada capacidad aplicable se evalúan cinco dimensiones:

| Dimensión | Peso |
|---|---:|
| Consulta y detalle | 20% |
| Creación | 20% |
| Edición | 20% |
| Acciones y ciclo de vida | 20% |
| Filtros y contexto operativo | 20% |

Puntuación de cada dimensión:
- `0`: inexistente.
- `0,5`: parcial.
- `1`: completa y verificada.

Se promedian las capacidades aplicables y se ponderan los features por importancia funcional. Un módulo pequeño no debe pesar igual que Sales Orders solo por tener una pantalla.

Arquitectura, contratos, permisos y pruebas son criterios adicionales de aceptación: una funcionalidad visualmente completa con contrato roto o vulnerabilidad no se considera cerrada.

## Hitos orientativos

| Objetivo | Hito |
|---:|---|
| 58% | Punto de partida indicado por la auditoría anterior; confirmar contra su matriz |
| 70% | Datos maestros y seguridad cerrados |
| 82% | Inventario, compras y ventas alineados |
| 93% | Administración e integraciones alineadas |
| 100% | Paridad, pruebas y documentación verificadas |

Estos porcentajes son objetivos de planificación, no mediciones actuales.

---

# 13. Ejecución en GitHub

Para cada feature:
1. Inspeccionar React completo.
2. Inspeccionar handlers Flask y schemas.
3. Inspeccionar implementación Svelte actual.
4. Documentar diferencias.
5. Establecer contratos y DTO.
6. Implementar Domain.
7. Implementar Application.
8. Implementar Data/Infrastructure.
9. Implementar UI.
10. Añadir pruebas por capa.
11. Ejecutar regresión.
12. Revisar cambios, imports y tipos.
13. Actualizar documentación.
14. Registrar commit y evidencias.

## Convención de commits

```text
fix(auth): align page grants with Flask permissions
fix(transfers): enforce source and destination warehouse scope
feat(items): complete React CRUD parity
feat(vendors): add filtering and pagination
feat(dashboard): restore productivity and warehouse metrics
test(sales-orders): cover lifecycle and concurrency
test(inventory): add warehouse isolation regression
docs(migration): record verified feature completion
```

Mantener commits pequeños y descriptivos. No mezclar diez features en un único commit. Corregir Flask cuando el problema sea de autorización o contrato backend; no intentar resolver una vulnerabilidad solo ocultando controles en el frontend.

---

# 14. Prioridad de inicio recomendada

## Bloque A — Seguridad y almacenes (P0)

- Transferencias entre almacenes.
- Ajustes y aprobaciones.
- Fraud.
- Claves de autorización.
- Regresión P-01 a P-16.

**Resultado:** frontera de seguridad fiable.

## Bloque B — Catálogos maestros (P1)

- Items.
- Vendors.
- Warehouses.
- Zones.
- Bins.
- Preferred Bins.

**Resultado:** datos maestros completos y estables.

## Bloque C — Operaciones de almacén (P1)

- Inventory.
- Cycle Counts.
- Adjustments.
- Purchase Orders.
- Receiving.
- Putaway.

**Resultado:** flujos de inventario y compras alineados.

No abrir nuevas funcionalidades hasta estabilizar las dependencias directas. Esto evita acumular pantallas Svelte que parecen completas pero dependen de contratos, tipos o permisos incorrectos.

---

# 15. Documentación que debe mantenerse en el repositorio

| Documento | Responsabilidad |
|---|---|
| `webapp/.frondend-migration/MigrationPlan.md` | Fases y progreso por feature |
| `webapp/docs/API-Contracts.md` | Endpoints, DTO, errores y permisos |
| `webapp/docs/Feature-Parity-Matrix.md` | React vs Svelte, operación por operación |
| `webapp/docs/Regression-Matrix.md` | Pruebas de permisos, almacenes y flujos |

Cada feature debe registrar:
- Operaciones originales de React.
- Operaciones implementadas en Svelte.
- Endpoints Flask.
- DTO y mappers.
- Diferencias encontradas.
- Pruebas ejecutadas y resultados.
- Commits relacionados.
- Pendientes y excepciones justificadas.

## Resultado final esperado

Cualquier desarrollador debe poder identificar qué existía en React, qué ofrece Flask, qué debe implementar SvelteKit y qué pruebas necesita superar para cerrar un feature.

**Regla final:** no declarar una feature completa por apariencia visual o por compilar. Debe existir evidencia de paridad funcional, contrato correcto, autorización, aislamiento por almacén, pruebas y documentación.
