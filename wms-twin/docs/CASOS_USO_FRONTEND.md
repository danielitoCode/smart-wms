# Casos de uso detectados en el frontend (solo lectura)

Inventario generado inspeccionando `admin/src` y `mobile/src` **sin modificarlos**.
El admin concentra llamadas `api.get/post/put/patch/delete` dentro de páginas/componentes (no hay capa de servicios separada). El mobile usa `client` + pantallas.

## Totales

- ~189 combinaciones método+path usadas por UI (sin query string).
- Todas caen bajo prefijos que el gemelo registra (`/api/auth`, `/api/admin`, floor ops, `/api/v1`, `/api/warehouses`).

## Grupos de casos de uso

| Grupo | Pantallas / origen | Endpoints clave |
|-------|--------------------|-----------------|
| Auth | auth.jsx, LoginScreen, ChangePassword | login, logout, me, change-password |
| Dashboard | Dashboard.jsx, Sidebar, HomeScreen | `/admin/dashboard`, `/v1/dashboard/*`, sales-orders badges |
| Catálogo | Warehouses, Zones, Bins, Items, PreferredBins, Vendors | CRUD `/admin/warehouses|zones|bins|items|preferred-bins|vendors` |
| PO / Receiving | Receiving.jsx, ReceiveScreen | PO admin, `/receiving/po|receive|cancel` |
| Putaway | PutAway.jsx, PutAwayScreen | `staging-summary`, suggest, confirm, update-preferred |
| Picking | Picking*, PickScan/Walk | wave-validate/create, batch, confirm, short, complete |
| Pack / Ship | Pack*, Ship* | packing verify/complete/order, shipping fulfill/order |
| Sales / Returns | SalesOrders, Refunds, RMA, Returns | sales-orders list/detail/put, void-return, receive-return, memo |
| Transfers | TransferScreen, TransferOrders, InterWarehouse | transfers/move, transfer-orders admin |
| Cycle count | CycleCounts, CountScreen, Approval | inventory/cycle-count/*, adjustments pending/review |
| Integrations | Channels, ConsumerGroups, Webhooks, Integrations, Notifications | channels, connectors, consumer-groups, webhooks, notification-webhooks |
| Settings / Users / Tokens | Settings, Users, Tokens | settings keys, users, tokens, scope-catalog |
| Inbound activity | InboundActivity.jsx | `/admin/inbound/activity` |
| Lookup / warehouses | mobile Home + screens | lookup item/bin/so, warehouses/list |

## Cierre en gemelo (esta iteración)

- `GET /api/putaway/staging-summary/{warehouse_id}` con shape `{bins:[...]}` para PutAway.jsx
- `POST /api/putaway/update-preferred`
- `GET /api/admin/inbound/activity` (+ detalle resource/id) con `{rows}`
- Listado `/api/admin/sales-orders` con `sales_orders`, `page`, `pages`, `total`, filtros `q/status/exclude_post_fulfillment`
- PUT/PATCH sales-order, `void-return`, `receive-return`, `memo`

## Limitación honest

“Listo para el frontend” en **rutas y shapes mínimos** ≠ paridad de cada regla de negocio Flask.
Los módulos de connectors/channels/TO usan persistencia documental PrismaTec-Core; el núcleo floor/POS tiene lógica de dominio más profunda.
