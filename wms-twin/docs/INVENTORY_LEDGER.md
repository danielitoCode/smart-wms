# Ledger de inventario sobre PrismaTec-Core

## Propósito

Implementé este agregado como primer corte de negocio persistente del gemelo. Demuestra cómo aplico invariantes de inventario y guardo una mutación usando organismos, memoria episódica y bloques CID de PrismaTec-Core, sin añadir una base SQL paralela.

No reemplaza el inventario Flask.

## Contrato HTTP técnico

Todas las rutas requieren `Authorization: Bearer <WMS_TWIN_API_TOKEN>`.

### Consultar balances

`GET /api/twin/inventory/balances`

Devuelve `version`, `balances` y `total`. Cada balance contiene `warehouse_id`, `bin_id`, `item_id`, `lot_number`, `quantity_on_hand` y `quantity_allocated`.

### Ajustar existencia

`POST /api/twin/inventory/adjust`

```json
{
  "operation_id": "adjustment-0001",
  "warehouse_id": 1,
  "bin_id": 10,
  "item_id": 25,
  "lot_number": "LOT-A",
  "delta": 12
}
```

### Reservar o liberar

`POST /api/twin/inventory/allocate` y `POST /api/twin/inventory/release`

```json
{
  "operation_id": "reservation-0001",
  "warehouse_id": 1,
  "bin_id": 10,
  "item_id": 25,
  "lot_number": "LOT-A",
  "quantity": 3
}
```

### Mover entre ubicaciones

`POST /api/twin/inventory/move`

```json
{
  "operation_id": "move-0001",
  "source": {
    "warehouse_id": 1,
    "bin_id": 10,
    "item_id": 25,
    "lot_number": "LOT-A"
  },
  "destination": {
    "warehouse_id": 2,
    "bin_id": 20,
    "item_id": 25,
    "lot_number": "LOT-A"
  },
  "quantity": 2
}
```

El cliente solo identifica origen y destino. El servidor carga las cantidades reales desde el ledger; no confía en un balance enviado por el cliente.

## Consistencia e idempotencia

Mantengo un registro canónico `inventory-ledger/global` que se convierte en organismo `wms.inventory-ledger.global`. Cada comando:
1. valida el identificador de operación;
2. calcula una huella SHA-256 del comando;
3. lee la última proyección persistida;
4. comprueba si el ID ya fue procesado;
5. aplica las reglas puras del dominio;
6. actualiza los balances afectados;
7. incrementa la versión;
8. agrega un único episodio con `corestore.Store.Put`.

Repetir el mismo `operation_id` y contenido devuelve el resultado original. Reutilizarlo con otro contenido produce conflicto. Si el primer commit local quedó pendiente de replicación, el replay idempotente llama a `Store.Sync` para reintentar la sincronización sin volver a aplicar el movimiento. Un movimiento actualiza ambos balances dentro del mismo documento persistido.

## Límites que no oculto

- El mutex serializa llamadas dentro de una instancia del proceso.
- Dos procesos/nodos con copias distintas no comparten el mutex.
- El snapshot nativo Core no transfiere bytes de bloques CID; el adaptador WMS ya los envía por separado, con firma Ed25519 y ACK antes del snapshot.
- El protocolo WMS está probado con LocalTransport, pero faltan pruebas TCP/libp2p multi-proceso.
- La replicación no es un commit distribuido ni quorum; no habilita failover seguro ante particiones.
- DHT/GossipSub quedan como trabajo futuro en la revisión Core.
- No hay compactación del historial ni expiración de idempotency keys.
- El ledger no integra todavía SalesOrder/Picking ni eventos/outbox WMS.
- No implementa la ruta Flask `/api/transfers/move` ni JWT original.

No autorizo usarlo como fuente de stock multi-nodo en producción. La transferencia autenticada de bloques CID ya está implementada y pasó la prueba LocalTransport. Antes necesito autoridad por partición, fencing monotónico aplicado a cada comando, quorum, reconciliación y pruebas TCP/libp2p de partición/dual-primary.

## Pruebas

```bash
go test ./internal/application/inventoryledger -v
go test -race -count=1 ./internal/application/inventoryledger
go test ./internal/httpapi -v
```

Se añadieron pruebas para ajuste/reserva/liberación, idempotencia, movimiento, persistencia tras reconstruir el nodo Core, concurrencia dentro de un proceso, HTTP y reintento de replicación pendiente mediante replay idempotente.


## Evidencia automatizada

La ejecución `42893176180` validó el corte anterior. En `42895311390` pasaron inventoryledger, corestore, domain/inventory, replication y runtime; httpapi falló por aceptación de token sin esquema Bearer. El middleware ya está corregido y la suite queda pendiente de repetición.
