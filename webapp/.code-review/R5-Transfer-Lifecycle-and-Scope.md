# R5 — Transferencias entre almacenes: auditoría de contratos y guardas frontend

**Rama:** `svelte-webapp`  
**Alcance:** exclusivamente `webapp/`. Flask/Python se inspecciona como contrato, pero no se modifica.  
**Estado:** `FRONTEND_GUARDS_IMPLEMENTED / BLOCKED_BACKEND`  
**Conclusión:** no se puede certificar R5 como recorrido logístico completo con los contratos Flask actuales. La UI queda en consulta y las mutaciones incompatibles con el ciclo solicitado están deshabilitadas.

## 1. Contratos Flask comprobados

### 1.1 Transfer Orders

- `GET /api/admin/transfer-orders`: listado paginado. Para usuarios no ADMIN, `_transfer_order_scope_sql()` exige que origen Y destino estén dentro de `warehouse_ids`.
- `GET /api/admin/transfer-orders/<id>`: el encabezado se obtiene con el mismo filtro de ambos almacenes. Si falta uno, responde 404. Las líneas y aprobaciones se leen después de validar el encabezado.
- `GET /api/admin/picker/transfer-orders/<id>`: lectura del picker con scope de almacén origen; no acredita autorización de destino.
- `POST /api/admin/transfer-orders/import`: crea orden y compromete cantidades agregadas. El backend reserva contra `quantity_allocated`, pero no devuelve ni persiste una relación inequívoca por orden/línea/inventory_id/bin/lote que permita liberar exactamente cada reserva cuando hay órdenes concurrentes del mismo SKU.
- Inicio de picking y envío de cantidades existen; la aprobación actual mueve inventario desde origen a destino. No hay una operación de despacho separada que cree un saldo en tránsito ni una recepción independiente por el usuario del almacén destino.
- Cancelación y short-close dependen de liberar cantidades agregadas recorriendo filas de inventario; no equivalen a un ledger de reservas exactas por línea/bin.
- El detalle incluye `notes`; no hay contrato separado de memo con ciclo de vida/ACL distinto.

Referencia de auditoría previa: `webapp/docs/F3.8-transfer-orders-closure.md`.

### 1.2 Inter-warehouse Transfers

- `POST /api/admin/inter-warehouse-transfer`: valida que ambos almacenes sean distintos, activos y estén autorizados independientemente; valida bins dentro de cada almacén; calcula disponible como `quantity_on_hand - quantity_allocated`; bloquea filas/identidades de inventario, ejecuta decremento e incremento dentro de una transacción, preserva lote, escribe `bin_transfers`, auditoría de salida/entrada y recibo idempotente.
- Esta operación mueve el saldo inmediatamente de origen a destino y libera backorders destino tras commit. No crea una fase `IN_TRANSIT`, no separa dispatch de receive y no reserva stock con anterioridad al picking.
- `GET /api/admin/inter-warehouse-transfers`: historial limitado; el servidor filtra por acceso simultáneo a ambos extremos. El historial es la superficie de consulta disponible; no existe endpoint individual de detalle ni API de memo.
- No se encontró endpoint de `dispatch`, `receive` o `put-away` para el ciclo inter-almacén.

Referencia: `webapp/docs/F3.9-inter-warehouse-transfers.md`.

## 2. Cambios aplicados en frontend

### Scope y aislamiento

- Nuevo `TransferWarehouseScopePolicy`: una transferencia solo es visible si el usuario tiene acceso a origen y destino. ADMIN conserva acceso global, pero los IDs deben ser válidos y distintos.
- Transfer Orders filtra el listado usando los almacenes activos devueltos por el endpoint autorizado y vuelve a validar ambos almacenes después de obtener el detalle. Si el detalle no cumple ambos extremos, no se conserva como selección.
- Inter-warehouse history filtra también por presencia de ambos almacenes en el conjunto autorizado.
- Los filtros de origen y destino siguen siendo independientes; no se transforma el permiso de origen en permiso implícito de destino.

### Mutaciones cerradas por seguridad

