# R9 — Integraciones, webhooks, auditoría y operaciones complementarias

**Rama:** `svelte-webapp`  
**Directorio de implementación:** `webapp/`  
**Baseline inspeccionado:** `e7b59c969e2c861f68992c2e19522b2790a46bf2`  
**Inicio de R9:** 22-11-2026  
**Regla de alcance:** cambios de migración solo en `webapp/`; Flask se inspecciona como contrato y fuente de verdad, no se modifica.

## Estado inicial

Las features ya existen en Clean Architecture; R9 empieza como auditoría y endurecimiento, no como creación desde cero.

| Feature | Domain / Application | Data / endpoints observados | UI actual | Riesgo / estado inicial |
|---|---|---|---|---|
| Webhooks | Entidades, repositorio y casos de uso para CRUD, rotación, DLQ, stats, errores y replay simple/lote | `/api/admin/webhooks`, `/{id}`, `/rotate-secret`, `/dlq`, `/stats`, `/replay/{delivery_id}`, `/replay-batch`, `/api/admin/webhook-errors` | Suscripciones, secreto one-time, pausa/reanudación, revocación/purga, DLQ, estadísticas, errores y replay | API global; page grant `webhooks` no equivale a warehouse scope. Se restringe la pantalla a ADMIN como mitigación frontend |
| Connectors | Feature existente en R8 | Catálogo/schema, credenciales, test, sync status/reset/execute | Configuración por almacén, estado y errores | Mantener controles de secretos y scope por warehouse de R8.5; validar DTO y permisos dentro de regresión R9 |
| Audit Log | Filtros, paginación, sorting, mapper con redacción | `GET /api/admin/audit-log`; filtros action/user/date/item; sort whitelist | ADMIN-only por route policy; lectura y detalle read-only | Endpoint no acepta warehouse_id ni filtra por scope; la vista global se conserva ADMIN-only. El lookup de nombres secundarios no aplica scope, pero solo se consume desde esa vista ADMIN |
| Fraud | Cola, detalle, memo, historial scoped, push a cola | `GET /api/admin/sales-orders?status=FRAUD_REVIEW`, detalle, `/memo`, `/audit-history`, `/push-to-queue` | Revisión manual por almacén; memo e historial | Flask no devuelve score ni recomendación de fraude. La feature representa el estado `FRAUD_REVIEW`, no un motor de score |
| Customers | Proyección read-only desde sales orders; agrupación por nombre normalizado | `/api/admin/search?q=...`, `/api/admin/sales-orders`, detalle SO | Lista, búsqueda, detalle e historial de pedidos | No hay entidad/ID canónico ni API CRUD de clientes. Dedupe solo dentro de los resultados/página consultados; no afirmar identidad o total global |

## Hallazgos confirmados por contrato Flask

### R9.1 — Webhooks

- Los handlers están protegidos por `require_auth` y `require_admin_or_page_permission("webhooks")`; la autorización de página existe en Flask.
- Crear y rotar secreto devuelven plaintext una sola vez. El secreto persistido se cifra en `webhook_secrets.secret_ciphertext`; list/detail no devuelven secreto.
- CRUD, pause/resume, soft revoke, hard purge, rotate-secret, DLQ paginada, stats por ventana, catálogo de errores y replay simple/lote existen en Flask. Replay escribe eventos auditados.
- Los filtros de suscripción aceptan `warehouse_ids`, y el backend valida que existan, pero los endpoints administrativos de suscripciones/listado/errores/replay son globales; no comprueban que cada warehouse_id pertenezca a los almacenes asignados al actor. La pantalla se restringe a ADMIN para evitar que una concesión USER de page grant exponga o administre suscripciones globales. Esto no sustituye un guard backend.
- DLQ devuelve exclusivamente filas con status `dlq`, por lo que el mapper que asigna `status: 'dlq'` está alineado con ese endpoint. El catálogo global de errores sí devuelve el estado real.
- El replay por lotes tiene filtro de estado/event type/warehouse/fechas, acknowledgement para lotes grandes, límite duro, throttling y audit log. No se debe simplificar ni omitir la confirmación que exige el contrato.

### R9.2 — Connectors

- R8.5 ya endureció el manejo de secretos: GET enmascarado, POST sin plaintext de vuelta, mapper que descarta valores, inputs sensibles y limpieza del draft.
- Credenciales, test, estado y sync llevan warehouse_id y el middleware Flask valida el almacén para estas rutas. Mantener este contexto en cualquier extensión.
- Catálogo/schema son globales; configuración y estado operativo deben seguir vinculados al almacén seleccionado.
- No confundir el test de conexión con una sincronización ejecutada, ni un task ID con sincronización completada.

### R9.3 — Audit Log

