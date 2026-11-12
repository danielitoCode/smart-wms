# Verificación E2E del admin contra el gemelo

El admin **no** guarda JWT en localStorage: usa cookies HttpOnly `sentry_auth` + `sentry_csrf` y envía `X-CSRF-Token` en mutaciones (`admin/src/api.js`, `auth.jsx`). Esta guía verifica ese modelo contra el twin **sin modificar el frontend**.

## 1. Batería cookie/CSRF (obligatoria)

```bash
cd wms-twin
./scripts/start-lab.sh          # terminal 1
./scripts/admin-e2e-cookie.sh   # terminal 2
```

Debe terminar en `ADMIN COOKIE/CSRF E2E PASSED`.

## 2. Mismo origen en el navegador (recomendado)

Vite en docker apunta `/api` a `http://api:5000` (Flask). Para lab local sin tocar `vite.config.js`:

```bash
# terminal 1
./scripts/start-lab.sh

# terminal 2 — admin en 3000 (si el proxy de vite falla hacia api:5000, da igual:
# el navegador solo hablará con 3080)
cd ../admin && npm run dev -- --host 127.0.0.1 --port 3000

# terminal 3
cd ../wms-twin
python3 scripts/admin-lab-proxy.py
```

Abrir **http://127.0.0.1:3080/**  
Login: `operator` / `Operator123`

Checklist manual mínimo:

1. Login y permanencia de sesión al refrescar
2. Dashboard carga
3. Warehouses / Items listan
4. Crear warehouse (CSRF)
5. Sales orders listan
6. Channels listan
7. Logout y redirección a login

## 3. Qué aún no cubre este paso

- Mobile E2E (Bearer, sin CSRF cookie)
- Connectors con sync real vs Flask
- Migración de datos de producción
- Rollback de proxy bajo carga
