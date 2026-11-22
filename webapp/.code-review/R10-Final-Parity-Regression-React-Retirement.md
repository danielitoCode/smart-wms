# R10 — Matriz de paridad final React → SvelteKit

**Rama:** `svelte-webapp`  
**Ámbito:** `webapp/`; React `admin/` se conserva como referencia hasta aprobación explícita.  
**Baseline de auditoría:** `e01b3250faa218fd04a2c48dc019d4e08c17b744`  
**Estado:** `IN_PROGRESS — ROUTE INVENTORY STARTED`  
**Regla:** una ruta existente o un test unitario no prueban por sí solos paridad de recorrido. Cada fila debe enlazar comportamiento, casos de uso, endpoint Flask, permiso/scope y evidencia de prueba.

## 1. Criterios de estado

- `ROUTE_MAPPED`: existe una ruta/pantalla Svelte identificada; aún no certifica paridad.
- `CONSOLIDATED`: función React absorbida por una pantalla/tab o flujo Svelte distinto; requiere verificar que conserva acciones y transiciones.
- `RETIRED_BY_PRODUCT_DECISION`: React documenta retirada intencional; debe conservarse la justificación y probar que no se expone una acción duplicada.
- `COMPATIBILITY_GAP`: URL/bookmark React sin equivalente/redirect Svelte demostrado.
- `PENDING_E2E`: falta ejecutar el recorrido real con usuario, grants y almacén representativos.
- `VERIFIED_PARITY`: solo tras completar todos los campos de la matriz y aportar evidencia reproducible de resultados/transiciones.

## 2. Inventario de rutas React

Inventario extraído de `admin/src/App.jsx` en el baseline. El path Svelte indicado es la ruta canónica observada en `webapp/src/routes` o en el layout de navegación. Los endpoints y grants deben completarse desde `docs/API-Contracts.md` y el contrato Flask por operación; no se deducen de los nombres de pantalla.

