# Guía de trabajo del backend gemelo WMS

Escribo esta guía para que cualquier desarrollador o agente pueda continuar el trabajo sin depender de conversaciones externas. El backend original permanece intacto; el gemelo se desarrolla exclusivamente en `wms-twin/` sobre PrismaTec-Core.

## Estado real

La rama de trabajo es `feat/wms-prismatec-genesis`. La entrega actual contiene el primer servicio Go ejecutable, el arranque del nodo Core, persistencia por organismos/CID y una API técnica protegida. No existe todavía paridad funcional completa con Flask.

## Requisitos y puesta en marcha

Necesito Go 1.25.0 o superior. El módulo PrismaTec-Core declara `go 1.25.0` y se consume como dependencia externa fijada a un commit; su código no se copia ni se vende dentro de este repositorio.

Desde la raíz:

```bash
export WMS_TWIN_DATA_DIR="$HOME/.local/share/smart-wms-twin"
export WMS_TWIN_NODE_NAME="wms-node-local"
export WMS_TWIN_HTTP_ADDR=":5001"
export WMS_TWIN_AIP_ADDR=":8081"
export WMS_TWIN_API_TOKEN="$(openssl rand -hex 32)"
cd wms-twin
go mod download
go test ./...
go run ./cmd/wms-twin
```

- API técnica WMS: `http://127.0.0.1:5001`
- Health Core: `http://127.0.0.1:5001/healthz`
- AIP: `http://127.0.0.1:8081/aip/v1`
- Datos persistentes: `WMS_TWIN_DATA_DIR`

No necesito PostgreSQL ni Redis para este proceso. El backend original conserva sus propias dependencias y su forma de arranque.

## Ejecutar el backend original simultáneamente

El original continúa en su stack actual (Flask, PostgreSQL, Redis y procesos auxiliares). No comparto directorio de datos, secretos ni puertos con el gemelo. La configuración original sigue siendo la documentada en README y `docker-compose.yml`.

## Cambiar el frontend entre backends

El admin actual usa `/api` relativo. No es necesario modificar su código para alternar en un entorno con reverse proxy: el upstream de `/api` puede apuntar al original (puerto 5000) o al gemelo (puerto 5001). La app móvil cambia su URL base mediante su variable de deployment.

**Advertencia actual:** todavía no se debe dirigir el frontend original al gemelo. El gemelo aún no implementa el contrato original de login/cookies/CSRF/JWT ni sus rutas. La ruta `/api/twin/*` es una API técnica protegida con Bearer token.

## Pruebas y diagnóstico

```bash
cd wms-twin
gofmt -w .
go mod download
go test ./...
go test -race -count=1 ./...
go vet ./...
go test ./internal/corestore -run TestRecordsPersistThroughCoreCIDStore -v
```

Si falla la descarga de dependencias, revisar Go 1.25, `GOPROXY`, conectividad a GitHub y el proxy de módulos. Si falla el arranque, comprobar que `WMS_TWIN_DATA_DIR` sea escribible y que los puertos 5001/8081 estén libres. Si una lectura CID falla, conservar el directorio de datos para análisis: no borrarlo como primera medida.

## Dónde continuar

1. Auditar y congelar el mapa completo de rutas, esquemas, middleware y respuestas del backend Flask.
2. Implementar autenticación compatible, con revocación y CSRF sin debilitar el contrato.
3. Portar primero almacenes, zonas, bins e items, con DTO y códigos HTTP exactos.
4. Implementar inventario como agregado con operaciones atómicas e idempotentes.
5. Portar recepción, put-away, picking, packing, shipping, transferencias y conteos.
6. Completar usuarios, permisos, auditoría, integraciones, webhooks, snapshots e importaciones.
7. Ejecutar pruebas diferenciales original vs gemelo y pruebas de concurrencia/particiones.

Antes de cada commit actualizo esta guía, `EstructuraBackendGo.md`, `NivelDeParidadConBackendOriginal.md` y `AUDITORIA_GEMELO.md`. El siguiente agente debe leer primero esos cuatro documentos y `wms-twin/README.md`.
