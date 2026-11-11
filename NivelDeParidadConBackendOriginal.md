# Nivel de paridad con el backend original

> **Actualización 2026-11-11 (PrismaTec-Core / wms-twin):** el gemelo cubre el **camino operativo núcleo**
> (auth JWT, catálogo, PO, recepción, putaway, picking/wave, packing, shipping, transfers, cycle-count,
> lookup, balances, system-info, users). **No es sustituible** todavía respecto a POS, Dockd, events/snapshots,
> webhooks, inbound ni la suite E2E Flask. Usar `wms-twin/scripts/parity-smoke.sh` y `demo-flow.sh` para
> demos del equipo. Health puede emitir `service=sentry-wms` con `WMS_TWIN_HEALTH_SERVICE=sentry-wms`.

## Estado global

**NO SUSTITUIBLE.** El backend Flask original permanece intacto y operativo. El gemelo arranca PrismaTec-Core, expone AIP separada, persiste registros por organismo/CID y contiene un ledger técnico de inventario con idempotencia y serialización dentro de una instancia. Todavía no puede atender el frontend original.

## Criterio

No declaro paridad por tener rutas con nombres parecidos. Cada caso debe igualar método, ruta, DTO, validación, autenticación, autorización, status HTTP, cuerpo JSON, efectos laterales, transacción, idempotencia, auditoría y comportamiento ante reinicio/concurrencia.

## Matriz

| Área | Original | Gemelo | Paridad |
|---|---|---|---|
| Arranque API | Flask | Go + PrismaTec Node | Parcial, contratos distintos |
| Persistencia | PostgreSQL/SQLAlchemy | Un organismo por registro + ledger Core + CID | Persistencia local y replicación de bloques por protocolo WMS; no equivalente transaccional |
| Identidad nodo/transporte | No aplica | NodeID + PeerID Core | Firma NodeID y peers explícitos probados con LocalTransport; TCP/libp2p multi-proceso pendiente |
| AIP Core | No aplica | AIP v1 listener independiente | Integrado |
| CRUD genérico | Rutas SQL específicas | `/api/twin/records/*` | No compatible |
| Auth | JWT HS256 + estado vivo de usuario | JWT HS256 + estado vivo de usuario; Bearer técnico aislado en /api/twin | Parcial; falta diferencial completo |
| Cookies/CSRF | `sentry_auth`, `sentry_csrf`, doble envío | `sentry_auth`, `sentry_csrf`, CSRF en mutaciones con cookie | Parcial; falta prueba diferencial completa |
| Roles/permisos | Roles, page permissions, warehouse scopes | ADMIN/page permissions y warehouse scope en auth + catálogo inicial | Parcial; falta aplicar a todos los flujos |
| Warehouses/zones/bins/items | CRUD, validación y relaciones | CRUD warehouses/zones/bins/items/vendors/preferred-bins | Alta en núcleo; validaciones residuales |
| Inventario | Transacciones, locks, reservas y auditoría | Ledger global: adjust/allocate/release/move, idempotencia, append por operación y réplica CID | Parcial de dominio; un primario global, no paridad ni quorum |
| Receiving/put-away | PO, recepción, cancelación y ubicación | Rutas core implementadas | Parcial |
| Picking/waves | Batch, wave, short pick, cancel | Batch + wave-validate/wave-create + confirm/short/complete/cancel | Alta en núcleo |
| Packing/shipping | Verificación y despacho | verify/complete/fulfill básicos | Parcial |
| Cycle counts/adjustments | Conteo, aprobación y ajustes | create/get/submit | Parcial |
| Transfers | Movimiento y órdenes inter-almacén | POST /api/transfers/move + ledger | Parcial |
| Orders/RMA/backorders/POS | Workflows completos | Sales orders admin + fulfill básicos; POS/RMA/backorders pendientes | Parcial / pendiente POS |
| Events/snapshots | Outbox, consumer groups, ack, cursor | Pulse/AIP no equivalen al contrato WMS | Pendiente |
| Connectors/webhooks/inbound/Dockd | Scopes, firmas, retry, DLQ | No | Pendiente |
| Auditoría | Hash-chain y atribución WMS | Audit Core sin mapeo WMS | No paridad |
| Diferenciales/E2E | Suite Flask extensa | Tests unitarios y HTTP técnicos | Pendiente |

