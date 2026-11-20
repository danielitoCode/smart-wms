# R1 — Auditoría de catálogo y estructura física del almacén

Fecha: 2026-11-19  
Rama: `svelte-webapp`  
HEAD auditado inicialmente: `a747e53572fd8f834d314fd61d518cc3f5512627` (revisión de seguimiento: ver commit más reciente en GitHub)  
Ámbito: exclusivamente `webapp/`. Flask y React se inspeccionan como referencias; no se modifican.

## 1. Resultado ejecutivo

R1 parte de implementaciones existentes, no de módulos vacíos. Svelte ya contiene capas Domain/Data/UI y pruebas para Items, Warehouses, Zones y Bins. La prioridad es verificar paridad y corregir contratos/estados/aislamiento, no duplicar features.

Estado de esta auditoría: **VERIFIED — alcance frontend R1 (2026-11-20)**. La certificación se apoya en el workflow Webapp CI ejecutado sobre el HEAD definitivo indicado en la sección 9. Las limitaciones server-side se conservan como `BACKEND_LIMITATION`; no se afirma que estén resueltas.

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

## 6. Tareas frontend de cierre — completadas

1. Comparación de las pantallas Items, Warehouses, Zones y Bins frente a React en los recorridos y contratos soportados; formularios, filtros, detalle, confirmaciones, CSV y errores.
2. Auditoría de `WarehouseWorkspaceScreen`, estado y repositorios: contexto de almacén activo, invalidación de solicitudes/respuestas obsoletas y protección de mutaciones.
3. Detalle de Items identifica inventario como global; no lo atribuye al almacén activo.
4. DTO/mappers y payloads se ajustan a los schemas Flask inspeccionados; capacidades físicas no soportadas se retiraron de escritura y se comunican como no disponibles.
5. Matriz de pruebas cubre paginación/filtros, duplicados, errores 400/404/409, grants independientes `items`, `warehouses`, `zones`, `bins`, contexto y regresión. Se añadió una prueba explícita de navegación con solo el grant `bins`.
6. Exportación CSV recorre todas las páginas y usa columnas respaldadas por Flask.
7. Webapp CI completo, incluida regresión y coverage by feature paths, ejecutado sobre el HEAD definitivo; evidencia en la sección 9.

## 7. Criterio de cierre R1

R1 queda `VERIFIED` para frontend: paridad donde Flask soporta la operación, DTO/mappers, filtros/paginación, grants, aislamiento de estado/presentación, catálogo global de Items, errores de dependencias y regresión frontend han sido verificados. La autorización/aislamiento server-side de Zones/Bins y la persistencia de capacidades físicas siguen siendo `BACKEND_LIMITATION`; no se certifican como resueltas ni se implementan en esta migración.

## 8. Verificación de seguimiento — 2026-11-19 (histórica; sustituida por sección 9)

**HEAD de implementación verificado:** `eb9500a98c7315ae9ecd8a70df2c5eeb81b64289`  
**Workflow Webapp CI:** https://github.com/danielitoCode/smart-wms/actions/runs/44612712940

### Items

Estado: **VERIFIED en las capas frontend cubiertas**.

- Archivo/restauración aplica el `is_active` devuelto por Flask antes de refrescar la lista.
- Se impide el doble envío por artículo y el doble envío de eliminación.
- Detalle invalida respuestas antiguas al cambiar de artículo o cerrar el diálogo.
- La confirmación de borrado permanece abierta y muestra el error HTTP 400 real de Flask. No se añade una preconsulta que el backend no ofrece.
- DTO, mapper, repositorio, estado y UI tienen cobertura de regresión en las suites ejecutadas.

### Warehouses, Zones y Bins

Estado: **IN_PROGRESS — protecciones frontend verificadas; limitaciones de servidor pendientes**.

- El estado de bins valida el almacén y, cuando dispone de la lista de zonas, la pertenencia de la zona; descarta detalles obsoletos y bloquea mutaciones de bins que no pertenecen al resultado cargado.
- La exportación CSV pagina con `per_page=1000`, recorre todas las páginas y usa columnas presentes en las respuestas Flask. Se eliminaron columnas ficticias y el límite silencioso de 10.000 filas.
- Se retiraron del dominio, DTO, repositorio, casos de uso y UI los campos de capacidad física que Flask no acepta ni devuelve; la pantalla informa explícitamente que la validación física no está disponible en el servidor.
- Los errores de duplicado, inexistencia y dependencias (400/404/409) se conservan y se presentan en la UI.
- Las respuestas y mutaciones se validan contra el almacén/zona activos en frontend. Esto no proporciona aislamiento de seguridad frente a llamadas directas: las rutas administrativas Flask inspeccionadas no aplican warehouse scope por usuario.

