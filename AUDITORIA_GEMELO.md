# Auditoría de modificaciones del backend gemelo

Mantengo una traza cronológica de cada modificación, problema, detonante, causa confirmada o hipótesis, decisión, riesgo y evidencia. No marco como probado lo que no ejecuté. Las entradas anteriores se conservan.

## Formato obligatorio

Cada entrada identifica commit, archivos, detonante, síntoma, causa, corrección, riesgo y pruebas/resultado. Si una validación no se ejecutó o fue cancelada, lo digo expresamente.

### AUD-0001 — Frontera inicial PrismaTec

- **Commit:** `0a47c26be3f805ff24779fb267bbb2d57b3f5aa9`.
- **Cambio:** contratos/adaptadores exploratorios bajo `api/prismatec/`.
- **Detonante:** explorar integración WMS/Core.
- **Problema:** el código quedó dentro del backend Flask y violaba aislamiento físico.
- **Corrección:** retiré solo los archivos agregados por ese commit en `0cccae88c0dd32787d38220d2e3c7532f81373ff`; no eliminé ni modifiqué archivos originales.
- **Decisión:** todo código nuevo vive en `wms-twin/`.

### AUD-0002 — Documentación y workflow iniciales

- **Commits:** `aef763491ddbcd24e6a3e02a78ca6777c2760f21`, `b12ec8179e175ce9eaa5f56caa3cf45d0f7e38e6`, `3d68a171b394cfca522042aaffca1c24d00c5e7c`.
- **Cambio:** guía, estructura, paridad, bitácora y Actions.
- **Resultado:** workflow disponible; required checks y branch protection requieren configuración administrativa.

### AUD-0003 — Primer corte Go/Core

- **Commit:** `f4f4b979b3898901fbd4fe09e1ecb8f687d1ed5c`.
- **Cambio:** runtime Go, nodo Core, AIP, episodios/CID, API técnica Bearer e invariantes puras de inventario.
- **Riesgos:** autenticación y contratos de negocio no implementados; historial sin compactar; sin transacciones multi-organismo ni replicación WMS validada.

### AUD-0004 — Aislamiento físico

- **Commit:** `0cccae88c0dd32787d38220d2e3c7532f81373ff`.
- **Detonante:** separar experimentos Python del backend Flask.
- **Cambio:** eliminé exclusivamente archivos añadidos en AUD-0001.
- **Verificación:** el árbol de la rama ya no contiene `api/prismatec/`.

### AUD-0005 — Separación AIP y reglas de inventario

- **Commit:** `026bad44df23e64faa22d91c844ba4942e4d131b`.
- **Detonante:** AIP compartía handler con WMS y las validaciones de movimiento requerían endurecimiento.
- **Cambio:** dos listeners, JSON limitado a 1 MiB, validación de balance, overflow e item/lote.
- **Resultado CI:** la ejecución `42889670356` falló en gofmt; guard documental pasó.

### AUD-0006 — Formato Go

- **Commits afectados:** `026bad4` y luego `6b0e9e9`.
- **Detonante:** gofmt detectó archivos no formateados y detuvo el job antes de vet/tests.
- **Corrección temporal:** workflow normalizó formato en workspace efímero.
- **Riesgo residual:** publicar siempre fuentes ya formateadas.

### AUD-0007 — Grafo de módulos y go.sum

- **Commit afectado:** `e7e18ba38b1f591659dc2e6ac224fa72cd4d49dc`.
- **Detonante:** faltaban checksums de PrismaTec-Core al ejecutar vet.
- **Corrección:** fijé el módulo y publiqué `wms-twin/go.sum`.
- **Evidencia:** el workflow Go de `ee78910` pasó; un ciclo posterior fue cancelado por una nueva actualización antes de terminar todos sus pasos.

### AUD-0008 — Handoff, inventario de rutas y actualización segura

- **Commits:** cambios publicados hasta `11b5a0fc71e09865bf8643f3ed948147698ba2db`.
- **Detonante:** el equipo necesitaba mapa de rutas, guía de arranque, actualización validada y handoff para agentes.
- **Cambio:** documentación, mapa de rutas y script `scripts/safe-update-wms-twin.sh`.
- **Problema Git:** la rama local ya existía y `git switch --track` falló.
- **Corrección:** `git switch feat/wms-prismatec-genesis`; luego fast-forward tras validar.
- **Limitación:** Actions no intercepta `git pull` local. El script local valida antes de actualizar; branch protection sigue desactivada.

### AUD-0009 — Límite de replicación CID de PrismaTec-Core

