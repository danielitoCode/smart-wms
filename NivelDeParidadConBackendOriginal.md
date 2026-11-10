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

**Límite:** el mutex es local al proceso. No existe consenso/quorum, sincronización de bloques CID ni autoridad distribuida probada. No usar para stock autoritativo multi-nodo ni como ruta Flask equivalente.

## Seguridad que debo reproducir

JWT HS256 de ocho horas, cookies HttpOnly SameSite Strict, CSRF doble envío, estado activo y rol/almacenes actualizados en cada petición, forced password change, lockout, revocación, permisos por página y WMS token scopes. Validar solo firma JWT no es suficiente.

## Distribución Core

Los snapshots no transfieren los bytes CID; DHT/GossipSub están documentados como futuros y el block store predeterminado es local. No declaro replicación de registros WMS ni failover seguro ante particiones.

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

La ejecución `42893176180` sobre `4b3880fe` pasó guard documental/alcance, tidy diff, verificación de módulos, gofmt, vet y race tests. Por tanto, el ledger técnico está validado por su suite automatizada actual. No cambia el estado global: el gemelo sigue sin paridad de autenticación, DTO/rutas de negocio y flujos WMS, y no es sustituible.
