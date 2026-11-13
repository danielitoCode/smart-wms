# Fase 03 — Catálogo maestro WMS

## Propósito

Porto primero almacenes, zonas y bins porque son las entidades que dan contexto físico a recepción, putaway, picking, inventario y transferencias. Tomo como contrato de referencia el blueprint Flask `api/routes/admin/admin_warehouse.py` y los schemas `warehouses.py`, `zones.py` y `bins.py`. El prefijo real del blueprint es `/api/admin`.

## Arquitectura

- `internal/application/catalog`: modelos, validaciones, relaciones, secuencias e invariantes de catálogo.
- `internal/httpapi/catalog.go`: rutas HTTP compatibles en método y path.
- `internal/httpapi/server.go`: conecta el repositorio al runtime y monta el prefijo.
- `corestore.Store`: persiste cada entidad como organismo Core independiente.
- `inventoryledger.Ledger`: consulta balances al validar borrados.

No introduzco SQL, PostgreSQL, SQLite ni Redis en el gemelo. PrismaTec-Core sigue siendo una dependencia externa.

## Rutas

| Método | Ruta | Contrato |
|---|---|---|
| GET | `/api/admin/warehouses` | Colección paginada |
| POST | `/api/admin/warehouses` | Crear warehouse, 201 |
| GET | `/api/admin/warehouses/{id}` | Warehouse y zonas |
| PUT | `/api/admin/warehouses/{id}` | Actualizar campos permitidos |
| DELETE | `/api/admin/warehouses/{id}` | Borrado sujeto a dependencias |
| GET | `/api/admin/zones` | Colección, filtro `warehouse_id` |
| POST | `/api/admin/zones` | Crear zona, 201 |
| PUT | `/api/admin/zones/{id}` | Actualizar zona |
| DELETE | `/api/admin/zones/{id}` | Rechaza zonas con bins |
| GET | `/api/admin/bins` | Filtros warehouse, zone, type y búsqueda |
| POST | `/api/admin/bins` | Crear bin, 201 |
| GET | `/api/admin/bins/{id}` | Bin y balances asociados |
| PUT | `/api/admin/bins/{id}` | Actualizar campos permitidos |
| DELETE | `/api/admin/bins/{id}` | Rechaza bins con stock |

Las tres colecciones aceptan `page` y `per_page` (máximo 1000) y devuelven `total`, `page`, `per_page` y `pages`.

## Reglas aplicadas

1. Warehouse: código y nombre obligatorios; límites 32 y 256; dirección hasta 512; activo por defecto.
2. Zone: debe existir warehouse; código único dentro del warehouse; nombre obligatorio; tipos RECEIVING, STORAGE, PICKING, STAGING o SHIPPING.
3. Bin: warehouse y zone deben existir; la zone debe pertenecer al warehouse; código único dentro del warehouse; barcode único; tipos Staging, PickableStaging o Pickable; límites y secuencias no negativas.
4. Warehouse no se elimina si conserva zones, bins o inventario positivo.
5. Zone no se elimina si conserva bins.
6. Bin no se elimina si conserva stock on-hand o asignado.
7. IDs enteros crecientes se reservan en el organismo `catalog-sequences`; eliminar una entidad no permite reutilizar su ID.
8. Las rutas usan JWT/cookie, CSRF en mutaciones con cookie, permiso de página y warehouse scope. Los usuarios no administradores solo ven almacenes autorizados.

## Diferencias conocidas y límites

- La secuencia y la entidad se escriben en organismos distintos. Un fallo puede consumir un ID y dejar un hueco; no se reutiliza el identificador. No existe transacción distribuida multi-organismo.
- La serialización del repositorio es local al proceso. No coordina dos primarios durante una partición.
- El detalle de bin expone balances con item_id y cantidades, pero todavía no enriquece SKU/nombre: el catálogo de artículos se implementará después.
- La regla de borrado de bin no consulta todavía preferred_bins; esa entidad y su endpoint siguen pendientes. El ledger tampoco purga balances vacíos.
- La validación JSON es estricta con campos desconocidos, mientras Pydantic puede ignorarlos según configuración. Los mensajes/status de errores no están igualados en todos los casos.
- Los patches con valores null no reproducen por completo `model_dump(exclude_unset=True)`.
- Los IDs son enteros compatibles con la forma del frontend, pero no son IDs PostgreSQL ni se han importado todavía desde la base original.
- No existe todavía una prueba diferencial automatizada Flask vs Go.

## Pruebas incorporadas

- Creación y borrado en orden warehouse→zone→bin.
- Rechazo de códigos duplicados.
- Rechazo de zona inexistente y de bin cuyo warehouse no coincide con el warehouse de su zona.
- No reutilización de IDs después de borrar.
- Rechazo de borrado con stock.
- Rutas HTTP con JWT, permisos de página y warehouse scope.

## Cómo probar

Con JWT y datos de prueba ya cargados:

```bash
curl -i -H "Authorization: Bearer $JWT" http://localhost:5001/api/admin/warehouses
curl -i -X POST http://localhost:5001/api/admin/warehouses \
  -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
  -d '{"warehouse_code":"WH-01","warehouse_name":"Main"}'
```

El endpoint técnico `/api/twin/records/*` no es el contrato de negocio. El frontend original no debe cambiar de destino todavía.


## Validación de catálogo

El corte de warehouses/zones/bins pasó WMS twin validation `42974486856`, incluidos gofmt, vet, tests con race detector y guard de documentación/alcance. El código inicial se corrigió tras un fallo de vet por variables sombreadas. El HEAD con formato es `ccf1934b2640feb45df852d515316be73d408de1`.

La suite general del repositorio seguía en ejecución. El frontend original debe continuar conectado al backend Flask hasta completar las demás rutas y las pruebas diferenciales.


## Actualización posterior — catálogo extendido

La Fase 04 ya incorpora preferred bins, por lo que el borrado de bins también comprueba las asignaciones preferidas. El borrado de items se protege ante balances y preferred mappings. Las diferencias históricas SO/PO y los IDs SQL de inventario siguen pendientes porque los módulos de órdenes y el modelo SQL original no existen en el gemelo.
