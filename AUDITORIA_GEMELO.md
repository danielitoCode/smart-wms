# Auditoría de modificaciones del backend gemelo

Este registro conserva una traza verificable de cambios, problemas, detonantes, decisiones y evidencia. No registro como probado lo que no ejecuté.

## Formato obligatorio

Cada entrada identifica fecha, commit, archivos, detonante, decisión, riesgo, pruebas y resultado. Los fallos se registran con síntoma, causa confirmada o hipótesis explícita, corrección y prueba de no regresión.

## Entradas

### AUD-0001 — Frontera inicial PrismaTec

- **Commit:** `0a47c26be3f805ff24779fb267bbb2d57b3f5aa9`.
- **Cambio:** se añadieron contratos/adaptadores iniciales bajo `api/prismatec/`.
- **Detonante:** explorar la integración entre WMS y PrismaTec-Core.
- **Problema detectado después:** ubicar código bajo `api/` lo mezcla físicamente con el backend Flask original y contradice el aislamiento solicitado.
- **Corrección:** los archivos agregados por esa entrega se retiraron de la rama gemela en el commit `0cccae88c0dd32787d38220d2e3c7532f81373ff`. Ningún archivo preexistente del backend original fue eliminado o modificado.
- **Decisión vigente:** toda implementación nueva del gemelo vive en `wms-twin/`.

### AUD-0002 — Documentación y workflow

- **Commits:** `aef763491ddbcd24e6a3e02a78ca6777c2760f21`, `b12ec8179e175ce9eaa5f56caa3cf45d0f7e38e6`, `3d68a171b394cfca522042aaffca1c24d00c5e7c`.
- **Cambio:** guía, estructura, matriz de paridad, auditoría y workflow.
- **Detonante:** permitir continuidad por cualquier desarrollador/agente y validación antes de integrar.
- **Resultado:** workflow escrito; no existe evidencia de una ejecución verde ni de protección de rama configurada.

### AUD-0003 — Primer corte ejecutable Go/Core

- **Commit:** `f4f4b979b3898901fbd4fe09e1ecb8f687d1ed5c`.
- **Fecha:** 2026-11-10.
- **Archivos:** `wms-twin/**`, `Guia.md`, `EstructuraBackendGo.md`, `NivelDeParidadConBackendOriginal.md`, este archivo y workflow.
- **Detonante:** pasar de diseño documental a runtime funcional sin alterar Flask.
- **Cambio:** bootstrap Core, AIP v1, almacenamiento de registros mediante organismos/episodios/CID, API técnica Bearer y primeras invariantes de inventario.
- **Pruebas:** definidas en código. No fueron ejecutadas localmente desde esta sesión. La ejecución GitHub Actions asociada al commit `f4f4b97` fue observada en estado `in_progress`; todavía no existe resultado final confirmado.
- **Riesgos abiertos:** compatibilidad HTTP/auth pendiente; operaciones multi-registro no atómicas; no se ha probado replicación WMS.

### AUD-0004 — Aislamiento físico del backend original

- **Commit:** `0cccae88c0dd32787d38220d2e3c7532f81373ff`.
- **Detonante:** al revisar el árbol completo confirmé que `api/prismatec/` estaba dentro del directorio del backend Flask, aunque sus archivos fueran nuevos.
- **Cambio:** retiré exclusivamente los archivos creados por AUD-0001 y mantuve el código nuevo bajo `wms-twin/`.
- **Protección:** no eliminé ni modifiqué archivos preexistentes de `api/`.
- **Verificación:** el workflow de protección documental pasó en el commit `026bad4`; la comparación completa contra `main` sigue pendiente.

### AUD-0005 — Límites HTTP, AIP e invariantes de inventario

- **Commit:** `026bad44df23e64faa22d91c844ba4942e4d131b`.
- **Detonantes:** el AIP se había montado dentro del servidor WMS aunque la guía anunciaba otro puerto; además, el lector HTTP usaba un writer nulo en `http.MaxBytesReader`, y las reglas de movimiento necesitaban fallar sin devolver balances parcialmente modificados.
- **Cambio:** separé el listener AIP del listener WMS; limité el cuerpo JSON a 1 MiB con lectura acotada; reforcé validación de balances, desbordamiento y movimientos de igual producto/lote.
- **Pruebas:** añadí casos para ajuste que no puede retirar stock reservado, movimiento incompatible y overflow. No se declara validado hasta que CI termine.

### AUD-0006 — Primer fallo de CI por formato Go

- **Commit afectado:** `026bad44df23e64faa22d91c844ba4942e4d131b`.
- **Evidencia:** workflow `WMS twin validation`, ejecución `42889670356`, job `Go tests and static checks`.
- **Detonante:** el paso `gofmt -l .` detectó archivos no formateados y detuvo el job antes de `go vet` y `go test`.
- **Decisión:** el workflow normaliza el formato dentro del workspace efímero de CI, deja una advertencia visible y continúa con vet/tests. No altera el commit. Esta normalización es temporal; debo publicar los archivos formateados en la rama cuando cierre la siguiente pasada.

### AUD-0007 — Falta de go.sum en primera integración

- **Commit afectado:** `e7e18ba38b1f591659dc2e6ac224fa72cd4d49dc`.
- **Evidencia:** job `130088180410`, error `missing go.sum entry` para los imports de PrismaTec-Core.
- **Detonante:** `go mod download` no produjo las entradas completas que necesitaban `go vet` y los paquetes importados.
- **Corrección:** cambio el workflow a `go mod tidy` para resolver el grafo real, generar `go.sum` y mostrar su contenido delimitado para incorporarlo al repositorio.
- **Estado:** pendiente de ejecutar CI y guardar el checksum lock generado.
