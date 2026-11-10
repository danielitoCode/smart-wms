# Fase 02 — Identidad, sesión y autorización

Escribo esta especificación antes de conectar autenticación al HTTP server para separar lo que ya puedo verificar de lo que todavía no existe. No declaro autenticación compatible hasta implementar el ciclo completo y probarlo contra los contratos Flask.

## Fuente contractual

Inspeccioné en el backend original:

- `api/routes/auth.py`
- `api/services/auth_service.py`
- `api/services/cookie_auth.py`
- `api/middleware/auth_middleware.py`
- `api/models/user.py`
- `api/routes/admin/admin_users.py`
- `admin/src/api.js`
- `mobile/src/api/client.js`

La referencia contractual es el backend original en `main`; no modifico esos archivos.

## Contrato que debo reproducir

### JWT

- Algoritmo HS256; nunca aceptar `none` ni algoritmos alternativos.
- Duración máxima: ocho horas.
- Claims: `user_id`, `username`, `role`, `warehouse_id`, `warehouse_ids`, `iat`, `jti`, `exp`.
- `jti` identifica de forma única cada sesión emitida.
- Se valida firma, estructura, expiración y ventana temporal.
- La firma JWT no convierte claims de rol o almacenes en autoridad vigente.

### Estado vivo

En cada request protegido debo consultar la identidad persistida y verificar:

- usuario existente y activo;
- rol vigente;
- almacenes vigentes;
- fecha de cambio de contraseña frente a `iat`;
- `must_change_password`;
- permisos de página para usuarios no ADMIN;
- revocación/estado de sesión y de tokens según el contrato original.

No basta con verificar el JWT una sola vez al iniciar sesión. Los cambios administrativos deben surtir efecto sin esperar ocho horas.

### Cookies y CSRF

- Cookie `sentry_auth`: HttpOnly, SameSite=Strict, Path=/, Max-Age de ocho horas y Secure cuando la petición es HTTPS.
- Cookie `sentry_csrf`: legible por el cliente, SameSite=Strict, Path=/ y mismo Max-Age.
- Mutaciones autenticadas mediante cookie requieren `X-CSRF-Token` igual a la cookie.
- Bearer JWT móvil no depende de CSRF.
- Logout sin cookie devuelve 200 sin limpiar cookies; cookie válida exige CSRF; cookie inválida/expirada se limpia.

### Login y cambio de contraseña

- Username normalizado a minúsculas y espacios externos eliminados.
- Bloqueo por combinación IP/usuario: 5 intentos, 15 minutos por defecto, configurables.
- Password: mínimo ocho caracteres, al menos una letra y un dígito; rechazar `admin` en cualquier combinación de mayúsculas y espacios externos.
- Cambio de contraseña verifica password actual, registra auditoría y limpia `must_change_password`.
- Una contraseña cambiada invalida tokens anteriores usando `password_changed_at`.

### Autorización

- ADMIN conserva bypass de permisos de página y almacenes.
- USER necesita permisos de página explícitos.
- `warehouse_ids` se carga desde persistencia en cada request.
- Si `warehouse_id` aparece en path, query y body, debo rechazar valores discrepantes con 400 antes de ejecutar el handler.
- Un usuario sin grant sobre el almacén recibe 403.
- `must_change_password` solo permite `auth.change_password`, `auth.logout` y `auth.me`.

## Trabajo implementado en este corte

He añadido primitivas aisladas y probables con tests:

- firma/verificación JWT HS256 con los nombres de claims originales;
- rechazo de secreto inferior a 32 bytes, firma incorrecta, algoritmo distinto, claims inválidos, token expirado y vida superior a ocho horas;
- generación criptográfica de token CSRF y comparación de doble envío en tiempo constante;
- política de validación de password con los mismos mensajes funcionales del original.

Estas primitivas **no están todavía conectadas a endpoints ni a una identidad persistente**. No implementan login, logout, refresh, revocación, lockout, sesiones, permisos ni scopes. El Bearer técnico de desarrollo continúa siendo el único middleware activo.

## Decisión de persistencia de identidad

No voy a conectar el gemelo directamente a PostgreSQL ni a copiar SQLAlchemy. Las identidades deberán vivir en organismos Core con esquema versionado y contraseña almacenada exclusivamente como hash bcrypt. El bootstrap inicial y la migración/importación de usuarios deben ser explícitos, auditables y no exportar passwords en claro. La operación de identidad necesita evitar escrituras concurrentes y garantizar que una desactivación o cambio de rol invalide inmediatamente las sesiones.

## Secuencia de cierre

1. Definir el organismo `wms.identity.user.{id}`, repositorio y bootstrap seguro.
2. Implementar bcrypt, login, lockout por IP/usuario y auditoría.
3. Integrar JWT en middleware y consultar estado vivo en cada request.
4. Implementar cookies, CSRF, logout y refresh.
5. Implementar change-password, forced change y invalidación por timestamp.
6. Implementar page permissions, roles y warehouse scope con detección de discrepancias path/query/body.
7. Crear fixtures diferenciales para login, 401/403/429, cookies, CSRF, refresh, revocación y cambios administrativos.
8. Solo entonces marcar autenticación como compatible y habilitar rutas de negocio bajo sus guards reales.

