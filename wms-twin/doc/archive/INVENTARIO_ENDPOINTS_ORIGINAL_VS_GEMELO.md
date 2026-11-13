# Inventario de endpoints: original vs gemelo

Documento en primera persona. **Regla de oro para conmutar backends sin que el frontend se entere:**

1. Mismo método HTTP y misma ruta final bajo `/api`.
2. Mismos nombres de campos JSON relevantes para el cliente (aunque por debajo PrismaTec-Core use organismos/ledger).
3. Mismos códigos HTTP esperados en el flujo feliz y errores habituales (401/403/404/409).
4. Misma política de auth: JWT Bearer y/o cookies `sentry_auth` + CSRF en mutaciones.
5. El original Flask **no se modifica**. Solo avanzo el gemelo en `wms-twin/`.

## Estado global

| Estado | Significado | Cantidad (aprox.) |
|--------|-------------|-------------------|
| impl | Cubierto de forma usable en el gemelo | ver tabla |
| partial | Existe ruta/handler pero falta paridad de DTO o casos borde | ver tabla |
| missing | El frontend recibiría 404 u otro fallo si apunta al gemelo | ver tabla |

**Conclusión:** sí es posible y es el objetivo. Hoy **no** están todos iguales. El trabajo crítico es cerrar `missing` y endurecer `partial` hasta que la matriz quede en `impl` para todo lo que usa admin/mobile.

## Matriz (generada desde blueprints Flask)