## Ledger técnico actual

- GET `/api/twin/inventory/balances`
- POST `/api/twin/inventory/adjust`
- POST `/api/twin/inventory/allocate`
- POST `/api/twin/inventory/release`
- POST `/api/twin/inventory/move`

Requiere Bearer técnico y `operation_id`. El servidor carga las existencias desde el ledger; el cliente no puede fijar cantidades de origen/destino. El mismo ID/comando es idempotente; el mismo ID con otro comando produce conflicto.

**Límite:** el mutex del ledger es local al proceso. La transferencia autenticada de bloques CID y snapshots WMS está implementada y pasó su prueba LocalTransport; aún no existe consenso/quorum, autoridad por partición ni prueba TCP/libp2p multi-proceso. No usar para stock autoritativo multi-nodo ni como ruta Flask equivalente.

## Seguridad que debo reproducir

JWT HS256 de ocho horas, cookies HttpOnly SameSite Strict, CSRF doble envío, estado activo y rol/almacenes actualizados en cada petición, forced password change, lockout, revocación, permisos por página y WMS token scopes. Validar solo firma JWT no es suficiente.

## Distribución Core

El snapshot nativo no transfiere bytes CID; el protocolo WMS ya los transfiere por separado con firma y ACK. DHT/GossipSub siguen como futuros y no hay quorum ni failover seguro ante particiones. La replicación de dos nodos está probada en LocalTransport, no aún en TCP/libp2p.

## Frontends

Admin usa `/api` relativo, cookies y CSRF. Mobile usa `EXPO_PUBLIC_API_URL` y Bearer JWT. El upstream podrá alternarse mediante proxy/configuración después de paridad. Hoy no se debe enviar tráfico funcional al gemelo.

## Condición para declarar una ruta equivalente

1. Capturar fixtures request/response del original.
2. Igualar DTO y validación.
3. Comparar status, headers y JSON.
4. Verificar auth, permisos y aislamiento por almacén.
5. Verificar transacciones, locks e idempotencia.
6. Ejecutar con el frontend original.
7. Registrar evidencia en matriz y auditoría.

El backend original se conserva incluso después de un despliegue gradual y rollback probado.


## Evidencia de validación del ledger

El guard de documentación/aislamiento pasó en el commit `497b2048`. El job Go falló en `go mod tidy -diff`, antes de gofmt, vet y tests. Por tanto, las pruebas añadidas aún no se han ejecutado en CI y el ledger sigue marcado como implementación pendiente de validación.


## Evidencia de CI del ledger

En `9695a825`, el guard documental/alcance pasó, `go mod tidy` y `go mod verify` pasaron, pero gofmt falló. Vet y race tests no se ejecutaron. La paridad sigue sin demostrarse y la implementación no debe usarse en producción.


## Evidencia de CI más reciente

La ejecución `42892797788` validó resolución del módulo, checksum y formato temporal; falló en vet por un import no utilizado en el test nuevo. Race tests no se ejecutaron. El defecto está corregido en el commit siguiente, pendiente de su ejecución completa. La paridad funcional continúa sin demostrarse.


## Última evidencia de CI

La ejecución `42893176180` validó el corte anterior del ledger. En `42895311390`, módulos, gofmt, vet y los paquetes inventoryledger/corestore/domain/replication/runtime pasaron; httpapi falló por aceptar un token sin el esquema Bearer. La corrección está en este commit y queda pendiente de CI. No cambia el estado global: no hay paridad de autenticación original, DTO/rutas de negocio y flujos WMS.


## Avance de autenticación — primitivas, no paridad