### Ejecución CI

En el workflow Webapp CI del HEAD anterior:

| Paso | Resultado |
|---|---|
| Typecheck | PASS |
| Build | PASS |
| Domain | 82 archivos / 337 pruebas PASS |
| Application | 57 archivos / 240 pruebas PASS |
| Infrastructure/Data | 68 archivos / 274 pruebas PASS |
| UI / Presentation | 39 archivos / 202 pruebas PASS |
| i18n | 1 archivo / 5 pruebas PASS |
| Integration | 22 PASS / 2 FAIL |

Los dos fallos de integración pertenecen al gate R0 y no a los cambios de R1:
1. `refreshes the cookie and retries /me after a 401`: la prueba espera una secuencia de refresh/reintento que el comportamiento/contrato vigente no ejecuta.
2. `rejects an inactive account even when login returns HTTP 200`: falla por `Body is unusable: Body has already been read`.

Por esos fallos, el workflow marcó el job como failure y omitió Full regression y Coverage by feature paths. No se declara CI global verde.

**Decisión de cierre:** Items queda verificado en frontend. La auditoría/corrección frontend de Warehouses, Zones y Bins queda validada por las suites ejecutadas, pero R1 no se certifica globalmente mientras persistan el gate de integración R0 y las limitaciones server-side de warehouse scope y capacidades físicas. No se ha modificado Flask.



## 9. Cierre R1 VERIFIED — matriz final (2026-11-20)

<badge color="success">VERIFIED — frontend</badge>

