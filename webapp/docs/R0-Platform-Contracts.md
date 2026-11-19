# R0 — Auditoría de contratos y ejecución de plataforma

- **Estado:** `IN_PROGRESS`
- **Fecha de revisión:** 2026-11-19
- **Rama:** `svelte-webapp`
- **Alcance:** frontend `webapp/`, frontend React `admin/` y contratos Flask `api/`.
- **Último commit de código de esta intervención:** `c4c0535fa1d5c290768936ffeb68abf3390d378d`
- **Regla:** no se modificó Flask ni se cambió la semántica de autorización del servidor.

Este documento registra evidencia comprobada y cambios realizados para R0. No certifica todavía el cierre del recorrido completo.

---

## 1. Contratos Flask comprobados

### 1.1 Sesión y autenticación

| Operación | Contrato real | Permiso / seguridad | Resultado |
|---|---|---|---|
| Login | `POST /api/auth/login`, schema `LoginRequest(username, password)` | Rate limit por IP + usuario; credenciales; emite cookie de sesión y CSRF | `SUPPORTED` |
| Identidad y grants | `GET /api/auth/me` | `require_auth`; lee usuario y grants actuales de BD | `SUPPORTED` |
| Refresh | `POST /api/auth/refresh` | También exige `require_auth`; emite nueva cookie si el token actual sigue siendo válido | `PARTIAL` |
| Logout | `POST /api/auth/logout` | Si hay cookie válida exige doble-submit CSRF; elimina cookies | `SUPPORTED` |
| Cambio de contraseña | `POST /api/auth/change-password` | `require_auth`; valida schema y política de contraseña; registra auditoría | `SUPPORTED` |

**Hallazgo crítico sobre refresh:** `refresh` no es un mecanismo de recuperación de una sesión expirada. El middleware `require_auth` decodifica el token antes de entrar al handler; si expiró, devuelve 401. La prueba Flask `api/tests/test_auth.py::TestRefresh::test_refresh_with_expired_token` confirma ese comportamiento. El frontend anterior intentaba llamar a refresh después de que `/me` devolviera 401 y esperaba que pudiera recuperar la sesión. Ese flujo era incompatible con Flask.

**Decisión aplicada:** un 401 de `/me` ahora se trata como sesión no válida y conduce a reautenticación. El caso de uso explícito de refresh se conserva para renovar una sesión que todavía es válida; no se usa para recuperar una cookie expirada.

### 1.2 Datos de identidad

- `POST /api/auth/login` devuelve `token` y `user` mediante `User.to_dict()`.
- Ese `user` incluye identidad, rol, almacenes asignados, funciones operativas y `must_change_password`, pero no incluye `allowed_pages` ni `allowed_overrides`.
- `GET /api/auth/me` sí devuelve `allowed_pages` y `allowed_overrides`; para ADMIN devuelve el catálogo completo y para los demás roles consulta `user_page_permissions`.
- El middleware vuelve a cargar rol, almacenes y grants de página desde BD en cada petición autenticada. Flask, no el snapshot de Svelte, sigue siendo la autoridad final.

**Decisión aplicada:** tras login, el repositorio Svelte ejecuta `/api/auth/me` antes de devolver el usuario al flujo de navegación. Así el primer destino y las protecciones de rutas se calculan con el conjunto real de grants.

### 1.3 Permisos y almacenes

- Los endpoints administrativos usan `require_admin_or_page_permission(page_key)` donde corresponde. ADMIN omite el grant; los demás roles necesitan la clave exacta.
- Los overrides se devuelven aparte de `allowed_pages`; no deben confundirse con grants de página.
- `require_auth` vuelve a cargar `warehouse_ids` desde BD y valida los `warehouse_id` aportados en path, query y JSON body. Si las fuentes discrepan devuelve 400; si el almacén no está asignado devuelve 403.
- Para lecturas de colección, `warehouse_scope_clause` permite filtrar en SQL y evitar filtrar información de otros almacenes mediante una comprobación posterior.
- `GET /api/warehouses/list` es un endpoint autenticado, sin grant de administración de almacenes, que devuelve almacenes activos y aplica `warehouse_scope_clause`. ADMIN obtiene el catálogo activo; otros usuarios reciben el subconjunto asignado.

**Decisión aplicada:** el selector/contexto operativo consume `/api/warehouses/list` para todos los roles. Las opciones no administrativas son la intersección entre los IDs asignados por `/me` y el catálogo activo devuelto por Flask. Si no se puede validar el catálogo, no se fabrican almacenes ficticios ni se selecciona un ID sin confirmar.

---

## 2. Estado de implementación Svelte

### 2.1 Sesión y autorización

- `ApiClient` usa `credentials: 'include'`, cookie HttpOnly, cabecera CSRF en métodos mutables, timeout, cancelación y normalización de errores HTTP.
- `AuthSession` mantiene únicamente una proyección de usuario en memoria; no persiste el token en localStorage.
- `EnsureAuthenticatedUseCase` valida identidad mediante `/me`. Ya no intenta un refresh imposible después de 401.
- `AuthRepositoryImpl.login` ejecuta login y luego `/me`, para cargar grants de página y overrides antes de resolver el destino.
- El layout autenticado revalida permisos al cambiar de ruta. Cuando el servidor informa revocación/expiración, limpia el contexto y devuelve al login conservando la ruta solicitada.
- El layout aplica la obligación de cambio de contraseña también a navegación directa y a cambios de estado detectados en la sesión.

### 2.2 Warehouse context

