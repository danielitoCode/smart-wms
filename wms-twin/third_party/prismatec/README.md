# PrismaTec-Core (integración en smart-wms)

Esta carpeta documenta y empaqueta la dependencia **PrismaTec-Core** usada por `wms-twin`.

## Módulo Go

```
github.com/yecharlot/PrismaTec-Core
```

Fijado en `wms-twin/go.mod` / `go.sum`. El twin importa:

- `core` — nodo, organismos, almacenamiento CID local  
- `network` — peers / transporte  
- `api/aip` — listener AIP  

## Binario de integración

Tras `go build ./cmd/wms-twin`, el ejecutable del twin **ya incorpora** PrismaTec-Core.

Ruta recomendada en el repo (generada en build local o CI):

```
third_party/prismatec/bin/wms-twin
```

No se versiona el binario por tamaño/plataforma salvo que el equipo decida publicarlo en releases. Script:

```bash
./scripts/package-prismatec.sh
```

## Variables de entorno relacionadas

| Variable | Uso |
|----------|-----|
| `WMS_TWIN_DATA_DIR` | Datos del nodo PrismaTec-Core + twin |
| `PRISMATEC_NETWORK_ADDR` | Dirección de red del nodo |
| `PRISMATEC_TRANSPORT` | Transporte |
| `PRISMATEC_PEERS` | Peers |
| `JWT_SECRET` | ≥ 32 bytes (lab tiene default documentado) |

## Naming

En documentación y código de este repo, referirse siempre como **PrismaTec-Core**, no como “PrismaTec-Core”.
