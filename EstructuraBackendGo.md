# Estructura del backend Go gemelo

## Decisión

Mantengo Flask y sus archivos originales intactos. El gemelo es un módulo Go independiente en `wms-twin/`. PrismaTec-Core se consume como dependencia Go externa fijada a un commit; su código no se copia ni se vendea.

## Core verificado

Módulo `github.com/yecharlot/PrismaTec-Core`, Go 1.25.0. Superficie pública inspeccionada: `core.NewNode`, `Node.Start/Stop`, Manager de organismos (`Create/Start/Stop/Get/List/AppendEpisode/GetBlock/SetReplicas/Adopt`), AIP HTTP/SSE y block store CID. TCP/libp2p se configura en el nodo. No infiero Kademlia/GossipSub ni garantías de consenso que no estén probadas en el código y tests revisados.

## Árbol actual

```
wms-twin/
├── go.mod
├── README.md
├── cmd/wms-twin/main.go
├── docs/
│   ├── CONTRATO_FRONTEND.md
│   └── MAPA_RUTAS_BACKEND_ORIGINAL.md
└── internal/
    ├── corestore/             # episodios + bloques CID
    ├── domain/inventory/      # invariantes puras de balance
    ├── httpapi/               # health + API técnica Bearer
    └── runtime/               # bootstrap Core + handlers separados
```

## Topología

```
Admin/Mobile -> reverse proxy -> Flask :5000 (actual)
                              -> WMS Twin :5001 (solo tras paridad)
WMS Twin :5001 -> /api/health, /api/twin/*
PrismaTec AIP :8081 -> /healthz, /aip/v1/*
```

Los listeners WMS y AIP están separados en el mismo proceso. Cada nodo debe tener su propio DataDir e identidad.

## Persistencia actual y límites

Cada colección genérica usa organismo `wms-records-{kind}`; cada upsert agrega un episodio y guarda el JSON como bloque CID. Delete agrega tombstone. List reduce el historial y recupera el bloque CID. Esto preserva versiones pero el historial crece, las lecturas cuestan O(n) en episodios y no hay transacción multi-organismo. No es todavía la persistencia final del inventario crítico.

## Modelo objetivo

Organismos/agregados por dominio:
- Warehouse, Zone, Bin, Item, Vendor.
- InventoryBalance, Reservation, Adjustment, CycleCount.
- PurchaseOrder, Receipt, PutawayTask, SalesOrder, PickBatch, Pack, Shipment, TransferOrder, RMA.
- User, Role, PagePermission, WarehouseGrant, WMS API Token.
- Connector, Mapping, EventSubscription, ConsumerGroup, Delivery, SnapshotCursor.

No concentrar todo en un organismo global. Definir límites de consistencia, idempotency keys y autoridad por partición. Las operaciones entre agregados requieren saga/outbox persistido; no prometer atomicidad distribuida si Core no la proporciona.

## Identidades y distribución

NodeID = nodo; PeerID = transporte; RootCID = manifiesto/contenido; Epoch = generación de autoridad. No son intercambiables. Para inventario, cada escritura debe validar autoridad y fencing. Con dos nodos aislados no se promete disponibilidad y seguridad simultáneas; failover particionado exige quorum/witness o fail-closed.

## Seguridad

API técnica con Bearer independiente. Pendientes: JWT HS256 compatible, cookies `sentry_auth`, CSRF `sentry_csrf`, roles, page permissions, warehouse scopes y WMS token scopes. No exponer el listener a redes no confiables. Mind/Zyrion puede razonar, pero no sustituye policy/capability ni autorización.

## Pruebas y handoff

CI ejecuta dependencias, formato, vet y tests con race detector. El script local `scripts/safe-update-wms-twin.sh` valida la punta remota en worktree temporal antes del fast-forward. En cada commit actualizo Guía, Estructura, Paridad y Auditoría.
