# Deploy del gemelo en Render

Servicio esperado: **smart-wms-twin** (Docker, root `wms-twin`, rama `feat/wms-prismatec-genesis`).

## Variables

- `PORT` — lo inyecta Render (el binario también lee `WMS_TWIN_HTTP_ADDR` o `PORT`)
- `WMS_TWIN_ALLOW_DEMO_BOOTSTRAP=true` — usuarios lab
- `JWT_SECRET` — obligatorio en producción
- `WMS_TWIN_API_TOKEN` — token de lab/API
- `WMS_TWIN_DATA_DIR=/data` — persistencia local del contenedor (free: efímero al redeploy)
- `GITHUB_TOKEN` — **build-time** para `go mod download` de PrismaTec-Core privado

## Usuarios demo

- operator / Operator123
- admin / Admin1234

## Health

`GET /api/health` → debe incluir `"engine":"PrismaTec-Core"`.
