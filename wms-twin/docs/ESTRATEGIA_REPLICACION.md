# Estrategia de replicación WMS sobre PrismaTec-Core

## Problema

La revisión Core fija replication.Snapshot con organismo, placement, versión y timestamp, pero no bytes de bloques CID. Un snapshot aislado puede dejar episodios con referencias a bloques ausentes.

## Protocolo WMS

1. El primario actualiza el conjunto explícito de réplicas.
2. Lee todos los bloques CID referenciados por episodios.
3. Firma cada mensaje con Ed25519 de la identidad persistente.
4. Envía wms.replication.block y espera ACK firmado.
5. El peer verifica allowlist, NodeID, timestamp, firma, tamaño y CID calculado; almacena el bloque.
6. Tras recibir ACK de todos los bloques, envía wms.replication.snapshot.
7. El peer verifica que los bloques existen, valida Primary/epoch/seq y adopta el organismo como réplica fría.
8. Devuelve ACK firmado del snapshot.

El NodeID contiene la clave pública Ed25519 en base64url. No lo confundo con PeerID ni RootCID.

## Autoridad

Cada organismo tiene Placement.Primary. Solo el NodeID primario puede hacer Put/Delete. El peer receptor permanece Ready; los intentos de escritura desde la réplica devuelven ErrNotPrimary. La promoción debe incrementar epoch y respetar fencing.

## Límites

- Peers explícitos; no hay Kademlia ni GossipSub en la revisión Core fijada.
- No hay quorum/consenso. No habilito failover automático ante partición.
- Se reenvían todos los bloques históricos en cada sync; falta incremental/compactación.
- La firma autentica mensajes; TCP no cifra. Para redes no confiables, usar libp2p Noise.
- Una operación local se confirma antes de replicar. Si falla un peer, la API responde 503 con local_commit=true; el registro existe localmente y el cliente debe reintentar con el mismo ID.

## Prueba

TestAuthenticatedReplicationTransfersCIDAndFencesReplicaWrites comprueba con dos nodos Core y LocalTransport:
- transferencia de CID antes del snapshot;
- integridad y preservación de RootCID/ContentCID;
- rechazo de escritura en réplica;
- propagación de tombstone.

Pendiente: pruebas TCP multi-proceso, desconexión/reconexión, firma inválida, CID corrupto, epoch viejo y peer no autorizado.