- Transfer Orders queda en modo consulta: crear/importar, reservar, iniciar picking, enviar cantidades, aprobar/rechazar, short-close, cancelar y eliminar no se ejecutan desde el estado frontend.
- Inter-warehouse deja deshabilitado el movimiento directo. Su endpoint es transaccional/idempotente para movimiento inmediato, pero no satisface el recorrido de mercancía en tránsito y recepción destino.
- No se crean saldos, reservas, recepciones, ubicaciones ni eventos ficticios en memoria/localStorage.
- La pantalla explica por qué la ejecución no está disponible; el historial y el detalle existente permanecen consultables.

### Contratos futuros definidos

Nuevo archivo: `src/core/feature/transfer-orders/domain/contract/TransferLifecycleContract.ts`.

Incluye:
- capacidades tipadas `SUPPORTED / PARTIAL / NOT_SUPPORTED_BY_SERVER`;
- comandos con `expectedVersion`, `idempotencyKey`, cantidades por línea y warehouse destino;
- puerto `TransferLifecycleRepository`;
- superficie nombrada de casos de uso: CreateTransfer, GetTransfer, ReserveTransferStock, StartTransferPicking, SubmitPickedQuantities, ShortCloseTransfer, DispatchTransfer, ReceiveTransfer, PutAwayTransfer y CancelTransfer;
- error explícito `NOT_SUPPORTED_BY_SERVER`; no hay fallback que invente éxito.

## 3. Pruebas frontend añadidas/actualizadas

- Política: solo origen, solo destino, ambos, ADMIN y almacenes iguales/IDs inválidos.
- Contrato futuro: dispatch, receive, put-away, ledger en tránsito y reserva exacta permanecen no soportados; los diez casos de uso futuros fallan de forma explícita.
- Transfer Orders state: filtra filas si falta uno de los dos almacenes; rechaza detalle fuera de scope; confirma que las mutaciones no llaman a los repositorios.
- Inter-warehouse state: filtra historia a ambos almacenes y confirma que no invoca el endpoint de movimiento inmediato.
- UI: presenta los avisos de indisponibilidad y mantiene los controles de mutación deshabilitados.

Las pruebas se han añadido al repositorio; no se consideran aprobadas hasta que Webapp CI termine sobre el HEAD definitivo.

## 4. Matriz de aceptación

| Criterio | Estado frontend | Dependencia/limitación |
|---|---|---|
| Listado aislado por origen Y destino | Guard local + scope Flask comprobado | Revalidar CI |
| Detalle aislado por ambos extremos | Guard local + scope Flask comprobado | IWH no tiene detalle individual |
| Memo/notas | Transfer Order notes read-only | Sin API memo separada |
| Retorno a cola | Consulta inline/listado conservado | Sin operación de mutación |
| Origen y destino autorizados independientemente | Política y filtros locales; Flask comprueba ambos en rutas principales | El picker read solo valida origen |
| Stock disponible no bruto | IWH inmediato calcula no asignado | No equivale a reserva anticipada |
| Reserva exacta/concurrente por línea/bin | Bloqueado/deshabilitado | Flask no expone ledger de asignaciones por línea/bin |
| Picking y short-close seguro | Deshabilitados en el recorrido R5 | Dependen de reserva exacta |
| Dispatch y no doble dispatch | No soportado/deshabilitado | Endpoint Flask ausente |
| Stock en tránsito diferenciado | No soportado | Estado/ledger Flask ausente |
| Receive y no doble recepción | No soportado/deshabilitado | Endpoint Flask ausente |
| Put-away y capacidad destino | No soportado/deshabilitado | Endpoint/validación de capacidad ausentes |
| Cancelación/rechazo y liberación exacta | Deshabilitados | Liberación actual agregada, no vinculada inequívocamente a reserva |
| Ledger conciliado y auditoría | IWH directo registra movimiento/auditoría; Transfer Orders audita etapas existentes | Falta ledger completo origen→tránsito→destino |
| Pruebas de dos usuarios/dos almacenes | Cobertura backend existente inspeccionada; pruebas frontend locales añadidas | Ejecución backend fuera de alcance; no sustituye CI frontend |

