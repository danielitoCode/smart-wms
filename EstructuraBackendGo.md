# Estructura del backend Go gemelo

## Decisión

Mantengo el backend Flask original sin modificaciones. El gemelo vive exclusivamente en `wms-twin/` como módulo Go independiente. PrismaTec-Core se consume como dependencia externa fijada a un commit concreto; no copio ni vendo su código fuente dentro de Smart WMS.

## Dependencia Core verificada

Repositorio: `github.com/yecharlot/PrismaTec-Core`. El módulo declara Go 1.25.0. El commit fijado en `go.mod` es `84e9f40cbcc0fd0176c1d9057b20f099db2e7f5b`.

La API pública inspeccionada incluye `core.NewNode`, ciclo de vida Node.Start/Stop, identidad NodeID/PeerID, Manager de organismos, memoria episódica, lectura de bloques CID, AIP v1 y transporte TCP/libp2p. Core también expone runtime Mind/Zyrion, pero su resultado no sustituye autorización ni policy.

## Límites verificados

1. Kademlia DHT y GossipSub quedan como trabajo futuro en la documentación Core revisada; no los declaro activos.
2. Los snapshots de replicación contienen el organismo/episodios, pero no transfieren los bytes de los bloques CID.
3. El block store por defecto usa `cid1:` SHA-256 local. El método IPFS CIDv1 no equivale a una red IPFS ni a pinning distribuido.
4. RootCID deriva del manifiesto; no cambia con cada versión operativa.
5. El failover Core no es quorum seguro ante particiones de dos nodos.
6. El audit JSONL Core no sustituye automáticamente la cadena hash y la semántica de auditoría WMS.

## Árbol implementado

```text
wms-twin/
├── go.mod
├── go.sum
├── README.md
├── cmd/wms-twin/main.go
├── docs/
│   ├── CONTRATO_FRONTEND.md
│   ├── MAPA_RUTAS_ORIGINAL.md
│   └── INVENTORY_LEDGER.md
└── internal/
    ├── application/
    │   └── inventoryledger/       # casos de uso, idempotencia y proyección
    ├── corestore/                 # organismo por registro, episodios y CID
    ├── domain/inventory/          # invariantes puras de stock
    ├── httpapi/                   # health, API técnica y ledger
    └── runtime/                   # bootstrap Core y listeners separados
```

## Persistencia por organismo

Cada registro tiene un organismo `wms.{kind}.{id}`. Una escritura agrega un episodio `wms.record.upsert`; el contenido JSON se guarda en un bloque CID. Una eliminación agrega un episodio `wms.record.deleted`. RootCID identifica el manifiesto del organismo y ContentCID identifica el contenido de una versión.

El ledger actual de inventario usa un registro dedicado `wms.inventory-ledger.global` y guarda la proyección completa de balances e idempotency records en un único append por operación. Esto evita escrituras parciales entre dos bins dentro de una instancia, pero no es una transacción distribuida.

## Flujo del ledger

```text
HTTP Bearer
    -> httpapi.inventory
    -> application/inventoryledger
       -> valida operación e idempotency key
       -> carga proyección
       -> aplica invariantes del dominio
       -> serializa dentro del proceso
    -> corestore.Store.Put
    -> PrismaTec organism / episodic memory / local CID block
```

## Agregados objetivo

Catálogo: Warehouse, Zone, Bin, Item, Vendor, PreferredBin.
Existencias: InventoryBalance, Reservation, Adjustment, CycleCount, Transfer.
Entrada: PurchaseOrder, Receipt, PutawayTask.
Salida: SalesOrder, Allocation, PickBatch, Pack, Shipment.
Postventa: Return/RMA, Refund, Backorder.
Seguridad: User, Role, PagePermission, WarehouseGrant, WMS API Token.
Integraciones: Connector, Mapping, EventSubscription, ConsumerGroup, Delivery, SnapshotCursor, Webhook.

No creo carpetas vacías para aparentar avance. Cada feature debe incluir comportamiento, validaciones, pruebas y documentación.

## Identidades y autoridad

NodeID identifica el nodo Core; PeerID identifica transporte; RootCID identifica manifiesto/contenido; Epoch identifica generación de autoridad. No son intercambiables.

La serialización actual del ledger es por proceso. Para varios escritores necesito autoridad por partición, fencing comprobado en cada escritura, transferencia de liderazgo, sincronización autenticada de bloques y reconciliación. La detección de peers o difusión de eventos no resuelve conflictos de inventario.

## Seguridad y compatibilidad

La API técnica usa un Bearer independiente. No implementa JWT HS256, cookies `sentry_auth`/ `sentry_csrf`, CSRF doble submit, lockout, revocación, roles, permisos por página ni warehouse scopes. No la publico a redes no confiables ni conecto el frontend original hasta cerrar estos contratos.

## Pruebas y handoff

CI debe ejecutar tidy diff, checksum, gofmt, vet y race tests. Los tests del ledger cubren invariantes, idempotencia, movimiento de dos ubicaciones, reinicio y concurrencia local. No demuestran failover ni paridad Flask. El siguiente agente debe leer Guia, Paridad, Auditoría, el mapa de rutas y el contrato frontend antes de tocar código.
