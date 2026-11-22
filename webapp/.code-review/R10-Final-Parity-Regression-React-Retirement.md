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
| RMA | `/returns/rma` (también redirect legacy `/rma`) | alias HTTP 308 `/returns/rma` y `/rma` → `/management/returns` (`ReturnsScreen`) | ROUTE_MAPPED — PENDING_BROWSER_E2E |
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


## 8. R10.2 — compatibilidad de URLs React

Se añadieron redirects HTTP 308 para 28 rutas antiguas que no tenían una página canónica directa en SvelteKit. Los destinos son rutas Svelte actuales; el acceso final sigue pasando por las guardas y permisos del destino. Las rutas que ya existen con el mismo path (`/login`, `/inventory`, `/sales-orders`, `/items`, `/warehouses`, `/picking-tickets`, etc.) no se duplicaron.

- Mapa central: `src/lib/navigation/legacyRouteRedirects.ts`.
- Wrappers SvelteKit: `+page.server.ts` por URL antigua.
- Cobertura de contrato del mapa: `src/lib/navigation/legacyRouteRedirects.test.ts`.
- Se incluyen `/rma`, `/returns/rma` y `/returns/refunds`; las funciones RMA se consolidan en `/management/returns`, y Refunds en `/management/refunds`.
- Se preservan aliases de datos `/bins`, `/zones`, `/preferred-bins` hacia sus tabs `/data/*`; `/warehouses` ya tiene ruta Svelte propia y no se duplica.
- Se preservan rutas top-level React de gestión hacia `/management/*`, además de `/cycle-counts → /cycle-count`.

**Estado de validación:** implementación y pruebas del mapa añadidas; Webapp CI del HEAD `bc3d84ac4dcb429a8e0383715ad6a9da557fe099` pendiente al registrar esta nota. Aún falta probar navegación real/refresh en navegador y validar permisos por rol en los destinos. Por tanto, el gap de URL queda `IMPLEMENTED_PENDING_CI_AND_BROWSER`, no `VERIFIED_PARITY`.

**No se ha retirado React.**


## 8. Revisión de implementación R10 (22-11-2026)

**HEAD inspeccionado:** `ce6b7277dc5598c26ca8725c541b7f8e740e7752`.

### Verificado estáticamente
- Las 28 claves del mapa `LEGACY_ROUTE_REDIRECTS` tienen wrappers `+page.server.ts` y `+page.svelte`.
- Los wrappers usan `redirect(308, LEGACY_ROUTE_REDIRECTS[...])`; el test recorre el mapa y comprueba que cada wrapper referencia la clave correspondiente.
- RMA y Refunds están consolidados en las pantallas `ReturnsScreen` y `RefundsScreen` servidas por `/management/returns` y `/management/refunds`.
- `AdminOperationScreen` comprueba la feature contra `ADMIN_OPERATION_CATALOG` y muestra estado «Módulo no encontrado» si no está catalogada.
- React permanece en el repositorio. No se ha eliminado `admin/`.

### Hallazgos y límites
- El test de compatibilidad es una prueba estática de mapa/wrappers; no prueba una respuesta HTTP 308 real, navegación del navegador, query strings, refresh con sesión ni permisos en destino.
- Diferencia pendiente de comprobar: React redirige `/warehouses` a `/data/warehouses`; Svelte sirve `/warehouses` con `WarehousesScreen` directamente. La pantalla puede ser funcionalmente equivalente, pero no se ha probado el contenedor/tab ni el resultado de navegación.
- No hay Playwright/Cypress ni script `test:e2e` declarado en `webapp/package.json`. No existe evidencia de ejecución de los recorridos autenticados R1–R9 contra Flask.
- No se ha completado todavía una auditoría exhaustiva de mocks/fixtures/adaptadores en runtime ni la matriz de negocio por operación/endpoints/permisos/scope.

### Estado de aceptación
- `R10.0 ROUTE INVENTORY`: implementado.
- `R10.2 LEGACY URL WRAPPERS`: implementación estática completada; CI y navegador pendientes.
- `R10.3 E2E RUNBOOK`: preparado; ejecución bloqueada hasta disponer de entorno Flask de pruebas, dataset reiniciable y cuentas representativas.
- `R10.1, R10.4–R10.7`: pendientes.
- `R10.8 React retirement`: bloqueado; requiere evidencia completa y aprobación explícita.

