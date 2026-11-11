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


## Evidencia CI — autenticación HTTP y bootstrap

La ejecución `42899616129` de WMS twin validation terminó en success sobre `5d8d334bb24dc21bf2609f8c8089092297563de8`. Pasaron guard de alcance/documentación, tidy diff, module verify, gofmt, vet y race tests. El commit de formato quedó en `2720ed7d70fb69e46422c3338dc354f15d30cc3a`.

La auditoría global de dependencias `42899616007` falla por auditorías npm (admin/mobile) y pip (backend Python), separadas del gemelo Go. La suite general del repo estaba aún en curso al documentar.


## Fase 03 — paquete de catálogo

Añadí `internal/application/catalog` con repositorio Core-backed para `warehouses`, `zones` y `bins`. Cada entidad se almacena como un organismo independiente mediante `corestore.Store`; el repositorio asigna IDs enteros y conserva una secuencia separada para no reutilizar identificadores eliminados. La secuencia se persiste antes que el registro, por lo que un fallo puede dejar un hueco, pero no una colisión por reutilización.

Las reglas de dominio cubren:
- Código de warehouse único.
- Código de zone único dentro del warehouse y tipo permitido: RECEIVING, STORAGE, PICKING, STAGING o SHIPPING.
- Código de bin único dentro del warehouse, barcode único, tipo permitido: Staging, PickableStaging o Pickable.
- Relación zone→warehouse y bin→zone/warehouse coherente.
- Borrado bloqueado por dependencias: zonas/bins/stock.

El repositorio serializa sus operaciones dentro del proceso. Esto no constituye exclusión distribuida ni una transacción atómica multi-organismo. La replicación conserva el comportamiento CoreStore: un fallo de réplica puede informar `local_commit=true`.


## Evidencia de validación de Fase 03

La ejecución WMS twin validation `42974486856` terminó en success para `bb645444a830cee3b244a3f9d576b4d2b9e3433c`. Pasaron guard documental/de alcance, module verify, gofmt, vet y race tests. CI publicó formato en `ccf1934b2640feb45df852d515316be73d408de1`. La suite general `42974487059` seguía en curso.


## Fase 04 — catálogo extendido

Extendí `internal/application/catalog`:
- `Item`: SKU/UPC únicos, atributos, estado, ubicación predeterminada, búsqueda y secuencia entera.
- `PreferredBin`: agregado único `preferred-bins/global`, upsert por item+bin, solo bin Pickable y resecuencia contigua 1..K sin empates.
- `Vendor`: UUID canónico/externo, contactos, direcciones, datos fiscales, términos de pago y estado activo.

La lista de artículos prioriza el preferred bin con prioridad 1 y cae al `default_bin_id` si no existe. La lista de proveedores admite búsqueda por nombre/contacto/email, estado y paginación.

La persistencia de preferred bins en un agregado permite que la reasignación de prioridad sea un solo append Core. No la confundo con una transacción distribuida; la exclusión sigue siendo local al proceso.


## Evidencia CI — catálogo extendido

La ejecución `42975654846` de WMS twin validation terminó en success para `c32d3bed1ca754c681e19412d5c6614182ff1729`. Pasaron module verify, gofmt, vet, race tests y guard de documentación/alcance. El formato final quedó en `6b7d821277b29baf1754f3aa2038a1a85bf33a2d`. La suite general del repositorio `42975655011` seguía en curso.


## Fase 05 — agregado de compras

Añadí `internal/application/purchaseorders`. Cada PO y sus líneas se persisten en un solo organismo `purchase-orders.{id}`. Reservo IDs en organismos de secuencia separados; una falla puede dejar huecos, pero no reutilizar IDs. El estado de cada línea se deriva de ordered/received; el header se recalcula OPEN/PARTIAL/RECEIVED. CLOSED y ARCHIVED bloquean edición de header/líneas; ARCHIVED solo se permite desde CLOSED. Reopen solo acepta CLOSED.

La capa HTTP conserva el prefijo `/api/admin`, JWT/page permission y warehouse scope. La lectura de detalle enriquece cada línea con el artículo del catálogo.



## Endurecimiento de los módulos de integración

En la rama `fix/wms-twin-operational-completion` mantuve la frontera: todo el código nuevo permanece bajo `wms-twin/`; no alteré Flask ni los frontends.

- `application/inbound` recibe el repositorio `purchaseorders.Repository` y crea el agregado PO real con validación de warehouse, artículos, cantidades y duplicados heredada del repositorio.
- `application/dockd` propaga errores de `CompletePack`; `fulfillment.CompletePack` rechaza líneas que no alcanzan la cantidad ordenada. La anulación no se declara exitosa mientras no exista una operación persistente de reversión.
- `application/pos` valida availability por warehouse y SKU y acumula cantidades repetidas del mismo artículo en el carrito. Las operaciones que requieren contratos de pago/inventario todavía incompletos fallan explícitamente; no crean una venta ordinaria disfrazada de checkout.
- `application/rma` mantiene el expediente persistente, pero bloquea el cierre hasta que exista una disposición de inventario identificable.
- `application/snapshot` persiste exportaciones con ID, versión del ledger, warehouse, filas y SHA-256. `Get` recalcula el checksum. No hay restauración del ledger desde el snapshot.
- `application/webhooks` usa un transporte HTTPS sin proxy ni redirects y resuelve/verifica el destino al abrir la conexión, conectando directamente a una IP pública comprobada. El secreto sigue persistido en el organismo sin cifrado en reposo; no oculto esa deuda.
- `application/events` persiste el evento y el estado de publicación, expone `PublishPending` para reintentar publicaciones fallidas. Falta un worker duradero que ejecute esa recuperación automáticamente.
- `application/wmsaudit` verifica toda la cadena (secuencia continua, PrevHash y SHA-256) antes de cada append y bloquea escrituras si encuentra corrupción.
- `application/mesh` sigue siendo una tabla de peers y difusión con TTL sobre el transporte Core. No implementa DHT Kademlia ni GossipSub.

