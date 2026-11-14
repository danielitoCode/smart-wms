# MigrationPlan — Smart WMS SvelteKit

## Fase 0 — Seguridad y plataforma

### F0.1–F0.4
Auth, permisos, warehouse context, cliente HTTP — ver commits previos.

### F0.5 Traducciones y CI

| Criterio | Estado | Evidencia |
|---|---|---|
| Italiano idioma principal | Hecho | default locale `it` |
| Español completo | Hecho | identidad canónica |
| Inglés completo (claves i18n.t) | Hecho | catalog + gapTranslations |
| Cobertura claves en componentes | Hecho | translations.test.ts |
| Spot hardcode login | Hecho | LoginScreen test |
| Suites independientes | Hecho | test:domain/application/infrastructure/ui/integration |
| CI regresión completa | Hecho | webapp-ci.yml |
| Cobertura por feature | Hecho | test:coverage:feature |

### Gate salida Fase 0

CI verde · matriz permisos · warehouse context · contratos F0 · i18n IT/ES/EN → abrir Fase 1.