| Componente | Estado del gemelo | Paridad |
|---|---|---|
| Firma JWT HS256 | Primitiva añadida; claims del original | Parcial, aún sin endpoints ni estado vivo |
| Verificación JWT | Firma, algoritmo, expiración, vida máxima y claims | Parcial, no consulta usuario persistido |
| CSRF | Generación aleatoria y comparación double-submit | Parcial, aún no conectado a cookies HTTP |
| Política de password | Validación equivalente de longitud/letra/dígito y bloqueo de admin | Parcial, sin cambio de password ni bcrypt |
| Login/logout/refresh | No implementados | Pendiente |
| Sesión, revocación y lockout | No implementados | Pendiente |
| Roles, page permissions y warehouse scopes | No implementados | Pendiente |

El Bearer técnico continúa siendo el único mecanismo activo. La fase completa requiere identidad Core-backed, estado vivo por request, cookies/CSRF y pruebas diferenciales. Ver `wms-twin/docs/FASE_02_SEGURIDAD.md`.


## Identidad persistente — avance parcial

| Componente | Estado | Paridad |
|---|---|---|
| Repositorio de usuarios | Organismo Core por usuario, hash bcrypt y metadatos | Parcial; falta importación del original |
| Username único | Normalización y comprobación bajo mutex del primario | Parcial; sin transacción distribuida |
| Autenticación local | bcrypt, usuario activo y mensaje de error genérico | No expuesta por HTTP |
| Cambio de password | Verifica password actual, hash nuevo y timestamp | No expuesto por HTTP ni auditoría equivalente |
| Login/logout/refresh | No implementados | Pendiente |
| Lockout y revocación | No implementados | Pendiente |
| Middleware, cookies y CSRF | Primitivas solamente | Pendiente |
| Permisos y warehouse scopes | Datos almacenables; no aplicados a requests | Pendiente |

El repositorio es un bloque interno, no una autenticación utilizable por los frontends. Ver `wms-twin/docs/FASE_02_SEGURIDAD.md`.


## Evidencia CI y estado de la prueba manual

El corte de identidad del commit `d8c2c02e17c667620cccdf6dcb017a83f33e575c` pasó la ejecución `42897626723`: tidy diff, verificación de módulos, gofmt, vet y race tests. El guard de documentación/aislamiento también pasó. El formato final quedó publicado en `e0d2e20dea760ad99f71c1376d97a4896f28c284`.

La prueba manual confirmó POST 201, GET 200, CID/RootCID y contador de organismos igual a uno. Aún no confirma persistencia después de reiniciar el servidor local. La matriz sigue indicando que el gemelo no sustituye el backend original.


## Autenticación HTTP — paridad parcial

| Contrato | Estado | Límite |
|---|---|---|
| `POST /api/auth/login` | Implementado | No reproduce todavía todos los detalles de errores Pydantic/auditoría |
| `POST /api/auth/logout` | Implementado | Limpia cookies; no existe revocación individual por jti |
| `GET /api/auth/me` | Implementado | `require_packing` viene de variable de entorno, no de app_settings |
| `POST /api/auth/refresh` | Implementado | Reemite token/cookies tras consultar usuario vivo |
| `POST /api/auth/change-password` | Implementado | Falta escritura de audit log equivalente |
| JWT HS256/8h | Implementado | Estado vivo por request; falta comparación diferencial con fixtures originales |
| Cookies + CSRF | Implementado | Solo para cookie; Bearer queda exento |
| Lockout | Core-backed, persistente | Un organismo por key; sin coordinación distribuida durante partición |
| Forced password change | Middleware reutilizable | Aún no protege endpoints de negocio no portados |
| Page permissions | Wrapper reutilizable | Aún no aplicado a rutas admin equivalentes |
| Warehouse scope/mismatch | Wrapper reutilizable | Aún no aplicado a todos los flujos operativos |
| Importación de usuarios | JSON con hashes bcrypt | No existe aún exportador automatizado desde PostgreSQL |

