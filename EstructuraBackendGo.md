# Estructura del backend Go gemelo

## Decisión

Mantengo el backend Flask original sin modificaciones. El gemelo vive exclusivamente en `wms-twin/` como módulo Go independiente. PrismaTec-Core se consume como dependencia externa fijada a un commit concreto; no copio ni vendo su código fuente dentro de Smart WMS.

## Dependencia Core verificada

Repositorio: `github.com/yecharlot/PrismaTec-Core`. El módulo declara Go 1.25.0. El commit fijado en `go.mod` es `84e9f40cbcc0fd0176c1d9057b20f099db2e7f5b`.

La API pública inspeccionada incluye `core.NewNode`, ciclo de vida Node.Start/Stop, identidad NodeID/PeerID, Manager de organismos, memoria episódica, lectura de bloques CID, AIP v1 y transporte TCP/libp2p. Core también expone runtime Mind/Zyrion, pero su resultado no sustituye autorización ni policy.

## Límites verificados

1. Kademlia DHT y GossipSub quedan como trabajo futuro en la documentación Core revisada; no los declaro activos.
2. El snapshot nativo Core no transfiere bytes CID; el adaptador WMS ya transfiere bloques firmados, espera ACK y después adopta el snapshot. Está probado con LocalTransport; falta TCP/libp2p multi-proceso.
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
    ├── replication/               # bloques CID + snapshots WMS firmados y ACK
    └── runtime/                   # bootstrap Core, peers y listeners separados
```

## Persistencia por organismo

Cada registro tiene un organismo `wms.{kind}.{id}`. Una escritura agrega un episodio `wms.record.upsert`; el contenido JSON se guarda en un bloque CID. Una eliminación agrega un episodio `wms.record.deleted`. RootCID identifica el manifiesto del organismo y ContentCID identifica el contenido de una versión.

El ledger actual de inventario usa un registro dedicado `wms.inventory-ledger.global` y guarda la proyección completa de balances e idempotency records en un único append por operación. El replay de una operación idempotente intenta completar la replicación pendiente sin duplicar la mutación. Esto evita escrituras parciales entre dos bins dentro de una instancia, pero no es una transacción distribuida.

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
    -> PrismaTec organism / episodic memory / CID block
    -> replicator: bloque firmado + ACK -> snapshot firmado + ACK
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


## Reproducibilidad del módulo

La primera comprobación estricta `go mod tidy -diff` falló en el commit del ledger, por lo que el grafo de dependencias aún no está cerrado. La siguiente ejecución de CI genera temporalmente `go.mod` y `go.sum` canónicos como artefacto para incorporarlos. El objetivo final es que CI solo verifique y nunca reescriba el módulo.


## Estado de validación del commit de inventario

La reconstrucción del grafo de módulos terminó correctamente y `go mod verify` pasó. La primera barrera siguiente detectó archivos Go sin formato; vet y tests quedaron omitidos. La normalización temporal y el artefacto de fuentes sirven para recuperar el formato exacto, pero no sustituyen la publicación de los archivos formateados en Git.


## Grafo de módulos y calidad de código

Incorporé las dependencias indirectas exactas generadas por `go mod tidy` con Go 1.25. El archivo `go.sum` ya estaba completo. También publiqué el formato producido por gofmt. El fallo de vet se debió a un import no utilizado en el test del ledger, ya retirado. El workflow no reescribe lockfiles. Formatea Go en su workspace temporal, ejecuta vet y race tests y, solo si pasan en un evento push, publica un commit exclusivamente de formato. En pull_request no escribe en la rama.


## Evidencia de validación

La ejecución `42893176180` validó el corte anterior del ledger. En la ejecución `42895311390`, formato y vet pasaron; inventoryledger, corestore, domain/inventory, replication y runtime pasaron sus tests. httpapi falló por aceptación de token sin esquema Bearer; ya estoy corrigiendo el middleware. La paridad Flask sigue sin demostrarse.


## Seguridad: primitivas y frontera de fase 02

Añadí `internal/security/auth` para implementar HS256, CSRF double-submit y política de password. Este paquete no lee ni autoriza usuarios: el siguiente paso es conectarlo a un repositorio de identidades Core-backed y al middleware HTTP. El contrato completo, decisiones y criterios de aceptación están en `wms-twin/docs/FASE_02_SEGURIDAD.md`. No confundo las primitivas criptográficas con autenticación terminada.


## Repositorio de identidad Core-backed

Añadí `internal/application/identity`. Cada usuario se guarda como organismo `wms.users.{user_id}`, con hash bcrypt y estado versionado en episodios/CID. El repositorio conserva username, nombre, rol, warehouse_id/warehouse_ids, allowed_functions, page grants, overrides, actividad, timestamps y forced password change. El DTO público excluye el hash. La unicidad y asignación secuencial se serializan dentro del primario local; no las presento como coordinación multi-nodo. Login HTTP y middleware aún no están conectados.


## Evidencia CI — repositorio de identidad

La ejecución `42897626723` sobre el commit `d8c2c02e17c667620cccdf6dcb017a83f33e575c` terminó en success. Pasaron `go mod tidy -diff`, `go mod verify`, gofmt, `go vet ./...` y `go test -race -count=1 ./...`; el guard documental y de alcance también pasó. El workflow publicó el commit de formato `e0d2e20dea760ad99f71c1376d97a4896f28c284`. Esta evidencia valida las pruebas del repositorio de identidad y las primitivas, no los endpoints HTTP ni la paridad del WMS.


## Autenticación HTTP y runtime

El HTTP server incorpora `internal/httpapi/auth.go` para login/logout/me/refresh/change-password, JWT, cookies, CSRF, forced-change, lockout persistente y wrappers de autorización. `RequireAuth` refresca rol, estado y warehouse grants desde el repositorio Core en cada petición; `RequirePagePermission` aplica los grants de página. El runtime lee `JWT_SECRET` y puede importar identidades desde `WMS_TWIN_BOOTSTRAP_USERS_FILE`, solo si el repositorio está vacío y el archivo tiene permisos 0600 o más restrictivos.

Los endpoints de negocio aún no están migrados ni envueltos con estas protecciones. La autenticación está conectada al contrato HTTP, no equivale a paridad global.


## Bootstrap reanudable y coste bcrypt

La importación de identidades ahora es idempotente: omite IDs ya persistidos, no sobrescribe usuarios existentes, rechaza colisiones de username y añade los faltantes. Esto permite reanudar después de una importación parcial. El runtime procesa el archivo configurado en cada arranque, pero solo añade identidades que aún no existen. Hashes nuevos usan bcrypt cost 12 para igualar el default del backend original.