| Método | Ruta original | Estado gemelo | Fuente Flask |
|--------|---------------|---------------|--------------|
| `DELETE` | `/api/admin/bins/<int:bin_id>` | impl | `routes/admin/admin_warehouse.py` |
| `DELETE` | `/api/admin/channels/<channel_id>` | missing | `routes/admin/admin_channels.py` |
| `DELETE` | `/api/admin/connector-registry/<connector_id>` | missing | `routes/admin/admin_consumer_groups.py` |
| `DELETE` | `/api/admin/connectors/<connector_name>/credentials` | missing | `routes/admin/admin_connectors.py` |
| `DELETE` | `/api/admin/consumer-groups/<consumer_group_id>` | missing | `routes/admin/admin_consumer_groups.py` |
| `DELETE` | `/api/admin/items/<int:item_id>` | impl | `routes/admin/admin_items.py` |
| `DELETE` | `/api/admin/notification-webhooks/<int:webhook_id>` | missing | `routes/admin/admin_notifications.py` |
| `DELETE` | `/api/admin/preferred-bins/<int:preferred_bin_id>` | impl | `routes/admin/admin_items.py` |
| `DELETE` | `/api/admin/purchase-orders/<int:po_id>/lines/<int:po_line_id>` | impl | `routes/admin/admin_orders.py` |
| `DELETE` | `/api/admin/sales-orders/<int:so_id>/lines/<int:so_line_id>` | impl | `routes/admin/admin_orders.py` |
| `DELETE` | `/api/admin/tokens/<int:token_id>` | partial | `routes/admin/admin_tokens.py` |
| `DELETE` | `/api/admin/transfer-orders/<int:to_id>` | missing | `routes/admin/admin_transfer_orders.py` |
| `DELETE` | `/api/admin/users/<int:user_id>` | partial | `routes/admin/admin_users.py` |
| `DELETE` | `/api/admin/vendors/<uuid:canonical_id>` | impl | `routes/admin/admin_vendors.py` |
| `DELETE` | `/api/admin/warehouses/<int:warehouse_id>` | impl | `routes/admin/admin_warehouse.py` |
| `DELETE` | `/api/admin/webhooks/<subscription_id>` | partial | `routes/admin/admin_webhooks.py` |
| `DELETE` | `/api/admin/zones/<int:zone_id>` | impl | `routes/admin/admin_warehouse.py` |
| `GET` | `/api/admin/adjustments/list` | missing | `routes/admin/admin_users.py` |
| `GET` | `/api/admin/adjustments/pending` | missing | `routes/admin/admin_users.py` |
| `GET` | `/api/admin/audit-log` | partial | `routes/admin/admin_users.py` |
| `GET` | `/api/admin/backorders` | missing | `routes/admin/admin_orders.py` |
| `GET` | `/api/admin/bins` | impl | `routes/admin/admin_warehouse.py` |
| `GET` | `/api/admin/bins/<int:bin_id>` | impl | `routes/admin/admin_warehouse.py` |
| `GET` | `/api/admin/channels` | missing | `routes/admin/admin_channels.py` |
| `GET` | `/api/admin/channels/<channel_id>` | missing | `routes/admin/admin_channels.py` |
| `GET` | `/api/admin/channels/<channel_id>/dlq` | missing | `routes/admin/admin_channels.py` |
| `GET` | `/api/admin/connector-registry` | missing | `routes/admin/admin_consumer_groups.py` |
| `GET` | `/api/admin/connectors` | missing | `routes/admin/admin_connectors.py` |
| `GET` | `/api/admin/connectors/<connector_name>/config-schema` | missing | `routes/admin/admin_connectors.py` |
| `GET` | `/api/admin/connectors/<connector_name>/credentials` | missing | `routes/admin/admin_connectors.py` |
| `GET` | `/api/admin/connectors/<connector_name>/sync-status` | missing | `routes/admin/admin_connectors.py` |
| `GET` | `/api/admin/consumer-groups` | missing | `routes/admin/admin_consumer_groups.py` |
| `GET` | `/api/admin/cycle-counts` | missing | `routes/admin/admin_users.py` |
| `GET` | `/api/admin/dashboard` | missing | `routes/admin/admin_users.py` |
| `GET` | `/api/admin/inbound/activity` | missing | `routes/admin/admin_inbound.py` |
| `GET` | `/api/admin/inbound/activity/<resource>/<int:inbound_id>` | missing | `routes/admin/admin_inbound.py` |
| `GET` | `/api/admin/inter-warehouse-transfers` | missing | `routes/admin/admin_warehouse.py` |
| `GET` | `/api/admin/inventory` | missing | `routes/admin/admin_items.py` |
| `GET` | `/api/admin/items` | impl | `routes/admin/admin_items.py` |
| `GET` | `/api/admin/items/<int:item_id>` | impl | `routes/admin/admin_items.py` |
| `GET` | `/api/admin/notification-webhooks` | missing | `routes/admin/admin_notifications.py` |
| `GET` | `/api/admin/pick-batches` | missing | `routes/admin/admin_pick_batches.py` |
| `GET` | `/api/admin/picker/transfer-orders/<int:to_id>` | missing | `routes/admin/admin_transfer_orders.py` |
| `GET` | `/api/admin/pos/sales-orders` | missing | `routes/admin/admin_pos.py` |
| `GET` | `/api/admin/pos/summary` | missing | `routes/admin/admin_pos.py` |
| `GET` | `/api/admin/preferred-bins` | impl | `routes/admin/admin_items.py` |
| `GET` | `/api/admin/purchase-orders` | impl | `routes/admin/admin_orders.py` |
| `GET` | `/api/admin/purchase-orders/<int:po_id>` | impl | `routes/admin/admin_orders.py` |
| `GET` | `/api/admin/purchase-orders/<int:po_id>/receipts` | impl | `routes/admin/admin_orders.py` |
| `GET` | `/api/admin/sales-orders` | impl | `routes/admin/admin_orders.py` |
| `GET` | `/api/admin/sales-orders/<int:so_id>` | impl | `routes/admin/admin_orders.py` |
| `GET` | `/api/admin/sales-orders/<int:so_id>/lines/<int:so_line_id>/available-bins` | impl | `routes/admin/admin_orders.py` |
| `GET` | `/api/admin/sales-orders/<int:so_id>/picking-ticket` | impl | `routes/admin/admin_orders.py` |
| `GET` | `/api/admin/sales-orders/<int:so_id>/related` | impl | `routes/admin/admin_orders.py` |
| `GET` | `/api/admin/scope-catalog` | missing | `routes/admin/admin_tokens.py` |
| `GET` | `/api/admin/search` | missing | `routes/admin/admin_search.py` |
| `GET` | `/api/admin/settings` | missing | `routes/admin/admin_users.py` |
| `GET` | `/api/admin/settings/<setting_key>` | missing | `routes/admin/admin_users.py` |
| `GET` | `/api/admin/short-picks` | missing | `routes/admin/admin_orders.py` |
| `GET` | `/api/admin/source-systems` | missing | `routes/admin/admin_orders.py` |
| `GET` | `/api/admin/tokens` | partial | `routes/admin/admin_tokens.py` |
| `GET` | `/api/admin/transfer-orders` | missing | `routes/admin/admin_transfer_orders.py` |
| `GET` | `/api/admin/transfer-orders/<int:to_id>` | missing | `routes/admin/admin_transfer_orders.py` |
| `GET` | `/api/admin/users` | partial | `routes/admin/admin_users.py` |
| `GET` | `/api/admin/users/<int:user_id>/permissions` | partial | `routes/admin/admin_users.py` |
| `GET` | `/api/admin/vendors` | impl | `routes/admin/admin_vendors.py` |
| `GET` | `/api/admin/vendors/<uuid:canonical_id>` | impl | `routes/admin/admin_vendors.py` |
| `GET` | `/api/admin/warehouses` | impl | `routes/admin/admin_warehouse.py` |
| `GET` | `/api/admin/warehouses/<int:warehouse_id>` | impl | `routes/admin/admin_warehouse.py` |
| `GET` | `/api/admin/webhook-errors` | missing | `routes/admin/admin_webhooks.py` |
| `GET` | `/api/admin/webhooks` | partial | `routes/admin/admin_webhooks.py` |
| `GET` | `/api/admin/webhooks/<subscription_id>` | partial | `routes/admin/admin_webhooks.py` |
| `GET` | `/api/admin/webhooks/<subscription_id>/dlq` | partial | `routes/admin/admin_webhooks.py` |
| `GET` | `/api/admin/webhooks/<subscription_id>/stats` | partial | `routes/admin/admin_webhooks.py` |
| `GET` | `/api/admin/zones` | impl | `routes/admin/admin_warehouse.py` |
| `GET` | `/api/auth/me` | auth | `routes/auth.py` |
| `GET` | `/api/inventory/cycle-count/<int:count_id>` | partial | `routes/inventory.py` |
| `GET` | `/api/lookup/bin/<barcode>` | impl | `routes/lookup.py` |
| `GET` | `/api/lookup/bin/search` | impl | `routes/lookup.py` |
| `GET` | `/api/lookup/item/<barcode>` | impl | `routes/lookup.py` |
| `GET` | `/api/lookup/item/search` | impl | `routes/lookup.py` |
| `GET` | `/api/lookup/so/<barcode>` | impl | `routes/lookup.py` |
| `GET` | `/api/packing/order/<barcode>` | impl | `routes/packing.py` |
| `GET` | `/api/picking/active-batch` | impl | `routes/picking.py` |
| `GET` | `/api/picking/batch/<int:batch_id>` | impl | `routes/picking.py` |
| `GET` | `/api/picking/batch/<int:batch_id>/next` | impl | `routes/picking.py` |
| `GET` | `/api/putaway/pending/<int:warehouse_id>` | impl | `routes/putaway.py` |
| `GET` | `/api/putaway/staging-summary/<int:warehouse_id>` | impl | `routes/putaway.py` |
| `GET` | `/api/putaway/suggest/<int:item_id>` | impl | `routes/putaway.py` |
| `GET` | `/api/receiving/po/<barcode>` | impl | `routes/receiving.py` |
| `GET` | `/api/shipping/order/<barcode>` | impl | `routes/shipping.py` |
| `GET` | `/api/v1/dashboard/preferences` | missing | `routes/dashboard.py` |
| `GET` | `/api/v1/dashboard/productivity` | missing | `routes/dashboard.py` |
| `GET` | `/api/v1/dashboard/received` | missing | `routes/dashboard.py` |
| `GET` | `/api/v1/dashboard/shipping-health` | missing | `routes/dashboard.py` |
| `GET` | `/api/v1/dockd/items/<barcode>` | partial | `routes/dockd.py` |
| `GET` | `/api/v1/dockd/orders/<so_number>` | partial | `routes/dockd.py` |
| `GET` | `/api/v1/events/` | partial | `routes/polling.py` |
| `GET` | `/api/v1/events/schema/<event_type>/<int:version>` | partial | `routes/polling.py` |
| `GET` | `/api/v1/events/types` | partial | `routes/polling.py` |
| `GET` | `/api/v1/inbound/mapping-schema` | partial | `routes/inbound.py` |
| `GET` | `/api/v1/pos/availability` | partial | `routes/pos.py` |
| `GET` | `/api/v1/pos/sales-orders/<so_number>` | partial | `routes/pos.py` |
| `GET` | `/api/v1/snapshot/inventory` | partial | `routes/snapshot.py` |
| `GET` | `/api/warehouses/list` | missing | `routes/warehouses.py` |
| `PATCH` | `/api/admin/channels/<channel_id>` | missing | `routes/admin/admin_channels.py` |
| `PATCH` | `/api/admin/connector-registry/<connector_id>` | missing | `routes/admin/admin_consumer_groups.py` |
| `PATCH` | `/api/admin/consumer-groups/<consumer_group_id>` | missing | `routes/admin/admin_consumer_groups.py` |
| `PATCH` | `/api/admin/notification-webhooks/<int:webhook_id>` | missing | `routes/admin/admin_notifications.py` |
| `PATCH` | `/api/admin/purchase-orders/<int:po_id>/lines/<int:po_line_id>` | impl | `routes/admin/admin_orders.py` |
| `PATCH` | `/api/admin/sales-orders/<int:so_id>/address` | impl | `routes/admin/admin_orders.py` |
| `PATCH` | `/api/admin/sales-orders/<int:so_id>/lines/<int:so_line_id>` | impl | `routes/admin/admin_orders.py` |
| `PATCH` | `/api/admin/sales-orders/<int:so_id>/lines/<int:so_line_id>/allocation` | impl | `routes/admin/admin_orders.py` |
| `PATCH` | `/api/admin/sales-orders/<int:so_id>/memo` | impl | `routes/admin/admin_orders.py` |
| `PATCH` | `/api/admin/webhooks/<subscription_id>` | partial | `routes/admin/admin_webhooks.py` |
| `POST` | `/api/admin/adjustments/direct` | missing | `routes/admin/admin_users.py` |
| `POST` | `/api/admin/adjustments/review` | missing | `routes/admin/admin_users.py` |
| `POST` | `/api/admin/bins` | impl | `routes/admin/admin_warehouse.py` |
| `POST` | `/api/admin/channels` | missing | `routes/admin/admin_channels.py` |
| `POST` | `/api/admin/connector-registry` | missing | `routes/admin/admin_consumer_groups.py` |
| `POST` | `/api/admin/connectors/<connector_name>/credentials` | missing | `routes/admin/admin_connectors.py` |
| `POST` | `/api/admin/connectors/<connector_name>/sync-reset` | missing | `routes/admin/admin_connectors.py` |
| `POST` | `/api/admin/connectors/<connector_name>/sync/<sync_type>` | missing | `routes/admin/admin_connectors.py` |
| `POST` | `/api/admin/connectors/<connector_name>/test` | missing | `routes/admin/admin_connectors.py` |
| `POST` | `/api/admin/consumer-groups` | missing | `routes/admin/admin_consumer_groups.py` |
| `POST` | `/api/admin/import/<entity_type>` | missing | `routes/admin/admin_items.py` |
| `POST` | `/api/admin/inter-warehouse-transfer` | missing | `routes/admin/admin_warehouse.py` |
| `POST` | `/api/admin/items` | impl | `routes/admin/admin_items.py` |
| `POST` | `/api/admin/items/<int:item_id>/archive` | impl | `routes/admin/admin_items.py` |
| `POST` | `/api/admin/notification-webhooks` | missing | `routes/admin/admin_notifications.py` |
| `POST` | `/api/admin/notification-webhooks/<int:webhook_id>/rotate-url` | missing | `routes/admin/admin_notifications.py` |
| `POST` | `/api/admin/notification-webhooks/<int:webhook_id>/test-send` | missing | `routes/admin/admin_notifications.py` |
| `POST` | `/api/admin/pick-batches/<int:batch_id>/delete` | missing | `routes/admin/admin_pick_batches.py` |
| `POST` | `/api/admin/picker/transfer-orders/<int:to_id>/submit` | missing | `routes/admin/admin_transfer_orders.py` |
| `POST` | `/api/admin/preferred-bins` | impl | `routes/admin/admin_items.py` |
| `POST` | `/api/admin/purchase-orders` | impl | `routes/admin/admin_orders.py` |
| `POST` | `/api/admin/purchase-orders/<int:po_id>/close` | impl | `routes/admin/admin_orders.py` |
| `POST` | `/api/admin/purchase-orders/<int:po_id>/lines` | impl | `routes/admin/admin_orders.py` |
| `POST` | `/api/admin/purchase-orders/<int:po_id>/reopen` | impl | `routes/admin/admin_orders.py` |
| `POST` | `/api/admin/receipts/<int:receipt_id>/unreceive` | missing | `routes/admin/admin_orders.py` |
| `POST` | `/api/admin/sales-orders` | impl | `routes/admin/admin_orders.py` |
| `POST` | `/api/admin/sales-orders/<int:bo_so_id>/cancel-backorder` | impl | `routes/admin/admin_orders.py` |
| `POST` | `/api/admin/sales-orders/<int:so_id>/admin-pick` | impl | `routes/admin/admin_orders.py` |
| `POST` | `/api/admin/sales-orders/<int:so_id>/admin-ship` | impl | `routes/admin/admin_orders.py` |
| `POST` | `/api/admin/sales-orders/<int:so_id>/cancel` | impl | `routes/admin/admin_orders.py` |
| `POST` | `/api/admin/sales-orders/<int:so_id>/create-rma` | impl | `routes/admin/admin_orders.py` |
| `POST` | `/api/admin/sales-orders/<int:so_id>/lines` | impl | `routes/admin/admin_orders.py` |
| `POST` | `/api/admin/sales-orders/<int:so_id>/partial-fulfill` | impl | `routes/admin/admin_orders.py` |
| `POST` | `/api/admin/sales-orders/<int:so_id>/push-to-queue` | impl | `routes/admin/admin_orders.py` |
| `POST` | `/api/admin/sales-orders/<int:so_id>/receive-return` | impl | `routes/admin/admin_orders.py` |
| `POST` | `/api/admin/sales-orders/<int:so_id>/revert-status` | impl | `routes/admin/admin_orders.py` |
| `POST` | `/api/admin/sales-orders/<int:so_id>/void-return` | impl | `routes/admin/admin_orders.py` |
| `POST` | `/api/admin/sales-orders/mark-printed` | impl | `routes/admin/admin_orders.py` |
| `POST` | `/api/admin/tokens` | partial | `routes/admin/admin_tokens.py` |
| `POST` | `/api/admin/tokens/<int:token_id>/revoke` | partial | `routes/admin/admin_tokens.py` |
| `POST` | `/api/admin/tokens/<int:token_id>/rotate` | partial | `routes/admin/admin_tokens.py` |
| `POST` | `/api/admin/transfer-orders/<int:to_id>/approvals/<int:approval_id>/approve` | missing | `routes/admin/admin_transfer_orders.py` |
| `POST` | `/api/admin/transfer-orders/<int:to_id>/approvals/<int:approval_id>/reject` | missing | `routes/admin/admin_transfer_orders.py` |
| `POST` | `/api/admin/transfer-orders/<int:to_id>/cancel` | missing | `routes/admin/admin_transfer_orders.py` |
| `POST` | `/api/admin/transfer-orders/<int:to_id>/lines/<int:line_id>/short-close` | missing | `routes/admin/admin_transfer_orders.py` |
| `POST` | `/api/admin/transfer-orders/<int:to_id>/start-picking` | missing | `routes/admin/admin_transfer_orders.py` |
| `POST` | `/api/admin/transfer-orders/import` | missing | `routes/admin/admin_transfer_orders.py` |
| `POST` | `/api/admin/users` | partial | `routes/admin/admin_users.py` |
| `POST` | `/api/admin/vendors` | impl | `routes/admin/admin_vendors.py` |
| `POST` | `/api/admin/warehouses` | impl | `routes/admin/admin_warehouse.py` |
| `POST` | `/api/admin/webhooks` | partial | `routes/admin/admin_webhooks.py` |
| `POST` | `/api/admin/webhooks/<subscription_id>/replay-batch` | partial | `routes/admin/admin_webhooks.py` |
| `POST` | `/api/admin/webhooks/<subscription_id>/replay/<int:delivery_id>` | partial | `routes/admin/admin_webhooks.py` |
| `POST` | `/api/admin/webhooks/<subscription_id>/rotate-secret` | partial | `routes/admin/admin_webhooks.py` |
| `POST` | `/api/admin/zones` | impl | `routes/admin/admin_warehouse.py` |
| `POST` | `/api/auth/change-password` | auth | `routes/auth.py` |
| `POST` | `/api/auth/login` | auth | `routes/auth.py` |
| `POST` | `/api/auth/logout` | auth | `routes/auth.py` |
| `POST` | `/api/auth/refresh` | auth | `routes/auth.py` |
| `POST` | `/api/inventory/cycle-count/create` | partial | `routes/inventory.py` |
| `POST` | `/api/inventory/cycle-count/submit` | partial | `routes/inventory.py` |
| `POST` | `/api/packing/complete` | impl | `routes/packing.py` |
| `POST` | `/api/packing/verify` | impl | `routes/packing.py` |
| `POST` | `/api/picking/cancel-batch` | impl | `routes/picking.py` |
| `POST` | `/api/picking/complete-batch` | impl | `routes/picking.py` |
| `POST` | `/api/picking/confirm` | impl | `routes/picking.py` |
| `POST` | `/api/picking/create-batch` | impl | `routes/picking.py` |
| `POST` | `/api/picking/short` | impl | `routes/picking.py` |
| `POST` | `/api/picking/wave-create` | impl | `routes/picking.py` |
| `POST` | `/api/picking/wave-validate` | impl | `routes/picking.py` |
| `POST` | `/api/putaway/confirm` | impl | `routes/putaway.py` |
| `POST` | `/api/putaway/update-preferred` | impl | `routes/putaway.py` |
| `POST` | `/api/receiving/cancel` | impl | `routes/receiving.py` |
| `POST` | `/api/receiving/receive` | impl | `routes/receiving.py` |
| `POST` | `/api/shipping/fulfill` | impl | `routes/shipping.py` |
| `POST` | `/api/transfers/move` | impl | `routes/transfers.py` |
| `POST` | `/api/v1/dockd/orders/<so_number>/ship` | partial | `routes/dockd.py` |
| `POST` | `/api/v1/dockd/orders/<so_number>/void-ship` | partial | `routes/dockd.py` |
| `POST` | `/api/v1/events/ack` | partial | `routes/polling.py` |
| `POST` | `/api/v1/pos/checkout` | partial | `routes/pos.py` |
| `POST` | `/api/v1/pos/reference-orders` | partial | `routes/pos.py` |
| `POST` | `/api/v1/pos/refund` | partial | `routes/pos.py` |
| `POST` | `/api/v1/pos/validate-cart` | partial | `routes/pos.py` |
| `PUT` | `/api/admin/bins/<int:bin_id>` | impl | `routes/admin/admin_warehouse.py` |
| `PUT` | `/api/admin/items/<int:item_id>` | impl | `routes/admin/admin_items.py` |
| `PUT` | `/api/admin/preferred-bins/<int:preferred_bin_id>` | impl | `routes/admin/admin_items.py` |
| `PUT` | `/api/admin/purchase-orders/<int:po_id>` | impl | `routes/admin/admin_orders.py` |
| `PUT` | `/api/admin/sales-orders/<int:so_id>` | impl | `routes/admin/admin_orders.py` |
| `PUT` | `/api/admin/settings` | missing | `routes/admin/admin_users.py` |
| `PUT` | `/api/admin/users/<int:user_id>` | partial | `routes/admin/admin_users.py` |
| `PUT` | `/api/admin/users/<int:user_id>/permissions` | partial | `routes/admin/admin_users.py` |
| `PUT` | `/api/admin/vendors/<uuid:canonical_id>` | impl | `routes/admin/admin_vendors.py` |
| `PUT` | `/api/admin/warehouses/<int:warehouse_id>` | impl | `routes/admin/admin_warehouse.py` |
| `PUT` | `/api/admin/zones/<int:zone_id>` | impl | `routes/admin/admin_warehouse.py` |
| `PUT` | `/api/v1/dashboard/preferences` | missing | `routes/dashboard.py` |

## Orden de implementación (PrismaTec-Core debajo, contrato Flask arriba)

1. Rutas que el admin/mobile llaman en el flujo diario (auth, catálogo, SO/PO, receiving→shipping).
2. Listados admin que hoy son `missing` (connectors, channels, transfer-orders, adjustments…).
3. `/api/v1/*` con los mismos scopes de WMS token.
4. Fixtures diferenciales request/response en CI.
5. Proxy de lab y E2E real antes de declarar sustituto.

## Rutas solo-gemelo (no del original)

- `/api/twin/*` — operación del nodo PrismaTec-Core; el frontend original no debe depender de ellas.


## Actualización AUD-0026

Los prefijos que estaban en `missing` para el panel admin y dashboard v1 **ya no devuelven 404**: tienen handlers en `admin_extended.go` / `dashboardV1` con persistencia PrismaTec-Core.

Importante: la **paridad de negocio profunda** (misma validación SQLAlchemy, mismos jobs, mismos side-effects que Flask) sigue refinándose. Lo crítico para conmutar el frontend —**mismos paths y métodos sin 404**— queda cubierto para el inventario Flask bajo `/api/admin/*` extendido, `/api/warehouses/list` y `/api/v1/dashboard/*`.
