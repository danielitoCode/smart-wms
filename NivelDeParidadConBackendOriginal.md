# Nivel de paridad con el backend original

## Estado global

**NO SUSTITUIBLE.** El backend original Flask permanece intacto y activo. El gemelo tiene runtime Core, AIP separado, persistencia CID experimental, API técnica y reglas puras iniciales de inventario. No tiene paridad de negocio ni autenticación de usuario.

## Criterio

Para cada ruta comparo método/URL, DTO, validación, auth/autorización, status y JSON, efectos laterales, transacciones, locks, idempotencia, auditoría, eventos y comportamiento ante concurrencia/reinicio. Una ruta homónima no demuestra paridad.

## Matriz

| Superficie | Original | Gemelo | Estado |
|---|---|---|---|
| Health | GET `/api/health` | Mismo cuerpo público | Contrato básico implementado; falta comparación E2E |
| AIP | No aplica | Listener :8081, AIP v1 | Integrado |
| API técnica | No aplica | `/api/twin/*` Bearer | Implementada, no compatible WMS |
| Auth | JWT HS256 8h, cookies HttpOnly, CSRF, lockout y revocación | No | Pendiente |
| Usuarios/roles/permisos | CRUD, page permissions, warehouse scopes | No | Pendiente |
| Warehouses/zones/bins/items | CRUD, búsqueda, paginación, import | Solo registros genéricos | Pendiente |
| Inventory | SQL locks, reservas, backorders, auditoría | Invariantes puras | Parcial dominio; no paridad |
| Receiving/putaway | Flujos PO, recepción, movimiento | No | Pendiente |
| Picking/waves | Batch, wave, short pick, cancel | No | Pendiente |
| Packing/shipping | Verificación, fulfill, void | No | Pendiente |
| Counts/adjustments | Conteo, aprobación y ajustes | Reglas base | Pendiente |
| Transfers | Movimiento y transferencias | Validación pura | Parcial dominio; no paridad |
| Orders/RMA/POS | Workflows completos | No | Pendiente |
| Events/snapshots | Outbox, consumer groups, ack, cursor | Pulse Core no equivale al contrato WMS | Pendiente |
| Connectors/webhooks/inbound/dockd | Scopes, firmas, retry, DLQ | No | Pendiente |
| Auditoría | Cadena hash y atribución WMS | Audit Core sin mapeo WMS | Pendiente |
| Diferenciales/E2E | Suite original | Tests unitarios técnicos | Pendiente |

## Mapa de rutas

Inventario inicial: `wms-twin/docs/MAPA_RUTAS_BACKEND_ORIGINAL.md`. Incluye auth, lookup, receiving, putaway, picking, packing, shipping, inventory, transfers, warehouses, administración y superficies versionadas Events, Snapshot, Inbound, Dashboard, Dockd y POS. Se deriva de decoradores Flask; falta contrastar OpenAPI y fixtures.

## Frontends

Admin usa `/api` relativo, cookies `sentry_auth/sentry_csrf` y `X-CSRF-Token`. Mobile usa `EXPO_PUBLIC_API_URL` y Bearer JWT. Un proxy o URL de deployment puede alternar backend sin reescribir pantallas, pero solo después de paridad. El gemelo actual solo admite health y API técnica.

## Evidencia CI

El workflow específico del gemelo en commit `ee78910` terminó **success**: módulo/dependencias, normalización de formato en workspace efímero, `go vet` y `go test -race`. La normalización automática es temporal; debo publicar código ya formateado. Los workflows separados de auditoría npm/pip fallaron por dependencias del repo original; no atribuyo esos fallos al gemelo ni modifico el backend original para silenciarlos.

## Sustitución

No cambiar upstream de producción hasta cerrar auth, rutas consumidas por ambos frontends, transacciones de stock, idempotencia/autoridad, pruebas diferenciales, E2E, backup/restore, reinicio, failover y rollback/reconciliación. El backend original se conserva incluso después de un despliegue gradual.