- **Detonante:** inspección de `core/replication/replication.go`, `core/node.go`, `network/libp2p.go` y `storage/cid/cid.go`.
- **Hallazgo:** snapshots transportan organismo/episodios, pero no bytes del block store. `AppendEpisode` escribe bloques localmente. Kademlia DHT y GossipSub quedan como trabajo futuro; el CID predeterminado es `cid1:` SHA-256 local.
- **Impacto:** no puedo afirmar que un registro WMS siga siendo legible después de replicar solo su organismo.
- **Decisión:** no declarar replicación WMS hasta implementar transferencia autenticada de bloques y pruebas de recuperación.

### AUD-0010 — Fallos del Dependency Audit original

- **Ejecución:** `42890875478`, asociada al commit `a20ddc56cc75f88efafeddb125c7526c5ff9fdfb`.
- **Hallazgo:** 14 advisories high/critical en admin, 36 en mobile-dev, 32 en mobile; `pip-audit` detectó PyJWT 2.13.0 afectado por `GHSA-pxh4-856f-4h89`. También aparecen undici, node-forge, xmldom, shell-quote, browserslist y brace-expansion.
- **Impacto:** el workflow global Dependency Audit permanece rojo aunque la validación del gemelo pase.
- **Restricción:** no actualizo lockfiles ni código original porque el usuario prohibió modificar backend/frontend originales.

### AUD-0011 — Un organismo por agregado WMS

- **Commits:** `0d919ea0fc690ff575a9e20834c01b1368020922`, `eb414640bd7772b3f8fd5b170c13b069078b9947`.
- **Detonante:** la primera versión agrupaba registros por tipo en un organismo de colección.
- **Cambio:** cada registro tiene organismo propio `wms.{kind}.{id}`; las versiones son episodios y los contenidos son bloques CID.
- **Prueba añadida:** reabrir el nodo desde el mismo directorio y comprobar contenido/RootCID y tombstone.
- **Estado:** la ejecución debe verificarse por commit, no inferirse.

### AUD-0012 — Ledger de inventario persistente e idempotente

- **Commit:** el commit que contiene esta entrada, identificable por el mensaje `feat(wms-twin): add Core-backed idempotent inventory ledger`.
- **Archivos:** `wms-twin/internal/application/inventoryledger/`, `wms-twin/internal/httpapi/server.go`, `inventory.go` y tests; README, guía, estructura, paridad y documento del ledger; workflow y script de actualización segura.
- **Detonante:** las invariantes puras de inventario no persistían operaciones ni ofrecían un primer caso de uso de negocio.
- **Problema:** mover stock como dos escrituras separadas podía dejar origen/destino inconsistentes; la API técnica aceptaba un token sin prefijo Bearer.
- **Corrección:** guardo proyección completa en un registro/organismo y hago un append por operación; agregué idempotencia por `operation_id`, serialización dentro de proceso, persistencia tras reinicio y validación estricta del Bearer.
- **Pruebas añadidas:** ajuste/reserva/liberación, replay/conflicto, movimiento, reinicio Core, concurrencia local y HTTP.
- **Límites:** el mutex no coordina nodos; no hay quorum/fencing distribuido ni compactación; el ledger no implementa las rutas originales.
- **Resultado CI:** pendiente de ejecución para este commit. No marco tests como aprobados antes de observar Actions.

## Incidencias externas al gemelo

Los fallos de npm/pip del workflow global Dependency Audit pertenecen a dependencias originales. No modifiqué esos archivos para ocultar alertas.

## Protección de rama

La lectura de GitHub mostraba `feat/wms-prismatec-genesis` sin branch protection ni required checks. El workflow valida contenido; la protección administrativa debe activarse aparte para bloquear la aceptación de PRs sin checks verdes.


### AUD-0013 — Grafo de módulos no reproducible tras incorporar el ledger

- **Commit detonante:** `497b20480358449ae025fd24eff32b2e8926b589`.
- **Ejecución:** `42892262782`, workflow WMS twin validation.
- **Detonante:** el job Go terminó en error durante `go mod tidy -diff`.
- **Síntoma confirmado:** no se ejecutaron gofmt, vet ni race tests; el guard documental/alcance sí pasó.
- **Causa:** pendiente de confirmar; el detalle del diff no fue expuesto por el conector de GitHub. La hipótesis es que `go.mod` requiere entradas indirectas adicionales, pero no la doy por confirmada.
- **Acción temporal:** generar `go.mod` y `go.sum` mediante Go 1.25 en CI y subirlos como artefacto de corta retención para inspección.
- **Corrección final esperada:** incorporar el grafo exacto y restaurar `go mod tidy -diff` como verificación no mutante.
- **Resultado:** abierto; no declaro el código Go probado.
