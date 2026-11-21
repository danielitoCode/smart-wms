# R6 — Picking, Packing y Shipping: auditoría de recorrido

**Estado de revisión:** `FRONTEND_HARDENING_IN_PROGRESS / BLOCKED_BACKEND`  
**Rama:** `svelte-webapp`  
**Alcance:** exclusivamente `webapp/`. Flask/Python se inspecciona como contrato y no se modifica.

## 1. Recorrido React que debe conservarse

El patrón operativo original está en los escáneres móviles:
- `PickScanScreen`: escanea SO/TO, valida con `POST /api/picking/wave-validate`, agrega SOs y crea la ola con `POST /api/picking/wave-create`; el servidor decide cobertura y planificación y puede responder 409 con `insufficient_coverage`.
- `PickWalkScreen`: obtiene tareas siguientes, escanea producto, confirma o registra short pick y completa el batch.
- `PackScreen`: escanea pedido, escanea cada artículo y confirma packing solo cuando se verificaron las cantidades recogidas.
- `ShipScreen`: escanea pedido listo, informa transportista y tracking y confirma fulfillment.

No se debe reconstruir un CRUD administrativo independiente de tickets/lotes como sustituto de este flujo. Las vistas administrativas existentes solo se mantienen si ya forman parte de otra capacidad y no reemplazan al escáner.

## 2. Contratos Flask comprobados

| Caso de uso | Contrato observado | Estado |
|---|---|---|
| ListPickTickets | GET `/api/admin/sales-orders` con status, warehouse_id, hide_printed, include_primary_bin e include_line_count. La consulta aplica warehouse_scope_clause y el servicio Svelte GetAllPrintableTickets reutiliza este endpoint. La ruta Flask exige sales-orders o fraud, no picking-tickets. | Parcial: datos/warehouse sí; ACL de listado no coincide con la página |
| GetPickTicket | GET `/api/admin/sales-orders/<id>/picking-ticket`; devuelve cabecera, líneas, UPC y preferred_bin. Exige picking-tickets, pero la consulta del SO no aplica warehouse_scope_clause ni check_warehouse_access. | Parcial: contrato de datos existe; aislamiento server-side ausente |
| MarkPickingTicketsPrinted | POST `/api/admin/sales-orders/mark-printed`; acepta so_ids y actualiza printed_at. Exige picking-tickets, pero el UPDATE no filtra por warehouse. | Parcial: no seguro para usuarios multi-almacén no ADMIN |
| ListPickBatches | `GET /api/admin/pick-batches?warehouse_id=`; requiere `picking-batches` page permission y warehouse access. Devuelve batches activos con estado, operador, warehouse, tareas y pedidos. | Parcial / administrativo |
| GetPickBatch | `GET /api/picking/batch/<id>`; valida acceso al warehouse y devuelve tareas. | Disponible |
| CreatePickBatch | `POST /api/picking/wave-create` y legacy `/create-batch`; wave valida IDs, warehouse, cobertura y planifica inventario/bins según reglas del servicio. Responde batch_id, batch_number, total_orders/picks/units y first_pick. | Parcial; no idempotency key/replay seguro |
| GetNextPickTask | `GET /api/picking/batch/<id>/next`; consulta la siguiente tarea. | Disponible |
| ConfirmPick | `POST /api/picking/confirm`; body `pick_task_id, warehouse_id?, scanned_barcode, quantity_picked`. Valida barcode de item, cantidad y estado, actualiza tarea, línea, inventario y audit en una transacción. | **Bloqueado por concurrencia** |
| ShortPick | `POST /api/picking/short`; body `pick_task_id, warehouse_id?, quantity_available`. Registra short, cantidades, inventario y audit. | **Bloqueado por concurrencia** |
| CompletePicking | `POST /api/picking/complete-batch`; valida tareas pendientes y shortfall, cambia SO a PICKED y escribe audit/eventos. | Parcial; falta lock/idempotencia del batch |
| VerifyPacking | `POST /api/packing/verify`; body `so_id, scanned_barcode, quantity, warehouse_id?`. Bloquea el pedido `FOR UPDATE`, valida barcode/cantidad y actualiza `quantity_packed`. | Disponible con lock de agregado |
| ConfirmPacking | `POST /api/packing/complete`; bloquea SO `FOR UPDATE`, exige todas las cantidades recogidas verificadas y shortfalls explícitos, pasa a PACKED y emite audit/evento. | Disponible con lock de agregado |
| ShipOrder | `POST /api/shipping/fulfill`; exige tracking y carrier no vacíos; bloquea SO `FOR UPDATE`, comprueba estado y regla `require_packing_before_shipping`, crea fulfillment/lines, actualiza SO y audit/outbox. | Parcial; paquete físico no validable, sin GET shipment/idempotency key |
| GetShipment | No se encontró endpoint de detalle de fulfillment por `fulfillment_id`. | No disponible |

