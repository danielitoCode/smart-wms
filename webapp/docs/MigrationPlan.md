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

## Fase 6 — Features complementarios

### F6.2 Customers / Clientes

**Estado:** implementación read-only en curso; feature nueva Svelte, excluida de la paridad React.

| Capa | Estado |
|---|---|
| Domain Customer, direcciones, almacenes y pedidos | Implementado como proyección, sin ID canónico |
| Application Search/List/Detail/Orders | Casos de uso implementados |
| Data | Usa /admin/search y Sales Orders paginados; eliminado per_page=1000 |
| UI | Listado, búsqueda, detalle, direcciones e historial paginado |
| Permisos/almacén | Grant sales-orders; hereda almacén activo global |
| Pruebas | Mapper, casos de uso, repositorio y datasource; falta ejecución CI satisfactoria |

**Contrato:** Flask dispone de tabla canónica customers e ingestión inbound con WMS token, pero no de API administrativa web para clientes. No añadir mutaciones al frontend. La lista deduplica dentro de cada página de pedidos, por lo que el mismo cliente puede aparecer en páginas distintas. El endpoint de historial busca por número O nombre de pedido, de modo que total/pages puede incluir falsos positivos aunque las filas se filtren por nombre exacto.

**Pendiente para cierre:** comprobar svelte-check, build y suites; verificar resultados sobre el HEAD definitivo. Para una lista global de clientes con paginación propia e identidad inequívoca se necesitaría un endpoint read-only agregado en Flask; queda fuera del alcance frontend actual.
