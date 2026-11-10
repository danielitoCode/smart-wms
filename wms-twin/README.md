# WMS Twin — backend gemelo sobre PrismaTec-Core

Servicio Go independiente. No reemplaza ni importa código del backend Flask original. PrismaTec-Core es dependencia externa fijada en `go.mod`.

## Estado

- [x] Nodo Core y listeners WMS/AIP separados.
- [x] Health WMS con contrato público original y health/AIP Core.
- [x] Persistencia genérica mediante organismos, episodios y bloques CID.
- [x] API técnica Bearer para CRUD genérico de transición.
- [x] Invariantes puras iniciales de inventario.
- [ ] JWT HS256, cookies, CSRF, refresh/logout, lockout y revocación.
- [ ] Roles, permisos por página, scopes por almacén y WMS token scopes.
- [ ] Rutas/DTO de negocio compatibles y pruebas diferenciales.
- [ ] Flujos WMS completos y transacciones de inventario distribuidas.

**NO SUSTITUIBLE.** Esto es el primer runtime ejecutable, no un backend equivalente.

## Arranque

Requiere Go 1.25+ y acceso inicial al proxy de módulos.

```bash
export WMS_TWIN_DATA_DIR="$HOME/.local/share/smart-wms-twin"
export WMS_TWIN_NODE_NAME="wms-node-local"
export WMS_TWIN_HTTP_ADDR=":5001"
export WMS_TWIN_AIP_ADDR=":8081"
export WMS_TWIN_API_TOKEN="$(openssl rand -hex 32)"
go mod tidy
go mod verify
go test ./...
go run ./cmd/wms-twin
```

WMS :5001; AIP :8081. No requiere PostgreSQL ni Redis. El original conserva sus dependencias y despliegue.

## Comprobación

```bash
curl -fsS http://127.0.0.1:5001/api/health
curl -fsS http://127.0.0.1:8081/healthz
curl -fsS http://127.0.0.1:8081/aip/v1/info
curl -fsS -H "Authorization: Bearer $WMS_TWIN_API_TOKEN" http://127.0.0.1:5001/api/twin/info
```

`/api/twin/records/*` es una API técnica, no imita rutas Flask. No conectar frontend original hasta cerrar auth y paridad.

## Persistencia

Cada colección `kind` tiene organismo `wms-records-{kind}`. Upsert agrega episodio y bloque CID; delete agrega tombstone. Se conserva historial, pero no hay compactación ni transacción multi-registro. No usar aún para inventario crítico.

## Documentación

Leer `Guia.md`, `EstructuraBackendGo.md`, `NivelDeParidadConBackendOriginal.md`, `AUDITORIA_GEMELO.md`, `docs/CONTRATO_FRONTEND.md` y `docs/MAPA_RUTAS_BACKEND_ORIGINAL.md`.
