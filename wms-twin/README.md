# WMS Twin — backend gemelo sobre PrismaTec-Core

Este módulo es un servicio Go independiente. No reemplaza ni importa código del backend Flask original. Su runtime de organismos, identidad, eventos, memoria, persistencia CID, auditoría y transporte se obtiene del módulo público PrismaTec-Core.

## Estado de esta entrega

- [x] Arranque de un nodo PrismaTec dentro del proceso Go.
- [x] AIP v1 expuesto bajo `/aip/v1` y health de Core bajo `/healthz`.
- [x] Almacenes de registros WMS representados como organismos PrismaTec.
- [x] Cada versión de un registro se guarda como bloque CID y episodio; el historial no se sobrescribe.
- [x] API técnica protegida por token para crear, consultar, actualizar y borrar registros genéricos.
- [x] Reglas puras iniciales de balance de inventario y tests.
- [ ] Compatibilidad completa con JWT/cookies/CSRF del backend original.
- [ ] Paridad de endpoints, DTO, códigos HTTP y efectos de negocio.
- [ ] Flujos completos de recepción, put-away, picking, packing, shipping y transferencias.
- [ ] Pruebas diferenciales automatizadas contra el backend original.
- [ ] Pruebas de partición, autoridad, fencing y reconciliación específicas del dominio WMS.

No considero esta entrega un reemplazo del backend original ni una versión apta para producción con el frontend original. La considero el primer corte ejecutable de la infraestructura gemela y de su persistencia sobre Core.

## Requisitos

- Go 1.25.0 o superior (el módulo Core declara `go 1.25.0`).
- Acceso inicial a GitHub/Go proxy para descargar PrismaTec-Core y sus dependencias.
- No requiere PostgreSQL ni Redis para arrancar este proceso.

## Arranque local

Desde la raíz del repositorio:

```bash
export WMS_TWIN_DATA_DIR="$HOME/.local/share/smart-wms-twin"
export WMS_TWIN_NODE_NAME="wms-node-local"
export WMS_TWIN_HTTP_ADDR=":5001"
export WMS_TWIN_AIP_ADDR=":8081"
export WMS_TWIN_API_TOKEN="$(openssl rand -hex 32)"
export PRISMATEC_TRANSPORT="tcp"
# Opcional: activa transporte de red Core. Para TCP usa host:port.
# export PRISMATEC_NETWORK_ADDR="127.0.0.1:9101"

cd wms-twin
go mod download
go test ./...
go run ./cmd/wms-twin
```

El servicio WMS escucha en 5001 y AIP en 8081. Si se habilita `PRISMATEC_NETWORK_ADDR`, el nodo usa el transporte indicado por PrismaTec-Core. No habilito red distribuida por defecto: cada instancia necesita identidad y directorio de datos propios.

## Comprobaciones

```bash
curl -fsS http://127.0.0.1:5001/api/health
curl -fsS http://127.0.0.1:5001/healthz
curl -fsS http://127.0.0.1:8081/aip/v1/info
curl -fsS -H "Authorization: Bearer $WMS_TWIN_API_TOKEN" \
  http://127.0.0.1:5001/api/twin/info
curl -fsS -X POST -H "Authorization: Bearer $WMS_TWIN_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"warehouse_code":"WH-01","warehouse_name":"Almacén principal"}' \
  http://127.0.0.1:5001/api/twin/records/warehouses
```

Para reiniciar, conserva `WMS_TWIN_DATA_DIR`: ahí Core mantiene identidad, organismos y bloques CID. Borrar ese directorio destruye el estado local del nodo.

## Contrato técnico actual

La API de registros genéricos es deliberadamente una superficie interna de transición, no una imitación de las rutas Flask. Requiere `Authorization: Bearer $WMS_TWIN_API_TOKEN`. El frontend original usa `/api` relativo, cookies `sentry_auth`, CSRF y JWT HS256; esa compatibilidad todavía no está implementada. No apuntes el frontend de producción al gemelo hasta que `NivelDeParidadConBackendOriginal.md` marque cada ruta requerida como validada.

## Arquitectura de persistencia

Cada colección `kind` tiene un organismo Core `wms-records-{kind}`. Cada alta/actualización agrega un episodio con contenido guardado por el block store CID nativo. Una eliminación agrega un episodio tombstone. La lectura reconstruye el estado vigente aplicando el último episodio por identificador. Así conservo historial de cambios y evito crear SQLite/PostgreSQL como motor paralelo.

Este mecanismo todavía no equivale a transacciones atómicas entre múltiples registros. Los flujos que afectan inventario deben implementarse como operaciones de dominio con autoridad, idempotencia, fencing y auditoría antes de habilitar concurrencia multi-nodo.