El Bearer técnico sigue protegiendo `/api/twin/*`. La autenticación de usuarios no convierte todavía esas rutas genéricas en endpoints de negocio compatibles. Ver `wms-twin/docs/FASE_02_SEGURIDAD.md`.


## Importación de identidades — endurecimiento

La importación ahora es idempotente y reanudable. Omite IDs existentes sin sobrescribirlos, rechaza usernames que colisionan con otros IDs y persiste solo los usuarios faltantes. El runtime reintenta el import en cada arranque cuando el archivo está configurado. El hash de nuevas contraseñas usa bcrypt cost 12, equivalente al default de Python `bcrypt.gensalt()`.


## Validación CI del corte de autenticación

| Control | Resultado |
|---|---|
| WMS twin validation `42899616129` | Success |
| Guard documental y de alcance | Success |
| `go mod tidy -diff` / `go mod verify` | Success |
| gofmt / vet / race tests | Success |
| Gitleaks | Success |
| Lockfile version check | Success |
| Dependency Audit global | Failure en npm admin/mobile y pip Python; separado del gemelo Go |
| Suite general `Tests` | En curso al documentar |

El commit probado es `5d8d334bb24dc21bf2609f8c8089092297563de8`; el formato final quedó en `2720ed7d70fb69e46422c3338dc354f15d30cc3a`.


## Evidencia de paridad de catálogo

La primera validación encontró dos errores de compilación por sombreado de variables al leer filtros de bins. Los corregí en `bb645444a830cee3b244a3f9d576b4d2b9e3433c`. El WMS twin validation `42974486856` aprobó el código, incluidos `go vet` y tests `-race`. El commit de formato resultante es `ccf1934b2640feb45df852d515316be73d408de1`.

La suite general del repositorio `42974487059` seguía ejecutándose. Esto no cambia la conclusión: datos maestros iniciales implementados, gemelo global todavía no sustituible.


## Fase 04 — estado de paridad de catálogo

| Contrato Flask | Gemelo Go | Estado |
|---|---|---|
| GET/POST `/api/admin/items` | Igual ruta | Implementado; búsqueda, filtros, paginación |
| GET/PUT/DELETE `/api/admin/items/{id}` | Igual ruta | Implementado; detalle de inventario parcial |
| POST `/api/admin/items/{id}/archive` | Igual ruta | Implementado; toggle activo |
| GET/POST `/api/admin/preferred-bins` | Igual ruta | Implementado; filtro por item/bin/q |
| PUT/DELETE `/api/admin/preferred-bins/{id}` | Igual ruta | Implementado; resecuencia 1..K |
| GET/POST `/api/admin/vendors` | Igual ruta | Implementado; paginación/búsqueda/activo |
| GET/PUT/DELETE `/api/admin/vendors/{canonical_id}` | Igual ruta | Implementado; UUID |

Diferencias pendientes: item detail no reproduce `inventory_id` ni metadatos SQL de inventory; faltan bloqueos de borrado por historial SO/PO; vendor delete no puede comprobar referencias a POs hasta portar compras; null semantics y errores Pydantic no son idénticos. No habilito todavía el frontend.


## Estado actualizado de catálogo

La autenticación y los catálogos warehouses/zones/bins/items/preferred-bins/vendors están conectados bajo `/api/admin`. Las Fases 03 y 04 pasaron WMS twin validation con race tests. No equivale a paridad global: compras, recepción, putaway, inventario SQL-equivalente, picking, packing, shipping, transferencias, conteos, usuarios/admin, integraciones y eventos siguen pendientes.


## Fase 05 — paridad de Purchase Orders

| Ruta Flask | Gemelo Go | Estado |
|---|---|---|
| GET/POST `/api/admin/purchase-orders` | Igual ruta | Implementado; filtros/paginación |
| GET/PUT `/api/admin/purchase-orders/{id}` | Igual ruta | Implementado |
| POST `/{id}/lines` | Igual ruta | Implementado |
| PATCH/DELETE `/{id}/lines/{line_id}` | Igual ruta | Implementado |
| POST `/{id}/close` y `/{id}/reopen` | Igual ruta | Implementado |