## 3. Hallazgos críticos backend (no modificar en esta migración)

### R6-BE-01 — doble confirmación de picking posible

En `api/services/picking_service.py::confirm_pick` la tarea se lee sin `FOR UPDATE`; después se comprueba `PENDING` y se actualiza con `WHERE pick_task_id = :tid`, sin condición `status = PENDING` ni comprobación de filas afectadas. Dos transacciones pueden leer la misma tarea pendiente y ambas aplicar decremento de inventario, incremento de líneas y audit. La rama TO tiene una protección adicional por línea, pero la rama SO no queda protegida por la tarea.

### R6-BE-02 — short pick tiene la misma carrera

`short_pick` lee la tarea sin lock y actualiza sin condición de estado pendiente. Dos operadores pueden aplicar más de una vez la liberación/decremento y los cambios de línea/audit.

### R6-BE-03 — bin barcode no forma parte del comando de confirmación

La tarea devuelve información de bin, pero `ConfirmPickRequest` solo acepta `scanned_barcode` y el servicio valida UPC/aliases del artículo. No hay validación server-side del barcode de ubicación en la misma transacción. La UI no puede convertir una validación local en garantía de integridad.

### R6-BE-04 — completar batch no tiene guard terminal/idempotente suficiente

`complete_batch` lee batch sin `FOR UPDATE` ni valida que el estado sea OPEN/IN_PROGRESS antes de volver a actualizarlo y escribir audit/eventos. Aunque bloquea los SO durante el cambio, el agregado batch no queda serializado como operación idempotente.

### R6-BE-05 — reintento de creación de wave

`wave-create` no acepta una idempotency key. Tiene una recuperación específica de batch OPEN abandonado del mismo usuario y devuelve 409 `already_in_batch` para otros conflictos; no es una garantía general de replay de la misma petición después de perder la respuesta.

### R6-BE-06 — falta consulta de shipment

`POST /api/shipping/fulfill` devuelve `fulfillment_id`, pero no se encontró GET de detalle para reconciliar un timeout del cliente. El bloqueo de estado evita normalmente una segunda fulfillment tras commit, pero el cliente no puede recuperar la respuesta original por ID.

### R6-BE-07 — grant operativo no enforced en las rutas Flask

`GET /api/auth/me` devuelve `allowed_functions` (incluye las funciones operativas del usuario y filtra `pack` según la configuración), pero `require_auth` no carga ni valida ese grant en cada petición y las rutas picking/packing/shipping solo combinan autenticación con controles de warehouse. El guard Svelte por `pick`, `pack` y `ship` protege navegación/UX, pero no sustituye autorización server-side. Flask debe aplicar el grant operativo correspondiente a cada endpoint.


### R6-BE-08 — shipping no valida un paquete físico

El contrato de FulfillRequest solo acepta so_id, tracking_number, carrier, ship_method y warehouse_id. No existe package_id, package barcode, dimensiones ni operación de verificación de paquete. record_ship sintetiza un único package en el evento ship.confirmed, con dimensiones null y peso calculado desde las unidades picked. Por tanto, la aplicación no puede verificar un paquete escaneado; solo aplica estado de pedido y campos de transportista/tracking no vacíos.

### R6-BE-09 — shipping lookup omite quantity_packed

GET /api/shipping/order consulta quantity_packed en SQL, pero no lo incluye en cada objeto lines de la respuesta JSON. Devuelve quantity_ordered y quantity_picked. El endpoint fulfill crea líneas enviadas a partir de quantity_picked. El estado PACKED y el flujo de packing garantizan que la orden pasó por verificación cuando la configuración lo exige, pero el cliente no puede reconciliar explícitamente quantity_picked vs quantity_packed vs quantity_shipped desde el detalle de shipping.

### R6-BE-10 — detalle de ticket imprimible sin warehouse ACL

