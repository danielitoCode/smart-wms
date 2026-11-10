# Auditoría de modificaciones del backend gemelo

Este registro conserva una traza verificable de cambios, problemas, detonantes, decisiones y evidencia. No registro como probado lo que no ejecuté.

## Formato obligatorio

Cada entrada identifica fecha, commit, archivos, detonante, decisión, riesgo, pruebas y resultado. Los fallos se registran con síntoma, causa confirmada o hipótesis explícita, corrección y prueba de no regresión.

## Entradas

### AUD-0001 — Frontera inicial PrismaTec

- **Commit:** `0a47c26be3f805ff24779fb267bbb2d57b3f5aa9`.
- **Cambio:** se añadieron contratos/adaptadores iniciales bajo `api/prismatec/`.
- **Detonante:** explorar la integración entre WMS y PrismaTec-Core.
- **Problema detectado después:** la ubicación dentro de `api/` puede confundirse con una modificación del backend Flask, contradiciendo la separación física que establecí.
- **Decisión vigente:** el gemelo real vive en `wms-twin/`; no depender de `api/prismatec/`. La retirada de esos archivos propios se hará como limpieza aislada y quedará trazada; no se modificarán archivos originales.

### AUD-0002 — Documentación y workflow

- **Commits:** `aef763491ddbcd24e6a3e02a78ca6777c2760f21`, `b12ec8179e175ce9eaa5f56caa3cf45d0f7e38e6`, `3d68a171b394cfca522042aaffca1c24d00c5e7c`.
- **Cambio:** guía, estructura, matriz de paridad, auditoría y workflow.
- **Detonante:** permitir continuidad por cualquier desarrollador/agente y validación antes de integrar.
- **Resultado:** workflow escrito; no existe evidencia de una ejecución verde ni de protección de rama configurada.

### AUD-0003 — Primer corte ejecutable Go/Core

- **Commit:** pendiente de creación.
- **Fecha:** 2026-11-10.
- **Archivos:** `wms-twin/**`, `Guia.md`, `EstructuraBackendGo.md`, `NivelDeParidadConBackendOriginal.md`, este archivo.
- **Detonante:** pasar de diseño documental a runtime funcional sin alterar Flask.
- **Cambio:** bootstrap Core, AIP v1, almacenamiento de registros mediante organismos/episodios/CID, API técnica Bearer y primeras invariantes de inventario.
- **Pruebas:** definidas en código; no ejecutadas localmente desde esta sesión. CI debe confirmarlas.
- **Riesgos abiertos:** compatibilidad HTTP/auth pendiente; operaciones multi-registro no atómicas; no se ha probado replicación WMS.
