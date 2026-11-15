# Patrones empleados en el gemelo WMS

Escribo este documento para que **cualquier persona del equipo** entienda qué patrones usamos, **por qué**, **dónde se ven en el código** y **cómo añadir otros en el futuro**. El mismo contenido está en `PatronesEmpleados.pdf`.

No es un libro de teoría abstracta: cada idea se ata al gemelo (`wms-twin`) y a **PrismaTec-Core**.

---

## 1. La filosofía en tres frases

1. **Clean Architecture**: el negocio no depende de HTTP ni del detalle del disco; las dependencias apuntan hacia adentro.
2. **Feature-first**: el código se organiza por **capacidades de negocio** (catálogo, recepción, picking…), no por “tipo de archivo técnico” suelto.
3. **Repository / Ports**: quien guarda datos lo hace detrás de un contrato; los controladores HTTP no inventan datos ni hablan con PrismaTec-Core a pelo.

PrismaTec-Core es el **motor de persistencia e integridad**. Los patrones sirven para usarlo sin enredar el resto del sistema.

---

## 2. Mapa de capas (Clean Architecture)

Piensa en anillos. Lo de fuera puede conocer lo de dentro; lo de dentro **no** debe conocer lo de fuera.

```text
  [ Clientes: admin / móvil ]
            │
            ▼
  [ Interface: httpapi ]          ← rutas /api, cookies, Bearer
            │
            ▼
  [ Features: internal/features ] ← reglas de almacén, pedidos, etc.
            │
            ▼
  [ Ports: internal/ports ]       ← contratos (interfaces)
            │
            ▼
  [ Infrastructure ]              ← corestore, PrismaTec-Core, mesh…
```

| Capa | Carpeta real | Qué hace en palabras llanas |
|------|--------------|-----------------------------|
| Interface | `internal/httpapi` | Recibe la petición web y responde JSON |
| Features | `internal/features/*` | Lógica de cada capacidad (recibir, pickear…) |
| Domain | `internal/domain` | Ideas de negocio muy estables (p. ej. balances) |
| Ports | `internal/ports` | Acuerdos: “quién sabe listar/guardar X” |
| Infrastructure | `corestore`, `infrastructure/persistence`, PrismaTec-Core | Guardar de verdad en el nodo |

**Por qué:** si mañana cambio cómo se guarda un canal, toco infraestructura/feature de datos, no reescribo todas las pantallas ni todos los handlers.

---

## 3. Feature-first: un cajón por capacidad

En lugar de una carpeta “controllers” y otra “services” gigantes, cada **feature** tiene su sitio:

| Feature | Carpeta | Ejemplo de responsabilidad |
|---------|---------|----------------------------|
| Catálogo | `features/catalog` | Almacenes, zonas, bins, ítems |
| Recepción | `features/receiving` | Receive + putaway |
| Picking | `features/picking` | Lotes y tareas de picking |
| Pedidos | `features/salesorders`, `purchaseorders` | SO y PO |
| Identidad | `features/identity` | Usuarios y intentos de login |
| Admin datos | `features/admindata` | Recursos admin aún en migración |
| … | … | … |

**Ejemplo de uso:** crear un almacén no se “resuelve” en el HTML del admin. El admin llama `/api/admin/warehouses` → `httpapi` → `features/catalog` → `corestore` → **organismo en PrismaTec-Core**.

**Por qué feature-first:** cuando el equipo busca “dónde está el putaway”, abre `receiving`, no busca entre cien archivos sueltos.

---

## 4. Patrón Repository (repositorio)

### Qué es

Un **repositorio** es un objeto que **sabe guardar y recuperar** un tipo de dato. El resto del código le pide “lista canales” o “guarda este ítem”, sin preocuparse de si por debajo es PrismaTec-Core, un archivo o una base.

### Dónde se ve

1. **Contrato (port)** — `internal/ports/admin.go`  
   Define métodos: `List`, `Get`, `Put`, `Delete`, settings…

2. **Implementación** — `internal/features/admindata`  
   `Store` cumple ese contrato y escribe organismos vía `corestore`.

3. **Prueba de compilación** — `admindata/port_assert.go`  
   ```go
   var _ ports.AdminResourceRepository = (*Store)(nil)
   ```  
   Si alguien rompe el contrato, **el proyecto no compila**.

4. **Fábrica** — `infrastructure/persistence/admin_repository.go`  
   Enlaza el port con la implementación concreta.

