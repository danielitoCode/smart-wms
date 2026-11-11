# Runtime propietario (PrismaTec)

Este directorio reserva el punto de integración del **runtime de nodos** usado por `wms-twin`.

## Distribución

El runtime se consume como **dependencia de módulo Go** o, en builds de entrega, como **artefacto precompilado** enlazado al binario `wms-twin`. El código fuente del runtime **no forma parte del árbol público de este servicio**; se mantiene en el repositorio de producto del runtime y se publica solo la interfaz estable que el twin necesita (nodo, organismos, almacenamiento por CID, transporte).

## Integración en desarrollo

En `go.mod` del twin la dependencia se declara de forma habitual:

```go
require github.com/yecharlot/PrismaTec-Core vX.Y.Z
```

Para entornos con módulo privado:

```bash
export GOPRIVATE=github.com/yecharlot/*
go mod download
```

## Builds de entrega

Para binarios que se compartan fuera del equipo de runtime, el proceso de release construye `wms-twin` de forma que el runtime quede **compilado dentro del ejecutable**. Así el servicio se opera como un solo binario, sin exponer el árbol fuente del runtime en el paquete de despliegue.

Ejemplo de build de release (ajustable en CI):

```bash
cd wms-twin
go build -trimpath -ldflags="-s -w" -o dist/wms-twin ./cmd/wms-twin
```

Opcional (herramienta de build endurecido, si el pipeline de release la tiene instalada):

```bash
garble -literals -tiny build -o dist/wms-twin ./cmd/wms-twin
```

## Qué no va en este repo

- Fuentes internas del runtime  
- Claves de firma de nodos de producción  
- Snapshots o ledgers reales de clientes  

## Contacto de integración

Cambios de API del runtime se coordinan con el mantenedor del módulo PrismaTec antes de subir la versión en `go.mod`.
