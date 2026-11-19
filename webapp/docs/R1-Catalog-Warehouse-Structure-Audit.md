# R1 — Auditoría de catálogo y estructura física del almacén

Fecha: 2026-11-19  
Rama: `svelte-webapp`  
HEAD auditado: `a747e53572fd8f834d314fd61d518cc3f5512627`  
Ámbito: exclusivamente `webapp/`. Flask y React se inspeccionan como referencias; no se modifican.

## 1. Resultado ejecutivo

R1 parte de implementaciones existentes, no de módulos vacíos. Svelte ya contiene capas Domain/Data/UI y pruebas para Items, Warehouses, Zones y Bins. La prioridad es verificar paridad y corregir contratos/estados/aislamiento, no duplicar features.

Estado de esta auditoría: **contratos principales inspeccionados; R1 todavía no certificado**. La inspección de código fuente Flask no equivale a ejecutar pruebas backend ni autoriza cambios en Flask.

## 2. Contratos Flask verificados

### Items — `api/routes/admin/admin_items.py`, `api/schemas/items.py`

| Operación | Contrato observado | Permiso / alcance |
|---|---|---|
| Listar | GET `/api/admin/items?page=&per_page=&category=&active=&q=` | `items`; catálogo global, no filtra por almacén |
| Detalle | GET `/api/admin/items/{id}` | `items`; incluye `item`, `inventory[]`, `preferred_bins[]` |
| Crear | POST `/api/admin/items` | `items`; 201 |
| Actualizar | PUT `/api/admin/items/{id}` | `items`; 200 |
| Archivar/restaurar | POST `/api/admin/items/{id}/archive` | `items`; alterna `is_active` |
| Eliminar | DELETE `/api/admin/items/{id}` | `items`; 400 ante dependencias |

Filtros reales del listado: `q` busca SKU, nombre, UPC, MPN y barcode aliases; `category` es exacta; `active=true|false`. Paginación: `page`, `per_page` (máximo 1000), respuesta `items,total,page,per_page,pages`.

Campos de escritura admitidos: `sku`, `item_name`, `description`, `upc`, `mpn`, `category`, `weight_lbs`, `default_bin_id`, `reorder_point`, `reorder_qty`, `is_active` (según Create/Update schema; creación no admite todos los campos de Update). El detalle además expone `barcode_aliases`, dimensiones, trazabilidad por lote/serie y fechas, pero no todos esos campos son editables por estos schemas.

**Dependencias de borrado observadas:** Flask rechaza con 400 si existe inventario con cantidad en mano positiva, historial de líneas SO o historial de líneas PO. Si pasa esos controles, elimina preferred bins, cycle count lines, inventory adjustments, inventory e item. No se ha demostrado que el endpoint compruebe todas las referencias operativas que enumera el objetivo R1 (por ejemplo, tareas o movimientos adicionales); esto es una limitación del servidor, no una tarea backend de esta migración. La UI debe mostrar el error real y no prometer que el chequeo previo es exhaustivo.

**Alcance de almacén:** listado y detalle de Items son globales; el detalle consulta inventario/preferred bins sin filtro por warehouse. El catálogo global es consistente con React, pero la UI debe hacer explícito cuándo muestra existencias/ubicaciones de todos los almacenes y no presentarlas como si pertenecieran al almacén activo.

**Unidad de medida:** no aparece campo UOM en `CreateItemRequest`, `UpdateItemRequest`, listado ni detalle de Items inspeccionados. No añadir ni enviar una propiedad UOM supuesta. Clasificación: `BACKEND_LIMITATION` / contrato futuro pendiente de evidencia.

### Warehouses — `api/routes/admin/admin_warehouse.py`, `api/routes/warehouses.py`

- GET `/api/admin/warehouses?page=&per_page=`: listado administrativo paginado, grant `warehouses`; incluye activos e inactivos.
- GET `/api/admin/warehouses/{id}`: detalle `warehouse` + `zones[]`.
- POST `/api/admin/warehouses`: crear con `warehouse_code`, `warehouse_name`, `address?`.
- PUT `/api/admin/warehouses/{id}`: actualizar `warehouse_code`, `warehouse_name`, `address`, `is_active`.
- DELETE `/api/admin/warehouses/{id}`: rechaza si hay inventario con cantidad en mano positiva, bins o zones; responde 400.
- GET `/api/warehouses/list`: lista solo almacenes activos y aplica `warehouse_scope_clause`; respuesta `warehouses:[{id,name,code}]`. Es el endpoint de selección operativa, distinto del listado administrativo.

El borrado de almacén no se debe habilitar como operación garantizada por una consulta previa frontend: el servidor es autoridad y la UI debe conservar/motrar el error de dependencias.

### Zones — `api/routes/admin/admin_warehouse.py`, `api/schemas/zones.py`

- GET `/api/admin/zones?warehouse_id=&page=&per_page=`: requiere grant `zones`; admite almacén opcional, valida acceso al almacén cuando se indica y aplica scope de almacén; devuelve `zones[]`, `total,page,per_page,pages`, y `bins_count`.
- POST `/api/admin/zones`: requiere `warehouse_id,zone_code,zone_name,zone_type`; valida existencia y acceso al almacén.
- PUT `/api/admin/zones/{id}`: actualiza código/nombre/tipo/activo; valida scope y código duplicado.
- DELETE `/api/admin/zones/{id}`: 409 si contiene bins.

Tipos admitidos: `RECEIVING`, `STORAGE`, `PICKING`, `STAGING`, `SHIPPING`.

### Bins — `api/routes/admin/admin_warehouse.py`, `api/schemas/bins.py`