| Pantalla React | URL React | Ruta/pantalla Svelte observada | Estado inicial R10 |
|---|---|---|---|
| Login | `/login` | `/login` | ROUTE_MAPPED |
| ChangePassword | `/change-password` | `/change-password` | ROUTE_MAPPED |
| Dashboard | `/` | `/dashboard` (landing `/` resuelve sesión) | CONSOLIDATED |
| Inventory | `/inventory` | `/inventory` | ROUTE_MAPPED |
| CycleCounts | `/cycle-counts` | `/cycle-count` | CONSOLIDATED |
| CycleCountApproval | `/count-approvals` | `/management/count-approvals` | CONSOLIDATED |
| Receiving | `/receiving` | `/receiving` | ROUTE_MAPPED |
| PurchaseOrders | `/purchase-orders` | `/management/purchase-orders` | CONSOLIDATED |
| PutAway | `/putaway` | `/putaway` | ROUTE_MAPPED |
| SalesOrders | `/sales-orders` | `/sales-orders` y `/management/sales-orders` | ROUTE_MAPPED |
| POSActivity | `/pos-activity` | `/management/pos-activity` | CONSOLIDATED |
| Fraud | `/fraud` | `/management/fraud` | CONSOLIDATED |
| Backorders | `/backorders` | `/management/backorders` + `/management/backorders/:id` | CONSOLIDATED |
| Returns | `/returns` | `/management/returns` | CONSOLIDATED |
| RMA | `/returns/rma` (también redirect legacy `/rma`) | función incluida en `ReturnsScreen`; no se encontró ruta hija equivalente | COMPATIBILITY_GAP |
| Refunds | `/returns/refunds` | `/management/refunds` | CONSOLIDATED |
| PickingTickets | `/picking-tickets` | `/picking-tickets` | ROUTE_MAPPED |
| PickingTicketPrint | `/picking-tickets/:soId/print` | `/picking-tickets/:id/print` | ROUTE_MAPPED |
| PickingTicketPrintAll | `/picking-tickets/print-all` | `/picking-tickets/print-all` | ROUTE_MAPPED |
| PickingBatches | `/picking-batches` | `/picking-batches` + `/picking-batches/:id` | ROUTE_MAPPED |
| Picking / Packing / Shipping admin mirrors | retiradas en React (comentario explícito en `App.jsx`) | `/picking`, `/packing`, `/shipping` son flujos operativos Svelte | RETIRED_BY_PRODUCT_DECISION |
| Items | `/items` | `/items` | ROUTE_MAPPED |
| Vendors | `/vendors` | `/management/vendors` | CONSOLIDATED |
| Data | `/data` | `/data` | ROUTE_MAPPED |
| Warehouses | `/data/warehouses`; alias React `/warehouses` | `/data/warehouses` y `/warehouses` | ROUTE_MAPPED |
| Bins | `/data/bins`; alias React `/bins` | `/data/bins` | ROUTE_MAPPED |
| Zones | `/data/zones`; alias React `/zones` | `/data/zones` | ROUTE_MAPPED |
| PreferredBins | `/data/preferred-bins`; alias React `/preferred-bins` | `/data/preferred-bins` y `/management/preferred-bins` | ROUTE_MAPPED |
| Users | `/users` | `/management/users` | CONSOLIDATED |
| Tokens | `/api-tokens` | `/management/api-tokens` | CONSOLIDATED |
| InboundActivity | `/inbound` | `/management/inbound-activity` | CONSOLIDATED |
| ConsumerGroups | `/consumer-groups` | `/management/consumer-groups` | CONSOLIDATED |
| Webhooks | `/webhooks` | `/management/webhooks` | CONSOLIDATED |
| Channels | `/channels` | `/management/channels` | CONSOLIDATED |
| Notifications | `/notifications` | `/management/notifications` | CONSOLIDATED |
| AuditLog | `/audit-log` | `/management/audit-log` | CONSOLIDATED |
| Settings | `/settings` | `/management/settings` | CONSOLIDATED |
| Imports | `/imports` | `/management/imports` | CONSOLIDATED |
| Integrations | `/integrations` | `/management/integrations` | CONSOLIDATED |
| Adjustments | `/adjustments` | `/management/adjustments` | CONSOLIDATED |
| InterWarehouseTransfers | `/inter-warehouse-transfers` | `/management/inter-warehouse-transfers` | CONSOLIDATED |
| TransferOrders | `/transfer-orders` | `/management/transfer-orders` | CONSOLIDATED |

**Nota sobre la tabla:** `ROUTE_MAPPED` y `CONSOLIDATED` son inventario de routing, no aprobación de equivalencia funcional. Las filas R5/R6 con operaciones bloqueadas por limitaciones Flask deben conservar esa clasificación de capacidad y no convertirse en `VERIFIED_PARITY` para acciones no soportadas.

## 3. Hallazgos iniciales de routing / deep links

1. React conserva redirects de `/warehouses`, `/bins`, `/zones` y `/preferred-bins` hacia las pestañas de `/data`. Svelte ofrece `/warehouses` como pantalla y las rutas `/data/*`; se debe probar refresh y decidir si mantener los cuatro alias antiguos sin cambiar el destino funcional.
2. React conserva `/rma → /returns/rma`; en el árbol Svelte no se encontraron rutas `/rma`, `/returns` ni `/returns/rma`. La pantalla `ReturnsScreen` contiene la gestión de RMA, pero falta demostrar compatibilidad de bookmark y equivalencia de navegación.
3. Varias rutas React top-level se consolidaron bajo `/management/:feature`. Debe probarse acceso directo, refresh y deep link de cada feature, además del guard correcto para el path dinámico.
4. La ruta dinámica `/management/[feature]` tiene un catálogo explícito de pantallas. El fallback `AdminOperationScreen` no convierte cualquier feature desconocida en una función válida; debe mantenerse fail-closed y mostrar estado no encontrado.
5. React retiró explícitamente sus páginas administrativas espejo de picking/packing/shipping; Svelte implementa rutas operativas dedicadas. La comparación debe validar el recorrido scanner y no exigir paridad con una pantalla React retirada.

