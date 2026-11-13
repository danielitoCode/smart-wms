# Operación simultánea Flask + gemelo y veredicto de paridad

Documento en primera persona. Rama canónica del gemelo: **`feat/wms-prismatec-genesis`** (incluye todo el trabajo que estuvo en `fix/wms-twin-operational-completion`).

## 1. Una sola rama

- `feat/wms-prismatec-genesis` es la rama de trabajo del backend gemelo.
- Se unificó por *fast-forward* desde `fix/wms-twin-operational-completion` hasta `9ee4968`.
- Flask (`api/`) y frontends (`admin/`, `mobile/`) no se modifican en esta línea de trabajo.

## 2. Cómo simultanear sin que el frontend “se entere”

El frontend no debe apuntar a dos APIs a la vez en el código. El truco es un **proxy de borde** (nginx, Caddy, Traefik o el reverse proxy del admin) con la misma base `/api`.

### Topología de laboratorio

```
Admin / Mobile
      │
      ▼
  Proxy :8080  (misma origin /api para el browser)
      │
      ├── path o header de conmutación ──► Flask original :5000
      └── path o header de conmutación ──► wms-twin      :5001
```

### Reglas

1. **Mismo path prefix** `/api/...` en ambos backends para las rutas ya portadas.
2. **Cookies** `sentry_auth` / `sentry_csrf` con el mismo `Path=/` y, en lab, mismo host vía proxy.
3. **JWT** HS256: el gemelo debe usar el **mismo `JWT_SECRET`** que Flask si se quiere reutilizar sesión entre conmutaciones (solo lab controlado).
4. Conmutación por:
   - variable de entorno del proxy (`UPSTREAM=flask|twin`), o
   - header interno `X-WMS-Backend: twin`, o
   - ruta de staging distinta (`api-twin.example.local` → :5001).
5. Health del gemelo puede publicarse como `service=sentry-wms` con `WMS_TWIN_HEALTH_SERVICE=sentry-wms` para monitores que filtran por nombre.

### Ejemplo mínimo nginx (lab)

```nginx
upstream wms_flask { server 127.0.0.1:5000; }
upstream wms_twin  { server 127.0.0.1:5001; }

map $cookie_wms_backend $wms_upstream {
    default wms_flask;
    twin    wms_twin;
}

server {
    listen 8080;
    location /api/ {
        proxy_pass http://$wms_upstream;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    location / {
        proxy_pass http://127.0.0.1:5173; # admin vite o estático
    }
}
```

El frontend sigue hablando solo con `:8080`. Cambiar la cookie `wms_backend=twin` conmuta el backend sin rebuild del admin.

## 3. Seguridad (estado real)

| Control | Gemelo | ¿Listo para sustituir prod? |
|---------|--------|------------------------------|
| JWT HS256 + expiración | Sí | Parcial: falta diferencial exhaustivo vs Flask y revocación jti completa |
| Cookies HttpOnly + CSRF doble envío | Sí en mutaciones cookie | Parcial: probar admin real detrás del proxy |
| Lockout por intentos | Sí | Sí a nivel unitario |
| Password change invalida token | Sí | Sí a nivel unitario |
| Roles + page permissions + warehouse scope | Sí en rutas cableadas | Parcial: no auditado endpoint-a-endpoint vs Flask |
| Bearer técnico `/api/twin/*` aislado | Sí | Sí (no es contrato del frontend) |
| WMS scoped tokens | Implementado | Parcial |
| Webhooks HTTPS + anti-SSRF | Implementado | Parcial: cifrado de secretos y DLQ aún con límites documentados |
| Bootstrap demo | Solo con `WMS_TWIN_ALLOW_DEMO_BOOTSTRAP=true` | Nunca en producción compartida |

**No declaro el gemelo “seguro como Flask en producción”** hasta completar prueba de sesión real admin/mobile detrás del proxy y revisión de permisos por cada ruta del mapa original.

## 4. Casos de uso y paridad

### Cubierto con tests Go en verde (`go test ./...`)

Auth, catálogo, PO, receiving/putaway, picking/wave, packing/shipping, transfers, cycle counts, lookup, sales orders, ledger idempotente, POS (checkout/refund/dispatch/void con sagas), Dockd (límites documentados), inbound parcial, RMA parcial, events/webhooks/snapshot, audit chain, mesh libp2p básico, runtime bootstrap.

### Aún no equivalente a “el frontend no se entera nunca”

1. **DTO y errores idénticos** a fixtures Flask (comparación automática request/response).
2. **Todos** los módulos admin (connectors, consumer groups, notificaciones, etc.).
3. **Transacciones SQL multi-tabla** vs organismos/ledger (semántica distinta bajo fallos parciales).
4. **Jobs/workers** y colas del original.
5. **Prueba E2E** admin + mobile completos contra el gemelo sin degradación UX.

### Veredicto

| Pregunta | Respuesta |
|----------|-----------|
| ¿Puedo correr Flask y gemelo a la vez? | **Sí**, puertos distintos + proxy. |
| ¿Puede el frontend no enterarse en lab sobre el núcleo operativo? | **Casi**, con proxy y rutas ya portadas; validar pantalla a pantalla. |
| ¿Declaro el gemelo **sustituto de producción**? | **No todavía.** Criterio: diferencial de fixtures + E2E frontend + seguridad de sesión en proxy + runbook de rollback. |

## 5. Criterio explícito para declarar “sustituto”

Solo cuando se cumplan **todos**:

1. Matriz de `NivelDeParidadConBackendOriginal.md` sin filas críticas en Pendiente.
2. Suite diferencial de contratos (golden files) en CI.
3. Admin y mobile E2E en CI o checklist firmado contra `:twin` vía proxy.
4. Mismo `JWT_SECRET`/política de cookies documentada y probada.
5. Rollback a Flask en un cambio de upstream del proxy en &lt; 1 minuto.
6. Sin `WMS_TWIN_ALLOW_DEMO_BOOTSTRAP` en el entorno declarado.

Hasta entonces el estado oficial sigue siendo: **NO SUSTITUIBLE en producción; sí operable en paralelo para demos y lab.**