- GET `/api/admin/bins?warehouse_id=&zone_id=&bin_type=&q=&page=&per_page=`: requiere grant `bins`; valida paginación y aplica warehouse scope. `q` busca `bin_code` y `bin_barcode`. `per_page` máximo 1000.
- GET `/api/admin/bins/{id}`: detalle de bin e inventario.
- POST `/api/admin/bins`: requiere `zone_id,warehouse_id,bin_code,bin_barcode,bin_type` y campos opcionales de posición/secuencia/capacidad; valida relación zona/almacén y acceso.
- PUT `/api/admin/bins/{id}`: actualiza datos, estado, zona y capacidad; aplica warehouse scope y verifica que la zona destino pertenezca al almacén del bin.
- DELETE `/api/admin/bins/{id}`: aplica warehouse scope; responde 409 si hay inventario con cantidad en mano positiva o preferred-bin mappings. Si pasa, elimina filas de inventario y el bin.

Tipos admitidos: `Staging`, `PickableStaging`, `Pickable`. Campos de capacidad reales: `max_weight_lbs`, `max_volume_cuft` (decimal, no negativo, máximo dos decimales). La UI debe distinguir capacidad configurada de ocupación calculada; no inventar validación de compatibilidad item-bin que el servidor no exponga.

## 3. Paridad React observada

Las páginas React originales están en `admin/src/pages/Items.jsx`, `Bins.jsx`, `Zones.jsx`, `Warehouses.jsx`.

- Items: búsqueda con debounce, filtro activo/archivado/todos, páginas de 50, detalle con inventario y preferred bins, crear/editar, archivar/restaurar y eliminar con confirmación.
- Bins: depende de almacén activo; búsqueda por código/barcode, páginas de 50, exportación CSV, consulta de zonas, detalle con inventario, alta/edición/borrado.
- Warehouses: CRUD administrativo, edición de activo/inactivo y borrado con error del servidor.
- Zones: gestión asociada a almacén, CRUD y restricciones por bins dependientes.

La paridad debe incluir los flujos y errores, no solo la existencia de pantallas.

## 4. Implementación Svelte existente localizada

- Items: `core/feature/items/{domain,data,ui}`; DTO, mapper, datasource, repository, casos de uso (incluidos archive/delete), pantalla y estado.
- Warehouses/Zones/Bins: `core/feature/warehouses/{domain,data,ui}`; entidades, DTO, mappers, datasource, repositorios, casos de uso CRUD, workspace y estados.
- Contexto: `core/infrastructure/warehouse/WarehouseRequestScope.ts`, `WarehouseContext`, `ZoneContext`, selección de almacén y `WarehousePicker`.
- Pruebas existentes: unitarias de Items, Warehouses, Zones, Bins, mappers, repositorios, casos de uso y estados; integración de Items y Preferred Bins.

## 5. Hallazgos y clasificación inicial

| Hallazgo | Clasificación | Tratamiento frontend |
|---|---|---|
| UOM no está en el contrato Items inspeccionado | BACKEND_LIMITATION / UNVERIFIED_CONTRACT | No enviar UOM; no mostrar valor inventado |
| Flask no demuestra chequeo exhaustivo de todas las referencias de Item/Bin | BACKEND_LIMITATION | Tratar respuesta de borrado como autoridad; mostrar 400/409 real; no afirmar que frontend garantiza ausencia de referencias |
| Items y detalle de inventario son globales, no warehouse-scoped | Contrato observado | Etiquetar catálogo global y hacer explícito el alcance de inventario; no filtrar silenciosamente datos como si fueran del almacén activo |
| Bins/Zones requieren scope por almacén | Contrato observado | Exigir contexto explícito para workspace; invalidar cargas/selecciones al cambiar almacén; cubrir IDs de otro almacén en pruebas |
| Capacidad de bin sí está soportada por Flask | Contrato observado | Mantener max_weight/max_volume y distinguirlos de capacidad disponible/ocupación |
| UOM y compatibilidad Item-Bin no están demostrados | BACKEND_LIMITATION / UNVERIFIED_CONTRACT | No implementar reglas ficticias ni bloquear por datos ausentes |

## 6. Próximas tareas frontend para cerrar R1

1. Completar comparación campo por campo entre pantallas React y Svelte, incluidos formularios, filtros, detalle, confirmaciones, CSV y estados de error.
2. Auditar `WarehouseWorkspaceScreen`, sus estados y repositorios para garantizar que todas las lecturas y mutaciones de bins/zones llevan el almacén activo y que se descartan respuestas obsoletas al cambiarlo.
3. Revisar Item detail para que el inventario global se identifique como global o se limite a una vista explícitamente global; nunca inferir pertenencia al almacén activo.
4. Alinear DTO/mappers estrictamente con payloads reales: eliminar tolerancias a formatos alternativos no usados por Flask cuando no tengan consumidor contractual.
5. Probar paginación y filtros reales, errores de duplicados, 400/404/409, permisos separados `items`, `warehouses`, `zones`, `bins` y aislamiento entre almacenes.
6. Confirmar que la UI de bins expone y persiste capacidad física real, sin derivar reglas de compatibilidad no disponibles.
7. Ejecutar exclusivamente check, build y suites frontend de `webapp/`; registrar HEAD y resultados.

## 7. Criterio de cierre R1

R1 no se cierra hasta demostrar paridad React donde Flask soporta la operación, contratos DTO/mappers correctos, filtros/paginación, guards de permisos, aislamiento por almacén para zonas/bins, tratamiento explícito del catálogo global de Items, errores de dependencias y pruebas frontend de regresión. No se exige ni se realiza implementación o certificación de backend.