## 4. Matriz detallada obligatoria por operación

Completar una fila por acción de negocio (no solo por página), incluyendo al menos:

| Campo | Evidencia exigida |
|---|---|
| React source | Componente, handler, validación, estado y transición observados |
| Svelte destination | Ruta, pantalla y estado/view-model responsable |
| Business journey | Precondición → acción → resultado persistido → estado siguiente; caminos de error |
| Use cases | Use case(s) ejecutados y política Domain correspondiente |
| Flask contract | Método, endpoint, request/response DTO, códigos de error, paginación/filtros y efecto lateral |
| Permission | Role/page grant/function grant, override si aplica, y enforcement Flask |
| Warehouse scope | Fuente del warehouse_id, autorización de origen/destino, invalidación al cambiar de almacén |
| Tests | Unitarios Domain/Application/Data, integración/UI y regresión con nombre/ruta de test |
| Evidence | CI run + SHA, prueba manual reproducible o evidencia E2E |
| Result | `VERIFIED_PARITY`, `PARTIAL`, `BACKEND_LIMITATION`, `FRONTEND_DEFECT`, `UNVERIFIED` |

No se debe marcar una acción `VERIFIED_PARITY` si solo existe prueba de mapper, render o llamada HTTP simulada.

## 5. Plan de ejecución R10

- [x] R10.0 Inventario inicial de rutas React y destinos Svelte; preservar React.
- [ ] R10.1 Completar matriz de acciones, casos de uso, endpoints, DTO, permisos y warehouse scope por feature R1–R9.
- [ ] R10.2 Resolver gaps de compatibilidad de URLs (incluyendo RMA y aliases de datos) con redirects explícitos y tests, sin romper rutas canónicas.
- [ ] R10.3 Definir usuarios/roles y almacenes representativos; ejecutar recorridos E2E R1→R9 y comparar estados/resultados de negocio.
- [ ] R10.4 Verificar refresh/deep links, responsive, teclado/lector, foco, semántica ARIA, estados empty/loading/error/forbidden/not-supported y catálogos i18n.
- [ ] R10.5 Auditar mocks/fixtures/adaptadores temporales en runtime; separar estrictamente test-only de producción.
- [ ] R10.6 Inventariar funciones no soportadas por Flask y comprobar que cada acción está etiquetada, documentada y deshabilitada en UI y Application.
- [ ] R10.7 Congelar matriz de regresión y añadir gates para proteger invariantes aceptadas.
- [ ] R10.8 Retirada React: **BLOQUEADA** hasta evidencia completa de paridad y aprobación explícita del usuario. No borrar `admin/`, dependencias React ni workflows en esta fase sin esa aprobación.

## 6. Condiciones de retirada segura de React

No se elimina ningún archivo ni dependencia React durante R10. La retirada requiere:
1. Todas las acciones React clasificadas como migradas, consolidadas con equivalencia demostrada, retiradas con justificación aprobada o no soportadas/documentadas.
2. Cero gaps críticos de navegación y permisos.
3. Recorridos E2E representativos aprobados y resultados/transiciones comparados.
4. Matriz de regresión congelada y CI Svelte verde sobre el commit candidato.
5. Aprobación explícita del usuario para retirar `admin/`.

Hasta entonces, React permanece como referencia funcional y de comparación.

## 7. Limitaciones de la evidencia inicial

- Este inventario se obtuvo de `admin/src/App.jsx`, `webapp/src/routes`, el layout autenticado, `AccessPolicy.ts` y `AdminOperationCatalog.ts`.
- No se ejecutaron navegadores ni recorridos autenticados en esta auditoría inicial.
- Las pruebas unitarias y el Webapp CI verde reportados para R9 no certifican por sí solos la matriz de rutas ni E2E.
- Los endpoints/permisos de cada acción se completarán desde el contrato Flask específico; no se infieren desde el catálogo de UI.
