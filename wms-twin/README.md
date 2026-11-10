# WMS Twin — backend gemelo sobre PrismaTec-Core

Servicio Go independiente. No reemplaza ni importa código del backend Flask original. PrismaTec-Core es una dependencia externa fijada en `go.mod` y `go.sum`.

## Estado

- [x] Nodo Core y listeners WMS/AIP separados.
- [x] Health WMS con contrato público original básico.
- [x] Persistencia genérica: un organismo por registro, episodios y bloques CID locales.
- [x] API técnica Bearer para CRUD genérico.
- [x] Invariantes puras de balance.
- [x] Ledger Core-backed para ajuste, reserva, liberación y movimiento.
- [x] Idempotencia por `operation_id`, reinicio y serialización local cubiertos por tests añadidos.
- [ ] JWT HS256, cookies, CSRF, refresh/logout, lockout y revocación.
- [ ] Roles, permisos por página, scopes por almacén y WMS token scopes.
- [ ] DTO/rutas compatibles y pruebas diferenciales.
- [ ] Autoridad multi-nodo, transferencia de bloques CID y reconciliación.
- [ ] Flujos WMS completos.

**NO SUSTITUIBLE.** El ledger es un primer corte de dominio, no un backend equivalente.

## Arranque

Requiere Go 1.25+ y acceso inicial al proxy de módulos.

```bash
export WMS_TWIN_DATA_DIR="$HOME/.local/share/smart-wms-twin"
export WMS_TWIN_NODE_NAME="wms-node-local"
export WMS_TWIN_HTTP_ADDR=":5001"
export WMS_TWIN_AIP_ADDR=":8081"
export WMS_TWIN_API_TOKEN="$(openssl rand -hex 32)"
go mod download
go mod verify
go test ./...
go run ./cmd/wms-twin
```

WMS :5001; AIP :8081. No requiere PostgreSQL ni Redis. El original conserva sus dependencias.

## API técnica

Todas las rutas `/api/twin/*` requieren Bearer token:
- `GET /api/twin/inventory/balances`
- `POST /api/twin/inventory/adjust`
- `POST /api/twin/inventory/allocate`
- `POST /api/twin/inventory/release`
- `POST /api/twin/inventory/move`

Las mutaciones requieren `operation_id`. El mismo ID/comando es idempotente; el mismo ID con otro contenido devuelve 409. El movimiento envía solo identificadores de ubicación; el servidor lee balances autoritativos desde su ledger local.

## Límites

La serialización es por proceso, no consenso distribuido. Los snapshots Core no transfieren bytes CID; DHT/GossipSub están documentados como futuros. No usar el ledger como fuente de stock multi-nodo ni conectar el frontend original hasta completar autenticación y paridad. El historial no tiene compactación.

## Documentación

Leer `Guia.md`, `EstructuraBackendGo.md`, `NivelDeParidadConBackendOriginal.md`, `AUDITORIA_GEMELO.md`, `docs/CONTRATO_FRONTEND.md`, `docs/MAPA_RUTAS_ORIGINAL.md` y `docs/INVENTORY_LEDGER.md`.


## Estado de CI de la entrega de inventario

En el primer run posterior al ledger, el guard de alcance/documentación pasó, pero `go mod tidy -diff` falló antes de compilar. El grafo se está reconstruyendo en CI para obtener los archivos de módulo canónicos. No se debe interpretar el commit como validado hasta que el workflow completo termine en success.