## Criterio de aceptación

No marco esta fase como terminada hasta que el gemelo pueda atender admin y mobile con sus respectivos mecanismos de sesión, los tests reproduzcan status/headers/cuerpos del original y se demuestre que una modificación de usuario o almacenes entra en vigor en la siguiente petición.


## Avance de repositorio de identidad — 2026-11-10

Implementé el primer repositorio Core-backed en `internal/application/identity`:

- cada usuario se guarda en su propio organismo `wms.users.{user_id}`;
- el repositorio normaliza username, valida rol/campos y evita duplicados dentro del primario local;
- bcrypt genera y verifica hashes; las respuestas públicas usan un DTO que no contiene `password_hash`;
- conserva warehouse grants, allowed functions, permisos de página, overrides, estado, fechas de login/cambio de contraseña y forced-change;
- autentica con mensaje genérico para usuario inexistente, inactivo o password incorrecto;
- persiste `last_login` y permite cambio de contraseña verificando la actual.

La prueba añadida cubre autenticación, duplicado, cambio de contraseña, ausencia de hash en el DTO y reapertura desde el mismo DataDir.

**Límites abiertos:** todavía no hay importador de usuarios del PostgreSQL original, endpoints HTTP, lockout persistente, middleware JWT, cookies/CSRF ni autorización por request. El mutex de unicidad/ID es local al proceso y depende del fencing del primario; no equivale a una transacción distribuida.


## Evidencia de validación automatizada — 2026-11-10

La ejecución `42897626723` terminó en success sobre el commit `d8c2c02e17c667620cccdf6dcb017a83f33e575c`. Pasaron tidy diff, module verify, gofmt, vet, race tests y guard documental/de alcance. El commit de formato resultante es `e0d2e20dea760ad99f71c1376d97a4896f28c284`.

Esta validación cubre las primitivas y el repositorio interno. No acredita login HTTP, importación de usuarios, lockout, middleware, cookies, CSRF integrado ni autorización de endpoints.


## Autenticación HTTP conectada — primer corte

Añadí handlers `/api/auth/login`, `logout`, `me`, `refresh` y `change-password`. El runtime inyecta el repositorio de identidades Core y el secreto JWT. El login emite token de ocho horas y cookies `sentry_auth` (HttpOnly) y `sentry_csrf` (double-submit). Los requests con cookie y método mutante requieren `X-CSRF-Token`; los Bearer móviles no. El middleware carga el usuario actual en Core en cada request y aplica activo, invalidación por cambio de contraseña, forced-change y warehouse scope. `RequirePagePermission` está disponible para las rutas admin que portaré después.

El lockout persiste en organismos Core por clave de usuario y por IP+usuario, manteniendo el bucket de usuario solo para observabilidad y bloqueando el tuple IP+usuario tras el umbral. Configuración: `WMS_TWIN_MAX_LOGIN_ATTEMPTS=5`, `WMS_TWIN_LOGIN_LOCKOUT_MINUTES=15`.

## Importación inicial de identidades

Para no conectar el gemelo a PostgreSQL, añadí importación de JSON con usuarios existentes y hashes bcrypt. Configuro `WMS_TWIN_BOOTSTRAP_USERS_FILE=/ruta/usuarios.json`. El JSON debe ser un array de registros con `user_id`, `username`, `password_hash` bcrypt, `full_name`, `role`, `warehouse_id`, `warehouse_ids`, `allowed_functions`, `allowed_pages`, `allowed_overrides`, `is_active`, `created_at`, `password_changed_at` y `must_change_password`. Nunca exporto passwords en claro. El archivo debe tener modo 0600 o más restrictivo. El runtime solo importa si el store no contiene usuarios; no mezcla ni sobreescribe una identidad inicializada.

También configuro `JWT_SECRET` (mínimo 32 bytes) y `WMS_TWIN_REQUIRE_PACKING` (por defecto true).

## Límites de este corte

Los endpoints de autenticación están conectados, pero todavía no existe gestión HTTP de usuarios ni auditoría equivalente al cambio de contraseña. Los wrappers de autorización son reutilizables, pero aún no protegen rutas de negocio porque esas rutas no han sido portadas. El ajuste `require_packing` no consulta todavía `app_settings`. El Bearer técnico continúa siendo el guard de `/api/twin/*`. No conectar el frontend hasta completar la paridad de rutas y DTO.


## Importación reanudable

La importación JSON ahora es idempotente. Si una identidad ya existe con el mismo `user_id`, no la sobrescribo; si un username ya pertenece a otro ID, rechazo la colisión. Solo persisto usuarios faltantes. El runtime vuelve a procesar el archivo configurado en cada arranque, permitiendo reanudar una importación parcial. El archivo se valida siempre y debe ser 0600 o más restrictivo.

El coste bcrypt para contraseñas creadas/cambiadas por el gemelo es 12, igual al default de `bcrypt.gensalt()` del backend Python.
