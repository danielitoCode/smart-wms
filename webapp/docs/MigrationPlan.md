# MigrationPlan — Smart WMS SvelteKit

## Fase 0 — Seguridad y plataforma

### F0.1 Auth — cierre funcional sí
### F0.2 Authorization — parcial-alto
### F0.3 Warehouse Context — parcial-alto (cliente)

### F0.4 Cliente HTTP compartido

| Criterio | Estado | Evidencia |
|---|---|---|
| URL + query unificados | Hecho | `buildApiPath` + `RequestOptions.query` |
| Cookies + CSRF | Hecho | `credentials: include`, `X-CSRF-Token` |
| Errores normalizados 400/401/403/404/409/422/5xx | Hecho | `ApiError.codeForStatus` |
| Timeout + cancelación | Hecho | controller combinado |
| Concurrentes | Hecho | controller por request |
| Stale responses | Hecho | signal + `WarehouseRequestScope` (F0.3) |
| Diagnóstico sin secretos | Hecho | `ApiDiagnostics` (sin cookies/CSRF/Authorization) |
| Un solo cliente en features | Hecho | `apiClient` singleton en DI |
| Prohibido fetch en pantallas | Hecho | grep: solo `ApiClient.ts` |

**Cierre F0.4:** sí en infraestructura. Migrar datasources legacy a `options.query` es incremental (no bloqueante).
