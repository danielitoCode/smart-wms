# Paridad operativa del gemelo (PrismaTec-Core)

## Qué se puede demostrar hoy

Flujo de laboratorio completo vía JWT:

1. Login (`operator` / `Operator123` si data dir vacío)
2. Catálogo: warehouses, zones, bins, items
3. Purchase order → receive → putaway
4. Sales order → pack → ship
5. Wave validate/create
6. Cycle count create
7. Lookup + inventory balances
8. `GET /api/admin/system-info`, `GET /api/admin/users`

Scripts:

```bash
./scripts/run-local.sh          # arranque
bash scripts/demo-flow.sh       # flujo largo
bash scripts/parity-smoke.sh    # humo de rutas críticas
```

## Qué falta para igualar el original

| Área | Estado |
|------|--------|
| POS / Dockd / inbound | No portado |
| Events, snapshots, webhooks | No portado |
| RMA / backorders avanzados | No portado |
| Tokens WMS por scope (no JWT) | No portado |
| PostgreSQL transacciones / locks | Ledger PrismaTec-Core (modelo distinto) |
| Suite E2E Flask | No aplica 1:1 |

## Comparar con el backend original

1. Levantar Flask original en `:5000` (u otro puerto) con su `.env`.
2. Levantar twin en `:5001` con `./scripts/run-local.sh`.
3. Ejecutar las **mismas** llamadas curl (login, crear WH, PO…) contra ambos.
4. Comparar status HTTP y forma JSON (no hashes internos ni IDs de organismo).

El twin **no** sustituye producción hasta cerrar la matriz de `NivelDeParidadConBackendOriginal.md`.
