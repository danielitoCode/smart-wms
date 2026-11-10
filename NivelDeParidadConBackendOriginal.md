# Nivel de paridad con el backend original

## Criterio

No declaro paridad por tener rutas con nombres parecidos. Cada caso debe igualar método, ruta, DTO, validación, autenticación, autorización, status HTTP, cuerpo de respuesta, efectos laterales, transacción, idempotencia y errores observables por admin y móvil.

## Estado global

**NO SUSTITUIBLE.** El gemelo es un primer corte ejecutable de infraestructura Core. Todavía no puede atender el frontend original. El backend Flask no se elimina ni se modifica.

## Matriz de capacidades

| Área | Original | Gemelo | Paridad |
|---|---|---|---|
| Arranque API | Flask | Go + PrismaTec Node | Parcial, contratos distintos |
| Persistencia | PostgreSQL/SQLAlchemy | Organismos + bloques CID Core | Implementada en corte técnico; no equivalente transaccional |
| Identidad de nodo | No aplica | NodeID Core | Implementada |
| Identidad transporte | No aplica | TCP/libp2p según Core | Configurable; no validada en WMS E2E |
| AIP Core | No aplica | AIP v1 integrado | Implementado en listener independiente |
| CRUD genérico | Rutas específicas SQL | `/api/twin/records/*` | No compatible |
| JWT HS256 | Sí | No | Pendiente |
| Cookie `sentry_auth` | Sí | No | Pendiente |
| CSRF doble envío | Sí | No | Pendiente |
| Roles/permisos/páginas | Sí | No | Pendiente |
| Alcance por almacén | Sí | No | Pendiente |
| Warehouses/zones/bins/items | Sí | Sin endpoints compatibles | Pendiente |
| Inventario y reservas | Sí, transacciones y locks | Invariantes puras solamente | No paridad |
| Receiving/put-away | Sí | No | Pendiente |
| Picking/waves/short picks | Sí | No | Pendiente |
| Packing/shipping/fulfillment | Sí | No | Pendiente |
| Cycle counts/adjustments | Sí | No | Pendiente |
| Transferencias | Sí | No | Pendiente |
| Auditoría, outbox, webhooks | Sí | Eventos Core parciales; no equivalencia | Pendiente |
| Conectores/importaciones | Sí | No | Pendiente |
| Pruebas diferenciales | Sí, suite original | Tests unitarios nuevos | Pendiente |

## Contratos originales inspeccionados

- Admin usa `API_BASE = '/api'`, cookies y CSRF.
- Login original entrega JWT y usuario; el token es HS256 de ocho horas.
- Middleware original vuelve a consultar usuario activo, rol, almacenes, cambio de contraseña y permisos por página.
- Rutas CRUD de almacenes, zonas, bins e items incluyen paginación, validaciones y errores específicos.
- Inventario tiene invariantes de reserva y concurrencia; el original utiliza PostgreSQL y bloqueos de fila.
- El test suite original exige `TEST_DATABASE_URL` distinto de `DATABASE_URL` y trunca tablas de test; nunca ejecutar su suite contra datos reales.

## Condición para declarar una ruta equivalente

1. Capturar fixtures de request/response del original.
2. Implementar DTO y validación idénticos.
3. Comparar status y JSON canónico.
4. Verificar permisos y aislamiento entre almacenes.
5. Verificar transacciones, concurrencia e idempotencia.
6. Ejecutar pruebas con el frontend original.
7. Registrar evidencia y commit en esta matriz y en `AUDITORIA_GEMELO.md`.

Hasta entonces, el endpoint se marca como pendiente, aunque su lógica interna exista.