- `GET /api/admin/audit-log` tiene page grant `audit-log`, filtros action_type/user_id/start_date/end_date/item_id, paginación y sort whitelist.
- No tiene filtro `warehouse_id` ni añade `warehouse_scope_clause`. La route policy frontend mantiene `/management/audit-log` ADMIN-only.
- El backend resuelve nombres para item/bin/SO/PO en consultas secundarias por ID. No implementar una vista USER basada en filtrar localmente un dataset global.
- La historia de auditoría de un SO usa un endpoint distinto: valida warehouse scope sobre el SO y filtra por entity SO + warehouse_id; esa vista puede permanecer disponible dentro de Fraud cuando Flask concede `fraud` o `audit-log`.
- `AuditLogMapper` redacta claves sensibles para la presentación. La redacción frontend no reemplaza redacción server-side antes de persistir/serializar.

### R9.4 — Fraud

- La cola se obtiene de sales orders con status `FRAUD_REVIEW`, con paginación y warehouse scope en Flask.
- Detalle, memo y push-to-queue comprueban el warehouse scope. Historial de auditoría por SO valida el acceso al pedido y filtra por su warehouse_id.
- Los contratos DTO inspeccionados no contienen `fraud_score`, risk score, recommendation ni explicación de modelo. No existe dato del que construir un indicador numérico o recomendación. La UI solo puede presentar la bandera/status de revisión y las acciones manuales expuestas por Flask.
- `push-to-queue` mueve el pedido desde `FRAUD_REVIEW` a `OPEN`; no debe describirse como aprobación automática por un modelo.

### R9.5 — Customers

- No hay tabla/endpoint canónico de clientes en la API administrativa inspeccionada. `customer_name`, teléfono, email y direcciones son campos proyectados desde sales orders.
- `/api/admin/search` construye resultados DISTINCT de `customer_name` dentro del warehouse_id recibido; el tipo customer es una proyección de búsqueda, no una identidad maestra.
- `/api/admin/sales-orders` es paginado por pedidos, no por clientes. El agrupamiento Svelte por nombre solo deduplica la página cargada; el conteo puede ser de esa página o el agregado que devuelva la búsqueda global, no es un total de cliente universal.
- El historial filtra por nombre exacto sobre candidatos del endpoint `q`, que también busca número de SO. El total/paginación del backend corresponde a pedidos coincidentes, no necesariamente a pedidos del cliente exacto.
- Mantener read-only. No implementar merge, create, update, delete, dedupe global, ni un customer ID sintético que se presente como canónico.

## Cambios iniciales aplicados en R9

1. `AccessPolicy.routeAccessPolicyForPath` ahora trata `/management/webhooks` y descendientes como ruta ADMIN-only, igual que otras pantallas globales sin scope server-side.
2. Se amplió `AccessPolicy.test.ts` para verificar el bloqueo a USER incluso con grant de página, y el acceso ADMIN.
3. `WebhooksScreen.svelte` limpia el secreto plaintext de una sola exposición al destruir la pantalla (`onDestroy(vm.clearSecret)`).
4. `WebhooksScreen.test.ts` verifica la limpieza del secreto al salir.

Estos guards son mitigaciones de interfaz. El backend sigue aceptando page grant `webhooks`; un cliente API directo con ese grant no queda protegido por la route policy Svelte.

## Criterios de aceptación R9

- DTO y mapper coinciden con los contratos reales; estados y resultados no se infieren.
- Toda ruta con datos globales sin scope backend queda ADMIN-only en Svelte, sin filtrado client-side que pretenda dar seguridad.
- Las rutas operativas por almacén conservan warehouse_id explícito y validación del contexto antes y después de llamadas asíncronas.
- Los secretos se muestran solo cuando el servidor los devuelve por creación/rotación, se limpian al salir y nunca entran en logs, DTO persistente ni metadata de auditoría.
- Paginación, filtros, errores 400/403/404/409/429, límites y confirmaciones se prueban contra el contrato.
- Fraud no muestra score/recommendation no proporcionados por Flask.
- Customers continúa read-only y etiqueta correctamente el alcance de deduplicación y conteos.
- Las capacidades inexistentes se etiquetan como futuras/no disponibles; no se simula éxito.


### Revisión adicional R9.1–R9.3 (HEAD d3e9d53027a2)

- **R9.1 Webhooks:** los schemas Flask fijan `rate_limit_per_second` entre 1 y 100; `pending_ceiling` y `dlq_ceiling` son enteros >= 1. El caso de uso Svelte valida estos rangos y el límite de página DLQ (1–500). El replay por lotes usa estados permitidos (`dlq`, `failed`, `succeeded`), rango temporal y warehouse opcional; el UI conserva el acknowledgement del replay masivo. Los endpoints de errores y replay siguen siendo globales y dependen de la mitigación ADMIN-only.
- **R9.2 Connectors:** catálogo/schema globales; credenciales, test, sync-status, reset y execute incluyen `warehouse_id` y el middleware Flask aplica validación de almacén. GET solo devuelve claves enmascaradas. El método legacy `IntegrationsRemoteDataSource.test(name)` no incluye warehouse_id y no forma parte del flujo DI actual; verificar consumidores y eliminarlo antes del cierre.
- **R9.3 Audit Log:** el backend admite action/user/date/item, page/per_page y sort whitelist (`created_at`, `action_type`, `user_id`, `entity_type`). No hay filtro ni scope por warehouse. La UI conserva ADMIN-only. Se corrigió una carrera frontend: una respuesta antigua ya no puede sobrescribir el resultado de un filtro posterior; se añadió prueba de regresión. La redacción de `details` es de presentación, no protección de almacenamiento ni API.

