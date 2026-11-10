# Contrato de integración con los frontends existentes

## Estado

El frontend admin declara `const API_BASE = '/api'`, envía `credentials: 'include'`, lee la cookie `sentry_csrf` y envía `X-CSRF-Token` en mutaciones. La app móvil usa `EXPO_PUBLIC_API_URL`, Bearer JWT desde secure storage y permite cambiar la URL en runtime.

## Estrategia sin modificar el frontend

1. Mantengo frontend y componentes originales sin cambios.
2. Ejecuto Flask y Go en puertos distintos.
3. Para probar el gemelo, configuro el reverse proxy para que `/api` apunte al puerto :5001.
4. Para volver al original, cambio el upstream a :5000.
5. Mobile cambia su API URL por configuración runtime/deployment.

La conmutación de upstream no demuestra compatibilidad. No dirijo tráfico real al gemelo hasta cerrar autenticación y rutas.

## Diferencias verificadas

- Admin: `admin/src/api.js` fija `API_BASE = '/api'`.
- Admin: cookies `sentry_auth` y `sentry_csrf`; mutaciones con `X-CSRF-Token`.
- Mobile: `mobile/src/api/client.js` envía Bearer JWT desde almacenamiento seguro.
- Original: `POST /api/auth/login` devuelve token y usuario, y establece cookies HttpOnly/CSRF.
- Original: revalida usuario activo, rol, almacenes y permisos.
- Gemelo: `/api/twin/*` usa Bearer técnico independiente. No es compatible con los clientes.

## Inventario técnico del gemelo

Se añadieron endpoints técnicos para consultar balances y ejecutar adjust/allocate/release/move. Requieren `WMS_TWIN_API_TOKEN` y `operation_id`. No reproducen `/api/transfers/move`, no usan el JWT de usuario y no deben conectarse desde el frontend original.

## Próxima implementación

Portar JWT HS256 de ocho horas, cookies HttpOnly SameSite Strict, doble envío CSRF, estado activo/revocación, forced password change, rate limit y autorización por rol/página/almacén. Luego implementar rutas/DTO y compararlos con fixtures originales.