GET /api/admin/sales-orders/<id>/picking-ticket exige la página picking-tickets, pero selecciona el sales_order por so_id sin warehouse_scope_clause ni check_warehouse_access. Un usuario no ADMIN con esa página puede solicitar directamente un SO de otro almacén. La pantalla Svelte no debe tratar el filtro de la lista como autorización para el detalle; el servidor debe filtrar/validar el warehouse antes de devolver cabecera y líneas.

### R6-BE-11 — marcar tickets impresos sin warehouse scope

POST /api/admin/sales-orders/mark-printed actualiza printed_at para cualquier so_id recibido, sin filtrar warehouse ni validar acceso por fila. No debe ejecutarse para usuarios no ADMIN hasta que Flask aplique scope a cada SO.

### R6-BE-12 — ACL del listado de tickets no coincide con la página

El listado se obtiene de GET /api/admin/sales-orders, protegido por require_admin_or_any_page_permission('sales-orders', 'fraud'); la página y el detalle de ticket usan picking-tickets. Un usuario con solo picking-tickets puede entrar al frontend pero recibir 403 en el listado. Flask debe alinear el permiso del listado con picking-tickets o el frontend debe requerir explícitamente la combinación real de grants.
## 4. Garantías positivas observadas

- Picking valida el warehouse del batch y llama a `check_warehouse_access` en operaciones de tarea/batch. Las olas se crean para un warehouse explícito y el servicio aplica reglas de disponibilidad, preferred bins y pick sequence.
- Confirm pick valida barcode de artículo y cantidad no superior a la tarea.
- Complete batch no permite pending tasks y rechaza líneas bajo-pickeadas sin short marker.
- Packing verify y complete bloquean la fila de `sales_orders` con `FOR UPDATE`; packing no equivale a picking.
- Shipping fulfill también bloquea `sales_orders` con `FOR UPDATE`, valida estado y crea fulfillment, líneas, auditoría y evento/outbox dentro del flujo transaccional.
- Los tests backend existentes cubren escenarios funcionales de picking, packing y shipping. Además, `api/tests/test_packing.py::test_concurrent_duplicate_pack_scans_cannot_overpack` ejecuta dos solicitudes concurrentes con dos test clients y verifica un único 200/400 y `quantity_packed == quantity_picked` sobre la base persistente. No se encontró una prueba equivalente para doble pick/short-pick, complete packing frente a verify ni doble fulfillment. `api/tests/test_concurrency.py` cubre receiving/inventory, no el picking/shipping.

## 5. Trabajo frontend R6

1. Mantener el patrón de escáner para validación/creación de ola, siguiente tarea, confirmación/short, packing y shipping.
2. Asegurar que cada una de las tres pantallas captura warehouseId + generation al comenzar una petición y descarta respuestas tardías si cambia el contexto.
3. Asegurar que los DTO reflejan exactamente `batch_id`, `warehouse_id`, cantidades pick/pack y campos de fulfillment realmente devueltos.
4. Separar estado de picking, packing y shipping; nunca inferir packed a partir de picked.
5. Evitar reenvíos concurrentes en la misma instancia UI y reconciliar después de mutaciones con GET real.
6. No inventar `GetShipment`, idempotency keys ni campos de barcode de bin.
7. Las acciones ConfirmPick/ShortPick/CompletePicking no pueden recibir aceptación de doble operador hasta que Flask implemente bloqueo/UPDATE condicional y pruebas PostgreSQL de dos conexiones. Mantener visible el gap y no presentar una guarda local como garantía global.
8. Añadir pruebas frontend de cambio de almacén durante carga/mutación, respuestas fuera de orden, no doble submit local, cantidades conciliadas y gates de capacidades ausentes.

## 6. Pruebas de concurrencia exigidas para el cierre integral

Deben ejecutarse sobre la persistencia PostgreSQL real usada por Flask (dos conexiones/transacciones, no mocks):
- dos operadores confirman la misma tarea: exactamente un pick aplicado, un cambio de inventario y un audit;
- confirm pick frente a short pick sobre la misma tarea: solo una transición gana;
- **ya existe** prueba concurrente de dos scans de packing: `api/tests/test_packing.py::test_concurrent_duplicate_pack_scans_cannot_overpack`;
- añadir concurrencia de complete packing frente a verify y ship frente a fulfill;
- dos fulfillment concurrentes producen un único fulfillment, un único cambio a SHIPPED y un evento/outbox;
- retry tras timeout reconcilia la operación original sin duplicar stock, cantidades, fulfillment ni eventos.

