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
