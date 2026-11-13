# Demo para el equipo — backend gemelo

Escribo esta guía para que cualquiera del equipo pueda **arrancar el servicio gemelo**, **recorrer el flujo operativo** y **mostrarlo en pantalla** sin modificar el backend Flask ni los frontends originales.

## 1. Requisitos

- Go 1.25+
- Variables mínimas:

```bash
export WMS_TWIN_DATA_DIR="$HOME/.local/share/smart-wms-twin-demo"
export WMS_TWIN_NODE_NAME="wms-demo"
export WMS_TWIN_HTTP_ADDR=":5001"
export WMS_TWIN_AIP_ADDR=":8081"
export WMS_TWIN_API_TOKEN="$(openssl rand -hex 32)"
export JWT_SECRET="$(openssl rand -hex 32)"
# Solo para una demo local aislada; crea operator/admin con claves conocidas.
export WMS_TWIN_ALLOW_DEMO_BOOTSTRAP=true
```

Con `WMS_TWIN_ALLOW_DEMO_BOOTSTRAP=true`, el runtime crea `operator / Operator123` y `admin / Admin1234`. No activar este flag en una instalación compartida. Para una instalación real, importar identidades con `WMS_TWIN_BOOTSTRAP_USERS_FILE`.

## 2. Arranque del API

```bash
cd wms-twin
go mod download
go test ./... -count=1
go vet ./...
go test -race ./... -count=1
go run ./cmd/wms-twin
```

Comprobación rápida:

```bash
curl -s http://127.0.0.1:5001/api/health
```

## 3. Demo visual (recomendada para el equipo)

Con el API en `:5001`:

```bash
cd wms-twin/demo
python3 -m http.server 8765
```

Abrir en el navegador: `http://127.0.0.1:8765`

1. Verificar que **Base URL** sea `http://127.0.0.1:5001`
2. Pulsar **Health**
3. Pulsar **Login** (o directo **Ejecutar demo completa**)
4. El panel muestra IDs de warehouse, item, PO, SO y el resultado de shipping
5. El log en vivo sirve para proyectar en reunión

La página solo habla con el gemelo; no sustituye el admin React original.

## 4. Demo por terminal

```bash
chmod +x wms-twin/scripts/demo-flow.sh
WMS_TWIN_BASE=http://127.0.0.1:5001 \
WMS_TWIN_USER=operator \
WMS_TWIN_PASS=Operator123 \
./wms-twin/scripts/demo-flow.sh
```

Recorre health → login → catálogo → PO/receive/putaway → SO/pack/ship → lookup.

## 5. Qué mostrar al equipo (guion corto)

| Minuto | Qué se ve |
|--------|-----------|
| 0–1 | `GET /api/health` y login |
| 1–3 | Alta de almacén, zona, bins, artículo |
| 3–5 | Recepción a Staging y put-away a Pickable |
| 5–7 | Sales order, packing, shipping |
| 7–8 | Lookup por SKU con existencias |

Mensaje claro: **Flask original intacto**; el gemelo es un servicio paralelo con contratos HTTP compatibles en las rutas ya portadas.

## 6. Tests automatizados de respaldo

```bash
cd wms-twin
go test ./internal/httpapi -count=1
```

Incluye rutas operativas, lookup, receive/putaway y pack/ship, además de POS, RMA, inbound, snapshots, webhooks y mesh.

## 7. Límites a comunicar

No presentar el gemelo como sustituto total de producción. El gateway de pagos es externo; inbound aún no aplica versiones externas nuevas; webhooks son at-least-once y requieren un único worker; falta validar red multinodo/particiones y paridad diferencial completa. La matriz vigente está en `NivelDeParidadConBackendOriginal.md` y `docs/PARIDAD_OPERATIVA.md`.


## 8. Secretos de webhook y mesh

Para crear webhooks en la demo, configura una clave AES de 32 bytes:

```bash
export WMS_WEBHOOK_ENCRYPTION_KEY="$(openssl rand -base64 32)"
```

Para probar Kademlia/GossipSub real, el Core debe usar el transporte libp2p:

```bash
export PRISMATEC_TRANSPORT=libp2p
export PRISMATEC_NETWORK_ADDR="/ip4/0.0.0.0/tcp/4001"
```

En una red TCP/local el servicio reporta el fallback TTL; no se debe interpretar como DHT.
