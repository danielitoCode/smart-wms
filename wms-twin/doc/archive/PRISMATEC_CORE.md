# PrismaTec-Core — integración en el twin

El servicio `wms-twin` depende de **PrismaTec-Core** (módulo Go `github.com/yecharlot/PrismaTec-Core`). Este documento describe cómo se integra y se entrega junto al gemelo.

## Principios

1. El twin habla con PrismaTec-Core a través de su API pública (nodo, organismos, CID).
2. El código fuente de PrismaTec-Core vive en su propio repositorio de producto.
3. Los paquetes de despliegue del twin **compilan el servicio enlazando PrismaTec-Core**; el binario resultante incluye el núcleo.
4. Flask, admin y mobile originales no importan PrismaTec-Core.

## Desarrollo local

```bash
export GOPRIVATE=github.com/yecharlot/*
cd wms-twin
go mod download
./scripts/run-local.sh
# o: go run ./cmd/wms-twin
```

Usuarios demo (si el data dir está vacío):

| Usuario | Password |
|---------|----------|
| operator | Operator123 |
| admin | Admin1234 |

## Empaquetado del binario (servicio + PrismaTec-Core)

```bash
cd wms-twin
mkdir -p dist third_party/prismatec/bin
go build -trimpath -ldflags="-s -w" -o dist/wms-twin ./cmd/wms-twin
cp -f dist/wms-twin third_party/prismatec/bin/wms-twin
```

El artefacto `dist/wms-twin` / `third_party/prismatec/bin/wms-twin` es el servicio listo para laboratorio; PrismaTec-Core va **enlazado dentro** del binario (no hace falta un segundo proceso solo para el core en el flujo básico).

## Verificación

```bash
./scripts/run-local.sh &
sleep 2
curl -s http://127.0.0.1:5001/api/health
bash scripts/demo-flow.sh
```

Más detalle de carpeta de integración: `third_party/prismatec/README.md`.