No declarar R10 completa ni paridad funcional a partir de estos checks estáticos.


## 9. R10.1 — matriz operativa por acción (primera pasada)

Se creó `.code-review/R10.1-Operation-Traceability-Matrix.md` con una primera descomposición de R1–R9 en operaciones de negocio. Cada fila enlaza ruta React, destino Svelte, caso de uso/regla, contrato Flask/DTO, permiso, warehouse scope y evidencia disponible.

**Estado:** `BASELINE_CREATED — TRACEABILITY_PARTIAL`. No se declara paridad por tener ruta o test de mapper. La matriz distingue `CONTRACT_DOCUMENTED`, `BACKEND_LIMITATION`, `PENDING_EVIDENCE` y reserva `VERIFIED_PARITY` para recorridos reproducibles R10.3/R10.4.

Pendiente completar handlers React/transiciones, nombres exactos de use cases y tests por acción, DTO de respuesta/códigos HTTP y enforcement real de warehouse scope. Los contratos que no ofrecen preview, ledger o scope permanecen explícitamente como limitaciones Flask.

## 10. R10.2 — validación estática reforzada de compatibilidad

La revisión de React confirmó que `/warehouses` es un alias histórico hacia `/data/warehouses`. Svelte tenía una pantalla equivalente en ambos paths, pero servía `/warehouses` directamente y no reproducía el destino/canonicalización React. Se añadió redirect HTTP 308 para `/warehouses` y se cambió el landing interno de usuarios con grant `warehouses` a `/data/warehouses`.

- Mapa central actualizado: `src/lib/navigation/legacyRouteRedirects.ts`.
- Wrapper añadido: `src/routes/(app)/warehouses/+page.server.ts`.
- El test ahora verifica que cada destino resuelve a una página Svelte concreta o a una feature explícita de `management/[feature]`, además de comprobar que cada ruta heredada tiene su wrapper.
- El inventario pasa de 28 a **29 redirects legacy**.

**Límite:** son pruebas estáticas de filesystem/catálogo. No prueban el status HTTP observado en servidor, la navegación del browser, query strings, refresh autenticado ni la autorización efectiva Flask. Esas comprobaciones siguen en R10.2/R10.3 E2E. Estado: `IMPLEMENTED_PENDING_CI_AND_BROWSER`.

**React sigue intacto.**


## 11. R10.1 — inventario real de UseCases y tests

En `.code-review/R10.1-Operation-Traceability-Matrix.md` se añadió el inventario de archivos UseCase y tests presentes por feature, con rutas exactas de filesystem para R1–R9. También se inspeccionaron implementaciones de validación en Items, Receiving, Cycle Count, Sales Orders, Picking, Packing, Shipping, Returns, Refunds, Webhooks, Integrations y Audit Log.

Esto eleva la trazabilidad a `USECASE_AND_TEST_INVENTORY_ADDED`, pero **no** cierra el enlace uno-a-uno React handler → UseCase → endpoint → test. Los tests existentes son unitarios/feature y no prueban persistencia Flask. El estado de R10.1 sigue parcial.

## 12. R10.2 — fallo CI y corrección de imports

Webapp CI run [45049207492](https://github.com/danielitoCode/smart-wms/actions/runs/45049207492), commit `854d850`, falló en `svelte-check`: 29 errores idénticos `Cannot find module '$lib/navigation/legacyRouteRedirects'`. El proyecto configura el alias `#lib/*` en `webapp/tsconfig.json`; no configura el alias `$lib` porque sus paths personalizados lo sustituyen.

Se corrigieron los wrappers heredados para importar `#lib/navigation/legacyRouteRedirects` y se añadió una aserción que impide volver a introducir el alias incorrecto en cualquier wrapper. Commit correctivo `16381ef`; test de regresión `fdff7d9`.

**Pendiente:** CI del HEAD `70212a8` y navegación HTTP/browser. Hasta entonces R10.2 queda `IMPLEMENTED_PENDING_CI_AND_BROWSER`, no validada. React y Flask siguen sin modificarse.