**Rama:** `svelte-webapp`  
**HEAD definitivo de implementación:** `812837b1d62fc1f73d65b6f2d4d46f1b940c80e2`  
**Workflow:** [Webapp CI — ejecución 44652143070](https://github.com/danielitoCode/smart-wms/actions/runs/44652143070)  
**Resultado del job:** SUCCESS. Node.js 26; check, build, todas las suites, regresión completa y coverage by feature paths pasaron.

### Matriz por capas y features

Items y Warehouses tienen suites dedicadas en las cuatro capas; Zones y Bins comparten la feature `warehouses` y sus casos de uso/estado/pantallas, por lo que se prueban en los mismos archivos de esa feature, no en módulos duplicados.

| Capa / suite CI | Evidencia específica R1 | Resultado |
|---|---|---|
| Domain | Items: Create/List/Search; Warehouses: context/list/detail; Zones: ZoneContext/ListZones; Bins: ListBins/BinLookup y reglas de campos soportados | PASS |
| Application | Casos de uso de Items y WarehouseManagement (CRUD, Zones, Bins, lookup) | PASS |
| Data / Infrastructure | ItemMapper/Repository; Warehouse/Zone mappers; WarehouseRemoteDataSource/Repository; BinLookup datasource/repository; HTTP contracts | PASS |
| UI / Presentation | ItemsScreen/itemsState; WarehouseDetailState/Screen; Workspace; WarehousesScreen; warehouse selection; navegación de grants independientes | PASS |
| Integration | ItemsApiIntegration, PreferredBinsApiIntegration y suite completa, incluida AuthHttpIntegration | 24/24 PASS |
| Full regression | Todas las pruebas de `webapp` | 841/841 PASS |

### Conteos globales por suite

| Suite | Archivos | Pruebas | Resultado |
|---|---:|---:|---|
| Domain | 82 | 337 | PASS |
| Application | 57 | 240 | PASS |
| Infrastructure / Data | 68 | 274 | PASS |
| UI / Presentation | 40 | 206 | PASS |
| i18n | 1 | 5 | PASS |
| Integration | 5 | 24 | PASS |
| Full regression | 195 | 841 | PASS |
| Coverage by feature paths | — | comando completado | PASS |

Los conteos por suite pueden solaparse porque los scripts ejecutan conjuntos de pruebas distintos; `Full regression` representa la ejecución unificada sin duplicación.

### Correcciones de gate incluidas en el HEAD

- Se alinearon dos pruebas de autenticación con el contrato Flask real: no se intenta `/refresh` después de un 401 de `/me` porque el endpoint refresh también exige `require_auth`; el login de una cuenta inactiva se rechaza con 401 antes de `/me`.
- La navegación de Bins exige solo el grant `bins`, no `bins + zones`. Se añadió prueba de usuario con grant `bins` únicamente.
- Typecheck y build se ejecutaron después de estas correcciones, no solo antes de ellas.

### Excepciones conocidas — no bloquean el DoD frontend

- **BACKEND_LIMITATION:** las rutas administrativas Zones/Bins inspeccionadas no aplican warehouse scope server-side de forma consistente. Las protecciones de UI no sustituyen la autorización del servidor.
- **BACKEND_LIMITATION:** Flask no acepta ni devuelve capacidades físicas de bins (`max_weight_lbs`, `max_volume_cuft`); la UI comunica que no hay validación física disponible.
- **BACKEND_LIMITATION:** el inventario de detalle de Items es global y no se atribuye a un almacén seleccionado.
- **Fuera del DoD:** workflows/suites backend y gitleaks del repositorio completo. No se modificó Flask ni se usaron resultados backend para certificar R1.

**Declaración:** R1 está `VERIFIED` en el alcance frontend definido por `MigrationPlan.md`. R0 no se declara globalmente cerrado; los recorridos restantes conservan su propio gate.


## 10. Cierre definitivo R1 — Webapp CI verde (2026-11-20)

<badge color="success">VERIFIED — frontend</badge>

**Rama:** `svelte-webapp`  
**HEAD de código validado:** `bb78f8615e6b5205758b01f7c35f2fc19f9c4213`  
**Webapp CI:** [run 44654858421 — SUCCESS](https://github.com/danielitoCode/smart-wms/actions/runs/44654858421)

La ejecución corresponde exactamente al HEAD indicado. El job `Typecheck · Build · Test` completó correctamente:

- Typecheck (`svelte-check + TypeScript`).
- Build de producción SvelteKit/Vite.
- Suites Domain, Application, Infrastructure/Data, UI/Presentation e i18n.
- Integration.
- Full regression.
- Coverage by feature paths.

Todos los pasos del job terminaron en `success`. Esta es la evidencia de cierre frontend más reciente y sustituye la referencia histórica al HEAD `812837b1d62fc1f73d65b6f2d4d46f1b940c80e2` de la sección 9. Los conteos de aquella ejecución no se presentan como conteos de este run.

### Resultado de workflows independientes

| Workflow | Run / resultado | Interpretación para R1 |
|---|---|---|
| Webapp CI | [44654858421 — SUCCESS](https://github.com/danielitoCode/smart-wms/actions/runs/44654858421) | Aceptación frontend satisfecha |
| Tests (Python/backend) | [44654858367 — FAILURE](https://github.com/danielitoCode/smart-wms/actions/runs/44654858367) | Fallo en el paso `Run tests`; fuera del DoD frontend, registrar y tratar por separado |
| gitleaks | [44654858470 — FAILURE](https://github.com/danielitoCode/smart-wms/actions/runs/44654858470) | Control de secretos independiente; requiere revisión separada, no es regresión SvelteKit |

No se afirma que las pruebas Python ni el control gitleaks hayan pasado. Tampoco se modificó Flask como parte de este cierre.

### Excepciones backend que permanecen abiertas

- **BACKEND_LIMITATION:** las rutas administrativas Zones/Bins inspeccionadas no aplican warehouse scope server-side de forma consistente. Las protecciones de UI no sustituyen autorización del servidor.
- **BACKEND_LIMITATION:** Flask no acepta ni devuelve capacidades físicas de bins (`max_weight_lbs`, `max_volume_cuft`); la UI comunica que no hay validación física disponible.
- **BACKEND_LIMITATION:** el inventario de detalle de Items es global y no se atribuye a un almacén seleccionado.

### Declaración de cierre

R1 queda **formalmente VERIFIED para el frontend SvelteKit** en el HEAD `bb78f8615e6b5205758b01f7c35f2fc19f9c4213`, respaldado por Webapp CI verde y ejecución completa de las suites frontend, integración, regresión y coverage. Los fallos de Python/backend y gitleaks quedan explícitamente separados y no se ocultan ni se consideran aprobados. Las limitaciones server-side descritas siguen sin resolverse y no forman parte de la aceptación frontend. Este cierre de R1 no declara R0 globalmente cerrado.
