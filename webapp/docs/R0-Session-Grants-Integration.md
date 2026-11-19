# R0 — Política de grants y pruebas transversales de sesión

> Estado: **IN_PROGRESS**. Este documento registra el contrato observado en el código de la rama `svelte-webapp`; no declara enforcement de `allowed_functions` que no exista en Flask.

## 1. Contrato real de autorización

### 1.1 Tres mecanismos distintos

| Mecanismo | Fuente | Comportamiento observado | Alcance |
|---|---|---|---|
| `allowed_pages` | `GET /api/auth/me`, tabla `user_page_permissions` | Flask carga los grants en cada request autenticada y los usa en `@require_admin_or_page_permission` / `@require_admin_or_any_page_permission`. ADMIN se representa internamente con `allowed_pages=None`. | Páginas web y endpoints que declaran explícitamente esos decoradores. |
| `allowed_functions` | `GET /api/auth/me`, columna `users.allowed_functions` | Para USER se devuelve la lista persistida; para ADMIN se devuelven todas las funciones conocidas (`receive, putaway, pick, pack, ship, count, transfer`). Si `require_packing_before_shipping=false`, se elimina `pack`. | Es un catálogo de funciones operativas que se expone al cliente; **no es un enforcement general de cada endpoint**. |
| Scope de almacén | `users.warehouse_ids`, refrescado en `require_auth` | Middleware valida los warehouse_id explícitos de path/query/body; handlers deben usar `warehouse_scope_clause` o `check_warehouse_access` al cargar recursos. Si la petición no incluye warehouse_id, el middleware no restringe automáticamente la consulta SQL. | Asignación de almacenes y aislamiento de recursos; no equivale a un grant de página o función. |

### 1.2 Conclusión sobre allowed_functions

- Flask `/api/auth/me` entrega `allowed_functions` y la interfaz Svelte los mapea a `User.allowedFunctions` y `authSession.allowedFunctions`.
- En el middleware `require_auth` inspeccionado, los datos dinámicos que se refrescan y aplican son rol, estado activo, almacenes, grants de página y cambio obligatorio de contraseña. No se carga `allowed_functions` en `g.current_user` como política genérica.
- `require_auth` no compara la función de la ruta con `allowed_functions`. Los endpoints pueden tener reglas propias (autenticación, rol, grant de página, scope de almacén, override u otras validaciones), pero no debe asumirse un chequeo general por función.
- Svelte `AccessPolicy.canPerform` utiliza `allowedPages` y `allowedOverrides`; el campo `capability` está reservado para una futura separación y no cambia el resultado. No consume `allowedFunctions`.
- Por tanto, el comportamiento actual correcto es: usar `allowed_functions` como dato informativo/compatibilidad para mostrar disponibilidad UX donde exista una correspondencia explícita y probada; no presentarlo como frontera de seguridad ni inventar un mapa función→endpoint. Las llamadas HTTP siguen dependiendo de las validaciones reales del endpoint Flask.
- Cualquier enforcement nuevo requiere una decisión backend explícita: catálogo estable de operaciones, asignación inequívoca de cada endpoint, compatibilidad móvil/API, orden de decoradores, pruebas de autorización positiva/negativa y actualización de documentación. Queda fuera de esta tarea frontend.

### 1.3 Riesgo de consistencia de sesión

`/api/auth/me` vuelve a leer grants de página, funciones y almacenes desde DB. Svelte debe revalidar `/me` para actualizar su snapshot; una revocación no se refleja en una pestaña que no revalida hasta que vuelva a consultar. Aunque el cliente mantenga un snapshot antiguo, Flask sigue aplicando el grant de página vivo en los endpoints que tienen decorador. Las rutas scanner protegidas solo por autenticación deben continuar confiando en sus comprobaciones operativas reales, no en el snapshot del navegador.

## 2. UiStatePanel — política de adopción

Componente compartido disponible en `src/lib/components/UiStatePanel.svelte`, con estados `loading`, `empty`, `error`, `forbidden`, `not-supported` y `conflict`, soporte de retry y acción.

La adopción debe ser uniforme en todas las features y en todos los estados de pantalla que sustituyen el contenido principal:
- carga inicial y carga bloqueante;
- error recuperable con retry;
- 401/sesión expirada y 403/permisos;
- lista vacía (solo cuando la consulta terminó correctamente);
- conflicto/409;
- operación no soportada por Flask.

No sustituir con el panel:
- errores de validación inline de campos;
- toasts de éxito;
- errores por fila o por celda cuando la pantalla puede seguir operando;
- estados parciales de carga de widgets secundarios.

La adopción global sigue **pendiente de inventario por pantalla**. No se marca completa por el mero hecho de que el componente exista. Cada pantalla debe revisarse y probarse; no convertir todos los estados vacíos en errores ni perder acciones/contexto existentes al reemplazar markup.

## 3. Pruebas de integración añadidas

En `src/test/integration/AuthHttpIntegration.test.ts` se añadieron casos para:
1. consultar `/me` antes y después de revocar grants y comprobar que el snapshot en memoria se reemplaza por los valores actuales;
2. cancelar una petición HTTP con `AbortSignal` del llamador y comprobar el error normalizado `cancelled`;
3. cambiar la generación de almacén y comprobar que la petición anterior queda abortada y deja de ser vigente.

Ya existían casos de integración para login, validación de sesión, refresh tras 401, cambio de contraseña, logout incluso si falla la llamada remota y rechazo de usuario inactivo.

**Límite de estas pruebas:** usan respuestas HTTP simuladas. Verifican integración entre cliente, datasource, repositorio, casos de uso y estado en memoria; no sustituyen pruebas Flask contra DB real ni prueban por sí solas la revocación de cookie/token en navegador real.

## 4. Node 26 y CI

- `webapp/.node-version` fija Node **26**.
- `webapp/package.json` exige Node `>=26.0.0` y npm `>=10.9.0`.
- `.github/workflows/webapp-ci.yml` configura `actions/setup-node@v4` con `node-version: '26'`.
- El workflow ejecuta sync, `npm run check`, build y suites domain/application/infrastructure/UI/i18n/integration/full regression. Cobertura de feature está marcada `continue-on-error: true`.

No se afirma ejecución local ni resultado verde de CI en este commit. El conector de repositorio permite inspeccionar/editar GitHub, pero no ejecutar `npm ci`, `check`, tests o build dentro del workspace del proyecto. El cierre exige revisar el run disparado por el commit definitivo y registrar cada job.

## 5. Criterios de cierre

- [ ] Confirmar en backend todos los endpoints operativos que consumen `allowed_functions` o documentar que no existe enforcement común.
- [ ] Completar inventario de cada pantalla Svelte y adoptar `UiStatePanel` donde corresponda.
- [ ] Añadir pruebas de UI/route guard para grants revocados durante navegación y sesión expirada.
- [ ] Añadir prueba de cambio de almacén en el estado de selección real, además de la prueba del request-scope.
- [ ] Verificar logout con cookie/CSRF y que ninguna respuesta tardía restaure datos de la sesión cerrada.
- [ ] Ejecutar `npm ci`, `npm run check`, `npm run test:all` y `npm run build` con Node 26.
- [ ] Verificar CI del HEAD final; todos los jobs obligatorios deben estar verdes.
- [ ] Actualizar este documento con SHA del HEAD y enlaces a los runs.

