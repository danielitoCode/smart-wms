# Manual de framework: integración PrismaTec-Core en el gemelo WMS

Escribo este manual para profundizar en **cómo el gemelo se apoya en PrismaTec-Core**. Complementa `doc/README.md` (operación) y el PDF de la misma carpeta. Aquí no repito el “cómo arrancar”; explico el **porqué** y el **dónde** de cada pieza del Core dentro de `wms-twin`.

---

## 1. Qué problema resuelve el Core en este proyecto

El backend original guarda el almacén en PostgreSQL vía Flask. El gemelo debe:

1. Hablar el mismo `/api` hacia admin y mobile.
2. Guardar el estado de forma coherente con la visión PrismaTec (organismos, integridad, nodo).
3. Permitir evolucionar features sin que los controladores HTTP inventen datos.

PrismaTec-Core me da el **motor de persistencia e identidad de nodo**. Yo construyo encima el WMS (features, ledger, HTTP).

---

## 2. Piezas del Core que uso (y las que dejo de lado en el día a día)

| Pieza Core | Uso en el gemelo |
|------------|------------------|
| **Node** (`core.NewNode`) | Un proceso = un nodo con `DataDir`, nombre e ID. Arranca en `runtime`. |
| **Organisms / Manager** | Almacén de documentos versionables. Cada registro de negocio es un organismo. |
| **corestore** (adaptador mío) | API Put/Get/List/Delete sobre kinds (`warehouses`, `sales-orders`, `wms_admin_channel`…). |
| **Ledger WMS** (`features/inventoryledger`) | No es SQL: movimientos de stock con `operation_id` idempotente sobre organismos de balance. |
| **AIP** | Listener del nodo en otro puerto. El admin/mobile Sentry **no** lo llaman; es superficie Core. |
| **Mesh / transporte** | Opcional: difusión entre nodos. En lab de un solo proceso casi no lo noto. |

No expongo el Core “crudo” al frontend. El frontend solo ve `/api` Sentry-compatible.

---

## 3. Camino de un dato: del HTTP al organismo

Ejemplo: crear un almacén.

1. `POST /api/admin/warehouses` → `httpapi`.
2. Auth (cookie o Bearer).
3. `features/catalog.CreateWarehouse`.
4. Serializa el warehouse y hace `corestore.Put("warehouses", id, json)`.
5. El manager de organismos de PrismaTec-Core persiste el blob y actualiza CID/cadena local según el modelo Core.

Leer es el camino inverso: `Get`/`List` → JSON → DTO del feature → respuesta HTTP.

Para admin aún en migración (`channels`, etc.):

1. Handler delgado en `httpapi`.
2. `ports.AdminResourceRepository` → `features/admindata.Store`.
3. `corestore` con kinds `wms_admin_*`.
4. Si la colección está vacía, **seed** solo dentro de `admindata` (capa de datos), nunca en el controller.

---

## 4. Ledger de inventario: por qué no es un UPDATE de fila

En un WMS clásico hago `UPDATE stock SET qty = qty + 1`. Aquí:

- Cada ajuste, movimiento o reserva es un **comando** con `operation_id`.
- Si repito el mismo `operation_id`, no duplico el efecto (idempotencia).
- El saldo “actual” se materializa a partir del estado que el ledger mantiene en organismos de balance.

Eso alinea el floor (receive, putaway, pick, ship, POS) con un diario reproducible, no solo con el último número en una tabla.

---

## 5. Identidad del nodo y composition root

En el arranque (`runtime` + `httpapi.NewWithIdentity`):

1. Creo el **Node** Core con directorio de datos.
2. Obtengo `node.Organisms()` y armo `corestore`.
3. Construyo ledger, catalog, receiving, picking, … inyectando el mismo store.
4. Levanto el mux HTTP.

Todo el grafo de features comparte un store = un universo de organismos de ese nodo. Eso es intencional: un lab = un nodo.

---

## 6. Contratos (ports) y features

- **`internal/ports`**: interfaces (qué necesita la feature del mundo exterior).
- **`internal/features/<nombre>`**: casos de uso del dominio WMS.
- **`internal/infrastructure/persistence`**: fábricas que devuelven implementaciones sobre Core.
- **`internal/httpapi`**: solo transporte y auth.

Dependencias hacia adentro: HTTP → features → ports ← infrastructure/Core.

---

## 7. Cómo añado un organismo nuevo (checklist)

1. Elijo un `kind` estable (string).
2. Defino el DTO en la feature.
3. Put/Get vía `corestore` (o repositorio de la feature).
4. Expongo HTTP si el cliente lo necesita.
5. Test de feature con `features/testkit` (nodo temporal en `t.TempDir()`).
6. Si era un seed de `admindata`, lo elimino al tener dominio real.

---

## 8. Qué no debo hacer

- Llamar al Core desde el JSX del admin o desde pantallas mobile.
- Devolver JSON falso en el handler “porque aún no hay BD”.
- Mezclar el puerto AIP con el puerto `/api` del WMS en la cabeza del equipo: son superficies distintas.
- Asumir que multi-nodo mesh está probado igual que el lab de un solo proceso.

---

## 9. Cómo lo verifico a nivel framework

```bash
cd wms-twin
go test ./internal/features/... -count=1
go test ./internal/httpapi/ -count=1
./scripts/start-lab.sh
./scripts/team-curl-demo.sh
```

Los tests de feature levantan un **Node real de PrismaTec-Core** en directorio temporal: no son mocks del Core; ejercitan organismos de verdad en disco efímero.

---

## 10. Relación con la guía de operación y el PDF

| Documento | Enfoque |
|-----------|---------|
| `doc/README.md` | Operar el gemelo (arranque, auth, features, ampliar) |
| `doc/Guia_Completa_WMS_Twin_PrismaTec.pdf` | Misma guía operativa en PDF |
| **Este manual** | Profundidad de **integración PrismaTec-Core** |

Los tres deben contar la misma arquitectura; este texto entra más en el Core.