- `WarehouseSelectionState` consulta el catálogo operativo autorizado, no crea etiquetas sintéticas como `WH-{id}` y falla cerrado si el servidor no puede validar el catálogo.
- El ID guardado en sessionStorage se acepta únicamente si está en el conjunto de almacenes autorizados y activos.
- El cambio de almacén continúa incrementando la generación y abortando peticiones registradas en `WarehouseRequestScope`.
- Los usuarios sin permiso para cambiar el contexto conservan una etiqueta de almacén activo de solo lectura; la operación de selección también se bloquea en el estado, no solo en el botón UI.
- Al cerrar sesión se limpia el almacén seleccionado y se invalidan las peticiones asociadas.
- Cuando una revalidación detecta cambios de rol o de almacenes asignados, se vuelve a cargar el catálogo y se resuelve de nuevo el almacén activo.

### 2.3 Rutas y grants

- Se incorporó una política explícita de acceso a rutas.
- Rutas de picking, packing y shipping se tratan como autenticadas; su autorización operativa corresponde a los controles Flask/funciones del usuario, no a grants de página inexistentes.
- La entrada `/data` admite cualquiera de los grants de almacenes, bins, zones o preferred-bins; cada subruta conserva su permiso concreto.
- Una ruta que no tenga política registrada queda denegada por defecto. Ya no se interpreta una lista vacía de permisos como autorización implícita.
- La navegación Data y la política de entrada usan la misma regla any-of.

### 2.4 Capability Registry

Se creó `src/core/infrastructure/capabilities/CapabilityRegistry.ts` con estados `SUPPORTED`, `PARTIAL`, `NOT_SUPPORTED` y `UNVERIFIED`. En esta primera entrega registra contratos transversales de login, `/me`, refresh, logout, page grants, catálogo operativo de almacenes y scope de almacén, con permisos, DTO, efectos, idempotencia y referencias de evidencia.

El catálogo es todavía parcial: debe ampliarse con los contratos de cada recorrido R1–R10 y conectarse a los estados UI de cada feature. La capacidad `warehouse.request-scope` está marcada `PARTIAL` porque el middleware valida IDs explícitos, pero la protección de listados depende de que cada handler aplique `warehouse_scope_clause`; falta auditar todas las consultas. No se deben inferir capacidades de un 404 aislado.

---

## 3. Pruebas añadidas o actualizadas

- `EnsureAuthenticatedUseCase.test.ts`: ya no espera un intento de refresh después de 401.
- `AuthRepositoryImpl.test.ts`: verifica que login carga `/me` y obtiene page grants/overrides.
- `AccessPolicy.test.ts`: verifica políticas explícitas, rutas scanner autenticadas, entrada Data any-of y denegación por defecto de rutas desconocidas.
- `WarehouseContext.test.ts`: verifica intersección de asignaciones con el catálogo activo y fallo cerrado cuando no hay catálogo.
- `CapabilityRegistry.test.ts`: verifica evidencia, estados y que refresh no se anuncie como recuperación de sesión expirada.

**No se han ejecutado todavía** `npm run check`, `npm run test` ni `npm run build`. La versión instalada disponible en el entorno de revisión era Node 22.16.0, mientras `webapp/package.json` exige Node >=26.0.0. Tampoco fue posible clonar el repositorio desde ese entorno por falta de resolución de red. Por tanto, las pruebas anteriores son cambios de código/test, no resultados de ejecución.

---

## 4. Pendientes obligatorios para cerrar R0

1. Completar el inventario exhaustivo React → rutas Svelte → acciones → page keys/overrides → endpoints Flask. Las pruebas actuales cubren rutas representativas, no certifican todas las rutas existentes.
2. Auditar todos los componentes Svelte para demostrar que ninguno llama directamente a `fetch` ni construye requests fuera de Data/Infrastructure.
3. Auditar todos los casos de uso mutables y repositorios para verificar que autorización y warehouse scope se resuelven antes de ejecutar; la seguridad final sigue en Flask.
4. Completar la matriz de DTO/request/response, códigos 400/401/403/404/409/422/5xx, paginación y errores por cada contrato consumido.
5. Establecer y reutilizar componentes comunes para Forbidden, Not supported, Empty, Loading, Error y Conflict. Hay componentes de sesión/banner/toast existentes, pero todavía no se ha demostrado una cobertura homogénea de todos los features.
6. Añadir pruebas de integración para login → /me → grants → almacén activo, revocación de grants, cambio de asignación de almacén, logout y aborto de peticiones del contexto anterior.
7. Ejecutar `npm run check`, `npm run test` y `npm run build` con Node 26 sobre el HEAD definitivo; revisar CI y registrar resultados reales.
8. Revisar las cadenas UI nuevas en i18n y evitar mensajes de error técnicos en pantalla.

**Criterio de cierre:** R0 no pasa a `VERIFIED` hasta completar estos puntos con evidencia. Los cambios actuales corrigen inconsistencias detectadas y establecen una primera base, pero no demuestran todavía que todas las features consuman correctamente la infraestructura compartida.

---

## 5. Fuentes inspeccionadas

- Flask: `api/routes/auth.py`, `api/middleware/auth_middleware.py`, `api/routes/warehouses.py`, `api/services/auth_service.py`, `api/services/cookie_auth.py`, `api/schemas/auth.py`, `api/models/user.py`, `api/tests/test_auth.py`.
- React: `admin/src/auth.jsx`, `admin/src/api.js`, `admin/src/pages/Login.jsx`, `admin/src/components/Layout.jsx`, `admin/src/components/TopBar.jsx`, `admin/src/warehouse.jsx`, `admin/src/components/Sidebar.jsx`.
- Svelte: auth feature, `AccessPolicy`, `PermissionCatalog`, `PermissionMatrix`, warehouse context/selection, `ApiClient`, `ApiError`, `AuthSession`, `WarehouseRequestScope` y layout del grupo `(app)`.
