# Paridad operativa del gemelo WMS sobre PrismaTec-Core

Escribo esta matriz para distinguir capacidad real, persistencia, validación y equivalencia con Flask. No declaro una feature terminada porque exista una ruta HTTP o una estructura de datos. La condición de equivalencia exige reproducir el contrato externo y sus efectos laterales.

## Estado ejecutivo

**NO SUSTITUIBLE.** El backend Flask sigue siendo la referencia funcional y permanece intacto. El gemelo Go vive en `wms-twin/` y usa PrismaTec-Core como persistencia subyacente. La rama `fix/wms-twin-operational-completion` parte del commit `18c389e691d25e8366516835402a6f5efcaf2e1d`.

## Matriz de capacidades

| Dominio | Implementación actual | Validación/garantía | Estado de paridad |
|---|---|---|---|
| Runtime/Core | Nodo PrismaTec-Core, AIP separado, API WMS | Arranque y pruebas técnicas previas | Parcial; contratos externos distintos |
| Auth | JWT/cookies/CSRF, identidad persistente y WMS tokens scoped | Tests internos; falta fixture diferencial completo | Parcial |
| Catálogo | Warehouses, zones, bins, items, vendors, preferred bins | Validaciones y CRUD del gemelo | Alta en núcleo; no equivalencia completa |
| Purchase Orders | PO y líneas en agregado persistente; close/reopen/update | Tests de ciclo de vida y rutas | Parcial; receipts y audit/eventos pendientes |
| Receiving/Put-away | Recepción/putaway sobre PO y ledger | Flujos del gemelo | Parcial; falta paridad móvil, cancelación y receipts históricos |
| Inventory | Ledger global Core: adjust/allocate/release/move | Idempotencia por operation_id y mutex de proceso | Parcial; no transacción ni quorum multinodo |
| Picking/Waves | Batch/tasks, wave validate/create, pick confirm/short/complete/cancel | Flujos de laboratorio | Parcial; asignación/rollback y edge cases pendientes |
| Packing/Shipping | Verificación, complete pack y fulfill | Dockd ahora propaga error y no envía pedidos no aptos | Parcial; DTO/idempotencia/auditoría Flask pendiente |
| Dockd void-ship | No se declara éxito sin reversión persistente | Error explícito | Pendiente |
| POS availability | SKU + warehouse sobre ledger | Valida scope y disponibilidad agregada | Parcial; barcode/contrato original pendiente |
| POS validate-cart | Resuelve item y suma cantidades repetidas | Evita sobreventa por duplicidad de líneas en validación | Parcial |
| POS checkout | Bloqueado con 501 hasta portar tender y compromiso de stock | No crea una SO OPEN haciéndola pasar por venta | Pendiente |
| POS refund/dispatch/reference | Bloqueado con 501 | No emite estados ficticios | Pendiente |
| Inbound items/SO | Crea artículo y Sales Order persistentes | Validación del catálogo/orden | Parcial; mapeo, idempotencia, provenance y auditoría incompletos |
| Inbound PO | Crea PO real y líneas mediante PurchaseOrders Repository | Valida warehouse, artículos, cantidades y duplicados | Parcial; idempotencia/source mapping/receipts pendientes |
| RMA | Expediente persistente, recepción/cancelación | No completa si no se ha dispuesto/restockeado el stock | Parcial |
| Events | Evento Core persistido, estado Published, reintento invocable | Error de mesh no se descarta silenciosamente | Parcial; falta worker y garantías de consumer delivery |
| Webhooks | HTTPS, HMAC, no redirects, bloqueo SSRF al conectar | DNS validado y conexión fijada a IP pública | Parcial; falta outbox durable, retry/DLQ y cifrado del secreto |
| Snapshot | Exportación inventario persistida, versionada y con SHA-256 | GET recalcula y verifica checksum | Parcial; no es restore point transaccional |
| Audit | Cadena SHA-256 con PrevHash y secuencia | Verificación completa antes de append; escritura bloqueada ante corrupción | Parcial; falta anclaje externo y validación multinodo |
| Mesh | Peer table, XOR distance y difusión TTL | Transporte Core; deduplicación local | Experimental; no Kademlia DHT ni GossipSub |

## Contratos de seguridad y consistencia

- El WMS token delimita endpoints/scopes y puede restringirse a un warehouse.
- El ledger exige `operation_id`; el mismo comando puede reproducirse sin duplicar el efecto y el mismo ID con otro comando produce conflicto.
- El mutex del ledger y de los repositorios es local al proceso. No equivale a un lock distribuido ni a una transacción multi-organismo.
- La validación SSRF de webhooks ocurre al conectar y rechaza el conjunto de direcciones si alguna es privada, loopback, link-local, multicast o no especificada. Los redirects están deshabilitados.
- Los secretos webhook todavía se guardan en el organismo sin cifrado en reposo. No se debe exponer el campo en respuestas/listados.
- La cadena de auditoría detecta cambios en el historial persistido; no se debe llamar a esto inmutabilidad frente a un administrador que pueda reescribir todos los organismos.
- El snapshot permite verificar una exportación histórica, pero no restablecer de forma atómica el ledger.

## Evidencia de esta rama

Añadí pruebas unitarias para:
1. Rechazar URLs webhook HTTP, localhost, loopback y secretos débiles; bloquear una conexión loopback.
2. Crear, recuperar y detectar alteración de un snapshot.
3. Verificar una cadena de auditoría válida, detectar manipulación y bloquear nuevos appends.

**Estado de ejecución:** pruebas añadidas, ejecución CI pendiente. No afirmo que hayan pasado hasta revisar los logs de Actions.

