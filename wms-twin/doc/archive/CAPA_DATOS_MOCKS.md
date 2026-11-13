# Mocks en capa de datos (criterio Daniel)

Los endpoints aún no migrados de dominio **no** deben devolver JSON inventado en el controlador HTTP.

## Regla

1. El handler solo valida auth, path y llama a `application/admindata` (o al servicio de dominio real).
2. `admindata.Store` lee/escribe organismos PrismaTec-Core como si fueran filas de BD.
3. Si la colección está vacía, el **seed** vive en `admindata.seedIfEmpty` — no en `httpapi`.
4. Cuando un recurso gana servicio real (p. ej. `application/webhooks`), se deja de usar seed y se cablea el servicio; se borra el mock de esa entidad.

## Flujo

```
httpapi  →  admindata.Store  →  corestore  →  PrismaTec-Core organisms
```

Ve quitando seeds en `seedIfEmpty` a medida que migras cada recurso.