5. **Catálogo, pedidos, etc.** — cada feature tiene su propio repositorio o servicio que usa `corestore` (mismo espíritu: no guardar desde el handler).

### Ejemplo mental paso a paso

1. Llega `GET /api/admin/channels`.
2. `httpapi` comprueba que hay sesión.
3. Llama al repositorio de admin: “lista channels”.
4. El repositorio pregunta a `corestore` por organismos del kind de canales.
5. PrismaTec-Core devuelve los registros del nodo.
6. El handler solo traduce eso a JSON.

**Por qué:** los mocks o semillas de datos viven en la **capa de datos**, no en el controlador. Así el front siempre “cree” que hay almacén real.

---

## 5. Patrón Adapter (adaptador) hacia PrismaTec-Core

### Qué es

Un **adaptador** traduce el idioma del Core al idioma del WMS (y al revés).

### Dónde se ve

- **`internal/corestore`**: Put / Get / List / Delete sobre organismos.
- El **ledger** (`features/inventoryledger`): traduce “ajustar stock” a comandos con `operation_id` sobre el store del Core.

**Por qué:** el equipo del WMS piensa en “warehouse_id” y “receive”; PrismaTec-Core piensa en nodo y organismos. El adaptador evita que HTTP conozca esos detalles.

---

## 6. Composition Root (dónde se cablea todo)

### Qué es

Un solo lugar al arrancar donde se **crean** el nodo, el store, las features y el servidor HTTP y se **inyectan** unos a otros.

### Dónde se ve

- Arranque del proceso (`runtime` / `cmd`).
- `httpapi.NewWithIdentity(...)` en `server.go`: construye identity, catalog, receiving, admindata, etc.

**Por qué:** no hay “new” repartidos al azar por los handlers. Se ve de un vistazo qué depende de qué.

---

## 7. Handler delgado (Thin controller)

### Qué es

El método HTTP hace poco:

1. ¿Quién eres? (auth)
2. ¿Qué mandaste? (JSON)
3. Llama a la feature
4. Escribe la respuesta

### Dónde se ve

Rutas en `Server.Handler()`:

```go
mux.HandleFunc("/api/receiving/", s.RequireAuth(s.receivingRoute))
mux.HandleFunc("/api/admin/", s.RequireAuth(s.adminCatalog))
```

La lógica de “cómo se recibe mercancía” está en `features/receiving`, no pegada al `HandleFunc`.

**Por qué:** se puede probar la feature sin montar un navegador; el HTTP es solo la puerta.

---

## 8. Middleware de autenticación (Decorator sobre el handler)

### Qué es

Envuelvo una ruta con “antes de entrar, demuéstrame quién eres”.

### Dónde se ve

`RequireAuth(...)` alrededor de casi todas las rutas `/api` protegidas.

Acepta dos mundos (mismo patrón, dos credenciales):

| Cliente | Credencial | Dónde se guarda |
|---------|------------|-----------------|
| Admin web | Cookie de sesión + CSRF en escrituras | Navegador (cookie HttpOnly) |
| Móvil | Header `Authorization: Bearer` | Secure storage del teléfono |

**Por qué:** no repito el chequeo de login en cada función; un solo envoltorio protege muchas rutas.

---

## 9. Idempotencia en el ledger (patrón de operación segura)

### Qué es

Cada movimiento de stock lleva una **clave de operación**. Si el mismo comando se repite, no debe “sumar dos veces”.

### Dónde se ve

`features/inventoryledger` — comandos `Adjust`, movimientos de receive/putaway/pick, etc., con `operation_id`.

**Ejemplo:** la red falla después de recibir 5 unidades; el cliente reintenta el mismo receive con la misma clave → el sistema reconoce la operación y no inventa 10 unidades.

**Por qué:** almacenes reales sufren dobles clics y reintentos; el patrón protege el inventario.

---

## 10. Feature test kit (fixture de pruebas)

### Qué es

Un utilitario que levanta un **nodo PrismaTec-Core temporal**, catálogo y ledger para tests automáticos.

### Dónde se ve

`internal/features/testkit` — usado por tests de catalog, receiving, lookup, etc.

**Por qué:** las features se prueban contra el motor real en carpeta temporal, no contra mentiras vacías que no se parecen a producción.

---

## 11. Seguridad: patrones aplicados (paso a paso)

### 11.1 Dos puertas de entrada, un mismo backend

