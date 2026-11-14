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
| Sesión inválida vs red vs inactivo | Hecho | `EnsureAuthenticatedUseCase` (401→refresh→/me; inactive) |
| Splash + guard + mustChangePassword | Hecho | `SplashScreen`, `authGuardState`, layout |
| Tests unitarios use cases | Hecho | `src/test/unitTest/feature/auth/domain/usecase/*` |
| Tests integración HTTP auth | Hecho | `src/test/integration/AuthHttpIntegration.test.ts` |
| Paridad visual 1:1 con React | No requerida | Flujo funcional cerrado; UI Abellis propia |

**Cierre funcional F0.1:** sí (flujo). Restan regresiones E2E en entorno Docker real.

### F0.2 Authorization / Permisos

| Criterio | Estado | Evidencia |
|---|---|---|
| Catálogo page_keys Flask | Hecho | `PermissionCatalog.ts` |
| Matriz página/acción/endpoint | Hecho | `PermissionMatrix.ts` |
| fraud ≠ sales-orders | Hecho | `requiredPageKeysForPath`, nav `pageKey: 'fraud'` |
| count-approvals vs adjustments | Hecho | open=`count-approvals`; approve API=`adjustments` + `canPerform` |
| UX gates sin sustituir Flask | Hecho | `canPerform` / `canAccessPages` |
| Revalidate `/me` on navigate | Hecho | `authGuard.revalidatePermissions` + layout `$effect` |
| canPerform sales-orders | Hecho | `salesOrdersState` mutate + `so-full-edit` |
| canPerform count-approvals approve | Hecho | `cycleCountApprovalsState.canApprove` |
| Tests policy | Hecho | `AccessPolicy.test.ts` |
| Tests HTTP 403 reales | Pendiente | Requiere backend en CI |

**Cierre F0.2:** parcial-alto. Falta batería HTTP 403 en CI y cableado `canPerform` en resto de features mutadoras.

## Fases 1–6

| Fase | Scope | Estado global |
|---|---|---|
| 1 | Datos maestros | En curso / parcial |
| 2 | Inventario y compras | Parcial |
| 3 | Ventas y movimientos | Parcial (sales-orders avanzado) |
| 4 | Administración | Parcial |
| 5 | Integraciones | Parcial |
| 6 | Cierre transversal | Pendiente |

## Notas de autoridad

- Flask recarga grants desde DB en cada request autenticado; el JWT no es fuente de permisos actuales.
- El cliente solo mejora UX (ocultar nav/botones). Un 403 de Flask siempre gana.
- Tras revocación de page_key, la navegación interna llama `revalidatePermissions` para actualizar snapshot sin logout manual.
