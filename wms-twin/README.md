# WMS Twin — backend Go sobre PrismaTec-Core

Este módulo es un gemelo operativo independiente del backend Flask original. Mantengo Flask y los frontends sin cambios: el gemelo se valida en paralelo y no debe recibir tráfico de producción hasta demostrar paridad funcional, seguridad y recuperación.

## Rama canónica

`feat/wms-prismatec-genesis` concentra el gemelo (incluye el cierre de `fix/wms-twin-operational-completion`).

Simultáneo Flask+gemelo y veredicto de sustitución: `docs/SIMULTANEO_Y_PARIDAD.md`.

## Estado de esta rama

La rama `fix/wms-twin-operational-completion` concentra el cierre funcional previo a las pruebas reales.

- **POS:** checkout persistente e idempotente, conciliación de tenders, descuento/reserva de inventario, dispatch telefónico, refunds parciales con reposición de stock y control de cantidades/importes acumulados.
- **Fulfillment/Dockd:** envío persistido y void recuperable. Si el envío corresponde a una venta POS, el void revierte inventario con operation IDs deterministas.
- **RMA:** recepción por línea, disposición RESTOCK/SCRAP/HOLD, restock idempotente, finalización condicionada y compensación al cancelar.
- **Inbound:** idempotencia por source_system/resource/external_id/external_version y mapping de campos soportados de items, sales orders y purchase orders.
- **Webhooks:** outbox persistente, worker, backoff, DLQ/retry manual, cifrado AES-256-GCM de secretos y controles SSRF.
- **Snapshots:** exportaciones persistentes con SHA-256, verificación y restore con expected version y backup previo.
- **Events/audit:** publicación pendiente recuperable y verificación de la cadena de auditoría.
- **Mesh:** Kademlia DHT y GossipSub reales cuando PrismaTec-Core usa LibP2PTransport; TCP/local conserva el fallback peer-table + TTL fan-out.

Esto describe el código de la rama, no una aprobación de producción. El CI de este último corte debe terminar antes de empezar la validación funcional real.

## Límites conocidos antes de las pruebas reales

1. No hay integración con un procesador de pagos: el servicio conserva tenders y referencias externas, pero autorización/captura/reembolso los ejecuta el gateway POS.
2. Inbound rechaza una external_version diferente de la ya aplicada. Falta definir el contrato de supersession/PATCH por recurso para no sobrescribir estados WMS sin reglas del ERP.
3. Webhooks ofrecen entrega **at-least-once**. No hay lease distribuido ni exactly-once entre varios nodos; operar un único worker hasta implementar coordinación HA.
4. El mesh dispone de DHT/GossipSub en transporte libp2p, pero falta validar bootstrap de red real, particiones, failover, confianza de peers y providers CID a escala.
5. La consistencia del ledger/CoreStore sigue siendo local al organismo y no constituye quorum ni transacción distribuida multinodo.
6. La paridad diferencial completa Flask-Go y la migración gradual de tráfico siguen pendientes.

## Requisitos y arranque local

- Go 1.25 o superior.
- Acceso al proxy de módulos durante la primera descarga.
- JWT secret de al menos 32 caracteres.
- Identidades importadas o bootstrap demo explícito.

Para una demo local aislada:

```bash
cd wms-twin
export WMS_TWIN_DATA_DIR="$HOME/.local/share/smart-wms-twin-demo"
export WMS_TWIN_NODE_NAME="wms-demo"
export WMS_TWIN_HTTP_ADDR=":5001"
export WMS_TWIN_AIP_ADDR=":8081"
export WMS_TWIN_API_TOKEN="$(openssl rand -hex 32)"
export JWT_SECRET="$(openssl rand -hex 32)"
export WMS_TWIN_ALLOW_DEMO_BOOTSTRAP=true
go mod download
go mod verify
go test ./... -count=1
go vet ./...
go test -race ./... -count=1
go run ./cmd/wms-twin
```

El opt-in de demo crea `operator / Operator123` y `admin / Admin1234`. Solo usar en una instalación local aislada. En una instalación compartida debo importar identidades mediante `WMS_TWIN_BOOTSTRAP_USERS_FILE` y no activar el bootstrap demo.

WMS escucha en `:5001` y AIP en `:8081`. Health:

```bash
curl -i http://127.0.0.1:5001/api/health
```

## Configuración adicional

### Mesh libp2p

Para habilitar Kademlia/GossipSub sobre el transporte real de PrismaTec-Core:

```bash
export PRISMATEC_TRANSPORT=libp2p
export PRISMATEC_NETWORK_ADDR="/ip4/0.0.0.0/tcp/4001"
```

La API de estado del mesh debe informar `kademlia_ready=true` y `gossipsub_ready=true`. Si se usa TCP/local, la capa reportada es `peer-table+ttl-fanout`, no Kademlia.

### Webhooks

Para crear suscripciones se requiere una clave AES de 32 bytes codificada en Base64:

```bash
export WMS_WEBHOOK_ENCRYPTION_KEY="$(openssl rand -base64 32)"
```

Mantener la misma clave entre reinicios y respaldarla fuera del organismo. Si se pierde, los secretos cifrados existentes no podrán descifrarse.

## Demo de equipo

- Panel: `demo/index.html` servido con `python3 -m http.server 8765`.
- Script: `scripts/demo-flow.sh`.
- Guía: `docs/DEMO_EQUIPO.md`.

## Documentación de arquitectura y contratos

Leer en este orden:

1. `../Guia.md`
2. `../EstructuraBackendGo.md`
3. `../NivelDeParidadConBackendOriginal.md`
4. `../AUDITORIA_GEMELO.md`
5. `docs/CONTRATO_FRONTEND.md`
6. `docs/PARIDAD_OPERATIVA.md`
7. `docs/MAPA_RUTAS_ORIGINAL.md`
8. `docs/INVENTORY_LEDGER.md`

## Frontera protegida

No modifico el backend Flask, los frontends ni los cuatro artefactos existentes en la raíz. La documentación de esta rama describe solo el gemelo Go y sus límites. No se debe declarar paridad ni sustituir el backend original por la mera existencia de endpoints o tests unitarios.
