# Fase 05 — Purchase Orders

## Propósito

Porto las órdenes de compra antes de implementar la recepción física. Uso como referencia `api/routes/admin/admin_orders.py` y `api/schemas/purchase_orders.py`.

## Rutas implementadas

| Método | Ruta |
|---|---|
| GET / POST | `/api/admin/purchase-orders` |
| GET / PUT | `/api/admin/purchase-orders/{po_id}` |
| POST | `/api/admin/purchase-orders/{po_id}/lines` |
| PATCH / DELETE | `/api/admin/purchase-orders/{po_id}/lines/{po_line_id}` |
| POST | `/api/admin/purchase-orders/{po_id}/close` |
| POST | `/api/admin/purchase-orders/{po_id}/reopen` |

## Modelo y persistencia

Cada PurchaseOrder es un agregado persistido en un organismo `purchase-orders.{po_id}`. Las líneas están embebidas en el mismo documento, de modo que modificar una línea y recalcular el estado del header se resuelve con un único append Core. Los IDs de PO y PO line se reservan en organismos de secuencia separados; un fallo puede consumir IDs y dejar huecos, pero no reutilizarlos.

El modelo guarda número/barcode, vendor name, estado, fecha esperada, warehouse, notas, creador, timestamps, external ID y líneas. Cada línea guarda item, line number, ordered/received, coste y estado.

## Reglas

- Warehouse e items deben existir.
- PO number es único.
- No repito el mismo item dentro de una PO.
- La PO debe contener al menos una línea.
- Cantidades ordenadas deben ser positivas y no superar 1,000,000.
- Coste unitario no puede ser negativo.
- Fecha esperada admite ISO `YYYY-MM-DD`.
- Line number se asigna automáticamente cuando no se indica.
- Una línea con quantity_received > 0 no se elimina.
- quantity_ordered no puede reducirse por debajo de quantity_received.
- CLOSED y ARCHIVED bloquean cambios de cabecera/líneas.
- ARCHIVED solo se alcanza desde CLOSED.
- Reopen solo acepta CLOSED.
- Estado de línea: PENDING si no hay recibos, PARTIAL si hay recibos insuficientes, RECEIVED si quantity_received alcanza quantity_ordered.
- Estado de PO: OPEN sin recibos, PARTIAL con recibos parciales, RECEIVED si todas las líneas están completas.

## Seguridad

Las rutas requieren JWT/cookie, CSRF para mutaciones con cookie y page permission `purchase-orders`. La colección aplica warehouse scope; las rutas por ID recuperan el PO y verifican que el usuario tenga acceso a su warehouse.

## Límites

- No están implementadas todavía las rutas de receipts, unreceive, receiving mobile, cancel receiving ni putaway.
- No existe aún auditoría WMS, outbox ni eventos de cambio de PO.
- El agregado PO no replica el esquema SQL de tablas separadas, aunque conserva el contrato HTTP principal.
- Los errores y null semantics no están igualados con Pydantic.
- No hay fixtures diferenciales Flask/Go.
- El módulo de compras no se debe conectar al frontend hasta completar receiving/putaway y las demás rutas.

## Pruebas

Incluyo tests de creación, secuencia de líneas, PO number duplicado, item repetido, edición de cantidades, bloqueo CLOSED, reopen, borrado de línea sin recibos y rutas HTTP.