Aún pendientes: `/{id}/receipts`, unreceive, recepción móvil, cancelación de recepción, auditoría y eventos/outbox. Los DTO/errores no se han comparado automáticamente con fixtures Flask. El agregado PO no debe considerarse equivalente a una transacción SQL multi-tabla: sus líneas están embebidas para hacer cada mutación de PO un append único.


## Avance fases 06-09

Implementé receiving, put-away, sales orders, picking batch y packing/shipping básicos sobre PrismaTec-Core. Sigo sin declarar el gemelo sustituible ni autorizar el cambio de upstream del frontend en producción.


## Corte lookup/transfers/cycle (AUD-0023)

Añadí lookup item/bin/so/search, transfers/move, cycle-count create/get/submit y wave-validate/create. Documenté tests de flujo HTTP. Sigo sin declarar el gemelo como sustituible al 100%.



## Revisión de paridad del corte 18c389e y endurecimiento posterior

No cuento la existencia de una ruta como paridad. La siguiente matriz separa lo que ahora tiene comportamiento persistente de lo que deliberadamente responde como no soportado para evitar falsos positivos.

| Área | Estado en el gemelo tras el endurecimiento | Paridad real |
|---|---|---|
| Inbound items | Crea artículos mediante catálogo | Parcial; falta mapeo completo, idempotencia y auditoría del contrato original |
| Inbound sales orders | Crea SO persistente | Parcial; falta idempotencia/origen/canonical payload |
| Inbound purchase orders | Crea PO real y líneas persistentes; elimina shadow record | Parcial; falta idempotencia, versionado de origen y receipts |
| POS availability | Lectura filtrada por warehouse y SKU | Parcial; falta barcode, shape y reglas de visibilidad originales |
| POS validate-cart | Valida cantidades acumuladas por artículo | Parcial; no reproduce todos los errores/headers del original |
| POS checkout | Devuelve 501; no crea una venta falsa | Pendiente de tender, total, inventario, idempotencia, audit y outbox |
| POS refund | Devuelve 501; no declara devolución falsa | Pendiente de credit memo, tender match, ventana temporal, idempotencia y reintegro |
| POS dispatch/reference orders | Devuelve 501 | Pendiente |
| Dockd ship | Propaga error de packing y valida transición | Parcial; faltan DTO, idempotencia, audit y comparación diferencial |
| Dockd void-ship | No informa éxito sin reversión persistente | Pendiente |
| RMA | Expediente persistente; no completa sin disposición de stock | Parcial; faltan cantidades/condición por línea, destino, reintegro y backorder equivalente |
| Events | Evento persistido y estado Published; reintento invocable | Parcial; falta worker durable/consumer cursor y garantías de entrega |
| Webhooks | HTTPS, bloqueo SSRF en conexión y redirects deshabilitados | Parcial; falta outbox/retry/DLQ, rotación y cifrado de secretos en reposo |
| Inventory snapshot | Exportación persistida versionada con checksum | Parcial; no hay restore transaccional ni snapshot consistente bajo escritura concurrente |
| Audit chain | Verificación completa antes de append y bloqueo ante corrupción | Parcial; falta prueba de concurrencia multinodo y anclaje externo |
| Mesh | Peer table + TTL gossip | Experimental; no Kademlia DHT ni GossipSub |
| Inventario | Ledger Core con mutex local e idempotencia | Parcial; sin transacción distribuida, quorum ni fencing multinodo |

### Criterio para cerrar cada pendiente

