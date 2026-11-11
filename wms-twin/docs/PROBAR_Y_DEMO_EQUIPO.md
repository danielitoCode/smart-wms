# Cómo probar el gemelo y mostrar al equipo

Rama: `feat/wms-prismatec-genesis`.

## 1. Arrancar el gemelo (lab)

```bash
cd wms-twin
./scripts/start-lab.sh
```

Eso activa bootstrap demo, JWT, y `WMS_TWIN_HEALTH_SERVICE=sentry-wms`.

Usuarios:
- `operator` / `Operator123`
- `admin` / `Admin1234`

Comprobar:

```bash
curl -s http://127.0.0.1:5001/api/health
./scripts/parity-smoke.sh
./scripts/demo-flow.sh
```

## 2. Prueba visual completa (proyectar)

En otra terminal:

```bash
cd wms-twin/demo
python3 -m http.server 8765
```

Abrir **http://127.0.0.1:8765**

1. Base URL: `http://127.0.0.1:5001`
2. Usuario `operator` / `Operator123`
3. **Ejecutar prueba visual completa**

El panel recorre health → login → catálogo → PO/receive/putaway → SO/pack/ship → lookup → picking.

## 3. Flask y gemelo a la vez (frontend transparente)

1. Flask original en `:5000` (como siempre).
2. Gemelo en `:5001` (`./scripts/start-lab.sh`).
3. Proxy en `:8080` (opcional):

```bash
# ejemplo local sin docker: apunta el admin a :5001 en lab
# o usa wms-twin/proxy/nginx.conf con cookie wms_backend=twin
```

El frontend solo habla con un origen. Cambiar upstream (cookie/env) conmuta backend **sin rebuild**.

## 4. Tests automatizados

```bash
cd wms-twin
go test ./... -count=1
```

## 5. Producción

Ver `docs/SIMULTANEO_Y_PARIDAD.md`. **Aún no** se declara sustituto de producción hasta E2E frontend + fixtures diferenciales + runbook de rollback.