Los tests nuevos cubren la validación de URL/SSRF, persistencia e integridad de snapshots y detección de manipulación del audit chain. La evidencia de CI queda pendiente hasta ejecutar Actions sobre esta rama.


El snapshot ahora conserva los campos numéricos en una estructura tipada `InventoryRow`; evito convertir IDs/cantidades a float64 antes de calcular/verificar SHA-256. Para el outbox de eventos añadí `events.publish` como scope independiente y `POST /api/v1/events/retry-pending`; es un reintento explícito, no un worker automático permanente.


## Contratos añadidos en la fase de cierre funcional

### POS

`application/pos` ahora conserva el registro de venta en `wms_pos_sale` y devoluciones en `wms_pos_refund`. El checkout es una saga: persistencia PREPARING, movimientos ledger idempotentes, creación/recuperación de SO por número determinista y cierre COMPLETED. La lista `AppliedKeys` permite compensar movimientos parciales si falla una mutación. Los pedidos telefónicos reservan stock; el despacho libera la reserva y descuenta on-hand con IDs estables. El refund devuelve stock por el bin original, con control de cantidades acumuladas, tender y ventana de 90 días.

El tender conserva datos mínimos de conciliación, nunca PAN/CVV. La devolución externa se identifica mediante `external_refund_ref`; no hay integración directa con un procesador financiero.

### Fulfillment / Dockd

`application/fulfillment` persiste un shipment por SO en `wms_fulfillment`. El envío conserva `PreShipStatus`, carrier, tracking y fechas. Void usa VOIDING → restauración del estado de la SO y cantidades shipped → VOIDED. `VoidOperationID` y fingerprint impiden que una segunda orden de anulación cambie el motivo o repita el efecto. Si el proceso cae después de guardar la SO, el siguiente intento termina el marcador de shipment.

### RMA

`application/rma` ahora persiste líneas esperadas y recibidas, recepciones y disposiciones. RESTOCK invoca `inventoryledger.Adjust` con operation_id; SCRAP/HOLD no crean disponibilidad. Se rechaza la recepción por encima de la cantidad esperada, el bin fuera del almacén y la finalización con cantidades pendientes.

### Webhooks

`application/webhooks` mantiene `wms_webhook` y `wms_webhook_delivery`. `DeliverEvent` crea una entrada por suscripción con ID derivado de subscription + event_id. `ProcessPending` procesa PENDING/RETRY, actualiza intentos y next_attempt_at, clasifica DEAD y permite RetryDeadDelivery. `Run(ctx)` ejecuta el worker con el ciclo de vida del runtime.

Los secretos nuevos se guardan como AES-GCM nonce+ciphertext bajo `SecretCipher`; el campo legacy `Secret` se migra en el worker. La clave se obtiene de `SENTRY_ENCRYPTION_KEY` o `WMS_WEBHOOK_ENCRYPTION_KEY` (base64, 32 bytes). El transporte conserva el control SSRF existente.

### Snapshots

`snapshot.Restore(id, operationID, expectedVersion)` lee y verifica el snapshot, reconstruye balances tipados y llama a `inventoryledger.RestoreBalances`. La operación sustituye el ledger global o una proyección de warehouse dentro de una escritura del organismo, valida el expected version y es idempotente por operationID. Sigue siendo consistencia local del organismo; no es un CAS distribuido entre nodos.

### Inbound

`WriteRequest.SourceSystem` y los campos external_id/external_version activan el registro `wms_inbound_idempotency`. El fingerprint detecta reutilización de versión con cuerpo distinto; la repetición idéntica devuelve el resultado persistido. Para recuperar el intervalo entre escritura del agregado y escritura del mapa, items se buscan por SKU y SO/PO por número, validando warehouse y líneas. Se admite mapping por warehouse_code y SKU.

Las actualizaciones de una external_version más nueva se rechazan explícitamente: el mapeo de actualización canónica por recurso todavía necesita un contrato PATCH/UPSERT definido con el sistema fuente.

### Mesh

`mesh.Start(ctx)` detecta el Host() de LibP2PTransport. En esa ruta inicia `dht.New(..., dht.ModeServer)`, Bootstrap y `pubsub.NewGossipSub`. Los topics se suscriben y los mensajes recibidos se entregan a handlers con deduplicación local. `FindClosestPeers`, `ProvideCID` y `FindProviders` exponen operaciones DHT. TCP/local mantiene el adapter TTL y no se declara compatible con Kademlia/GossipSub.
