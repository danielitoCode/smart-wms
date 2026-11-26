# F0 — Inventario y baseline inicial del frontend

> Estado: **IN_PROGRESS**. Este informe contiene evidencia estructural del repositorio remoto; no certifica estado local ni paridad funcional.

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

## 4. F0.2 — Checklist de inventario funcional pendiente
La existencia de rutas no demuestra paridad. Se debe inspeccionar cada pantalla y sus componentes dependientes.

- [ ] Acciones por pantalla y sus efectos esperados.
- [ ] Formularios, campos, validaciones y guardas de cambios sin guardar.
- [ ] Diálogos/modales, confirmaciones, cancelaciones y side effects.
- [ ] Filtros, búsqueda, ordenación, paginación y persistencia de parámetros.
- [ ] Exportaciones, descargas, impresión y formatos.
- [ ] Estados loading, empty, error, forbidden, conflict, success y partial.
- [ ] Deep links, query params, rutas dinámicas, aliases, refresh y nueva pestaña.
- [ ] Grants, perfiles y almacén activo que condicionan cada capacidad.
- [ ] Correspondencia Svelte por cada interacción y enlaces a pruebas.
- [ ] Clasificación: equivalente, parcial, ausente, limitación Flask, cambio aprobado o retirada aprobada.

## 5. Límites y estado de tareas
- Auditoría estática del árbol y router en el SHA indicado; no se ejecutó la aplicación.
- No se han revisado todavía todos los cuerpos de pantalla ni todos los diálogos/acciones.
- No se ha demostrado paridad por la mera existencia de una ruta.
- Flask no fue inspeccionado ni modificado.
- No se ejecutaron check, build, Vitest, Playwright ni CI.

| Tarea | Estado | Evidencia | Crédito |
|---|---|---|---:|
| F0.1 | IN_PROGRESS | SHA, commit, workflows y consulta de status/runs registrada; falta estado local y Actions exhaustivo. | 0 / 0,5% |
| F0.2 | IN_PROGRESS | Router, módulos de página, componentes compartidos y divergencias estructurales identificados; falta catálogo de interacciones y comparación funcional Svelte. | 0 / 1% |

El porcentaje se acreditará únicamente tras completar y verificar todos los criterios en un SHA concreto.


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
