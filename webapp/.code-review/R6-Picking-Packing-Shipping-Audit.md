# R6 — Picking, Packing y Shipping: auditoría de recorrido

**Estado inicial:** `IN_PROGRESS / BACKEND_CONCURRENCY_GAPS`  
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
| ListPickTickets / GetPickTicket | No se encontró una API operativa independiente de tickets para el flujo de escáner. La entrada real es validar SO/TO por barcode. | No disponible como API separada |
| ListPickBatches | `GET /api/admin/pick-batches?warehouse_id=`; requiere `picking-batches` page permission y warehouse access. Devuelve batches activos con estado, operador, warehouse, tareas y pedidos. | Parcial / administrativo |
| GetPickBatch | `GET /api/picking/batch/<id>`; valida acceso al warehouse y devuelve tareas. | Disponible |
| CreatePickBatch | `POST /api/picking/wave-create` y legacy `/create-batch`; wave valida IDs, warehouse, cobertura y planifica inventario/bins según reglas del servicio. Responde batch_id, batch_number, total_orders/picks/units y first_pick. | Disponible; no idempotency key |
| GetNextPickTask | `GET /api/picking/batch/<id>/next`; consulta la siguiente tarea. | Disponible |
| ConfirmPick | `POST /api/picking/confirm`; body `pick_task_id, warehouse_id?, scanned_barcode, quantity_picked`. Valida barcode de item, cantidad y estado, actualiza tarea, línea, inventario y audit en una transacción. | **Bloqueado por concurrencia** |
| ShortPick | `POST /api/picking/short`; body `pick_task_id, warehouse_id?, quantity_available`. Registra short, cantidades, inventario y audit. | **Bloqueado por concurrencia** |
| CompletePicking | `POST /api/picking/complete-batch`; valida tareas pendientes y shortfall, cambia SO a PICKED y escribe audit/eventos. | Parcial; falta lock/idempotencia del batch |
| VerifyPacking | `POST /api/packing/verify`; body `so_id, scanned_barcode, quantity, warehouse_id?`. Bloquea el pedido `FOR UPDATE`, valida barcode/cantidad y actualiza `quantity_packed`. | Disponible con lock de agregado |
| ConfirmPacking | `POST /api/packing/complete`; bloquea SO `FOR UPDATE`, exige todas las cantidades recogidas verificadas y shortfalls explícitos, pasa a PACKED y emite audit/evento. | Disponible con lock de agregado |
| ShipOrder | `POST /api/shipping/fulfill`; exige tracking y carrier; bloquea SO `FOR UPDATE`, comprueba estado y regla `require_packing_before_shipping`, crea fulfillment/lines, actualiza SO y audit/outbox. | Disponible; estado bloquea segundo fulfillment, pero no expone idempotency key |
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

## 4. Garantías positivas observadas

- Picking valida el warehouse del batch y llama a `check_warehouse_access` en operaciones de tarea/batch. Las olas se crean para un warehouse explícito y el servicio aplica reglas de disponibilidad, preferred bins y pick sequence.
- Confirm pick valida barcode de artículo y cantidad no superior a la tarea.
- Complete batch no permite pending tasks y rechaza líneas bajo-pickeadas sin short marker.
- Packing verify y complete bloquean la fila de `sales_orders` con `FOR UPDATE`; packing no equivale a picking.
- Shipping fulfill también bloquea `sales_orders` con `FOR UPDATE`, valida estado y crea fulfillment, líneas, auditoría y evento/outbox dentro del flujo transaccional.
- Los tests backend existentes cubren escenarios funcionales de picking, packing y shipping; `api/tests/test_concurrency.py` cubre otras operaciones (receiving/inventory), pero no se encontró una prueba real de dos conexiones para doble pick, short-pick, packing verify/complete o fulfillment.

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
- dos confirmaciones de packing concurrentes no superan `quantity_picked`;
- complete packing frente a verify y ship frente a fulfill serializan correctamente;
- dos fulfillment concurrentes producen un único fulfillment, un único cambio a SHIPPED y un evento/outbox;
- retry tras timeout reconcilia la operación original sin duplicar stock, cantidades, fulfillment ni eventos.

Estas pruebas pertenecen al backend y se documentan como dependencia; no se alteran archivos Python desde esta migración.

## 7. Estado de aceptación

**R6 no está cerrada inicialmente.** La paridad de flujo React y los contratos existentes permiten completar trabajo frontend, pero los criterios globales de doble picking, validación server-side del bin, idempotencia de wave y consulta/reconciliación de shipment dependen de cambios Flask. Hasta corregirlos y probarlos con PostgreSQL, el resultado final correcto será `FRONTEND_IMPLEMENTATION_COMPLETE / BLOCKED_BACKEND`, no `VERIFIED` integral.


## 8. Avance frontend R6 (20-11-2026)

**Trabajo aplicado en `webapp/`:**
- Se añadió política de acceso a rutas operativas por los grants de `/api/auth/me`: `pick`, `pack` y `ship`; el menú lateral también oculta esas opciones cuando el usuario no tiene el grant (ADMIN conserva acceso).
- Las tres pantallas capturan warehouseId y generation para las lecturas; las respuestas tardías de otro contexto se descartan.
- Picking scanner: las SO se agregan únicamente después de validar el barcode; se retiró la creación manual legacy de lote de la pantalla operativa. El listado de batch/tarea sigue siendo consulta real.
- Picking queda fail-closed para crear ola/lote, confirmar, short-pick y completar batch hasta que el servidor garantice replay seguro, validación de bin y transiciones atómicas/idempotentes. No se presenta el bloqueo local como protección entre operadores.
- Packing: la confirmación exige que todas las unidades recogidas estén verificadas; después de una respuesta incierta se vuelve a consultar el pedido antes de permitir otro scan. Si no se puede reconciliar, se bloquea el siguiente scan.
- Shipping: el detalle queda ligado al warehouse generation; fulfillment tiene guard local de doble submit y el servidor bloquea el agregado SO con `FOR UPDATE`. No se inventa GET shipment ni idempotency key.

**Pruebas frontend añadidas/ampliadas:** grants operativos de ruta, capacidades R6 fail-closed, respuesta stale al cambiar warehouse/generation, conciliación de cantidad packed tras timeout, prevención de doble submit local de fulfillment y requisito de conciliación antes de completar packing.

**Límites que siguen abiertos:** la UI no puede demostrar doble pick imposible, bin scan atómico, enforcement server-side de allowed_functions, complete batch idempotente ni reconciliación GET shipment. Se requieren correcciones y pruebas Flask/PostgreSQL; Flask no se modificó.

**Estado:** `FRONTEND_HARDENING_IN_PROGRESS / BLOCKED_BACKEND`. Pendiente CI Webapp sobre HEAD final de esta iteración.