## Condición para cerrar la paridad

Para cada endpoint debo:
1. Capturar fixtures request/response del Flask original.
2. Igualar método, ruta, headers, DTO, validaciones, status y errores.
3. Comparar JSON normalizado y comportamiento de permisos/warehouse scope.
4. Verificar efectos laterales en inventario, PO/SO, fulfillment, auditoría y eventos.
5. Probar idempotencia, reintentos, fallos intermedios, concurrencia y reinicio.
6. Ejecutar la misma suite contra Flask y Go.
7. Registrar evidencia reproducible y conservar rollback al backend original.

Hasta cerrar esos puntos, el frontend original no debe cambiar su upstream productivo al gemelo.


## Integraciones transaccionales del corte actual

| Capacidad | Contrato implementado | Condición/límite |
|---|---|---|
| POS checkout | `POST /api/v1/pos/checkout`; idempotency_key, warehouse_id, líneas item/SKU/bin/qty/precio/impuesto, payment_method, tenders, total y external_txn_ref | Stock y SO quedan persistidos; el tender es conciliación y referencia, no captura financiera |
| POS refund | `POST /api/v1/pos/refund`; so_number, idempotency_key, external_refund_ref, cashier_id, reason, payment_method, total_cents, líneas opcionales | Full/partial inventory restock; no llama al adquirente |
| POS dispatch | `POST /api/v1/pos/dispatch`; so_number, carrier, tracking_number, idempotency_key | Solo phone orders con SO en PICKED/PACKED; reserva se convierte en salida de stock |
| Dockd void | `POST /api/v1/dockd/ship/{so_number}/void`; reason e idempotency_key | Recupera estado pre-shipment; no restockea bienes físicamente devueltos |
| RMA receive line | `POST /api/v1/rma/{id}/receive-line`; item_id, quantity, bin_id para RESTOCK, disposition, operation_id | RESTOCK/SCRAP/HOLD; cantidad limitada a lo esperado |
| Snapshot restore | `POST /api/v1/snapshots/{id}/restore`; operation_id y expected_ledger_version | Restore de un organismo ledger; no distributed CAS |
| Webhook deliveries | `GET /api/v1/webhooks/deliveries`; `POST /api/v1/webhooks/deliveries/{id}/retry` | Retry manual solo para DEAD; worker automático procesa PENDING/RETRY |
| Inbound | `POST /api/v1/inbound`; source_system y external_id/version en cada registro | Repetición exacta idempotente; versión nueva no se actualiza todavía |
| Mesh | LibP2PTransport inicia DHT Kademlia y GossipSub | Otros transportes mantienen fallback TTL |

### POS checkout request de referencia

```json
{
  "warehouse_id": 1,
  "idempotency_key": "terminal-01-transaction-0001",
  "external_txn_ref": "processor-reference",
  "cashier_id": "cashier-01",
  "terminal_id": "terminal-01",
  "payment_method": "cash",
  "subtotal_cents": 2000,
  "tax_cents": 200,
  "shipping_cents": 0,
  "total_cents": 2200,
  "tenders": [
    {"type": "cash", "amount_cents": 2200, "amount_tendered_cents": 2200, "change_cents": 0}
  ],
  "lines": [
    {"sku": "SKU-001", "item_id": 1, "bin_id": 2, "quantity": 2, "unit_price_cents": 1000, "tax_cents": 200, "line_total_cents": 2200}
  ]
}
```

Para tarjeta solo envío marca, last4, auth_code y external_ref. No enviar PAN ni CVV.

### Configuración operativa de webhooks

Configuro `SENTRY_ENCRYPTION_KEY` o `WMS_WEBHOOK_ENCRYPTION_KEY` como base64 de exactamente 32 bytes. Sin esta clave, la creación de una suscripción falla de forma explícita. Los secretos no se devuelven en respuestas ni listados.

### Advertencias de consistencia

- La saga POS recupera los movimientos por operation_id y compensa movimientos parciales conocidos. La protección es local al proceso/CoreStore; no reemplaza una transacción distribuida con fencing multinodo.
- El outbox de webhooks es al menos una vez. Los consumidores deben deduplicar por event_id.
- La restauración de snapshots requiere una ventana operativa controlada y respaldo externo; expected_ledger_version no es compare-and-swap distribuido.
- La idempotencia inbound cubre repetición exacta y recuperación por claves naturales; no acepta todavía una external_version nueva como UPSERT.
- Kademlia/GossipSub solo está activo sobre LibP2PTransport; no atribuyo esas garantías al adapter TCP.


## Recuperación y red

Snapshot Restore realiza primero un respaldo persistente del estado actual y devuelve `backup_snapshot_id`. La operación queda registrada por operation_id y se puede reintentar sin crear otro backup. El runtime exige que Kademlia/GossipSub arranquen cuando Core expone LibP2PTransport. Para activarlo se configura `PRISMATEC_TRANSPORT=libp2p` y `PRISMATEC_NETWORK_ADDR` como multiaddr; con TCP el fallback sigue siendo TTL fan-out. El dispatcher de eventos recorre el log persistido y repara la creación de deliveries webhook con el timestamp original.


El refund calcula el importe proporcional por artículo/bin usando el valor de línea original y las cantidades ya devueltas; `shipping_refund_cents` permite devolver el envío en una operación separada. El estado PARTIALLY_REFUNDED permite completar la devolución financiera en varias operaciones. RMA descuenta las cantidades ya devueltas por POS y las reservadas por RMAs activos/completados, evitando volver a recibir dos veces la misma unidad.
