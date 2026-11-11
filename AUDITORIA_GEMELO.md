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





### AUD-0014 — Fuentes Go sin formato en CI

- **Commit detonante:** `9695a825933d4cd59d7ea17140d63e304b8a468b`.
- **Ejecución:** `42892614773`, workflow WMS twin validation.
- **Detonante:** el paso de formato encontró archivos Go que gofmt modificaría.
- **Resultado:** documentación/alcance, `go mod tidy` y `go mod verify` pasaron; vet y race tests quedaron omitidos.
- **Corrección temporal:** CI normalizará fuentes en workspace efímero y subirá el código formateado como artefacto para incorporarlo al repositorio.
- **Corrección definitiva:** publicar los archivos ya formateados y restaurar el check no mutante `gofmt -l`.
- **Estado:** abierto hasta obtener artefacto y completar el siguiente CI.





### AUD-0015 — Cierre del grafo Go y corrección de vet

- **Commit detonante:** `f52b807d4686a458227e7be064079f0e667ce27b`.
- **Ejecución:** `42892797788`.
- **Hallazgo:** `go mod tidy`, `gofmt -w` en workspace temporal y `go mod verify` pasaron. `go vet` falló porque `ledger_test.go` importaba `internal/domain/inventory` sin usarlo.
- **Causa confirmada:** import sobrante después de cambiar el DTO de movimiento a `Location`.
- **Corrección:** elimino el import, incorporo el `go.mod` canónico generado por Go 1.25 y publico los archivos formateados. Restauro CI no mutante.
- **Riesgo residual:** vet y race tests aún deben terminar en verde en la nueva ejecución.





### AUD-0016 — Validación completa del corte de inventario

- **Commit validado:** `4b3880fe9a0dfec329cc88c8a2e08709454ecf14`.
- **Ejecución:** `42893176180`.
- **Resultado:** success en Documentation and protected-scope guard y Go tests and static checks.
- **Pasos aprobados:** `go mod tidy -diff`, `go mod verify`, comprobación gofmt, `go vet ./...` y `go test -race -count=1 ./...`.
- **Detonante:** cierre de las incidencias AUD-0013, AUD-0014 y AUD-0015.
- **Corrección:** grafo Go canónico, fuentes formateadas, import no utilizado retirado y workflow no mutante restaurado.
- **Alcance de la evidencia:** solo valida el código y escenarios automatizados actuales; no valida paridad Flask, replicación de bytes CID, autoridad distribuida ni operación multi-nodo.





### AUD-0017 — Replicación WMS de bloques CID y snapshots firmados

- **Commits:** protocolo `74d75233af`; integración del store `008978e5ad`; configuración de peers `e3b5889a38`; manejo HTTP de commit local pendiente `995f2fcc27`.
- **Detonante:** el snapshot nativo de PrismaTec-Core transporta el organismo, pero no los bytes de los bloques CID referenciados por sus episodios.
- **Cambio:** implementé en `internal/replication` transferencia de bloques con firma Ed25519 derivada del NodeID, allowlist de peers, timestamp, comprobación de CID y ACK firmado. El snapshot solo se envía después de confirmar los bloques.
- **Autoridad:** Store usa Core IsLeader para permitir Put/Delete solo en el primario. Las réplicas frías no se convierten en escritoras.
- **Fallo parcial:** la persistencia local ocurre antes de la replicación; si un peer falla, la API devuelve 503 con local_commit=true y el registro.
- **Límites:** peers explícitos, sin quorum, Kademlia ni GossipSub; se reenvía el historial completo en cada sincronización.


### AUD-0018 — Prueba de replicación con dos nodos

- **Commit:** `6b08dec2b9`.
- **Prueba:** `TestAuthenticatedReplicationTransfersCIDAndFencesReplicaWrites`.
- **Cobertura:** bloque CID transferido antes del snapshot, integridad del contenido, RootCID/ContentCID preservados, escritura de réplica rechazada y tombstone propagado.
- **Estado:** el paquete internal/replication pasó en CI 42895311390; el run global falló después en httpapi por un defecto de esquema Bearer, no por el protocolo.