Estas pruebas pertenecen al backend y se documentan como dependencia; no se alteran archivos Python desde esta migración.

## 7. Estado de aceptación

**R6 no se declara integralmente cerrada.** El frontend puede quedar protegido y alineado con el flujo operativo, pero el cierre funcional requiere garantías Flask y pruebas PostgreSQL reales para doble picking/short, bin scan, batch completion, replay de wave y reconciliación de shipment. El estado correcto es `FRONTEND_HARDENING_IN_PROGRESS / BLOCKED_BACKEND`, no `VERIFIED` integral.


## 8. Avance frontend R6 (20-11-2026)

**Trabajo aplicado en `webapp/`:**
- Se añadió política de acceso a rutas operativas por los grants de `/api/auth/me`: `pick`, `pack` y `ship`; el menú lateral también oculta esas opciones cuando el usuario no tiene el grant (ADMIN conserva acceso).
- Las tres pantallas capturan warehouseId y generation para las lecturas; las respuestas tardías de otro contexto se descartan.
- Picking scanner: las SO se agregan únicamente después de validar el barcode; se retiró la creación manual legacy de lote de la pantalla operativa. El listado de batch/tarea sigue siendo consulta real.
- Picking queda fail-closed para crear ola/lote, confirmar, short-pick y completar batch hasta que el servidor garantice replay seguro, validación de bin y transiciones atómicas/idempotentes. No se presenta el bloqueo local como protección entre operadores.
- Packing: la confirmación exige que todas las unidades recogidas estén verificadas; después de una respuesta incierta se vuelve a consultar el pedido antes de permitir otro scan. Si no se puede reconciliar, se bloquea el siguiente scan.
- Shipping: el detalle queda ligado al warehouse generation. El contrato de ejecución bloquea fulfillment porque Flask sintetiza un paquete y no acepta/valida un package barcode o package_id. La UI exige carrier/tracking en el formulario, pero no permite confirmar el envío hasta que exista validación de paquete; no se inventa GET shipment ni idempotency key.

**Pruebas frontend añadidas/ampliadas:** grants operativos de ruta, capacidades R6 fail-closed, respuesta stale al cambiar warehouse/generation, conciliación de cantidad packed tras timeout, prevención de doble submit local de fulfillment y requisito de conciliación antes de completar packing.

**Límites que siguen abiertos:** la UI no puede demostrar doble pick imposible, bin scan atómico, enforcement server-side de allowed_functions, complete batch idempotente ni reconciliación GET shipment. Se requieren correcciones y pruebas Flask/PostgreSQL; Flask no se modificó.

**Estado:** `FRONTEND_HARDENING_IN_PROGRESS / BLOCKED_BACKEND`. Picking y shipping permanecen fail-closed en sus mutaciones inseguras; packing puede ejecutar scans/confirmación bajo los locks existentes y se reconcilia ante respuestas inciertas. Pendiente CI Webapp sobre HEAD final de esta iteración.


## 9. Cierre de la revisión frontend (20-11-2026)

### 9.1 Autorización operativa y warehouse context

- Las rutas y el menú de `/picking`, `/packing` y `/shipping` requieren el grant operativo correspondiente de `/api/auth/me`: `pick`, `pack` y `ship`. ADMIN conserva bypass UX.
- La política de acceso distingue estos grants de las page permissions administrativas. No se crearon CRUD administrativos nuevos para sustituir el flujo de escáner.
- Los estados de las tres pantallas ligan el detalle/batch al `warehouseId + generation`; descartan respuestas tardías y no permiten mutar un pedido cargado en una generación anterior, aunque se reutilice el mismo ID.
- Las rutas Flask inspeccionadas solo muestran `require_auth` y validaciones de warehouse para estos endpoints; no se observó enforcement server-side de `allowed_functions`. El guard Svelte es UX, no autorización backend.

### 9.2 Flujo y contratos frontend

