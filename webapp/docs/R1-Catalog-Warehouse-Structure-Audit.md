# R1 — Auditoría de catálogo y estructura física del almacén

Fecha: 2026-11-19  
Rama: `svelte-webapp`  
HEAD auditado inicialmente: `a747e53572fd8f834d314fd61d518cc3f5512627` (revisión de seguimiento: ver commit más reciente en GitHub)  
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

- GET `/api/admin/warehouses?page=&per_page=`: listado administrativo paginado, grant `warehouses`; incluye activos e inactivos y no aplica el scope operativo de almacenes.
- GET `/api/admin/warehouses/{id}`: detalle `warehouse` + `zones[]`; protegido por grant `warehouses`, no por una comprobación de asignación del usuario al almacén.
- POST `/api/admin/warehouses`: crear con `warehouse_code`, `warehouse_name`, `address?`.
- PUT `/api/admin/warehouses/{id}`: actualizar `warehouse_code`, `warehouse_name`, `address`, `is_active`.
- DELETE `/api/admin/warehouses/{id}`: rechaza si hay inventario con cantidad en mano positiva, bins o zones; responde 400.
- GET `/api/warehouses/list`: lista solo almacenes activos y aplica `warehouse_scope_clause`; respuesta `warehouses:[{id,name,code}]`. Es el endpoint de selección operativa, distinto del listado administrativo.

El borrado de almacén no se debe habilitar como operación garantizada por una consulta previa frontend: el servidor es autoridad y la UI debe conservar/motrar el error de dependencias.

### Zones — `api/routes/admin/admin_warehouse.py`, `api/schemas/zones.py`

- GET `/api/admin/zones?warehouse_id=&page=&per_page=`: requiere grant `zones`; `warehouse_id` es un filtro de consulta, pero el handler no aplica el scope de almacenes asignados al usuario; devuelve `zones[]`, `total,page,per_page,pages`.
- POST `/api/admin/zones`: requiere `warehouse_id,zone_code,zone_name,zone_type`; el handler no realiza una comprobación explícita de asignación/scope del usuario al almacén.
- PUT `/api/admin/zones/{id}`: actualiza código/nombre/tipo/activo; comprueba existencia y duplicados, pero no aplica scope de almacén en el handler.
- DELETE `/api/admin/zones/{id}`: 409 si contiene bins.

Tipos admitidos: `RECEIVING`, `STORAGE`, `PICKING`, `STAGING`, `SHIPPING`.

### Bins — `api/routes/admin/admin_warehouse.py`, `api/schemas/bins.py`

- GET `/api/admin/bins?warehouse_id=&zone_id=&bin_type=&q=&page=&per_page=`: requiere grant `bins`; `warehouse_id` y `zone_id` filtran resultados, pero el handler no aplica el scope de almacenes asignados al usuario. `q` busca `bin_code` y `bin_barcode`; `per_page` máximo 1000.
- GET `/api/admin/bins/{id}`: detalle de bin e inventario por ID, sin comprobación explícita de warehouse scope en el handler.
- POST `/api/admin/bins`: requiere `zone_id,warehouse_id,bin_code,bin_barcode,bin_type` y campos opcionales de posición/secuencia. El schema no define capacidades físicas y el handler no comprueba explícitamente que la zona pertenezca al `warehouse_id` enviado.
- PUT `/api/admin/bins/{id}`: actualiza código, barcode, tipo, posición, secuencias, activo y `zone_id`; no acepta ni persiste capacidades físicas y no comprueba explícitamente que la zona destino pertenezca al almacén del bin.
- DELETE `/api/admin/bins/{id}`: por ID, sin comprobación explícita de warehouse scope; responde 409 si hay inventario con cantidad en mano positiva o preferred-bin mappings. Si pasa, elimina filas de inventario y el bin.

Tipos admitidos: `Staging`, `PickableStaging`, `Pickable`. **No hay contrato Flask para `max_weight_lbs` ni `max_volume_cuft`** en `CreateBinRequest`, `UpdateBinRequest`, los SELECT ni las respuestas de listado/detalle. No se deben enviar ni presentar como persistentes desde el frontend.

## 3. Paridad React observada

Las páginas React originales están en `admin/src/pages/Items.jsx`, `Bins.jsx`, `Zones.jsx`, `Warehouses.jsx`.

- Items: búsqueda con debounce, filtro activo/archivado/todos, páginas de 50, detalle con inventario y preferred bins, crear/editar, archivar/restaurar y eliminar con confirmación.
- Bins: depende de almacén activo; búsqueda por código/barcode, páginas de 50, exportación CSV, consulta de zonas, detalle con inventario, alta/edición/borrado. La exportación Svelte debe recorrer todas las páginas (hasta 1000 registros por página) y exportar solo columnas reales del contrato.
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
| Las rutas administrativas Zones/Bins no muestran enforcement server-side de warehouse scope en handlers ni en el decorator de grant inspeccionado | BACKEND_LIMITATION + FRONTEND_GUARD_REQUIRED | El frontend fija `warehouse_id`, valida filas/zonas devueltas y bloquea mutaciones sobre entidades no cargadas en el contexto; esto protege la UI, no sustituye autorización backend |
| Capacidades físicas de bin no están soportadas por los schemas/rutas Flask inspeccionados | BACKEND_LIMITATION | Retirar controles/DTO de escritura del frontend; no simular persistencia; reabrir cuando exista contrato verificable |
| UOM y compatibilidad Item-Bin no están demostrados | BACKEND_LIMITATION / UNVERIFIED_CONTRACT | No implementar reglas ficticias ni bloquear por datos ausentes |

## 6. Próximas tareas frontend para cerrar R1

1. Completar comparación campo por campo entre pantallas React y Svelte, incluidos formularios, filtros, detalle, confirmaciones, CSV y estados de error.
2. Auditar `WarehouseWorkspaceScreen`, sus estados y repositorios para garantizar que todas las lecturas y mutaciones de bins/zones llevan el almacén activo y que se descartan respuestas obsoletas al cambiarlo.
3. Revisar Item detail para que el inventario global se identifique como global o se limite a una vista explícitamente global; nunca inferir pertenencia al almacén activo.
4. Alinear DTO/mappers estrictamente con payloads reales: eliminar tolerancias a formatos alternativos no usados por Flask cuando no tengan consumidor contractual.
5. Probar paginación y filtros reales, errores de duplicados, 400/404/409, permisos separados `items`, `warehouses`, `zones`, `bins`, descarte de respuestas cruzadas y bloqueo de mutaciones fuera del contexto activo. El aislamiento de seguridad server-side de Zones/Bins permanece bloqueado por `BACKEND_LIMITATION`.
6. No exponer capacidad física como editable/persistente: Flask no la acepta ni devuelve. Mantener la ocupación calculada separada de capacidades futuras; registrar como `BACKEND_LIMITATION` hasta que exista contrato server-side.
7. Ejecutar exclusivamente check, build y suites frontend de `webapp/`; registrar HEAD y resultados.

## 7. Criterio de cierre R1

R1 no se cierra hasta demostrar paridad React donde Flask soporta la operación, contratos DTO/mappers correctos, filtros/paginación, guards de permisos, aislamiento por almacén para zonas/bins, tratamiento explícito del catálogo global de Items, errores de dependencias y pruebas frontend de regresión. No se exige ni se realiza implementación o certificación de backend.