### AUD-0019 — Reintento de replicación mediante replay idempotente

- **Detonante:** el primer commit de inventario puede persistir localmente y devolver 503 si un peer no confirma los bloques/snapshot. El replay idempotente anterior devolvía el resultado almacenado sin volver a sincronizar.
- **Corrección:** añadí corestore.Store.Sync; el replay del mismo operation_id vuelve a intentar la replicación sin duplicar la mutación. Una réplica no intenta promoverse ni sincronizar si no es Primary.
- **Prueba:** TestIdempotentReplayRetriesPendingReplication.
- **Estado:** inventoryledger pasó en CI 42895311390; el test de replay idempotente está incluido en ese paquete.



### AUD-0020 — Formato Go automatizado por CI

- **Detonante:** la ejecución 42894195703 pasó el guard de alcance/documentación, pero se detuvo al detectar siete archivos Go sin gofmt; vet y race tests no llegaron a ejecutarse.
- **Corrección:** el workflow formatea únicamente el workspace temporal, ejecuta vet y race tests, y solo si pasan publica un commit de formato Go. No modifica código Flask/admin/mobile/db ni dependencias originales.
- **Estado:** en CI 42895311390, gofmt y vet pasaron; los race tests fallaron en httpapi y por eso no se publicó el commit de formato. Tras corregir el esquema Bearer, se requiere nueva ejecución.


### AUD-0021 — Middleware aceptaba token sin esquema Bearer

- **Run que lo detectó:** 42895311390.
- **Detonante:** TestInventoryLedgerHTTPRequiresBearerAndPersistsMovement envió el token desnudo y obtuvo 200; el contrato del gemelo exige Authorization: Bearer.
- **Causa:** strings.TrimPrefix devolvía el valor original cuando no encontraba el prefijo, y el comparador aceptaba ese valor como token.
- **Corrección:** parseo explícito del esquema HTTP, comparación case-insensitive del nombre Bearer, rechazo de esquema ausente/vacío y comparación constante del token.
- **Prueba:** se mantiene la prueba del ledger HTTP y añado cobertura explícita del token desnudo en server_test.go.
- **Estado:** corrección publicada en el commit actual; CI pendiente.


### AUD-0020 — Primitivas de seguridad para fase 02

- **Commit:** esta entrega, identificable por `feat(wms-twin): add auth security primitives`.
- **Archivos:** `wms-twin/internal/security/auth/jwt.go`, `csrf.go`, `password.go` y `auth_test.go`; actualización de guía, estructura, paridad y README; especificación `wms-twin/docs/FASE_02_SEGURIDAD.md`.
- **Detonante:** comenzar a reproducir el contrato de identidad del backend original sin presentar la API técnica como autenticación de usuarios.
- **Cambio:** implementé HS256 con claims del original, validación de algoritmo/firma/expiración/vida máxima, CSRF criptográfico double-submit y política de password.
- **Decisión:** el secreto JWT debe tener al menos 32 bytes. El paquete no toma decisiones de autorización ni confía en claims de rol/almacén para autorizar operaciones.
- **Límite:** no implementé endpoints login/logout/refresh, bcrypt, persistencia de usuarios, estado vivo, revocación, lockout, cookies HTTP ni permisos. El Bearer técnico sigue activo.
- **Pruebas añadidas:** round-trip de claims, expiración, manipulación de firma, algoritmo no permitido, secreto débil, CSRF y política de password.
- **Validación:** no ejecuté Go localmente en este entorno. La validación queda pendiente del workflow CI de esta rama; no marco la fase como terminada.


### AUD-0021 — Repositorio de identidad persistido en PrismaTec-Core

