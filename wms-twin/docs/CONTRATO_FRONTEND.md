# Contrato de integración con los frontends existentes

## Estado

El frontend admin declara `const API_BASE = '/api'`, envía `credentials: 'include'`, lee la cookie `sentry_csrf` y envía `X-CSRF-Token` en mutaciones. La app móvil usa `EXPO_PUBLIC_API_URL`, Bearer JWT desde secure storage y permite cambiar la URL en runtime.

## Estrategia sin modificar el frontend

1. Mantengo frontend y componentes originales sin cambios.
2. Ejecuto Flask y Go en puertos distintos.
3. Para probar el gemelo, configuro el reverse proxy para que `/api` apunte al puerto :5001.
4. Para volver al original, cambio el upstream a :5000.
5. Mobile cambia su API URL por configuración runtime/deployment.

La conmutación de upstream no demuestra compatibilidad. No dirijo tráfico real al gemelo hasta cerrar autenticación y rutas.

## Diferencias verificadas

- Admin: `admin/src/api.js` fija `API_BASE = '/api'`.
- Admin: cookies `sentry_auth` y `sentry_csrf`; mutaciones con `X-CSRF-Token`.
- Mobile: `mobile/src/api/client.js` envía Bearer JWT desde almacenamiento seguro.
- Original: `POST /api/auth/login` devuelve token y usuario, y establece cookies HttpOnly/CSRF.
- Original: revalida usuario activo, rol, almacenes y permisos.
- Gemelo: `/api/twin/*` usa Bearer técnico independiente. No es compatible con los clientes.

## Inventario técnico del gemelo

Se añadieron endpoints técnicos para consultar balances y ejecutar adjust/allocate/release/move. Requieren `WMS_TWIN_API_TOKEN` y `operation_id`. No reproducen `/api/transfers/move`, no usan el JWT de usuario y no deben conectarse desde el frontend original.

## Estado de implementación

La autenticación base ya está conectada: JWT HS256 de ocho horas, cookies HttpOnly SameSite Strict, doble envío CSRF, estado activo, invalidación por cambio de contraseña, forced password change, lockout persistente y autorización por rol/página/almacén. La primera porción de rutas de negocio también está portada: warehouses, zones y bins bajo `/api/admin`.

## Próxima implementación

Completar catálogo de items, preferred bins y vendors; después purchase orders/receiving/putaway, inventario operativo, picking/packing/shipping, conteos/transferencias, usuarios/tokens, eventos/snapshots, conectores y webhooks. Cada ruta se compara con fixtures del backend original antes de habilitar el frontend. No hay paridad global todavía.


## Estado de implementación actualizado

La autenticación y el primer catálogo (warehouses/zones/bins) ya no son tareas futuras: ambos están implementados y la Fase 03 pasó CI. La Fase 04 añade items, preferred bins y vendors. El frontend original sigue bloqueado hasta completar los workflows y demostrar paridad con pruebas diferenciales.


## Estado actualizado del contrato frontend

El gemelo ya incluye auth, catálogo maestro y administración de Purchase Orders. El frontend sigue bloqueado: receiving, putaway, receipts/unreceive, inventory overview, sales orders y demás operaciones no están todavía portadas. No cambies la base URL del frontend.


## Nuevos contratos de integración POS y operaciones

### POS checkout

`POST /api/v1/pos/checkout` requiere `idempotency_key`, `warehouse_id`, `external_txn_ref`, `cashier_id`, `terminal_id`, `payment_method`, `subtotal_cents`, `tax_cents`, `total_cents`, `tenders` y `lines`. Cada línea identifica item/SKU, bin, quantity, unit_price_cents, tax_cents y line_total_cents. El backend valida que el total de líneas, los impuestos, envío y tenders cuadren. Repetir el mismo cuerpo con la misma clave devuelve la misma SO e incluye `X-Idempotent-Replay: true`. Reutilizar la clave con otro cuerpo produce conflicto.

Para tender cash, enviar amount_cents, amount_tendered_cents y change_cents. Para card, enviar card_brand, card_last4, auth_code y external_ref. Nunca enviar PAN/CVV. `is_phone_order=true` reserva existencias y deja la SO abierta para picking/packing; una venta de mostrador descuenta existencias y se marca SHIPPED.

### POS refund

`POST /api/v1/pos/refund` requiere `so_number`, `idempotency_key`, `external_refund_ref`, `cashier_id`, `reason`, `payment_method` y `total_cents`. `lines` es opcional: omitido significa devolución de toda la cantidad restante; informado permite devolución parcial por item/bin. El método debe coincidir con el tender original. La devolución completa debe reconciliarse con el saldo monetario restante. El servicio repone inventario y registra la referencia externa; la operación financiera en el adquirente sigue siendo responsabilidad de la integración de pagos externa.

### POS dispatch

`POST /api/v1/pos/dispatch` requiere `so_number`, `carrier`, `tracking_number` e `idempotency_key`. Solo despacha phone orders en estado PICKED/PACKED. El servicio convierte la reserva en salida física y persiste el shipment. Repetir la misma clave/comando devuelve el mismo shipment.

### Dockd void

`POST /api/v1/dockd/ship/{so_number}/void` requiere `reason` e `idempotency_key`. Devuelve la orden al estado previo al envío. No representa recepción física de mercancía: esa operación corresponde a RMA.

### RMA receive-line

`POST /api/v1/rma/{rma_id}/receive-line` recibe `item_id`, `quantity`, `disposition`, `operation_id`, `lot_number` y `bin_id` para RESTOCK. Dispositions permitidas: RESTOCK, SCRAP, HOLD. Cada operation_id es idempotente; la suma recibida no puede superar la cantidad esperada.

### Snapshot restore

`POST /api/v1/snapshots/{snapshot_id}/restore` requiere `operation_id` y `expected_ledger_version`. El cliente debe leer primero el ledger y enviar su versión actual confirmada. Si hay cambios concurrentes desde esa lectura, el servidor devuelve 409. El restore no se debe ofrecer como acción cotidiana ni ejecutarse sin respaldo.

### Webhook outbox

`GET /api/v1/webhooks/deliveries` lista el estado de entregas. `POST /api/v1/webhooks/deliveries/{delivery_id}/retry` permite reintentar una entrada DEAD. Los eventos se entregan al menos una vez; el consumidor debe deduplicar por event_id. El secreto de suscripción se cifra en servidor y no vuelve al frontend.

### Inbound

Cada registro puede incluir `source_system`, `external_id` y `external_version`. La combinación identifica el registro de origen. Repetición idéntica devuelve el resultado anterior; mismo external_version con otro contenido devuelve conflicto. Una versión mayor todavía no aplica update automático.


### Snapshot restore — respaldo previo

El endpoint devuelve `backup_snapshot_id` además del resultado del ledger. El cliente debe conservar ese ID para rollback operativo. Repetir el mismo operation_id devuelve el mismo backup y resultado; usarlo con otro snapshot/versión produce conflicto.


En refund, `shipping_refund_cents` permite devolver el cargo de envío de forma separada. El `total_cents` debe ser exactamente la suma del importe calculado para las cantidades devueltas y `shipping_refund_cents`. Se pueden devolver primero los artículos y después el envío; la SO queda PARTIALLY_REFUNDED hasta que todo el importe original esté devuelto.