## 5. Requisitos backend para habilitar R5

1. Reserva persistente por `transfer_id + line_id + inventory_id/bin_id + lot/serial + quantity`, transaccional y con locks deterministas.
2. Comando idempotente de picking que confirme cantidades reales y evite sobre-picking concurrente.
3. Short-close que libere exactamente el remanente de cada reserva, con transición de estado y ledger en la misma transacción.
4. Dispatch idempotente que consuma la reserva confirmada y cree saldo `IN_TRANSIT` sin incrementar disponible destino.
5. Receive idempotente, autorizado por destino, con cantidades recibidas/dañadas/faltantes y conciliación de lo despachado.
6. Put-away autorizado por destino, con validación server-side de bin activo, compatibilidad y capacidad; solo entonces aumentar stock disponible destino.
7. Cancelación/rechazo condicionado por estado y conciliación del ledger, sin liberar dos veces ni cambiar stock después de despacho.
8. Detalle, listado, memo e historial con scope independiente de origen/destino, versiones/ETags o equivalente, y eventos de auditoría consultables.
9. Pruebas PostgreSQL de dos usuarios con permisos cruzados, dos almacenes, dos transferencias concurrentes sobre el mismo stock, doble picking/dispatch/receive, rollback y reintentos idempotentes.

## 6. Dictamen

R5 **no está cerrado funcionalmente**. La migración frontend queda protegida contra las dos operaciones actuales que podrían confundirse con el flujo solicitado. Se habilitará la ejecución cuando Flask proporcione reserva exacta, dispatch, tránsito, receive, put-away y ledger con sus garantías transaccionales. No se ha modificado Flask/Python.


## 7. Endurecimiento adicional de contexto UI

- Las cargas de listado y detalle de Transfer Orders usan epochs: una respuesta antigua no puede reemplazar una consulta más reciente ni reabrir un detalle anterior.
- Al cambiar filtros de estado/origen/destino o volver al listado, se invalida el detalle seleccionado y el snapshot de picker.
- Si el servidor devuelve alguna fila cuyo origen o destino no está en la lista autorizada, se oculta y no se conserva el total/paginación original que pudiera filtrar metadatos de esa fila.


## 8. Revisión de autorización de sesión (20-11-2026)

La revisión final detectó que las guardas de Transfer Orders utilizaban el rol literal `USER` y que ambas vistas inferían autorización a partir de la lista de almacenes cargada por su propio selector. Eso no era suficiente: podía excluir incorrectamente a ADMIN y, más importante, no debía convertir una lista de catálogo en la fuente de grants del usuario.

**Corrección aplicada en frontend:**
- Transfer Orders obtiene `role` y `warehouseIds` desde `authSession.getUser()`, que se alimenta del perfil autenticado `/me`.
- El policy de ambos extremos recibe el rol real; ADMIN conserva el alcance global permitido por la política y los demás roles necesitan los dos IDs en sus grants.
- Los almacenes disponibles en Transfer Orders se limitan a los grants de sesión para usuarios no ADMIN.
- El historial IWH limita también los almacenes del selector y las filas a los grants de sesión; no considera autorizado un almacén solo porque aparezca en el catálogo.
- Si no hay usuario autenticado/grants en memoria, el comportamiento es fail-closed.
- Se ampliaron las pruebas de estado para comprobar que un almacén presente en el catálogo pero ausente de los grants no aparece como autorizado.

**Commits de esta corrección:**
- `92e85efd867cd4d597ff96aea5eaf5bdd5ec97fe` — Transfer Orders.
- `dfcc97c1a9c6ba902ad58a21690ab9fb2eec9584` — Inter-warehouse history.
- `fe27f0db9c01b5d5dfb134d1a92c867558102a62` — pruebas Transfer Orders.
- `5578c7516b186873e0154f16ffad0d2a68de2952` — pruebas IWH.

**Estado de aceptación:** guardas frontend y pruebas añadidas; la aprobación efectiva depende de Webapp CI en el HEAD final. Esto no sustituye el enforcement Flask. El cierre funcional integral R5 sigue bloqueado por las capacidades backend enumeradas en §5.
