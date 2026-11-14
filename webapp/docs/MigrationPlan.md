# MigrationPlan — Smart WMS SvelteKit

Seguimiento de cierre por fase. Un feature **no** se da por terminado solo porque compile o exista una pantalla.

## Criterios de cierre (tres condiciones)

1. **Paridad React** — funcionalidades, estados, acciones, filtros, validaciones y comportamientos relevantes.
2. **Integración Flask** — endpoint correcto, DTO, respuesta, errores y permisos.
3. **Calidad arquitectónica** — capas CA, control de almacén/concurrencia, pruebas suficientes.

## Fase 0 — Seguridad y plataforma

### F0.1 Auth / Autenticación

| Criterio | Estado | Evidencia |
|---|---|---|
| Login / me / refresh / logout / change-password | Hecho | `AuthRemoteDataSource`, use cases |
| HttpOnly + CSRF en cliente | Hecho | `ApiClient` |
| Sesión inválida vs red vs inactivo | Hecho | `EnsureAuthenticatedUseCase` |
| Splash + guard + mustChangePassword | Hecho | UI auth + layout |
| Tests unitarios + HTTP integration auth | Hecho | `src/test/.../auth` |

**Cierre funcional F0.1:** sí (flujo).

### F0.2 Authorization / Permisos

| Criterio | Estado | Evidencia |
|---|---|---|
| Catálogo page_keys Flask | Hecho | `PermissionCatalog.ts` |
| fraud / count-approvals alineados | Hecho | AccessPolicy + nav |
| canPerform SO / approvals | Parcial | sales-orders + cycle-count-approvals |
| Revalidate `/me` on navigate | Hecho | `authGuard.revalidatePermissions` |

**Cierre F0.2:** parcial-alto.

### F0.3 Warehouse Context / Contexto de almacén

| Criterio | Estado | Evidencia |
|---|---|---|
| Almacén activo centralizado | Hecho | `warehouseSelectionState` + layout context |
| Origen `warehouse_ids` de `/me` | Hecho | `load` / `syncFromUser` |
| Validar selección ⊆ warehouse_ids (non-ADMIN) | Hecho | `WarehouseContext.authorizedWarehouseIds` |
| Descartar ID persistido inválido (P-11) | Hecho | `resolveActiveWarehouseId` |
| Invalidar + cancelar al cambiar almacén | Hecho | `WarehouseRequestScope.notifyWarehouseChanged` |
| Respuestas tardías no pisan almacén actual | Hecho | `beginScopedRequest().isCurrent()` |
| No confiar solo en UI id | Hecho | `requireWarehouseId` + `assertWarehouseAuthorized` |
| Tests P-06..P-11 cliente | Hecho | `WarehouseContext.test.ts` |
| Tests scope abort | Hecho | `WarehouseRequestScope.test.ts` |
| P-01..P-16 HTTP reales en CI | Pendiente | Requiere Flask en pipeline |

**Cierre F0.3:** parcial-alto en cliente. Flask sigue siendo frontera de scope (P-07/P-08 path vs body). Features operativas deben usar `beginScopedRequest` + `requireWarehouseId` al leer/mutar.

## Fases 1–6

| Fase | Scope | Estado global |
|---|---|---|
| 1 | Datos maestros | En curso / parcial |
| 2 | Inventario y compras | Parcial |
| 3 | Ventas y movimientos | Parcial |
| 4 | Administración | Parcial |
| 5 | Integraciones | Parcial |
| 6 | Cierre transversal | Pendiente |

## Notas de autoridad

- Flask recarga grants y warehouse_ids desde DB en cada request.
- Cliente solo mejora UX y cancela trabajo obsoleto. Un 403 Flask siempre gana.
