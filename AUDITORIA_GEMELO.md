# Auditoría de modificaciones del backend gemelo

Mantengo una traza de cambios, problemas, detonantes, decisiones, pruebas y evidencia. No marco como probado lo que no ejecuté.

## Formato obligatorio

Cada entrada identifica commit/fecha, archivos, detonante, síntoma, causa confirmada o hipótesis, corrección, riesgo, pruebas y resultado.

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
- **Cambio:** runtime Go, nodo Core, AIP, episodios/CID, API técnica Bearer e invariantes de inventario.
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

- **Commit afectado:** `026bad4` y luego `6b0e9e9`.
- **Detonante:** gofmt detectó archivos no formateados y detuvo el job antes de vet/tests.
- **Corrección temporal:** workflow normaliza formato en workspace efímero. No modifica commit.
- **Estado:** publicar archivos ya formateados sigue siendo una tarea necesaria.

### AUD-0007 — Grafo de módulos y go.sum

- **Commit afectado:** `e7e18ba38b1f591659dc2e6ac224fa72cd4d49dc`.
- **Detonante:** faltaban entradas checksum de PrismaTec-Core al ejecutar vet.
- **Corrección:** workflow ejecuta `go mod tidy`, genera el grafo/checksums y después `go mod verify`.
- **Estado:** CI posterior `ee78910` pasó; el archivo go.sum todavía debe incorporarse al repositorio para builds reproducibles sin regeneración.

### AUD-0008 — Handoff, inventario de rutas y actualización segura

- **Commit:** pendiente de publicación.
- **Detonante:** el equipo necesita un mapa de rutas real, instrucciones para actualizar el clon sin integrar cambios no probados y documentación completa de infraestructura/diagnóstico.
- **Cambio:** actualizo Guia/Estructura/Paridad/README; agrego `MAPA_RUTAS_BACKEND_ORIGINAL.md`, tests de runtime y script `safe-update-wms-twin.sh`; normalizo fuentes Go y preservo el contrato de health original.
- **Problema Git observado:** la rama local ya existía, por lo que `git switch --track` falló. La corrección es `git switch feat/wms-prismatec-genesis`.
- **Pruebas esperadas:** bash -n del script; CI con gofmt, vet y race tests. No marcar verde hasta revisar la ejecución del commit publicado.

## Incidencias externas

Los workflows `Dependency Audit` del repo original fallaron en npm-audit (admin/móvil) y pip-audit. Son hallazgos separados del gemelo; no modifiqué dependencias originales para ocultarlos.


### AUD-0008 — Primera validación Go satisfactoria

- **Commit validado:** `ee7891004b938f1c4b089c508c6e3cd2f75fc6f3`.
- **Workflow:** `WMS twin validation`, ejecución `42890179941`.
- **Resultado:** documentación y protección de alcance correctas; `go mod tidy`, verificación de módulos, `go vet ./...` y `go test -race -count=1 ./...` terminaron satisfactoriamente.
- **Tests:** corestore, inventory y httpapi pasaron con race detector.
- **Limitación:** CI formateó el workspace temporalmente; los archivos de la rama aún requieren un commit de formato. Esto no prueba paridad WMS ni replicación multi-nodo.
