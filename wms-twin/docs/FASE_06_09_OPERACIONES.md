# Fases 06–09 — Operaciones de almacén (primera persona)

Documento el corte que implementé para acercar el gemelo al contrato del frontend.

## Rutas añadidas

### Receiving / Put-away
- GET `/api/receiving/po/<barcode>`
- POST `/api/receiving/receive`
- POST `/api/receiving/cancel`
- GET `/api/putaway/pending/<warehouse_id>`
- GET `/api/putaway/suggest/<item_id>`
- POST `/api/putaway/confirm`

### Sales orders (admin)
- GET/POST `/api/admin/sales-orders`
- GET `/api/admin/sales-orders/{id}`

### Picking
- GET `/api/picking/active-batch`
- POST `/api/picking/create-batch`
- GET `/api/picking/batch/{id}`
- GET `/api/picking/batch/{id}/next`
- POST `/api/picking/confirm`
- POST `/api/picking/short`
- POST `/api/picking/complete-batch`
- POST `/api/picking/cancel-batch`

### Packing / Shipping
- GET `/api/packing/order/<barcode>`
- POST `/api/packing/verify`
- POST `/api/packing/complete`
- GET `/api/shipping/order/<barcode>`
- POST `/api/shipping/fulfill`

## Estado

Parcial. No sustituyo el backend Flask. Wave-picking, backorders y diferencial de fixtures siguen pendientes.
