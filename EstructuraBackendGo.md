# Estructura del backend Go gemelo

## Decisión de arquitectura

Mantengo el backend Flask original sin modificaciones. El nuevo backend vive exclusivamente en `wms-twin/`, como módulo Go independiente. PrismaTec-Core se consume mediante su módulo Go público, fijado a un commit concreto; no copio su código fuente dentro de Smart WMS.

## Dependencia Core verificada

Repositorio: `github.com/yecharlot/PrismaTec-Core`. El módulo declara `go 1.25.0`. La API pública inspeccionada incluye:

- `core.NewNode(core.Config)` y ciclo de vida `Node.Start/Stop`.
- Identidad persistente NodeID y PeerID de transporte diferenciados.
- `Node.Organisms()` con `Create`, `Start`, `Get`, `List`, `AppendEpisode` y `GetBlock`.
- `organism.Manager.AppendEpisode` almacena el contenido en el block store CID local y asocia el CID al episodio.
- `api/aip.Server.Handler()` expone AIP v1, health, organismos, memoria/comandos, pulses y auditoría.
- `network.Transport` permite mensajes directos TCP/libp2p y la configuración del nodo acepta peers explícitos.
- `runtime/mind` y `runtime/zyrion` proporcionan el ciclo cognitivo y la lógica ternaria; Mind propone, Core policy autoriza.

El commit Core fijado en `go.mod` es `84e9f40cbcc0fd0176c1d9057b20f099db2e7f5b`.

## Límites verificados de la revisión Core

No confundo una interfaz declarada con una función desplegada:

1. **DHT/GossipSub:** el documento Core `docs/NETWORK_LIBP2P.md` deja Kademlia DHT y GossipSub como trabajo futuro. La revisión fijada no los expone como servicios activos.
2. **Replicación de contenido:** `replication.Snapshot` contiene el organismo, su memoria y episodios; no contiene los bytes del block store. `AppendEpisode` guarda el contenido CID localmente. Por tanto, un nodo remoto puede recibir el episodio y no tener el bloque. La replicación WMS de registros aún no está completa.
3. **CID:** el almacenamiento local usa por defecto `cid1:` + SHA-256. Existe un método para CIDv1 IPFS, pero no equivale a una red IPFS, pinning ni distribución de bloques.
4. **RootCID:** se deriva del manifiesto del organismo; no es un hash mutable del estado operativo.
5. **Failover:** Core registra epoch y fencing, pero su documento de autoridad reconoce que la promoción por ausencia de peer es liveness-oriented, no quorum seguro ante partición de dos nodos.
6. **Auditoría:** Core mantiene JSONL local y buffer; eso no sustituye por sí solo el hash-chain SHA-256 y la semántica de auditoría del WMS original.

Estas brechas son trabajo técnico obligatorio antes de habilitar operación multi-nodo como si fuera consistente.

## Árbol implementado

```
wms-twin/
├── go.mod
├── go.sum
├── README.md
├── cmd/wms-twin/main.go
├── internal/
│   ├── runtime/runtime.go
│   ├── corestore/store.go
│   ├── corestore/store_test.go
│   ├── domain/inventory/
│   │   ├── inventory.go
│   │   └── inventory_test.go
│   └── httpapi/
│       ├── server.go
│       └── server_test.go
└── docs/
    ├── CONTRATO_FRONTEND.md
    └── MAPA_RUTAS_ORIGINAL.md
```

### Responsabilidades

- `cmd/wms-twin`: proceso ejecutable, dos listeners HTTP y apagado ordenado.
- `internal/runtime`: bootstrap del nodo Core, AIP y API WMS técnica.
- `internal/corestore`: persistencia de registros como episodios y bloques CID.
- `internal/domain/inventory`: invariantes puras iniciales para disponibilidad, reserva, liberación, ajuste y movimiento.
- `internal/httpapi`: health, información del nodo y API técnica de registros.

## Modelo de persistencia actual

Cada tipo de registro usa un organismo `wms-records-{kind}`. Una escritura agrega un episodio `wms.record.upsert`; el contenido JSON se guarda como bloque CID. Una eliminación agrega un episodio `wms.record.deleted`. La lectura reduce la secuencia de episodios y toma el último estado por ID.

Esta estrategia conserva versiones y utiliza persistencia Core local, pero aún no resuelve transacciones entre varios registros ni sincronización de bloques a otros nodos. No debo conectar operaciones de inventario críticas a este CRUD genérico.

## Seguridad actual y pendiente

La API técnica exige `WMS_TWIN_API_TOKEN` Bearer. No implementa todavía la autenticación de usuario original. No debe publicarse a Internet ni conectarse al frontend original hasta completar JWT/cookies/CSRF, autorización por almacén/rol y auditoría de negocio.

## Próxima estructura objetivo

Cuando empiece a portar operaciones, separaré las capas por organismo/feature:

```
internal/
├── organisms/
│   ├── warehouse/
│   ├── zone/
│   ├── bin/
│   ├── item/
│   ├── inventory/
│   ├── purchase_order/
│   ├── receipt/
│   ├── sales_order/
│   ├── picking/
│   ├── packing/
│   ├── shipment/
│   ├── transfer/
│   ├── cycle_count/
│   ├── user/
│   └── integration/
├── application/
│   ├── auth/
│   ├── masterdata/
│   ├── receiving/
│   ├── fulfillment/
│   ├── inventory/
│   └── replication/
├── compatibility/
│   ├── flask_api/
│   └── dto/
├── adapters/
│   ├── prismatec/
│   ├── http/
│   └── observability/
└── testkit/
    ├── differential/
    └── fixtures/
```

No crearé carpetas vacías solo para aparentar progreso: cada feature debe traer comportamiento, validaciones y pruebas.

## Restricciones de diseño

- No añadir PostgreSQL/SQLite como persistencia paralela del gemelo.
- No copiar PrismaTec-Core ni sus internals.
- No escribir código nuevo en `api/`, `admin/`, `mobile/` o `db/` del backend original.
- Mantener identidad del nodo, identidad del usuario y PeerID como conceptos distintos.
- La conclusión de Mind no es autorización: las operaciones deben pasar por policy/capacidad y validaciones de dominio.
- No declarar Kademlia, GossipSub, replicación de bloques, quorum o IPFS de red como capacidades disponibles hasta implementarlas y probarlas.
