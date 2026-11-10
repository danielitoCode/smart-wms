# Guía de trabajo del backend gemelo WMS

Escribo esta guía para que cualquier desarrollador o agente pueda continuar el trabajo sin depender de conversaciones externas. El backend original permanece intacto; el gemelo se desarrolla exclusivamente en `wms-twin/` sobre PrismaTec-Core.

## Estado real

La rama de trabajo es `feat/wms-prismatec-genesis`. La entrega actual contiene el primer servicio Go ejecutable, el arranque del nodo Core, persistencia por organismos/episodios/CID y una API técnica protegida. No existe todavía paridad funcional completa con Flask.

La prueba de CI del gemelo en el commit `a20ddc56cc75f88efafeddb125c7526c5ff9fdfb` terminó correctamente: `go mod tidy -diff`, `go mod verify`, `go vet ./...` y `go test -race -count=1 ./...`. CI tuvo que formatear siete archivos dentro de su workspace temporal; la rama todavía necesita publicar esa normalización.

## Documentación de continuidad

- `EstructuraBackendGo.md`: arquitectura y responsabilidades.
- `NivelDeParidadConBackendOriginal.md`: estado de compatibilidad, sin inflar el progreso.
- `AUDITORIA_GEMELO.md`: cambios, detonantes, fallos y evidencia.
- `wms-twin/docs/MAPA_RUTAS_ORIGINAL.md`: inventario de rutas, contratos, clientes, seguridad y límites Core.
- `wms-twin/docs/CONTRATO_FRONTEND.md`: cómo alternar upstreams sin modificar el código de los clientes.

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
- Health WMS: `http://127.0.0.1:5001/api/health`
- Health Core: `http://127.0.0.1:8081/healthz`
- AIP: `http://127.0.0.1:8081/aip/v1`
- Datos persistentes: `WMS_TWIN_DATA_DIR`

No necesito PostgreSQL ni Redis para este proceso. El backend original conserva sus propias dependencias y su forma de arranque.

## Ejecutar el backend original simultáneamente

El original continúa en su stack actual (Flask, PostgreSQL, Redis y procesos auxiliares). No comparto directorio de datos, secretos ni puertos con el gemelo. La configuración original sigue siendo la documentada en README y `docker-compose.yml`.

## Cambiar el frontend entre backends

El admin actual usa `/api` relativo y cookies; en un entorno con reverse proxy el upstream de `/api` puede apuntar al original (puerto 5000) o al gemelo (puerto 5001). La app móvil usa `EXPO_PUBLIC_API_URL` como valor de build y además permite cambiar la URL en runtime mediante su configuración, guardándola como `sentry_api_url`.

**Advertencia actual:** todavía no se debe dirigir el frontend original al gemelo. El gemelo aún no implementa el contrato original de login/cookies/CSRF/JWT ni sus rutas. La ruta `/api/twin/*` es una API técnica protegida con Bearer token. La matriz de paridad y el mapa de rutas indican qué falta.

## Pruebas y diagnóstico

```bash
cd wms-twin
gofmt -w .
go mod tidy -diff
go mod verify
go test ./...
go test -race -count=1 ./...
go vet ./...
go test ./internal/corestore -run TestRecordsPersistThroughCoreCIDStore -v
```

Si falla la descarga de dependencias, revisar Go 1.25, `GOPROXY`, conectividad a GitHub y el proxy de módulos. Si falla el arranque, comprobar que `WMS_TWIN_DATA_DIR` sea escribible y que los puertos 5001/8081 estén libres. Si una lectura CID falla, conservar el directorio de datos para análisis: no borrarlo como primera medida.

## Alertas de CI que no debo confundir

La validación propia del gemelo pasó. El workflow independiente `Dependency Audit` del repositorio original falló en el mismo commit por advisories de dependencias preexistentes de admin/mobile y por PyJWT 2.13.0 (`GHSA-pxh4-856f-4h89`). No voy a tocar los lockfiles ni código original para silenciar ese resultado. Requiere una tarea de seguridad separada, preservando la regla de no modificar el backend/frontend original.

## Dónde continuar

1. Resolver la brecha de replicación CID: el snapshot actual de Core replica el organismo y sus episodios, pero no los bytes de los bloques referenciados. Sin una sincronización de bloques no puedo declarar los registros WMS replicados.
2. Implementar una política de peer allowlist, configuración de peers y pruebas TCP/libp2p; Core deja Kademlia y GossipSub como trabajo futuro en la revisión fijada.
3. Portar autenticación JWT/cookies/CSRF y permisos sin reducir los controles originales.
4. Portar almacenes, zonas, bins e items con DTO y errores exactos.
5. Implementar inventario como agregado con transacciones, idempotencia, autoridad y fencing.
6. Portar recepción, put-away, picking, packing, shipping, transferencias y conteos.
7. Completar usuarios, permisos, auditoría hash-chain, integraciones, webhooks, snapshots e importaciones.
8. Ejecutar pruebas diferenciales original vs gemelo y pruebas de concurrencia/particiones.

Antes de cada commit actualizo esta guía, `EstructuraBackendGo.md`, `NivelDeParidadConBackendOriginal.md` y `AUDITORIA_GEMELO.md`. El siguiente agente debe leer primero esos cuatro documentos y el mapa de rutas.
