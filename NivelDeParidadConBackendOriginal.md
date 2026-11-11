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
| Auth | JWT HS256 + estado vivo de usuario | JWT HS256 + estado vivo de usuario; Bearer técnico aislado en /api/twin | Parcial; falta diferencial completo |
| Cookies/CSRF | `sentry_auth`, `sentry_csrf`, doble envío | `sentry_auth`, `sentry_csrf`, CSRF en mutaciones con cookie | Parcial; falta prueba diferencial completa |
| Roles/permisos | Roles, page permissions, warehouse scopes | ADMIN/page permissions y warehouse scope en auth + catálogo inicial | Parcial; falta aplicar a todos los flujos |
| Warehouses/zones/bins/items | CRUD, validación y relaciones | CRUD warehouses/zones/bins bajo /api/admin; items pendiente | Parcial |
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