- Picking conserva el recorrido de escáner: validar SO/TO por barcode y consultar batch/tarea real. Se retiró de la pantalla operativa la creación manual legacy de batch; las pantallas supervisoras existentes de tickets/batches no se sustituyen ni se duplican.
- La creación de wave/batch, ConfirmPick, ShortPick y CompletePicking quedan fail-closed. La wave carece de idempotency key/replay general; ConfirmPick y ShortPick tienen carrera de tarea; falta validación atómica del bin; CompletePicking no serializa el agregado batch. No se llama al endpoint inseguro ni se devuelve éxito local.
- Packing mantiene separado `quantity_picked` de `quantity_packed`. El botón de completar solo se habilita cuando todas las unidades recogidas están verificadas. Si una verificación termina con timeout/error de transporte, se relee el pedido para reconciliar `quantity_packed`; si no se puede releer, se bloquean nuevos scans hasta cargar el pedido de nuevo.
- Shipping conserva el detalle real del pedido y precarga `ship_method` o `GROUND`, pero el botón de fulfillment queda fail-closed: Flask no expone validación de paquete físico ni `quantity_packed` en el lookup. Aunque `/fulfill` bloquea la SO con `FOR UPDATE` y el estado impide normalmente un segundo fulfillment, el contrato actual no cumple la aceptación de paquete/conciliación pick-pack-ship ni permite recuperar `fulfillment_id` tras timeout.
- El DTO de wave validation usa el campo canónico `barcode` aceptado por `WaveValidateRequest` (el alias `so_barcode` permanece en Flask por compatibilidad). `batch_id` se conserva en DTO/mapper de wave, batch y tarea donde el servidor lo devuelve.
- Flask genera hoy un único paquete sintético al confirmar packing; no hay identidad de paquete, dimensiones ni multi-package packing en el contrato. No se inventó una entidad de paquete persistida en el frontend.

### 9.3 Pruebas y límites de aceptación

Pruebas frontend añadidas/ampliadas: grants pick/pack/ship; capacidades R6 fail-closed; rechazo de operaciones no soportadas sin llamar repositorios; cambios de warehouse/generation durante carga; reconciliación de cantidades packed tras fallo incierto; bloqueo de shipping cuando falta validación de paquete físico; y bloqueo de completar packing antes de verificar cantidades.

La auditoría identificó la prueba backend existente `api/tests/test_packing.py::test_concurrent_duplicate_pack_scans_cannot_overpack`. No se encontró prueba PostgreSQL equivalente para dos operadores sobre la misma tarea pick/short, complete batch, verify frente a complete packing ni doble fulfillment. Estas pruebas reales son criterio backend pendiente; no se reemplazan por mocks frontend.

**Estado final de esta revisión:** `FRONTEND_HARDENING_IN_PROGRESS / BLOCKED_BACKEND`. La verificación CI del HEAD definitivo sigue pendiente. Flask/Python no se modificó.


### 9.4 Gate adicional de shipping

La revisión de `api/routes/shipping.py` confirmó que `FulfillRequest` no acepta `package_id` ni barcode del paquete. Además, `GET /api/shipping/order` consulta `quantity_packed` pero no lo incluye en el JSON de líneas; el fulfillment utiliza `quantity_picked`. Se añadieron `validateShipmentPackage = NOT_SUPPORTED_BY_SERVER` y `shipOrder = PARTIAL` al contrato R6. La pantalla muestra el bloqueo y el estado rechaza la llamada al repositorio; no se ejecuta `/fulfill` hasta que el backend permita verificar paquete y conciliar las cantidades.

## 10. Revisión focalizada Picking + Packing (21-11-2026)

### Picking — contratos y gates
- Se verificó que `ActiveBatchDto`, `PickTaskDto`, wave validate/create y create-batch conservan `batch_id` donde Flask lo devuelve. `PickingMapper` rechaza tareas sin identificador de tarea, batch, item o SKU y mapea campos de ubicación, tote, secuencia y pedidos contribuyentes.
- La lectura del batch activo se valida contra el `warehouseId` seleccionado; la tarea siguiente se valida además contra el `batchId` activo antes de publicarse en estado.
- ConfirmPick, ShortPick y CompletePicking consultan tanto la capacidad individual como el gate global de ejecución. La creación de wave/batch permanece detrás de `isR6PickingMutationSafe`. Los controles de pantalla también permanecen deshabilitados cuando las capacidades no están disponibles.
- La validación de SO/TO y la consulta de batch/tarea continúan disponibles. No se habilitan mutaciones de picking ni se simula su éxito.
- Persisten las limitaciones de listado/detalle de tickets y permisos descritas en R6-BE-10/11/12; no se crean endpoints frontend ficticios para cubrirlas.

