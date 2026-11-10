# Contrato de integración con los frontends existentes

## Estado

El frontend admin actual declara `const API_BASE = '/api'` y envía credenciales de cookie (`credentials: 'include'`), además de `X-CSRF-Token` en mutaciones. La app móvil usa `EXPO_PUBLIC_API_URL` como valor build-time, fallback `http://localhost:5000`, y permite cambiar la URL en runtime; persiste el valor en AsyncStorage como `sentry_api_url`.

## Estrategia sin modificar el frontend

1. Mantengo el frontend y su código sin cambios.
2. Ejecuto backend original y gemelo en puertos distintos.
3. Para probar el gemelo, configuro el proxy/reverse proxy del entorno para que `/api` apunte al puerto del gemelo.
4. Para volver al original, cambio únicamente el upstream del proxy.
5. La app móvil cambia su API URL desde su configuración runtime o variable `EXPO_PUBLIC_API_URL`; no se cambian pantallas ni modelos.

No afirmo que el paso 3 sea seguro hoy: la API técnica del gemelo todavía no reproduce el contrato original. La conmutación se habilitará después de paridad de autenticación y rutas.

## Diferencias verificadas

- Admin: `admin/src/api.js` fija `API_BASE = '/api'`.
- Admin: usa cookies `sentry_auth` y `sentry_csrf`; las mutaciones envían `X-CSRF-Token`.
- Mobile: `mobile/src/api/client.js` envía JWT Bearer desde secure storage.
- Backend original: `POST /api/auth/login` devuelve `token` y `user`, además de establecer cookies HttpOnly/CSRF.
- El backend original valida JWT HS256 y refresca rol, estado y almacenes autorizados desde la base de datos.
- El gemelo actual solo expone `/api/twin/*` con token Bearer independiente. No es compatible con ninguno de los dos clientes.

## Próxima implementación

Portar el contrato de autenticación sin rebajar controles: JWT HS256 de ocho horas, cookie HttpOnly SameSite Strict, doble envío CSRF, revocación/estado activo, cambio obligatorio de contraseña, limitación de intentos y autorización por rol/página/almacén. Luego implementar rutas y DTO por grupos funcionales y comparar respuestas.
