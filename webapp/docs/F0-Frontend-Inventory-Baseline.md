# F0 — Inventario y baseline inicial del frontend

> Estado: **F0.2 RESOLVED; F0.1 IN_PROGRESS**. El inventario funcional React y el catálogo de destinos candidatos Svelte están documentados. No certifica paridad funcional ni estado local.

## 1. Snapshot

- Repositorio: `danielitoCode/smart-wms`
- Rama: `svelte-webapp`
- HEAD: [`fd5d42be3329e074caf0196c0a4d1cbe7c4c442b`](https://github.com/danielitoCode/smart-wms/commit/fd5d42be3329e074caf0196c0a4d1cbe7c4c442b)
- Último commit: `fix(lab): remove lateral nav — navigate only from overview`
- Fecha: 2026-11-26T19:04:28Z
- Archivos cambiados en ese commit: `webapp/src/routes/lab/+layout.svelte`.
- Estado local (`git status --short`): **no verificable desde GitHub remoto**.
- Combined status devuelto para el SHA: sin estados.
- Workflow runs asociados devueltos por la consulta disponible: cero. La consulta de runs está limitada a ejecuciones PR; no demuestra ausencia de otras ejecuciones.

### Workflows del repositorio
- `.github/workflows/audit.yml`
- `.github/workflows/docs.yml`
- `.github/workflows/gitleaks.yml`
- `.github/workflows/lockfile-check.yml`
- `.github/workflows/refresh-dependency-locks.yml`
- `.github/workflows/test.yml`
- `.github/workflows/webapp-ci.yml`

**F0.1 sigue IN_PROGRESS:** falta confirmar el estado local y revisar exhaustivamente las ejecuciones/checks del SHA. Por tanto, todavía no suma el 0,5%.

## 2. Estructura React

Fuentes principales: `admin/src/App.jsx`, `components/Layout.jsx`, `components/Sidebar.jsx`, `auth.jsx`, `warehouse.jsx`, `api.js`.

### 2.1 Paths declarados en React Router (46)
- `/login`
- `/picking-tickets/print-all`
- `/picking-tickets/:soId/print`
- `/change-password`
- `/`
- `/inventory`
- `/cycle-counts`
- `/count-approvals`
- `/receiving`
- `/purchase-orders`
- `/putaway`
- `/sales-orders`
- `/pos-activity`
- `/fraud`
- `/backorders`
- `/returns`
- `rma`
- `refunds`
- `/rma`
- `/picking-tickets`
- `/picking-batches`
- `/items`
- `/vendors`
- `/data`
- `warehouses`
- `bins`
- `zones`
- `preferred-bins`
- `/warehouses`
- `/bins`
- `/zones`
- `/preferred-bins`
- `/users`
- `/api-tokens`
- `/inbound`
- `/consumer-groups`
- `/webhooks`
- `/channels`
- `/notifications`
- `/audit-log`
- `/settings`
- `/imports`
- `/integrations`
- `/adjustments`
- `/inter-warehouse-transfers`
- `/transfer-orders`

### 2.2 Módulos de páginas React (41)
- `admin/src/pages/Adjustments.jsx`
- `admin/src/pages/AuditLog.jsx`
- `admin/src/pages/Backorders.jsx`
- `admin/src/pages/Bins.jsx`
- `admin/src/pages/ChangePassword.jsx`
- `admin/src/pages/Channels.jsx`
- `admin/src/pages/ConsumerGroups.jsx`
- `admin/src/pages/CycleCountApproval.jsx`
- `admin/src/pages/CycleCounts.jsx`
- `admin/src/pages/Dashboard.jsx`
- `admin/src/pages/Data.jsx`
- `admin/src/pages/Fraud.jsx`
- `admin/src/pages/Imports.jsx`
- `admin/src/pages/InboundActivity.jsx`
- `admin/src/pages/Integrations.jsx`
- `admin/src/pages/InterWarehouseTransfers.jsx`
- `admin/src/pages/Inventory.jsx`
- `admin/src/pages/Items.jsx`
- `admin/src/pages/Login.jsx`
- `admin/src/pages/Notifications.jsx`
- `admin/src/pages/POSActivity.jsx`
- `admin/src/pages/PickingBatches.jsx`
- `admin/src/pages/PickingTicketPrint.jsx`
- `admin/src/pages/PickingTicketPrintAll.jsx`
- `admin/src/pages/PickingTickets.jsx`
- `admin/src/pages/PreferredBins.jsx`
- `admin/src/pages/PurchaseOrders.jsx`
- `admin/src/pages/PutAway.jsx`
- `admin/src/pages/RMA.jsx`
- `admin/src/pages/Receiving.jsx`
- `admin/src/pages/Refunds.jsx`
- `admin/src/pages/Returns.jsx`
- `admin/src/pages/SalesOrders.jsx`
- `admin/src/pages/Settings.jsx`
- `admin/src/pages/Tokens.jsx`
- `admin/src/pages/TransferOrders.jsx`
- `admin/src/pages/Users.jsx`
- `admin/src/pages/Vendors.jsx`
- `admin/src/pages/Warehouses.jsx`
- `admin/src/pages/Webhooks.jsx`
- `admin/src/pages/Zones.jsx`

### 2.3 Componentes compartidos identificados
`Layout`, `Sidebar`, `TopBar`, `ErrorBoundary`, `Modal`, `DataTable`, `PageHeader`, `StatusTag`, `Pipeline`, `SalesOrderModal`, `CreateRmaModal`; hook `useDirtyFormGuard`.

### 2.4 Reglas de routing/contexto observadas
- ProtectedRoute requiere sesión; redirige a `/login`.
- `must_change_password` obliga a usar `/change-password`.
- Las rutas de impresión de picking son standalone fuera del layout, pero protegidas.
- `/returns` contiene `rma` y `refunds`; `/rma` redirige a `/returns/rma`.
- `/data` agrupa warehouses, bins, zones y preferred-bins; paths anteriores redirigen a sus tabs.
- Sidebar filtra por grants; el backend es autoridad para acceso directo.
- POS Activity depende de configuración.
- El almacén activo se persiste en sessionStorage y afecta consultas/badges.

## 3. Estructura SvelteKit

Se detectan 130 archivos `+page.svelte` en `webapp/src/routes`, incluyendo páginas de negocio, autenticación, impresión y laboratorio. El laboratorio visual debe excluirse del catálogo de capacidades de negocio, pero mantenerse identificado para no confundirlo con rutas operativas.

### Divergencias a resolver
| Caso | Observación | Verificación requerida |
|---|---|---|
| `/picking`, `/packing`, `/shipping` | React comenta que las pantallas admin espejo fueron retiradas; Svelte contiene rutas homónimas. | Determinar si son nuevas, restos o reintroducción no aprobada. |
| `/management/*` | Svelte tiene rutas genéricas no declaradas en React Router. | Identificar propósito y consumidores. |
| `/cycle-count` / `/cycle-counts` | Ambas aparecen en Svelte; React declara `/cycle-counts`. | Verificar alias/duplicidad. |
| Returns/RMA/Refunds | React usa nested routes y alias; Svelte tiene rutas dedicadas. | Probar equivalencia y bookmarks. |
| Data | React consolida cuatro recursos en tabs; Svelte también expone rutas directas. | Verificar deep links y contexto. |
| Print | React usa rutas standalone. | Verificar layout, auth, nueva pestaña y print CSS en Svelte. |

## 4. F0.2 — Inventario funcional React (RESOLVED)

**Resultado:** inventario estructural y funcional de referencia cerrado para React en el SHA `6ae077de5a7727745ce4335bdf1d32da7484dec5`. El alcance de F0.2 es descubrir y registrar el universo React; la correspondencia y evaluación de equivalencia con Svelte pertenecen a F0.3 y a las tareas funcionales posteriores. No se confunde inventario con paridad.

### 4.1 Catálogo de pantallas React
Se enumeraron los 41 módulos `admin/src/pages/*.jsx` del árbol del repositorio y los 46 paths declarados en `admin/src/App.jsx`. El listado íntegro de rutas y módulos consta en las secciones 2.1 y 2.2. La cobertura de módulos queda agrupada así:

| Área | Módulos de referencia |
|---|---|
| Acceso y sesión | `Login`, `ChangePassword` |
| Inicio y operaciones de almacén | `Dashboard`, `Inventory`, `CycleCounts`, `CycleCountApproval`, `Receiving`, `PutAway`, `Bins`, `Warehouses`, `Zones`, `Adjustments` |
| Pedidos y preparación | `PurchaseOrders`, `SalesOrders`, `PickingTickets`, `PickingBatches`, `PickingTicketPrint`, `PickingTicketPrintAll`, `Backorders`, `TransferOrders`, `InterWarehouseTransfers` |
| Catálogos y datos maestros | `Items`, `Vendors`, `Data`, `PreferredBins` |
| Devoluciones | `Returns`, `RMA`, `Refunds` |
| Administración y plataforma | `Users`, `Settings`, `Tokens`, `Webhooks`, `Channels`, `ConsumerGroups`, `Integrations`, `Imports`, `InboundActivity`, `AuditLog`, `Notifications`, `POSActivity`, `Fraud` |

### 4.2 Inventario de interacciones que debe preservarse
La lectura del router, páginas y componentes compartidos identifica estas familias de comportamiento, incorporadas al catálogo como aspectos a comparar en F0.3/F2:

- Acciones de lectura y mutación a través del cliente `api` (GET/POST/PUT/PATCH/DELETE), con estados de carga y tratamiento de respuesta/error.
- Campos de entrada y controles select; validación en pantalla y confirmación de operaciones.
- Diálogos compartidos y específicos, incluidos `Modal`, `SalesOrderModal` y `CreateRmaModal`; acciones de aceptar/cancelar y flujos de creación/edición.
- Acciones de tabla/listado, búsqueda, filtros, orden/paginación y selección contextual.
- Navegación con parámetros de URL, identificadores dinámicos, aliases y query params; preservar refresh y enlaces profundos.
- Impresión individual y masiva de picking, incluyendo `so_ids`, `status`, `warehouse_id` y `combine`.
- Contexto de autenticación, `must_change_password`, grants y almacén activo; rutas protegidas y pantallas standalone.
- Componentes compartidos `Layout`, `Sidebar`, `TopBar`, `ErrorBoundary`, `DataTable`, `PageHeader`, `StatusTag`, `Pipeline`, `Modal`, `SalesOrderModal`, `CreateRmaModal` y hook `useDirtyFormGuard`.

### 4.3 Rutas y casos estructurales catalogados
Además de las 46 declaraciones React, se registran las relaciones que afectan a enlaces y navegación: `returns` con subrutas `rma` y `refunds`; alias `/rma`; consolidación de datos maestros bajo `/data` y rutas directas de warehouses/bins/zones/preferred-bins; rutas de impresión fuera del layout común; POS Activity condicionado por configuración; y selección de almacén persistida en `sessionStorage`.

### 4.4 Checklist de cierre F0.2
- [x] Enumerar todos los paths declarados en React Router (46).
- [x] Enumerar todos los módulos de páginas React (41).
- [x] Identificar layout, navegación, componentes compartidos y guarda de formulario sucio.
- [x] Registrar rutas protegidas, redirects, aliases, rutas dinámicas y pantallas standalone.
- [x] Identificar familias de acciones, controles, modales, llamadas API, filtros y parámetros URL que deben preservarse.
- [x] Registrar impresión individual/masiva y dependencias de sesión, grants y almacén.
- [x] Separar el inventario React de la comparación/paridad Svelte, que es F0.3 y F2.

## 5. Límites y estado de tareas
- El inventario es estático y está basado en el árbol/código del repositorio remoto; no se ejecutó la aplicación para observar cada interacción en runtime.
- No se afirma paridad funcional React/Svelte, ni que cada acción esté implementada en Svelte. Eso se resuelve en F0.3 y F2.
- Flask no fue inspeccionado ni modificado en F0.2.
- No se ejecutaron check, build, Vitest ni Playwright como parte de F0.2.

| Tarea | Estado | Evidencia | Crédito |
|---|---|---|---:|
| F0.1 | IN_PROGRESS | Snapshot remoto, workflows y ejecuciones del SHA actual registrados; falta confirmación del checkout local y cierre de CI baseline. | 0 / 0,5% |
| F0.2 | RESOLVED | 46 paths, 41 módulos, componentes comunes, reglas de routing/contexto y familias de interacción catalogadas en este documento. | 1 / 1% |

F0.2 queda cerrado como inventario de referencia. No habilita a declarar migrada ninguna capacidad ni sustituye F0.3.

## 7. Evidencia detallada de GitHub Actions para el SHA auditado

Consulta exhaustiva por `head_sha=fd5d42be3329e074caf0196c0a4d1cbe7c4c442b`:

| Workflow | Estado observado | URL |
|---|---|---|
| gitleaks | success | https://github.com/danielitoCode/smart-wms/actions/runs/45880855555 |
| Tests | in_progress en la consulta; R2 warehouse scope/receiving pasó, suite general aún ejecutándose | https://github.com/danielitoCode/smart-wms/actions/runs/45880855716 |
| Webapp CI | **failure** | https://github.com/danielitoCode/smart-wms/actions/runs/45880855677 |
| Lockfile Version Check | success | https://github.com/danielitoCode/smart-wms/actions/runs/45880855670 |
| Dependency Audit | success | https://github.com/danielitoCode/smart-wms/actions/runs/45880855715 |

### Fallo Webapp CI

Job `Typecheck · Build · Test`:
- Checkout, detección de webapp, Node 26, instalación y SvelteKit sync: success.
- `npm run check`: failure.
- Build y suites Domain/Application/Infrastructure/UI/i18n/Integration/Full regression/Coverage: skipped por el fallo anterior.
- Diagnóstico final: **5 errores y 151 advertencias en 61 archivos**.
- Errores concretos destacados en el log:
  - `webapp/src/routes/lab/dynamic-drop-zone/+page.svelte`: `demoFile` no existe en `DynamicDropZoneProps`; `files` y `f` tienen tipo implícito `any`.
  - `webapp/src/routes/lab/presence-cards/+page.svelte`: `autoplay` no existe en `PresenceCardsProps`.
- También aparecen advertencias de accesibilidad, selectores CSS no utilizados y referencias reactivas inicializadas solo con el valor inicial.

Este resultado es baseline del SHA `fd5d42be3329e074caf0196c0a4d1cbe7c4c442b`, anterior al commit que añadió este informe. No se debe atribuir a F0 ni corregir dentro de F0.1/F0.2; se registrará como hallazgo para la tarea de calidad correspondiente, con seguimiento por archivo y regresión propia.

La consulta del workflow general `Tests` se realizó mientras seguía en curso; no se declara su resultado final.


## 8. F0.2 — Inventario funcional completo (snapshot 6ae077d)

**Estado F0.2: RESOLVED.** El inventario está completo como línea base estática de referencia React y catálogo de correspondencias candidatas en Svelte. Esto NO certifica paridad funcional, comportamiento runtime ni aprobación de cambios/retiradas; esas comprobaciones pertenecen a F0.3, F1, F2 y F4.

### 8.1 Snapshot y alcance contado

- SHA del código inventariado: 6ae077de5a7727745ce4335bdf1d32da7484dec5.
- React: 41 módulos bajo admin/src/pages/; 46 declaraciones de ruta en admin/src/App.jsx.
- SvelteKit: 131 archivos +page.svelte en webapp/src/routes/; la cifra incluye 90 rutas de laboratorio/demos que no son capacidades operativas del WMS. El árbol contiene 41 pantallas de feature bajo webapp/src/core/feature/**/ui/screens/ (incluye pantallas adicionales de detalle y flujos móviles).
- Componentes React compartidos revisados: Layout, Sidebar, TopBar, ErrorBoundary, Modal, DataTable, PageHeader, StatusTag, Pipeline, SalesOrderModal, CreateRmaModal; hook useDirtyFormGuard.
- Fuentes transversales inspeccionadas: App.jsx, Layout.jsx, Sidebar.jsx, auth.jsx, warehouse.jsx, api.js y layout Svelte (app)/+layout.svelte.

### 8.2 Matriz completa React → Svelte (destino candidato)

| Módulo React | Ruta React | Destino/candidato Svelte | Pantalla/estado de inventario |
|---|---|---|---|
| Login | /login | /(auth)/login | LoginScreen |
| ChangePassword | /change-password | /(app)/change-password | ChangePasswordScreen |
| Dashboard | / | / | DashboardScreen |
| Inventory | /inventory | /inventory | InventoryScreen |
| CycleCounts | /cycle-counts | /cycle-count | CycleCountScreen; ruta React y ruta Svelte no coinciden |
| CycleCountApproval | /count-approvals | /management/count-approvals | InventoryAdjustmentsScreen; equivalencia semántica pendiente de F0.3 |
| Receiving | /receiving | /receiving | ReceivingScreen |
| PurchaseOrders | /purchase-orders | /management/purchase-orders | PurchaseOrdersScreen |
| PutAway | /putaway | /putaway | PutawayScreen |
| SalesOrders | /sales-orders | /sales-orders | SalesOrdersScreen (+ detalle Svelte) |
| POSActivity | /pos-activity | /management/pos-activity | PosActivityScreen; visibilidad condicionada por configuración/grant |
| Fraud | /fraud | /management/fraud | FraudReviewScreen |
| Backorders | /backorders | /management/backorders | BackordersScreen + BackorderDetailScreen |
| Returns | /returns | /management/returns | ReturnsScreen; React usa contenedor con rutas hijas |
| RMA | /returns/rma (alias antiguo /rma) | /management/returns | Incluido en el dominio Returns; ruta/pestaña equivalente por confirmar en F0.3 |
| Refunds | /returns/refunds | /management/refunds | RefundsScreen |
| PickingTickets | /picking-tickets | /picking-tickets | PickingTicketsScreen |
| PickingTicketPrint | /picking-tickets/:soId/print | /picking-tickets/[id]/print | PickingTicketPrintScreen; standalone y protegido en React |
| PickingTicketPrintAll | /picking-tickets/print-all | /picking-tickets/print-all | PickingTicketPrintAllScreen; query so_ids, status, warehouse_id, combine |
| PickingBatches | /picking-batches | /picking-batches | PickingBatchesScreen + detalle [id] |
| Items | /items | /items | ItemsScreen |
| Vendors | /vendors | /management/vendors | VendorsScreen |
| Data | /data | /data | Landing que selecciona destino según grants |
| Warehouses | /data/warehouses (alias /warehouses) | /data/warehouses | WarehousesScreen + detalle; /warehouses también existe |
| Bins | /data/bins (alias /bins) | /data/bins | BinsScreen; lee zone_id de query string |
| Zones | /data/zones (alias /zones) | /data/zones | ZonesScreen |
| PreferredBins | /data/preferred-bins (alias /preferred-bins) | /data/preferred-bins | PreferredBinsScreen; existe también candidato /management/preferred-bins |
| Users | /users | /management/users | UsersScreen |
| Tokens | /api-tokens | /management/api-tokens | ApiTokensScreen |
| InboundActivity | /inbound | /management/inbound-activity | InboundActivityScreen |
| ConsumerGroups | /consumer-groups | /management/consumer-groups | ConsumerGroupsScreen |
| Webhooks | /webhooks | /management/webhooks | WebhooksScreen |
| Channels | /channels | /management/channels | ChannelsScreen |
| Notifications | /notifications | /management/notifications | NotificationsScreen |
| AuditLog | /audit-log | /management/audit-log | AuditLogScreen |
| Settings | /settings | /management/settings | SettingsScreen |
| Imports | /imports | /management/imports | ImportsScreen |
| Integrations | /integrations | /management/integrations | IntegrationsScreen |
| Adjustments | /adjustments | /management/adjustments | InventoryAdjustmentsScreen |
| InterWarehouseTransfers | /inter-warehouse-transfers | /management/inter-warehouse-transfers | InterWarehouseTransfersScreen |
| TransferOrders | /transfer-orders | /management/transfer-orders | TransferOrdersScreen |

Los destinos /management/[feature] se resuelven en webapp/src/routes/(app)/management/[feature]/+page.svelte. La tabla identifica el candidato estructural; no declara equivalencia de acciones, validaciones ni resultados.

### 8.3 Hallazgo crítico: rutas Svelte heredadas con contenido placeholder

En el árbol de svelte-webapp, 28 páginas +page.svelte comparten el mismo blob y solo muestran el texto «Redirigiendo a la ruta actual…»; no contienen por sí mismas un goto/redirect. Son:

- adjustments, api-tokens, audit-log, backorders, bins, channels, consumer-groups, count-approvals, cycle-counts, fraud, imports, inbound, integrations, inter-warehouse-transfers, notifications, pos-activity, preferred-bins, purchase-orders, returns, returns/refunds, returns/rma, rma, settings, transfer-orders, users, vendors, webhooks, zones.

Los enlaces del layout Svelte llevan varias de estas capacidades a /management/... y Data usa /data/...; eso no convierte automáticamente los paths heredados en aliases funcionales. F0.3/F1.2 deben decidir y probar cada deep link: redirect real, ruta canónica documentada o retirada aprobada. No se corrige dentro del inventario.

### 8.4 Catálogo de interacciones por pantalla (inspección estática React)

Se inspeccionaron los 41 módulos React completos mediante lectura y recuento estático de formularios, campos, botones, modales, handlers, llamadas API y uso de URL/query state. Estos recuentos orientan el inventario y no equivalen a pruebas de ejecución:

| Módulo | Líneas | Formularios | Campos | Botones | Modales | Handlers | Llamadas API |
|---|---:|---:|---:|---:|---:|---:|---:|
| Adjustments | 367 | 1 | 6 | 1 | 0 | 7 | 4 |
| AuditLog | 674 | 0 | 5 | 6 | 1 | 11 | 3 |
| Backorders | 332 | 0 | 1 | 4 | 1 | 5 | 2 |
| Bins | 314 | 0 | 7 | 9 | 3 | 16 | 7 |
| ChangePassword | 146 | 1 | 3 | 2 | 0 | 5 | 1 |
| Channels | 347 | 0 | 10 | 12 | 4 | 22 | 6 |
| ConsumerGroups | 525 | 0 | 8 | 20 | 7 | 27 | 8 |
| CycleCountApproval | 184 | 0 | 2 | 5 | 0 | 7 | 2 |
| CycleCounts | 179 | 0 | 1 | 5 | 2 | 6 | 3 |
| Dashboard | 1346 | 0 | 14 | 26 | 5 | 42 | 8 |
| Data | 65 | 0 | 0 | 0 | 0 | 0 | 0 |
| Fraud | 193 | 0 | 1 | 1 | 0 | 4 | 3 |
| Imports | 158 | 0 | 1 | 3 | 0 | 3 | 1 |
| InboundActivity | 278 | 0 | 3 | 4 | 1 | 7 | 2 |
| Integrations | 298 | 0 | 1 | 5 | 0 | 6 | 7 |
| InterWarehouseTransfers | 406 | 1 | 6 | 1 | 0 | 7 | 5 |
| Inventory | 191 | 0 | 3 | 0 | 0 | 5 | 3 |
| Items | 290 | 0 | 8 | 9 | 3 | 17 | 6 |
| Login | 117 | 1 | 2 | 1 | 0 | 3 | 0 |
| Notifications | 571 | 0 | 7 | 10 | 3 | 19 | 6 |
| POSActivity | 393 | 0 | 5 | 3 | 0 | 8 | 2 |
| PickingBatches | 259 | 0 | 0 | 5 | 1 | 4 | 2 |
| PickingTicketPrint | 294 | 0 | 0 | 2 | 0 | 2 | 2 |
| PickingTicketPrintAll | 259 | 0 | 0 | 2 | 0 | 2 | 3 |
| PickingTickets | 415 | 0 | 5 | 4 | 0 | 10 | 2 |
| PreferredBins | 204 | 0 | 5 | 6 | 1 | 13 | 6 |
| PurchaseOrders | 713 | 0 | 11 | 7 | 2 | 22 | 9 |
| PutAway | 181 | 0 | 0 | 4 | 1 | 4 | 1 |
| RMA | 556 | 0 | 6 | 6 | 2 | 12 | 8 |
| Receiving | 490 | 0 | 4 | 6 | 2 | 10 | 9 |
| Refunds | 148 | 0 | 2 | 1 | 1 | 3 | 2 |
| Returns | 51 | 0 | 0 | 0 | 0 | 0 | 0 |
| SalesOrders | 151 | 0 | 2 | 1 | 0 | 3 | 2 |
| Settings | 692 | 0 | 31 | 14 | 2 | 44 | 21 |
| Tokens | 678 | 0 | 9 | 14 | 4 | 27 | 7 |
| TransferOrders | 642 | 0 | 8 | 15 | 4 | 23 | 12 |
| Users | 541 | 0 | 7 | 15 | 2 | 22 | 7 |
| Vendors | 289 | 0 | 11 | 7 | 2 | 18 | 4 |
| Warehouses | 151 | 0 | 4 | 7 | 2 | 11 | 4 |
| Webhooks | 1670 | 0 | 19 | 39 | 11 | 68 | 18 |
| Zones | 144 | 0 | 3 | 7 | 2 | 10 | 4 |

Los elementos anteriores permiten ubicar pantallas de alta densidad de interacción (por ejemplo Settings, Tokens, TransferOrders y Webhooks) y priorizar su análisis funcional posterior. Los conteos son sintácticos: un botón puede representar varias acciones y una llamada API no demuestra que el resultado sea correcto.

### 8.5 Inventario transversal de navegación, permisos y contexto

- React ProtectedRoute: espera a que termine la comprobación de sesión, redirige anónimo a /login y fuerza /change-password cuando must_change_password está activo.
- React print: las dos vistas de impresión de picking se renderizan fuera del shell de Layout, pero dentro de ProtectedRoute; el objetivo es no dejar que sidebar/header rompan la impresión.
- React Layout: escucha sentry:permission-denied, presenta modal de permisos y aplica cooldown de 5 segundos tras cerrar.
- React Sidebar: filtra entradas por allowed_pages; POS Activity se muestra solo cuando pos_activity_enabled=true; consulta badges dependientes del almacén activo.
- React Warehouse: el almacén activo se guarda en sessionStorage y se incorpora a consultas/badges.
- React Data: /data agrupa warehouses, bins, zones y preferred bins; paths legacy redirigen a tabs.
- React Returns: /returns contiene rma y refunds; /rma redirige a /returns/rma.
- Svelte app layout: estados de sesión checking/error/authenticated; revalidación de permisos al cambiar pathname; forzado de cambio de contraseña; chequeo de permisos por ruta; contexto de almacén; selección de idioma/tema; menú responsive; salida y reintento de bootstrap.
- Estados que deben quedar cubiertos por la matriz de pruebas: loading/checking, error, empty, forbidden, success, conflict/validation, no-data/no-access, impresión y estado de operación no soportada. La presencia concreta de cada estado por pantalla queda por verificar en F2/F4.

### 8.6 Query strings, deep links y parámetros identificados

- Picking print-all: so_ids, status, warehouse_id, combine.
- Bins: zone_id.
- Varias pantallas React leen/escriben parámetros de URL; se observaron referencias en AuditLog, Backorders, Bins, ChangePassword, Fraud, InboundActivity, Inventory, Items, POSActivity, PickingBatches, PickingTickets, PreferredBins, PurchaseOrders, RMA, Refunds, SalesOrders, TransferOrders y Vendors. La semántica de cada parámetro debe contrastarse con Svelte en F0.3/F2; no se asume equivalencia por el mero uso de URLSearchParams.
- Rutas dinámicas Svelte encontradas: /management/backorders/[id], /picking-batches/[id], /picking-tickets/[id]/print, /warehouses/[id] y /sales-orders/[id].

### 8.7 Clasificación de salida del inventario

| Categoría | Resultado |
|---|---|
| Capacidad/pantalla React identificada | 41/41 módulos |
| Declaraciones de rutas React inventariadas | 46/46 |
| Candidatos de pantalla/route Svelte identificados | 41 módulos y rutas feature correspondientes, más detalles y rutas de flujo |
| Rutas Svelte legacy con placeholder detectadas | 28, listadas arriba |
| Componentes transversales React y políticas globales | Inventariados |
| Formularios, campos, botones, modales, handlers y llamadas API | Recuento estático registrado para 41/41 |
| Parámetros URL/query y rutas dinámicas | Registrados; semántica pendiente de F0.3/F2 |
| Paridad funcional, autorización backend, resultados runtime | No certificada por F0.2; fuera de su DoD |

**Criterio de cierre F0.2 satisfecho:** ninguna página React ni ruta declarada queda fuera del inventario; cada módulo tiene una referencia candidata en Svelte o una divergencia explícita; las interacciones visibles y las dependencias transversales están catalogadas; los riesgos de alias/deep link están identificados para las fases siguientes.

### 8.8 Estado y crédito

| Tarea | Estado | Evidencia | Crédito |
|---|---|---|---:|
| F0.1 | IN_PROGRESS | Auditoría de Actions en SHA 6ae077d identifica 5 runs: 3 success y 2 failure; falta estado del checkout local. | 0 / 0,5% |
| F0.2 | RESOLVED | Matriz 41/41, rutas 46/46, destinos Svelte candidatos, interacciones estáticas, parámetros y reglas transversales; snapshot 6ae077d. | 1 / 1% |

F0.2 no afirma que las 41 capacidades tengan paridad. Las diferencias y stubs se transfieren explícitamente a F0.3/F1/F2, sin ocultarlos ni convertirlos en falsos cierres funcionales.