### Packing — conciliación y resultado de verificación
- `VerifyPackResult` conserva el detalle real devuelto por Flask (`item` y `order_progress`); el mapper y repositorio ya no reducen la respuesta a un mensaje.
- El estado muestra el progreso de líneas informado por el servidor y después vuelve a leer el pedido para usar las cantidades persistidas como fuente de verdad.
- La política `arePackingQuantitiesReconciled` exige al menos una línea, cantidades enteras/no negativas y coincidencia exacta `quantity_picked === quantity_packed`. Tanto el indicador `allVerified` como el comando complete comparten esta política; sobre-empaque no se interpreta como éxito.
- Se conserva la recuperación de errores inciertos: tras error/timeout de verify se relee el pedido; si la lectura falla se invalida el detalle y se bloquean scans hasta recargar. Tras timeout de complete se intenta reconciliar; si no se puede determinar el estado, no se invita a repetir la mutación.

### Pruebas incorporadas en este bloque
- Mapper de respuesta de verify y progreso de líneas.
- Use case de verify: normalización del barcode, cantidad por defecto y retorno del progreso del servidor.
- Política de conciliación: pedido vacío, cantidades iguales, faltantes, excedentes, negativos, fracciones y múltiples líneas.
- Picking: validación de batch/task y gates de mutación permanecen fail-closed.

**Estado histórico de esa iteración:** la certificación quedó pendiente en ese momento; el cierre de verificación definitivo se registra en la sección 10. No se ejecutaron pruebas locales desde esta integración GitHub. No se modificó Flask/Python.


## 9. R6 — cierre de contrato y gate de Shipping (21-11-2026)

**Contrato de Shipping verificado en Flask:**
- GET /api/shipping/order/<barcode>?warehouse_id=<id> es la lectura disponible. La respuesta contiene cabecera de SO (incluido warehouse_id), líneas con quantity_ordered y quantity_picked, y totales. Aunque el servicio consulta quantity_packed, el JSON no lo expone; el DTO Svelte no lo inventa ni lo convierte a cero.
- POST /api/shipping/fulfill acepta exclusivamente so_id, warehouse_id, tracking_number, carrier y ship_method opcional. La respuesta confirmada contiene fulfillment_id, pedido, transportista/tracking, método y totales enviados.
- No existe GET de shipment/fulfillment para recuperar un fulfillment concreto; tampoco existe contrato para package_id, package barcode, dimensiones o validación física. El paquete generado por Flask es sintético y no equivale a una verificación del paquete preparado.

**Decisión de capacidades y estados:**
- validateShipmentPackage = NOT_SUPPORTED_BY_SERVER; shipOrder = PARTIAL; getShipment = NOT_SUPPORTED_BY_SERVER. La operación de envío de R6 no es ejecutable mientras falte la validación de paquete y la conciliación requerida.
- El estado de Shipping conserva el detalle ligado a warehouseId + generation, descarta lecturas obsoletas, limpia el pedido al cambiar de almacén y evita dobles envíos locales mediante busy.
- El gate se aplica en la pantalla/estado y también en FulfillShipmentUseCase; un caller que omita la UI recibe R6OperationNotSupportedError y no alcanza el repositorio HTTP.
- El DTO representa únicamente los campos que Flask devuelve. No se añade quantity_packed, un shipment GET, un package ID ni estados de fulfillment inferidos.

**Pruebas frontend del gate:**
- El contrato declara explícitamente las capacidades ausentes y isR6ShippingExecutionAvailable() === false.
- El estado verifica que no se llama a fulfill cuando falta package validation, que el pedido de otro almacén/generation no se puede despachar y que una respuesta de lectura obsoleta se descarta.
- El use case comprueba que una llamada directa válida también queda bloqueada y que el repositorio no recibe la mutación.
- Los tests DTO/mappers y datasource verifican la forma real de la respuesta de lectura y el payload de fulfill, sin agregar campos no servidos.

