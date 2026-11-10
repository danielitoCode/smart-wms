# Contrato de integración con los frontends existentes

## Estado

El frontend admin actual declara `const API_BASE = '/api'` y envía credenciales de cookie (`credentials: 'include'`), además de `X-CSRF-Token` en mutaciones. La app móvil utiliza su propia variable de URL pública. Por tanto, ambos clientes pueden apuntar a otro servidor mediante configuración de proxy/origen, pero solo si el servidor destino reproduce el contrato HTTP y la autenticación.

## Estrategia sin modificar el frontend

1. Mantengo el frontend y su código sin cambios.
2. Ejecuto backend original y gemelo en puertos distintos.
3. Para probar el gemelo, configuro el proxy/reverse proxy del entorno para que `/api` apunte al puerto del gemelo.
4. Para volver al original, cambio únicamente el upstream del proxy.
5. La app móvil cambia su URL de API de deployment, no sus pantallas ni sus modelos.

No afirmo que el paso 3 sea seguro hoy: la API de registros del gemelo todavía no reproduce el contrato original. La conmutación se habilitará después de paridad de autenticación y rutas.

## Diferencias verificadas

- Admin: `admin/src/api.js` fija `API_BASE = '/api'`.
- Admin: usa cookies `sentry_auth` y `sentry_csrf`; las mutaciones envían `X-CSRF-Token`.
- Backend original: `POST /api/auth/login` devuelve `token` y `user`, además de establecer cookies HttpOnly/CSRF.
- El backend original valida JWT HS256 y refresca rol, estado y almacenes autorizados desde la base de datos.
- El gemelo actual solo expone `/api/twin/*` con token Bearer independiente. No es compatible con el frontend original.

## Próxima implementación

Portar el contrato de autenticación sin rebajar controles: JWT HS256 de ocho horas, cookie HttpOnly SameSite Strict, doble envío CSRF, revocación/estado activo, cambio obligatorio de contraseña, limitación de intentos y autorización por rol/página/almacén. Luego implementar rutas y DTO por grupos funcionales y comparar respuestas.
