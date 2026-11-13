# Clean Architecture + Feature-First (wms-twin)

## Capas

| Capa | Path | Responsabilidad |
|------|------|-----------------|
| Domain | `internal/domain/*` | Tipos y reglas puras (p. ej. balances de inventario) |
| Ports | `internal/ports` | Interfaces (contratos) que las features necesitan |
| Application / Features | `internal/application/<feature>` | Casos de uso por feature (catalog, receiving, pos, admindata…) |
| Infrastructure | `internal/infrastructure/persistence`, `corestore`, `mesh` | PrismaTec-Core, organismos, ledger, red |
| Interface | `internal/httpapi`, `cmd/wms-twin` | HTTP Sentry-compatible, wiring |

## Feature-first (mapa lógico → paquete)

| Feature | Paquete |
|---------|---------|
| Identity / Auth | `application/identity` + `httpapi` auth |
| Catalog | `application/catalog` |
| Receiving / Putaway | `application/receiving` |
| Picking | `application/picking` |
| Fulfillment / Pack / Ship | `application/fulfillment` |
| Sales / PO | `application/salesorders`, `purchaseorders` |
| POS / Dockd / RMA | `application/pos`, `dockd`, `rma` |
| Admin migration data | `application/admindata` (implements `ports.AdminResourceRepository`) |
| Integrations | `events`, `webhooks`, `inbound`, `snapshot` |

## Repository pattern (pedido Daniel)

1. El **controlador HTTP no mockea**.
2. Llama a un **repositorio** (`ports.AdminResourceRepository` / `*admindata.Store`).
3. El repositorio lee/escribe **organismos** vía `corestore` (como BD).
4. Seeds solo en la capa de datos (`seedIfEmpty`); se eliminan al migrar el dominio real.

## Añadir una funcionalidad nueva

1. Define el caso de uso en `application/<feature>/`.
2. Si necesita persistencia nueva: métodos en repo o nuevo port en `ports/`.
3. Implementación PrismaTec en `admindata` o `corestore` + feature repo.
4. Expón rutas en `httpapi` **delgadas** (auth + map DTO + llamar use-case).
5. Test en `application/<feature>` y smoke HTTP si aplica.
6. Si era mock admin: quita seed de ese resource en `admindata.seedIfEmpty`.
