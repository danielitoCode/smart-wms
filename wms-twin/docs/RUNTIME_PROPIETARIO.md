# Runtime propietario — integración en el twin

El servicio `wms-twin` depende de un **runtime de nodos propietario** (módulo PrismaTec). Este documento describe solo cómo se **integra y se entrega** junto al gemelo.

## Principios

1. El twin habla con el runtime a través de la API pública del módulo (nodo, organismos, CID).
2. El código fuente del runtime vive en su propio repositorio de producto.
3. Los paquetes de despliegue del twin incluyen el runtime **ya compilado** en el binario del servicio.
4. Flask, admin y mobile originales no importan este runtime.

## Desarrollo local

```bash
export GOPRIVATE=github.com/yecharlot/*
cd wms-twin
go mod download
go run ./cmd/wms-twin
```

## Release

```bash
cd wms-twin
mkdir -p dist
go build -trimpath -ldflags="-s -w" -o dist/wms-twin ./cmd/wms-twin
```

El artefacto `dist/wms-twin` es lo que se copia a servidores de laboratorio o staging del gemelo.

## Verificación

```bash
./dist/wms-twin   # con las variables de entorno documentadas en el README del twin
curl -s http://127.0.0.1:5001/api/health
```

Más detalle de carpeta de integración: `third_party/prismatec/README.md`.