**CI observada antes de este bloque:** HEAD aaae5009bd4cb6190b0951b50f227e2a4544d4d7, Webapp CI run [44871055210](https://github.com/danielitoCode/smart-wms/actions/runs/44871055210) falló en svelte-check (1 error, 100 warnings); build y suites quedaron omitidas. Lockfile, Dependency Audit y gitleaks pasaron. Por tanto, no se certifica regresión verde hasta ejecutar y revisar un workflow posterior a las correcciones sobre el HEAD final.

**Regresión requerida para el cierre frontend:** permisos operativos y grants, aislamiento entre almacenes, doble submit dentro de una instancia, cambios de generación/respuestas obsoletas, contratos DTO/mappers/repositories, npm run check, npm run build, Domain, Application, Infrastructure, UI, i18n, Integration y Full regression. Las pruebas PostgreSQL multi-conexión para doble picking/short, complete/verify y doble fulfillment siguen siendo responsabilidad Flask y no pueden certificarse con Vitest.

**Estado de R6:** FRONTEND_IMPLEMENTATION_PARTIAL / BLOCKED_BACKEND. El gate de Shipping queda endurecido a nivel de aplicación, pero R6 no es VERIFIED integral ni puede cerrarse operativamente hasta que Flask implemente las capacidades indicadas y se valide la regresión frontend completa. No se modificó Flask/Python.


## 10. R6 — verificación final de Shipping y regresión frontend (21-11-2026)

**HEAD de implementación validado:** `d4fe8246477efd9e9134583186e87af2300afe8c` (rama `svelte-webapp`).  
**Webapp CI:** [run 44871706656](https://github.com/danielitoCode/smart-wms/actions/runs/44871706656) — **SUCCESS**.

### Shipping — cierre frontend

- El contrato Flask de lectura y fulfillment queda documentado con los campos exactos disponibles; no se mapean campos que la respuesta no expone.
- `validateShipmentPackage` permanece `NOT_SUPPORTED_BY_SERVER`, `shipOrder` `PARTIAL` y `getShipment` `NOT_SUPPORTED_BY_SERVER`.
- `FulfillShipmentUseCase` aplica el gate antes de invocar el repositorio. La UI/state conserva el mismo gate, el scope `warehouseId + generation`, el descarte de respuestas obsoletas y la protección de doble submit local.
- Pruebas de contrato, use case, mapper, datasource y estado verifican que una solicitud directa no puede ejecutar fulfillment sin package validation; no se llama al POST ni se fabrica un resultado.

### Regresión final observada

Todos los pasos del job Webapp CI finalizaron correctamente:
- Typecheck (`svelte-check + TypeScript`): PASS.
- Build SvelteKit/Vite: PASS.
- Domain: 87 archivos / 363 tests PASS.
- Application: 60 archivos / 258 tests PASS.
- Infrastructure: 69 archivos / 279 tests PASS.
- UI/presentation: 43 archivos / 245 tests PASS.
- i18n: 1 archivo / 5 tests PASS.
- Integration: 5 archivos / 24 tests PASS.
- Full regression: **204 archivos / 911 tests PASS**.
- Coverage by feature paths: PASS (el workflow no publica un porcentaje global de cobertura).

Controles auxiliares sobre el mismo HEAD:
- [Lockfile Version Check 44871706704](https://github.com/danielitoCode/smart-wms/actions/runs/44871706704): SUCCESS.
- [gitleaks 44871706699](https://github.com/danielitoCode/smart-wms/actions/runs/44871706699): SUCCESS.
- [Dependency Audit 44871706641](https://github.com/danielitoCode/smart-wms/actions/runs/44871706641): SUCCESS.

La regresión detectó y se corrigió un import faltante de `onMount` en `PickingTicketPrintAllScreen.svelte`, además de actualizar fixtures/expectativas de pruebas de Shipping, Packing y el contrato R5. Los fallos intermedios quedaron corregidos antes del HEAD validado.

### Decisión de aceptación

**Frontend R6: `FRONTEND_HARDENING_COMPLETE` para el alcance implementable y verificable en Svelte.** Typecheck, build y todas las suites frontend están verdes en el HEAD indicado.

**R6 integral: `BLOCKED_BACKEND`, no `VERIFIED`.** Continúan pendientes las garantías que solo Flask puede aportar: grants operativos server-side, locking/UPDATE condicional e idempotencia de pick/short/batch/wave, validación de bin atómica, identidad/validación de paquete físico, exposición de `quantity_packed`, GET/reconciliación de shipment y pruebas PostgreSQL multi-conexión de las carreras de picking/packing/shipping. La regresión frontend no sustituye esas pruebas. No se modificó Flask/Python.
