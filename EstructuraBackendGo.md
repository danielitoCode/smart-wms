# Estructura del backend Go gemelo

## Decisión de arquitectura

Mantengo el backend Flask original sin modificaciones. El nuevo backend vive exclusivamente en `wms-twin/`, como módulo Go independiente. PrismaTec-Core se consume mediante su módulo Go público, fijado a un commit concreto; no copio su código fuente dentro de Smart WMS.

## Dependencia Core verificada

Repositorio: `github.com/yecharlot/PrismaTec-Core`. El módulo declara `go 1.25.0`. La API pública inspeccionada incluye:

- `core.NewNode(core.Config)` y ciclo de vida `Node.Start/Stop`.
- Identidad persistente NodeID y PeerID de transporte diferenciados.
- `Node.Organisms()` con `Create`, `Start`, `Get`, `List`, `AppendEpisode` y `GetBlock`.
- `organism.Manager.AppendEpisode` almacena el contenido en el block store CID y asocia el CID al episodio.
- `api/aip.Server.Handler()` expone AIP v1, health, organismos, memoria/comandos, pulses y auditoría.
- Transporte TCP/libp2p se activa desde la configuración del nodo.

El commit Core fijado en `go.mod` es `84e9f40cbcc0fd0176c1d9057b20f099db2e7f5b`. No considero que esto demuestre por sí solo disponibilidad de Kademlia/GossipSub: no aparecen en la superficie de transporte que se integró en este corte. No habilito esas capacidades por inferencia.

## Árbol implementado

```
wms-twin/
├── go.mod
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
└── docs/CONTRATO_FRONTEND.md
```

### Responsabilidades

- `cmd/wms-twin`: proceso ejecutable y apagado ordenado.
- `internal/runtime`: bootstrap del nodo Core, AIP y API WMS técnica.
- `internal/corestore`: persistencia de registros como episodios y bloques CID.
- `internal/domain/inventory`: invariantes puras iniciales para disponibilidad, reserva, liberación y movimiento.
- `internal/httpapi`: health, información del nodo y API técnica de registros.

## Modelo de persistencia

Cada tipo de registro usa un organismo `wms-records-{kind}`. Una escritura agrega un episodio `wms.record.upsert`; el contenido JSON se guarda como bloque CID. Una eliminación agrega un episodio `wms.record.deleted`. La lectura reduce la secuencia de episodios y toma el último estado por ID.

Esta estrategia conserva versiones y utiliza persistencia Core, pero aún no resuelve transacciones entre varios organismos ni autoridad distribuida de inventario. Para inventario real debo crear un agregado que serialice mutaciones, exija idempotency key y verifique autoridad/epoch antes de confirmar.

## Seguridad actual y pendiente

La API técnica exige `WMS_TWIN_API_TOKEN` Bearer. No implementa todavía la autenticación de usuario original. No debe publicarse a Internet ni conectarse al frontend original hasta completar JWT/cookies/CSRF, autorización por almacén/rol y auditoría de negocio.

## Restricciones de diseño

- No añadir PostgreSQL/SQLite como persistencia paralela del gemelo.
- No copiar PrismaTec-Core ni sus internals.
- No mezclar el código Go con `api/`, `admin/`, `mobile/` o `db/` originales.
- Mantener identidad del nodo, identidad del usuario y PeerID como conceptos distintos.
- La conclusión de Mind no es autorización: las operaciones deben pasar por política/capacidad y validaciones de dominio.
