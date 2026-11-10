# Auditoría de modificaciones del backend gemelo

Mantengo una traza cronológica de cada modificación, problema, detonante, causa confirmada o hipótesis, decisión, riesgo y evidencia. No marco como probado lo que no ejecuté. Las entradas anteriores se conservan.

## Formato obligatorio

Cada entrada identifica commit, archivos, detonante, síntoma, causa, corrección, riesgo y pruebas/resultado. Si una validación no se ejecutó o fue cancelada, lo digo expresamente.

### AUD-0001 — Frontera inicial PrismaTec

### AUD-0002 — Documentación y workflow iniciales

### AUD-0003 — Primer corte Go/Core

### AUD-0004 — Aislamiento físico

### AUD-0005 — Separación AIP y reglas de inventario

### AUD-0006 — Formato Go

### AUD-0007 — Grafo de módulos y go.sum

### AUD-0008 — Handoff, inventario de rutas y actualización segura

### AUD-0009 — Límite de replicación CID de PrismaTec-Core

### AUD-0010 — Fallos del Dependency Audit original

### AUD-0011 — Un organismo por agregado WMS

### AUD-0012 — Ledger de inventario persistente e idempotente

### AUD-0012 — Replicación WMS de bloques CID y snapshots firmados

### AUD-0013 — Grafo de módulos no reproducible tras incorporar el ledger

### AUD-0013 — Prueba de replicación con dos nodos

### AUD-0014 — Fuentes Go sin formato en CI

### AUD-0015 — Cierre del grafo Go y corrección de vet

### AUD-0016 — Validación completa del corte de inventario

### AUD-0017 — Reintento de replicación mediante replay idempotente

- **Detonante:** el primer commit de inventario puede persistir localmente y devolver 503 si un peer no confirma los bloques/snapshot. El replay idempotente anterior devolvía el resultado almacenado sin volver a sincronizar.
- **Corrección:** añadí `corestore.Store.Sync`; el replay del mismo operation_id vuelve a intentar la replicación sin duplicar la mutación. Una réplica no intenta promoverse ni sincronizar si no es Primary.
- **Prueba:** `TestIdempotentReplayRetriesPendingReplication`.
- **Estado:** pendiente de CI del commit actual.

### AUD-0018 — Formato Go automatizado por CI

- **Detonante:** la ejecución `42894195703` pasó el guard de alcance/documentación, pero se detuvo al detectar siete archivos Go sin gofmt; vet y race tests no llegaron a ejecutarse.
- **Corrección:** el workflow formatea únicamente el workspace temporal, ejecuta vet y race tests, y solo si pasan publica un commit de formato Go. No modifica código Flask/admin/mobile/db ni dependencias originales.
- **Estado:** pendiente de la ejecución del workflow actualizado.