- **Commit:** esta entrega, identificable por `feat(wms-twin): add Core-backed identity repository`.
- **Archivos:** `internal/application/identity/repository.go`, `repository_test.go`, `go.mod`; endurecimiento de validación JWT/password; actualización de guía, estructura, paridad y especificación de fase 02.
- **Detonante:** las primitivas criptográficas no podían autenticar a nadie sin una fuente de identidad persistente.
- **Cambio:** añadí un organismo Core por usuario, bcrypt, normalización de username, unicidad local, grants de almacén/página, funciones, overrides, estado y timestamps; agregué autenticación y cambio de contraseña internos.
- **Seguridad:** el hash bcrypt se guarda en el organismo y no forma parte del DTO público. Las credenciales inválidas usan una respuesta genérica. La contraseña nunca se persiste en claro.
- **Pruebas añadidas:** creación, login, rechazo de credenciales, username duplicado, cambio de contraseña, DTO sin hash y recuperación tras reiniciar el nodo con el mismo DataDir.
- **Límites:** no hay importador de usuarios, endpoints HTTP, lockout persistente, middleware JWT, cookies/CSRF ni autorización de rutas. El mutex solo coordina el proceso primario.
- **Validación:** pendiente del CI de esta rama; no he ejecutado Go localmente en este entorno.


### AUD-0022 — Validación CI de identidad y smoke manual del operador

- **Commit probado:** `d8c2c02e17c667620cccdf6dcb017a83f33e575c`.
- **Ejecución:** `42897626723`, WMS twin validation, success.
- **Pasos:** guard de alcance/documentación, tidy diff, module verify, gofmt, vet y race tests.
- **Resultado:** todos los pasos del workflow específico del gemelo pasaron. El formato final quedó en `e0d2e20dea760ad99f71c1376d97a4896f28c284`.
- **Prueba manual reportada:** POST de `WH-001` devolvió 201; GET devolvió 200 con CID/RootCID; health WMS devolvió ok; AIP healthz devolvió 200 vacío; el nodo informó un organismo.
- **Pendiente:** reiniciar el proceso local y comprobar de nuevo `WH-001`. La prueba unitaria de reapertura del Core store no sustituye esa comprobación del entorno del operador.
- **Límite:** CI no demuestra login HTTP, importación de usuarios, permisos, paridad de rutas ni flujos WMS.


### AUD-0023 — Autenticación HTTP y bootstrap de identidades

- **Commit:** esta entrega, identificable por `feat(wms-twin): add JWT auth endpoints and Core bootstrap`.
- **Archivos:** `internal/httpapi/auth.go`, `server.go`, `internal/runtime/runtime.go`, `internal/application/identity/import.go`, `login_attempts.go`, tests HTTP/identidad y actualización de documentación.
- **Detonante:** conectar las primitivas JWT/CSRF y el repositorio Core-backed a un contrato HTTP que pueda consumir admin y mobile.
- **Cambio:** añadí login/logout/me/refresh/change-password; cookies `sentry_auth` y `sentry_csrf`; JWT HS256; comprobación de estado vivo; forced password change; CSRF; lockout persistente; wrappers de permisos de página y almacén; importación inicial JSON de usuarios con hash bcrypt.
- **Bootstrap:** `JWT_SECRET` debe tener al menos 32 bytes. `WMS_TWIN_BOOTSTRAP_USERS_FILE` solo se importa si el store está vacío y el archivo tiene permisos 0600 o más restrictivos. No se aceptan passwords en claro.
- **Límites:** las rutas WMS de negocio no están portadas ni protegidas aún por estos wrappers; `require_packing` es configuración de entorno; no hay audit log de password ni revocación individual de jti.
- **Pruebas añadidas:** login/me/cookies/CSRF/cambio de password, invalidación de token anterior, lockout persistente, forced-change y warehouse mismatch/denial, importación y reapertura.
- **Validación:** pendiente del CI de esta rama; no declaro las pruebas ejecutadas localmente.
- **Incidencia de smoke test:** la respuesta local `/api/health` reportada como `service=sentry-wms` no coincide con el handler publicado, que responde `service=smart-wms-twin` e incluye `time`. No la atribuyo al gemelo hasta identificar el proceso que escucha en el puerto 5001.


### AUD-0024 — Importación reanudable y coste bcrypt compatible

