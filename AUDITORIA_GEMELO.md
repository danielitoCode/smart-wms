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
- **Corrección:** los archivos agregados por esa entrega se retiraron de la rama gemela en `AUD-0004`. Ningún archivo preexistente del backend original fue eliminado o modificado.
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
- **Problema preventivo corregido en `AUD-0005`:** lectura HTTP inicial usaba `http.MaxBytesReader` con writer nulo. Se sustituyó por lectura limitada explícita a 1 MiB antes de decodificar JSON.
- **Riesgos abiertos:** compatibilidad HTTP/auth pendiente; operaciones multi-registro no atómicas; no se ha probado replicación WMS.

### AUD-0004 — Aislamiento físico del backend original

- **Commit:** pendiente de creación.
- **Detonante:** al revisar el árbol completo confirmé que `api/prismatec/` estaba dentro del directorio del backend Flask, aunque sus archivos fueran nuevos.
- **Cambio:** retirar exclusivamente los archivos creados por AUD-0001 y mantener el código nuevo bajo `wms-twin/`.
- **Protección:** no borrar ni modificar archivos preexistentes de `api/`.
- **Verificación:** comparar el diff final de la rama contra `main` y comprobar que no quedan cambios bajo `api/`, `admin/`, `mobile/` o `db/`.

### AUD-0005 — Límite de tamaño del cuerpo HTTP

- **Commit:** pendiente de creación.
- **Detonante:** evitar pasar un ResponseWriter nulo a `http.MaxBytesReader` en el límite de entrada.
- **Cambio:** leer como máximo 1 MiB + 1 byte y rechazar cuerpos superiores antes de decodificar JSON.
- **Prueba:** CI debe ejecutar tests, race detector y vet; no se declara validado hasta resultado verde.
