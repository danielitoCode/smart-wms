# Nivel de paridad con el backend original

## Criterio

No declaro paridad por tener rutas con nombres parecidos. Cada caso debe igualar método, ruta, DTO, validación, autenticación, autorización, status HTTP, cuerpo de respuesta, efectos laterales, transacción, idempotencia y errores observables por admin y móvil.

## Estado global

**NO SUSTITUIBLE.** El gemelo es un primer corte ejecutable de infraestructura Core. Todavía no puede atender el frontend original. El backend Flask no se elimina ni se modifica.

El inventario de rutas y clientes se encuentra en `wms-twin/docs/MAPA_RUTAS_ORIGINAL.md`. Ese mapa se obtuvo de los blueprints y esquemas originales; cada endpoint debe verificarse además contra sus servicios y tests antes de marcarse equivalente.

## Matriz de capacidades

| Área | Original | Gemelo | Paridad |
|---|---|---|---|
| Arranque API | Flask | Go + PrismaTec Node | Parcial, contratos distintos |
| Persistencia | PostgreSQL/SQLAlchemy | Organismos + bloques CID Core | Implementada en corte técnico; no equivalente transaccional |
| Identidad de nodo | No aplica | NodeID Core | Implementada |
| Identidad transporte | No aplica | TCP/libp2p según Core | Configurable; no validada en WMS E2E |
| AIP Core | No aplica | AIP v1 en listener independiente | Implementado |
| CRUD genérico | Rutas específicas SQL | `/api/twin/records/*` | No compatible |
| Autenticación | JWT HS256 + estado vivo de usuario | Bearer técnico independiente | No compatible |
| Cookie `sentry_auth` | HttpOnly/SameSite Strict | No | Pendiente |
| CSRF doble envío | Cookie `sentry_csrf` + header | No | Pendiente |
| Roles/permisos/páginas | DB y permisos por página | No | Pendiente |
| Alcance por almacén | Path/query/body consistente | No | Pendiente |
| Warehouses/zones/bins/items | CRUD, validación y relaciones | Sin endpoints compatibles | Pendiente |
| Inventario y reservas | Transacciones y locks | Invariantes puras solamente | No paridad |
| Receiving/put-away | Recepción y ubicación | No | Pendiente |
| Picking/waves/short picks | Flujo completo | No | Pendiente |
| Packing/shipping/fulfillment | Verificación y despacho | No | Pendiente |
| Cycle counts/adjustments | Conteos y aprobación | No | Pendiente |
| Transferencias | Transfer orders e inter-warehouse | No | Pendiente |
| Auditoría | Hash-chain, servicios y eventos | Audit Core JSONL parcial | No paridad |
| Outbox/events/webhooks | Publicación, consumidores, DLQ y replay | No | Pendiente |
| Conectores/importaciones | Credenciales, sincronización y CSV | No | Pendiente |
| Pruebas diferenciales | Suite extensa Flask | Tests unitarios iniciales | Pendiente |

## Autenticación que debo reproducir

- JWT HS256 con expiración de 8 horas y claims de usuario/almacenes.
- Cookie `sentry_auth` HttpOnly, SameSite Strict, Secure bajo HTTPS.
- Cookie `sentry_csrf` y header `X-CSRF-Token` para mutaciones desde admin.
- Mobile usa Bearer JWT.
- Revalidación de usuario activo, rol, almacenes, cambio de contraseña y permisos de página en cada request.
- Login rate limit y forced password change.
- Revocación de WMS tokens con cache/Redis/PostgreSQL NOTIFY.

Validar solo firma JWT no es suficiente y sería una regresión de seguridad.

## Bloqueo distribuido detectado

El snapshot de replicación Core no transporta los bytes de bloques CID. El organismo remoto recibe referencias a CID que podrían no existir en su almacenamiento local. Hasta resolver transferencia/rehidratación verificable de bloques y probarla, el almacenamiento WMS no se considera replicado. Además, Core aún documenta DHT/GossipSub como futuro y no ofrece quorum seguro de dos nodos ante partición.

## Condición para declarar una ruta equivalente

1. Capturar fixtures de request/response del original.
2. Implementar DTO y validación idénticos.
3. Comparar status y JSON canónico.
4. Verificar permisos y aislamiento entre almacenes.
5. Verificar transacciones, concurrencia e idempotencia.
6. Ejecutar pruebas con el frontend original.
7. Registrar evidencia y commit en esta matriz y en `AUDITORIA_GEMELO.md`.

Hasta entonces, el endpoint se marca como pendiente, aunque su lógica interna exista.