Cada ruta debe compararse con el Flask original mediante fixtures reales request/response y pruebas de efectos laterales. Para POS y RMA también debo demostrar las variaciones del ledger antes/después, repetición idempotente, fallos intermedios y recuperación tras reinicio. Para webhooks necesito verificar persistencia de cada delivery, reintentos, DLQ, SSRF, rotación de secreto y comportamiento bajo caída del consumidor. Para snapshots debo probar integridad, consistencia y restauración en un entorno aislado antes de ofrecer un endpoint restore.

**Estado global: NO SUSTITUIBLE.** La rama de endurecimiento corrige comportamientos falsamente exitosos y añade controles; no equivale a paridad funcional ni autoriza mover tráfico productivo.


En el corte más reciente, el snapshot usa filas tipadas para conservar enteros en el checksum y Events expone un reintento manual protegido por scope `events.publish`. Esto mejora integridad/operabilidad, pero no convierte el outbox en un dispatcher autónomo ni garantiza entrega exactamente-una-vez.


## Revisión de cierre funcional — corte de noviembre de 2026

| Área | Estado de implementación Go | Lo que todavía no demuestra paridad |
|---|---|---|
| POS checkout | Checkout persistente, tender validado, stock decrementado o reservado, saga idempotente y compensación parcial | Fixtures completos de Flask; terminal/tender edge cases; integración de pago externo |
| POS refund | Reembolso parcial/total con control de tender/90 días, devolución de stock y registro de referencia externa | No ejecuta el movimiento financiero externo ni reproduce todavía cada credit memo Flask |
| POS dispatch | Despacho de phone order con release de reserva, decremento y recuperación idempotente del shipment | Faltan fixtures y pruebas de fallos concurrentes multinodo |
| Dockd void | Reversión persistente al estado pre-shipment, cantidad shipped cero, reason y operation ID | No sustituye la logística física; debe compararse con todos los estados/errores Flask |
| RMA | Líneas esperadas/recibidas, RESTOCK/SCRAP/HOLD y ledger idempotente | Falta paridad de los modelos/credit memos y casos de backorder del original |
| Webhooks | Outbox durable, worker, backoff, DLQ, retry manual, AES-GCM, SSRF guard | Falta rotación de claves, métricas/alertas y entrega multinodo exactamente una vez; delivery es al menos una vez |
| Snapshot | Exportación verificable y restore con checksum + expected ledger version | No hay CAS distribuido; el restore exige ventana controlada y respaldo externo |
| Inbound | Idempotencia source-scoped, recuperación por claves naturales, mapping por SKU/warehouse_code | Versiones nuevas no aplican upsert; mapeo por recurso todavía requiere contrato de actualización |
| Mesh | Kademlia DHT + GossipSub real sobre LibP2PTransport; fallback TTL para transportes no libp2p | Debe probarse bootstrap, churn, partitions, provider records y persistencia en red real; fallback TCP no es DHT |
| Audit | Cadena verificada antes de append | No hay anclaje externo ni quorum multinodo |
| Inventory | Ledger con operation_id, restore y movimientos idempotentes | Sin transacción distribuida ni fencing/quorum entre nodos |

### Reglas de operación

1. No ejecutar POS checkout sin bin_id, idempotency_key, referencia de transacción y tender reconciliado.
2. No enviar un phone order sin que el pedido haya alcanzado PICKED/PACKED y sin carrier/tracking/idempotency_key.
3. No anular shipment sin reason e idempotency_key.
4. No completar RMA si quedan cantidades sin recibir/disponer.
5. No crear suscripciones webhook sin clave AES de 32 bytes configurada.
6. No restaurar snapshot sin verificar SHA-256 y confirmar expected_ledger_version.
7. No tratar external_version nueva como update: el endpoint la rechaza hasta portar el contrato de UPSERT.
8. No afirmar DHT/GossipSub cuando el transporte activo no expone un host libp2p.

**Estado global:** el gemelo tiene ahora más operaciones reales y recuperables, pero sigue **NO SUSTITUIBLE** hasta ejecutar CI, comparar fixtures Flask/Go y validar concurrencia, particiones y efectos laterales multinodo.
