# Fase 04 — Artículos, ubicaciones preferidas y proveedores

## Propósito

Completo el siguiente tramo de datos maestros que necesitan inventario, putaway y compras. Tomo como contrato de referencia `api/routes/admin/admin_items.py`, `api/routes/admin/admin_vendors.py`, `api/schemas/items.py` y `api/schemas/vendors.py`.

## Rutas

| Método | Ruta |
|---|---|
| GET / POST | `/api/admin/items` |
| GET / PUT / DELETE | `/api/admin/items/{item_id}` |
| POST | `/api/admin/items/{item_id}/archive` |
| GET / POST | `/api/admin/preferred-bins` |
| PUT / DELETE | `/api/admin/preferred-bins/{preferred_bin_id}` |
| GET / POST | `/api/admin/vendors` |
| GET / PUT / DELETE | `/api/admin/vendors/{canonical_id}` |

## Artículos

Persisto cada item en un organismo individual. Asigno un ID entero desde `catalog-sequences`, genero un UUID externo y valido SKU único, UPC único cuando está informado, límites de longitud, peso y referencia de default bin. El listado admite `page`, `per_page` (máximo 1000), `category`, `active` y `q`; la búsqueda considera SKU, nombre, UPC, MPN y barcode aliases.

El bin predeterminado que se muestra en la lista se calcula así: preferred bin de prioridad 1 si existe; en caso contrario `default_bin_id`. El endpoint archive invierte `is_active` y devuelve el mensaje Item archived/Item restored.

El detalle incluye item, balances de ledger y preferred bins. No puedo emitir `inventory_id` SQL porque el ledger no modela filas SQL independientes; tampoco tengo todavía el join a SO/PO ni lot/serial completo del backend original.

## Ubicaciones preferidas

Guardo todas las relaciones en el organismo único `preferred-bins/global`. Cada alta o cambio de prioridad carga el agregado, aplica la mutación, resecuencia el artículo y persiste el estado completo con un append. Esto evita que una misma operación de reordenamiento se disperse entre varios organismos.

- Un item y un bin deben existir.
- Solo acepto bins `Pickable`; rechazo `Staging` y `PickableStaging`.
- La relación item+bin funciona como upsert.
- Las prioridades se convierten en una secuencia estricta 1..K, sin empates.
- GET admite filtros `item_id`, `bin_id` y `q`.
- PUT cambia prioridad; DELETE elimina la relación y compacta prioridades.

La escritura única hace atómica la actualización del agregado dentro del organismo Core, pero no aporta consenso distribuido ni exclusión entre nodos particionados.

## Proveedores

Cada proveedor tiene UUID `canonical_id` y `external_id`, nombre, contacto, email, teléfono, direcciones, tax ID, payment terms, estado y timestamps. GET colección admite búsqueda por nombre/contacto/email, estado activo y paginación. GET detalle devuelve `{"vendor": ...}`; POST y PUT también envuelven el proveedor; DELETE devuelve `{"deleted": true}`.

## Reglas y límites

- Item delete se rechaza si el ledger conserva cualquier balance del artículo, incluso vacío, o si tiene preferred mappings. No reutilizo IDs.
- Todavía no puedo comprobar historial SO/PO porque esos agregados no están portados. Al implementar órdenes, debo añadir sus restricciones antes de declarar paridad del borrado.
- Vendor delete todavía no consulta referencias a PO; esa relación se incorporará con el módulo de compras.
- Los campos opcionales con JSON null no reproducen exactamente `model_dump(exclude_unset=True)`.
- Item detail devuelve balances con item/bin/quantities, no `inventory_id` SQL ni todos los metadatos originales.
- No existe prueba diferencial automática Flask vs Go.

## Pruebas añadidas

Pruebo SKU duplicado, bin Pickable, rechazo de staging, resecuencia 1..K, upsert, protección de borrado, archive/restore, UUID de vendor, CRUD de proveedor y rutas HTTP con JWT.

## Estado

Validación CI pendiente. No habilito el frontend hasta completar los demás workflows y pruebas diferenciales.