1. El admin web **no** guarda el JWT en `localStorage` (evita que un script malicioso lo robe fácil con XSS).
2. El servidor pone cookie **`sentry_auth`** marcada **HttpOnly** (JavaScript de la página no puede leerla).
3. Para escrituras (POST/PUT/DELETE) el admin envía **`X-CSRF-Token`** alineado con la cookie **`sentry_csrf`**.
4. El móvil no usa ese par de cookies: usa **Bearer** porque no es un navegador con el mismo modelo de riesgo CSRF.

**Patrones:** *Session cookie*, *CSRF synchronizer token*, *Bearer token* para clientes nativos.

### 11.2 Defensa en profundidad en rutas

1. Ruta registrada en el mux.
2. `RequireAuth` exige identidad válida.
3. Algunas operaciones miran **alcance de almacén** (no todo usuario ve todos los warehouses).
4. Tokens de integración (WMS tokens) se pueden **revocar** por admin.

**Patrón:** *authorization checks* cerca del caso de uso, no solo “logueado sí/no”.

### 11.3 Secretos y laboratorio

1. `JWT_SECRET` y flags de bootstrap de demo son **configuración de entorno**, no texto fijo en el front.
2. Usuarios demo (`operator` / `admin`) solo tienen sentido con el modo lab activado.

**Patrón:** *configuration over hardcoding*.

### 11.4 Qué no hacemos a propósito

- No ponemos la lógica de “usuario válido” en el componente React.
- No devolvemos datos inventados solo en el controlador para “que no falle el UI” sin pasar por capa de datos.
- No exponemos el AIP interno de PrismaTec-Core como si fuera el `/api` del WMS.

### 11.5 Cómo lo verificamos

```bash
./scripts/admin-e2e-cookie.sh   # cookies + CSRF
./scripts/mobile-e2e-bearer.sh  # Bearer
```

Si alguien “arregla” auth rompiendo uno de los dos caminos, estos scripts lo detectan.

---

## 12. Cómo añadir un patrón o una feature nueva (guía futura)

### Si la feature es de negocio nueva

1. Crea (o amplía) `internal/features/<nombre>/`.
2. Escribe el caso de uso **sin** HTTP.
3. Persiste vía `corestore` / repositorio (organismos PrismaTec-Core).
4. Añade ruta delgada en `httpapi` + `RequireAuth`.
5. Cablea dependencias en `NewWithIdentity`.
6. Test con `testkit` + script curl si es visible al cliente.

### Si necesitas un port nuevo

1. Define la interfaz en `internal/ports`.
2. Implementa en la feature o en `infrastructure/persistence`.
3. Añade `var _ ports.X = (*Impl)(nil)` si quieres candado de compilación.
4. El handler depende del **port**, no del detalle del Core.

### Si el patrón es de seguridad nuevo

1. Documenta la amenaza (¿XSS, CSRF, robo de token, escalada de almacén?).
2. Elige el control (cookie, header, scope, rate limit…).
3. Centralízalo (middleware o servicio identity), no lo copies en 20 handlers.
4. Añade un script E2E que falle si se regresa el control.

### Si no debes aplicar un patrón

No copies patrones “de moda” si no resuelven un dolor real. En este gemelo, Repository + features + thin handlers + auth dual ya cubren el mantenimiento diario. Un patrón más solo se justifica con un problema concreto (multi-nodo, colas, etc.).

---

## 13. Resumen de “dónde mirar en el código”

| Patrón / idea | Dónde abrirlo |
|---------------|---------------|
| Rutas y auth | `internal/httpapi/server.go` |
| Features de negocio | `internal/features/*` |
| Ports | `internal/ports` |
| Admin repository | `features/admindata`, `ports/admin.go` |
| Puente PrismaTec | `internal/corestore` |
| Ledger / idempotencia | `features/inventoryledger` |
| Composition root | `NewWithIdentity` en `httpapi` |
| Tests de feature | `features/*/…_test.go`, `features/testkit` |
| Scripts seguridad lab | `scripts/admin-e2e-cookie.sh`, `mobile-e2e-bearer.sh` |

---

## 14. Relación con el resto de la ayuda

| Documento | Enfoque |
|-----------|---------|
| `doc/README.md` + PDF de operación | Arrancar y probar |
| `MANUAL_FRAMEWORK_PRISMATEC.md` + PDF | Qué es PrismaTec-Core |
| **Este documento + `PatronesEmpleados.pdf`** | Cómo está diseñado el gemelo y cómo extenderlo con criterio |

Un solo idioma: claro, en primera persona, pensado para el equipo completo.