- **Cambio:** convertí el importador de identidades en idempotente; los IDs ya existentes no se sobrescriben, las colisiones de username se rechazan y las identidades faltantes se incorporan.
- **Recuperación:** el runtime vuelve a procesar el archivo bootstrap en cada arranque, de modo que una importación parcial puede reanudarse.
- **Seguridad:** el archivo sigue exigiendo permisos 0600 o más restrictivos y solo contiene hashes bcrypt.
- **Paridad:** los hashes generados por el gemelo pasan a coste 12, equivalente al default de `bcrypt.gensalt()` en el backend original.
- **Validación:** pendiente del CI de este nuevo commit.


### AUD-0025 — Validación de autenticación y bootstrap

- **Commit probado:** `5d8d334bb24dc21bf2609f8c8089092297563de8`.
- **Ejecución:** `42899616129`, WMS twin validation, success.
- **Pasos aprobados:** guard documental/de alcance, tidy diff, module verify, gofmt, vet y race tests.
- **Formato final:** `2720ed7d70fb69e46422c3338dc354f15d30cc3a`.
- **Gitleaks / lockfile:** success.
- **Auditoría global:** `42899616007` falló en npm-audit admin/mobile y pip-audit Python; no corresponde al workflow WMS twin Go.
- **Suite general:** `Tests` seguía en curso en el momento de registrar.
- **Conclusión:** las nuevas rutas de auth y el bootstrap pasan validación Go; la paridad funcional global sigue pendiente.


### AUD-0026 — Catálogo inicial de almacenes, zonas y bins

- **Rama:** `feat/wms-prismatec-genesis`.
- **Archivos nuevos:** `internal/application/catalog/catalog.go`, `internal/httpapi/catalog.go`, tests de catálogo y HTTP.
- **Archivos conectados:** `internal/httpapi/server.go`.
- **Detonante:** empezar la paridad funcional por las entidades maestras que condicionan recepción, ubicación, picking e inventario.
- **Contrato de referencia:** `api/routes/admin/admin_warehouse.py`, `api/schemas/warehouses.py`, `api/schemas/zones.py`, `api/schemas/bins.py`; prefijo registrado `/api/admin`.
- **Cambio:** CRUD de warehouses, zones y bins; filtros y paginación; relaciones de pertenencia; autorización JWT/page permission/warehouse scope; protección de borrado por dependencias y stock.
- **Persistencia:** un organismo por entidad y organismo de secuencias para IDs enteros no reutilizables.
- **Riesgos abiertos:** secuencia y registro son dos commits Core distintos; sin transacción distribuida. La serialización del catálogo es local al proceso. Falta exactitud Pydantic para null/errores, preferred_bins, detalle SKU/nombre, e integración de migraciones/fixtures.
- **Pruebas añadidas:** ciclo warehouse-zone-bin, duplicados, referencias cruzadas, no reutilización de IDs, borrado con stock, rutas HTTP, login, page permission y warehouse scope.
- **Validación:** pendiente del CI de este commit; no declaro ejecución local.

- **Resultado CI inicial:** ejecución `42974237383`; el guard de documentación/alcance pasó, pero `go vet` detectó dos variables locales declaradas y no utilizadas por sombreado en el parseo de filtros `warehouse_id` y `zone_id`. Race tests quedaron omitidos.
- **Corrección:** sustituyo las declaraciones cortas que ocultaban las variables externas por variables temporales y asignación explícita. La nueva validación debe completar vet y race tests antes de cerrar la fase.


### AUD-0027 — Corrección de filtros y validación del catálogo

- **Commit de corrección:** `bb645444a830cee3b244a3f9d576b4d2b9e3433c`.
- **Commit de formato publicado por CI:** `ccf1934b2640feb45df852d515316be73d408de1`.
- **Incidencia:** `go vet` detectó dos variables no utilizadas por sombreado en el parseo de `warehouse_id` y `zone_id` de filtros de bins.
- **Corrección:** variables temporales y asignación explícita a los filtros externos.
- **CI:** WMS twin validation `42974486856` success; module verify, gofmt, vet, race tests y guard documental/alcance aprobados.
- **Suite general:** `42974487059` seguía en curso al registrar.
