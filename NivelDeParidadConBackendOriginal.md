# Nivel de paridad con el backend original

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
| Auth | JWT HS256 + estado vivo de usuario | Bearer técnico | No compatible |
| Cookies/CSRF | `sentry_auth`, `sentry_csrf`, doble envío | No | Pendiente |
| Roles/permisos | Roles, page permissions, warehouse scopes | No | Pendiente |
| Warehouses/zones/bins/items | CRUD, validación y relaciones | Sin endpoints compatibles | Pendiente |
| Inventario | Transacciones, locks, reservas y auditoría | Ledger global: adjust/allocate/release/move, idempotencia, append por operación y réplica CID | Parcial de dominio; un primario global, no paridad ni quorum |
| Receiving/put-away | PO, recepción, cancelación y ubicación | No | Pendiente |
| Picking/waves | Batch, wave, short pick, cancel | No | Pendiente |
| Packing/shipping | Verificación y despacho | No | Pendiente |
| Cycle counts/adjustments | Conteo, aprobación y ajustes | No | Pendiente |
| Transfers | Movimiento y órdenes inter-almacén | Movimiento técnico dentro del ledger | Parcial de dominio; no paridad |
| Orders/RMA/backorders/POS | Workflows completos | No | Pendiente |
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
