# Mapa de rutas del backend original

Este mapa lo elaboré leyendo los decoradores Flask y los prefijos de registro de blueprints en `api/app.py`. Es el inventario inicial para planificar la paridad. Documentar una ruta no significa que esté implementada en Go.

## Autenticación — `/api/auth`

| Método | Ruta |
|---|---|
| POST | `/login` |
| POST | `/logout` |
| GET | `/me` |
| POST | `/refresh` |
| POST | `/change-password` |

## Operación WMS

| Módulo | Prefijo | Rutas declaradas |
|---|---|---|
| Lookup | `/api/lookup` | GET `/item/{barcode}`, `/bin/{barcode}`, `/so/{barcode}`, `/item/search`, `/bin/search` |
| Receiving | `/api/receiving` | GET `/po/{barcode}`; POST `/receive`, `/cancel` |
| Putaway | `/api/putaway` | GET `/pending/{warehouse_id}`, `/staging-summary/{warehouse_id}`, `/suggest/{item_id}`; POST `/confirm`, `/update-preferred` |
| Picking | `/api/picking` | GET `/active-batch`, `/batch/{batch_id}`, `/batch/{batch_id}/next`; POST `/create-batch`, `/wave-validate`, `/wave-create`, `/confirm`, `/short`, `/complete-batch`, `/cancel-batch` |
| Packing | `/api/packing` | GET `/order/{barcode}`; POST `/verify`, `/complete` |
| Shipping | `/api/shipping` | GET `/order/{barcode}`; POST `/fulfill` |
| Inventory | `/api/inventory` | POST `/cycle-count/create`, `/cycle-count/submit`; GET `/cycle-count/{count_id}` |
| Transfers | `/api/transfers` | POST `/move` |
| Warehouses | `/api/warehouses` | GET `/list` |

## Administración — `/api/admin`

| Módulo | Rutas declaradas |
|---|---|
| Warehouses/zones/bins | GET/POST/PUT/DELETE `/warehouses`, `/warehouses/{warehouse_id}`, `/zones`, `/zones/{zone_id}`, `/bins`, `/bins/{bin_id}`; POST `/inter-warehouse-transfer`; GET `/inter-warehouse-transfers` |
| Items/preferred bins/import | GET/POST `/items`; GET/PUT/DELETE `/items/{item_id}`; POST `/items/{item_id}/archive`; GET `/inventory`; POST `/import/{entity_type}`; GET/POST `/preferred-bins`; PUT/DELETE `/preferred-bins/{preferred_bin_id}` |
| Orders/RMA/backorders | Purchase orders, receipts/unreceive, sales orders, related records, picking tickets, line CRUD/allocation, queue/cancel/revert, admin pick/ship, void-return, partial fulfill, cancel-backorder, create/receive RMA, short-picks |
| Users/settings/adjustments | CRUD users; GET/PUT page permissions; audit log, dashboard, settings, cycle counts, pending/list adjustments; POST review/direct adjustment |
| Tokens | Scope catalog, token CRUD, rotate and revoke |
| Channels/DLQ | Channel CRUD and per-channel DLQ |
| Consumer groups/registry | Consumer group CRUD and connector registry CRUD |
| Connectors | Connector list/schema/credentials/test/sync status/reset/sync |
| Inbound activity | Activity list and resource detail |
| Notifications | Notification webhook CRUD, rotate URL, test send |
| POS/search/vendors | POS sales-order summary, search, vendor CRUD |
| Webhooks | Subscription CRUD, secret rotation, DLQ, replay, replay batch, stats and error list |
| Pick batches | List and delete batch |
| Transfer orders | List/detail/cancel/delete, import, picker submit, approval/rejection and short-close |

## Integraciones versionadas — `/api/v1`

| Prefijo | Métodos y rutas |
|---|---|
| `/events` | GET `/`, `/types`, `/schema/{event_type}/{version}`; POST `/ack` |
| `/snapshot` | GET `/inventory` |
| `/inbound` | GET `/mapping-schema` |
| `/dashboard` | GET `/productivity`, `/preferences`, `/received`, `/shipping-health`; PUT `/preferences` |
| `/dockd` | GET `/orders/{so_number}`, `/items/{barcode}`; POST `/orders/{so_number}/ship`, `/orders/{so_number}/void-ship` |
| `/pos` | GET `/availability`, `/sales-orders/{so_number}`; POST `/validate-cart`, `/checkout`, `/refund`, `/reference-orders` |

## Rutas directas de aplicación

- GET `/api/health` — pública; cuerpo `{"status":"ok","service":"sentry-wms"}`.
- GET `/api/admin/system-info` — autenticación + rol ADMIN.
- POST `/api/csp-report` — receptor de reportes CSP.

## Notas

1. El inventario deriva de los decoradores Flask y prefijos inspeccionados; no reemplaza OpenAPI ni los tests de contrato.
2. Administración requiere autenticación y permisos por página.
3. Events, snapshot, inbound, dockd y POS usan WMS tokens/scopes específicos; no son JWT de usuario.
4. Próximo paso: fixtures request/response por endpoint y matriz automatizada de paridad.
