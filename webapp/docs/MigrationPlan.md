# MigrationPlan — Smart WMS SvelteKit

## Fase 0 — Seguridad y plataforma

F0.1–F0.5 cerrados en commits previos (auth, permisos, warehouse, HTTP, i18n/CI).

## Fase 1 — Datos maestros

### F1.1 Items / Productos

| Capa | Estado |
|---|---|
| Domain Item + ItemDetail + WriteInput | Hecho |
| Use cases list/detail/create/update/archive/delete/search | Hecho |
| Data DTO/mapper (wrapper detail) + list page total/page/pages | Hecho |
| UI list filters Active/Archived/All, search, CRUD modals | Hecho |
| Tests mapper + create validation + list | Hecho |

**Cierre F1.1:** paridad CRUD/búsqueda con React y contratos Flask `/admin/items`.
Endpoints: GET/POST `/api/admin/items`, GET/PUT/DELETE `/api/admin/items/{id}`, POST archive.
Restricciones delete: inventario > 0, historial SO/PO → error Flask (mostrado vía toUserMessage).