## Pendientes para siguientes incrementos

- R9.1: completar matriz de pruebas de secreto/rotación, replay simple/lote, DLQ/errores, límites y errores HTTP; confirmar el guard ADMIN-only en pruebas de rutas.
- R9.2: completar regresión de errores 400/403/404 por almacén, confirmar cambio rápido de almacén y limpiar el método legacy de test sin warehouse si no tiene consumidores.
- R9.3: ampliar pruebas de filtros/paginación/sorting/redacción, verificar ADMIN-only y mantener explícito que el aislamiento por almacén no existe en Flask.
- R9.4: comprobar ausencia de score inventado y reforzar pruebas de warehouse scope y transiciones Fraud.
- R9.5: probar la proyección de Customers y hacer explícitos los límites de identidad, deduplicación y conteo.
- R9.6: regresión integrada de R9 y verificación Webapp CI sobre HEAD definitivo.

**No se modificó Flask/Python.**


### Revisión adicional R9.4–R9.6 (22-11-2026)

- **Fraud — contrato real:** cola por `status=FRAUD_REVIEW`, `warehouse_id`, `page` y `per_page=50`; detalle, memo con `expected_memo`, historial paginado y `push-to-queue` usan los endpoints existentes. El mapper rechaza el detalle si el pedido ya no está en `FRAUD_REVIEW`. La transición disponible es manual: `push-to-queue` devuelve el pedido a la cola de preparación; no es una decisión de un modelo antifraude. No hay score ni recommendation en DTO.
- **Fraud — endurecimiento:** las mutaciones memo/push ya no actualizan ni recargan el estado si el contexto de almacén/lista fue invalidado mientras la petición estaba en vuelo. El resultado de `push` queda condicionado a que la recarga de la bandeja se complete; si no puede verificarse el estado nuevo, no se reporta la operación como refrescada. Pruebas nuevas cubren el cambio de contexto durante memo y push.
- **Customers — contrato real:** `/api/admin/search` exige al menos dos caracteres y devuelve hasta 10 coincidencias de customer por consulta; cada resultado es `DISTINCT customer_name` más un count de sales orders dentro del warehouse consultado, sin ID canónico. `/api/admin/sales-orders` pagina pedidos, no clientes. El UI limita la página de origen a 50 pedidos; la deduplicación por nombre normalizado y los conteos derivados de filas quedan explícitamente limitados a esa página. El historial filtra por nombre exacto sobre candidatos `q`, cuyo total puede incluir coincidencias por número de pedido.
- **Customers — endurecimiento:** `setWarehouseId` invalida inmediatamente solicitudes y detalle anteriores y limpia datos del almacén previo. Se corrigió además una carrera real: las respuestas de búsqueda/listado ahora se aplican solo si su request version sigue vigente; anteriormente la versión protegía errores/loading pero no impedía que una respuesta vieja sobrescribiera resultados recientes. Pruebas nuevas cubren respuesta antigua de búsqueda, cambio de almacén y detalle tardío.
- **R9.6 — regresión:** añadidas pruebas unitarias de estado para los casos de concurrencia anteriores, manteniendo pruebas existentes de DTO/mapper, límites, paginación, scope y transiciones. La matriz completa y la aceptación CI permanecen pendientes hasta obtener un resultado exitoso en el HEAD definitivo.
- **Límite de alcance:** no se modificó Flask/Python. No se simula una evaluación antifraude ni un CRUD/merge de clientes. Las comprobaciones frontend no reemplazan las validaciones warehouse-scoped del servidor.


### Endurecimiento adicional Fraud y estado CI (22-11-2026)

- Se detectó que los catch de memo y push podían publicar un error de una solicitud antigua después de invalidar/cambiar el contexto de almacén. Ahora solo publican el error si el epoch de lista sigue vigente.
- Se añadieron dos pruebas que rechazan memo/push después de clear() y verifican que el contexto nuevo permanece sin errores ni datos antiguos.
- Webapp CI del HEAD previo 4ee1428ff66a672125dcde6c4e27b967c9f6892b, run [45042682060](https://github.com/danielitoCode/smart-wms/actions/runs/45042682060), falló en typecheck antes de build/tests: 26 errores y 122 warnings en 53 archivos. Los errores visibles corresponden a componentes/rutas de laboratorio (BranchedMenu ausente, props de FlowingMenu/MagicBento incompatibles, entre otros); no se reportaron errores en Fraud/Customers en el log inspeccionado. Las suites no se ejecutaron, por tanto no hay aceptación R9.6.
- Lockfile Version Check, Dependency Audit y gitleaks finalizaron correctamente en ese HEAD. El workflow Tests separado seguía en curso y no forma parte de la aceptación frontend.
- El nuevo HEAD con el hardening de errores stale es 37d2f3577f8fcfd221a59f5c3abca5a91baf37ef; su CI debe completar para evaluar si los cambios nuevos están limpios. No se modificó Flask/Python.
