# Plan maestro de migración funcional — Smart WMS (React → SvelteKit)

> **Documento rector de ejecución.** Este plan sustituye la migración por fases de módulos aislados por una migración de capacidades y recorridos de negocio completos. Todo trabajo nuevo en `webapp/` debe seguir este documento. La rama objetivo es `svelte-webapp`.

- **Ámbito exclusivo de implementación y aceptación:** frontend SvelteKit en `webapp/`. Se compara con el frontend React original y se integra contra los contratos observados de Flask.
- **Objetivo:** alcanzar paridad funcional verificable con React dentro de `webapp/`, respetar los contratos y restricciones que Flask expone y dejar diseñadas/implementadas en frontend las capacidades futuras que el servidor aún no ofrece, sin simular que funcionan.
- **Límite de responsabilidad:** este proyecto NO modifica, corrige, amplía ni implementa Flask. Tampoco ejecuta ni exige que pasen las suites de pruebas del backend. Los fallos backend se registran como limitaciones/dependencias del servidor, no como defectos de la migración Svelte.
- **Uso de Flask como referencia:** sí se inspeccionan rutas, schemas, middleware, permisos, DTO, respuestas y comportamiento existente para alinear los adaptadores frontend. Esa inspección no autoriza cambios backend ni convierte sus pruebas en criterios de aceptación frontend.
- **Capacidades ausentes o incompletas en Flask:** documentar el gap y el contrato requerido; modelar en frontend dominio, casos de uso, puertos, DTO futuro y UI cuando corresponda; marcar la acción como no soportada/parcial, deshabilitar su ejecución y no inventar endpoints, persistencia, seguridad ni resultados. El frontend no debe afirmar que sustituye el enforcement del servidor.
- **Criterio de verificación:** solo cuentan para la aceptación los comandos y workflows de `webapp/` (Node 26, dependencias, check/typecheck, build, suites unitarias/de integración/UI/i18n y regresión frontend). Un workflow mixto solo cuenta por sus jobs identificados como frontend; un fallo de backend no se atribuye a Svelte.
- **Estado inicial de referencia:** HEAD auditado `9191bd8fd8cc62a38608f9db23202efdc3cf7687`. La medición porcentual anterior (55%) es una línea base histórica, no una certificación nueva de todos los recorridos.

---

## 1. Instrucciones obligatorias para cualquier persona o agente que trabaje en este plan

### 1.1 Trabajar por recorrido funcional completo, no por pantalla ni por feature aislado

Una función de negocio puede cruzar varios features. Ejemplo: **ingresar mercancía y dejarla correctamente disponible en un almacén** involucra identidad/autorización, almacenes, productos, órdenes de compra, recepción, staging, bins/ubicaciones, capacidad, inventario, auditoría y UI.

No se declara terminada una función porque:
- exista su pantalla;
- un caso de uso responda con datos mock;
- un endpoint se invoque sin validar su contrato;
- el frontend compile;
- se haya terminado una fase antigua que otra fase posterior puede sobrescribir.

Se declara terminada cuando el recorrido completo cumple sus criterios de aceptación, incluyendo caminos de error, permisos, almacén, consistencia, concurrencia, persistencia, feedback UI y pruebas.

### 1.2 Una sola pasada, con dependencias explícitas y sin reabrir módulos por fases

1. Establecer primero las reglas transversales y el mapa de capacidades del servidor.
2. Ejecutar los recorridos de negocio en orden de dependencia y valor operativo.
3. Cuando un recorrido necesite una capacidad de otro feature, completar el contrato mínimo y estable de esa capacidad dentro del mismo recorrido; registrar su propietario funcional para evitar duplicaciones.
4. No crear una implementación provisional para reemplazarla más tarde. No dejar una pantalla "terminada" si su recorrido depende de un flujo incompleto.
5. Las fases antiguas (F0, F1, F2, F3...) sirven como **índice de trazabilidad**, no como orden de ejecución ni como autorización para sobrescribir trabajo.
6. Una fase posterior no puede cambiar silenciosamente una regla ya aceptada. Todo cambio transversal debe actualizar el contrato, sus consumidores, pruebas de regresión y esta matriz.
7. Una función compartida tiene un único propietario (dominio/caso de uso). Otros features la consumen por puertos/casos de uso; no copian reglas ni mantienen estados paralelos.

### 1.3 No inventar contratos Flask

Antes de implementar cada integración:
- localizar la ruta real Flask, método HTTP, blueprint, middleware, permisos, validación, serialización, paginación, filtros y códigos de error;
- leer el servicio y esquema que respaldan la ruta, no inferirlo desde el nombre del endpoint;
- verificar qué almacén determina el servidor (contexto autenticado, parámetro, recurso o encabezado);
- documentar request/response real con ejemplos anonimizados y campos opcionales/nullables;
- comprobar si la operación realmente persiste y qué efectos laterales produce;
- distinguir endpoint existente, endpoint parcial, endpoint no disponible y endpoint no comprobado.

Los nombres de rutas que aparecen en notas históricas son pistas de búsqueda, no contratos garantizados. Por ejemplo, `/api/admin/items` y sus variantes deben contrastarse en Flask antes de usarse como autoridad.

### 1.4 Backend ausente: implementar el contrato frontend, no fingir ejecución

Cuando React contenga una función que Flask todavía no soporta, o se diseñe una mejora necesaria:
- modelar sus entidades, invariantes, casos de uso, puertos, DTO futuro y estados UI en Svelte;
- marcar la capacidad como `NOT_SUPPORTED_BY_SERVER` (o estado equivalente tipado);
- mostrar la función en la UI solo si ayuda a explicar el proceso, pero deshabilitar su ejecución y mostrar un mensaje accesible que explique qué falta en el servidor;
- no enviar una petición a una ruta inventada;
- no devolver éxito local, no mutar stock optimistamente, no guardar una operación ficticia en memoria/localStorage y no presentar datos mock como datos reales;
- permitir consulta/edición de borradores locales únicamente si esa conducta está definida explícitamente y se etiqueta como borrador no persistido;
- documentar el contrato backend requerido, permisos, efectos, idempotencia y pruebas que deberá implementar el backend en el futuro.

Mensaje recomendado: **“Esta operación todavía no está disponible en el servidor. Puedes consultar la información, pero no ejecutar ni confirmar este cambio hasta que el backend incorpore esta capacidad.”** El mensaje debe localizarse mediante i18n y no sustituir el detalle técnico para soporte.

### 1.6 Separación obligatoria de responsabilidades frontend/backend

La migración se ejecuta y se acepta exclusivamente en `webapp/`. Se permite inspeccionar Flask para conocer el contrato real, pero no modificarlo ni exigir que sus pruebas pasen. Clasificar cada hallazgo en una de estas categorías:

- `FRONTEND_DEFECT`: discrepancia o funcionalidad incompleta en React/Svelte, arquitectura, DTO/mappers, estado, navegación, permisos UX, contexto, cancelación o pruebas de `webapp`. Es responsabilidad de esta migración.
- `BACKEND_LIMITATION`: endpoint ausente, contrato parcial, permiso no aplicado por Flask, scope insuficiente, persistencia/transacción no disponible o defecto demostrado del servidor. Se documenta con evidencia; no se corrige aquí.
- `FRONTEND_GUARD_REQUIRED`: comportamiento frontend necesario para no invocar capacidades inexistentes, no enviar datos fuera del contexto seleccionado, no mostrar éxito ficticio y comunicar una respuesta/limitación del servidor. Sí es responsabilidad de `webapp`, pero no sustituye seguridad backend.
- `UNVERIFIED_CONTRACT`: evidencia insuficiente del comportamiento Flask. El frontend no debe inventar el contrato; mantenerlo explícito como no verificado y solicitar evidencia antes de integrar.

Los workflows pueden ejecutar suites de backend por separado o en paralelo. Sus resultados se informan como contexto del repositorio, pero no se usan para declarar fallida la migración frontend. Para el estado de R0/R1 se registran exclusivamente los jobs y comandos que validan `webapp`. Si una prueba de frontend falla porque el test esperaba una capacidad que Flask no ofrece, corregir el test para expresar el contrato real y el comportamiento frontend seguro; no implementar un backend ficticio ni debilitar una protección frontend válida.

### 1.5 Definición de terminado (DoD) obligatoria

Un recorrido solo se cierra si todos los puntos aplicables están demostrados:

- [ ] Paridad con React: acciones, reglas, estados, filtros, navegación, mensajes, restricciones y casos límite inventariados.
- [ ] Dominio: invariantes y políticas independientes de Svelte/HTTP; unidades y estados inequívocos.
- [ ] Aplicación: casos de uso completos, orquestación, autorización y errores explícitos.
- [ ] Data/Infrastructure: contratos Flask verificados, DTO y mappers probados, cancelación/timeouts y errores normalizados.
- [ ] UI: estados loading/empty/error/forbidden/not-supported/success; controles coherentes con permisos; sin éxito ficticio.
- [ ] Warehouse context: lectura y escritura restringidas al almacén correcto; cambio de almacén invalida consultas y selecciones dependientes.
- [ ] Consistencia en frontend: estados, validaciones, prevención de doble envío, cancelación y tratamiento explícito de conflictos conforme a lo que el contrato permita verificar. No se exige implementar ni certificar transacciones/concurrencia internas de Flask.
- [ ] Auditoría: representar y consultar los datos de auditoría que el servidor exponga; si no los expone, documentar el gap y preparar la integración futura sin inventar registros.
- [ ] Pruebas frontend unitarias de dominio/aplicación, mappers/DTO, repositorios con HTTP simulado, integración y UI/regresión. Las pruebas de Flask/backend quedan expresamente fuera de este DoD.
- [ ] Ejecutar los comandos de verificación de `webapp/` (Node 26, `npm run check`, suites frontend y `npm run build`, según scripts reales) sobre el HEAD definitivo; anotar resultados. No ejecutar ni exigir suites backend.
- [ ] No hay regresiones en recorridos previamente cerrados ni cambios silenciosos en contratos compartidos.
- [ ] Documentación actualizada: estado, rutas, permisos, gaps Flask, evidencias y commit.

---

## 2. Arquitectura obligatoria

El proyecto declara **Feature-First + Clean Architecture**, Svelte 5 (runes), SvelteKit y TypeScript. Mantener esta separación; no trasladar lógica de negocio a componentes.

Estructura conceptual (adaptar a las carpetas reales existentes; no crear duplicados si ya hay una abstracción equivalente):

```text
src/
  core/
    domain/                 # tipos compartidos de negocio solo si son realmente transversales
    application/            # puertos/casos de uso transversales
    infrastructure/         # HTTP, auth, capability registry, clock, logging
  features/
    <feature>/
      domain/
        entities/           # entidades y value objects
        policies/           # invariantes/reglas puras
        errors/
      application/
        ports/              # interfaces de repositorio/gateway
        use-cases/          # operaciones orientadas a intención
      data/
        dto/                # DTO Flask explícitos (no filtrar a dominio)
        mappers/            # DTO ↔ dominio
        repositories/       # adaptadores de puertos
      ui/
        components/
        screens/
        view-models/        # estado de presentación, sin reglas de negocio
  shared/
    ui/
    i18n/
    types/
  routes/                   # composición y routing SvelteKit, no reglas de negocio
```

### 2.1 Responsabilidades por capa

- **Domain:** Item, Warehouse, Bin, Stock, PurchaseOrder, Receipt, PickTask, Transfer, etc.; cantidades/unidades; estados; políticas de capacidad y transición. No importa Svelte, fetch, Flask ni DTO.
- **Application:** casos de uso como `ReceivePurchaseOrder`, `ConfirmPutAway`, `ReserveTransferStock`, `ConfirmPick`. Orquesta repositorios, políticas, autorización y resultados. No importa componentes ni detalles HTTP.
- **Data/Infrastructure:** adaptadores HTTP, DTO de Flask, serialización, paginación, errores y mappers. Es la única capa que conoce rutas/campos del servidor.
- **UI:** representa el estado del caso de uso y captura intención. No calcula stock disponible por su cuenta ni decide permisos basándose solo en ocultar botones.
- **Core/shared:** solo capacidades genuinamente compartidas. No crear un "mega servicio" que concentre reglas de todos los features.

### 2.2 Dependencias permitidas

`UI → Application → Domain`; `Data` implementa los puertos definidos hacia dentro. La composición conecta adaptadores. Domain/Application no importan SvelteKit ni DTO. Los componentes no llaman directamente a `fetch` ni construyen URLs.

### 2.3 Contratos, errores y resultados

- Usar tipos distintos para DTO externo, entidad de dominio y modelo de presentación.
- No usar `any` para ocultar diferencias del contrato.
- No convertir un campo ausente en cero, cadena vacía o estado válido salvo que el contrato lo defina.
- Mantener `null`, ausencia y valor vacío diferenciados cuando tengan semánticas distintas.
- Normalizar errores HTTP sin perder status, código de negocio, campos de validación y correlation/request id.
- Distinguir `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `VALIDATION_ERROR`, `SERVER_ERROR`, `NETWORK_ERROR` y `NOT_SUPPORTED_BY_SERVER`.
- La paginación debe reflejar el total del servidor. No deduplicar o filtrar una página y presentar el resultado como total global.
- Los cambios de almacén deben invalidar cache, formularios dependientes, selección de bins y datos de stock.

### 2.4 Capability Registry (capacidad real del servidor)

Crear/centralizar un catálogo tipado de capacidades, respaldado por evidencia de Flask, por ejemplo:
- `SUPPORTED`: endpoint y comportamiento confirmados;
- `PARTIAL`: existe una parte, pero no cubre el recorrido completo;
- `NOT_SUPPORTED`: Flask no expone la operación;
- `UNVERIFIED`: no se ha podido comprobar.

Cada capacidad registra: identificador, feature dueño, método/ruta real si existe, permiso requerido, scope de almacén, DTO, efectos laterales, idempotencia, limitaciones y evidencia (archivo Flask/commit/prueba).

La UI consulta este catálogo para deshabilitar acciones no soportadas. No usar detección heurística de 404 como única definición de capacidad. Un 404 de un endpoint soportado puede ser un recurso inexistente, no ausencia de función.

---

## 3. Modelo de negocio transversal: identidad, autorización, almacén e inventario

Estos controles se implementan una sola vez y son dependencias obligatorias de los recorridos.

### 3.1 Sesión y autorización

- Resolver sesión/token, expiración, refresh y cierre de sesión.
- Obtener usuario, roles/grants y almacenes autorizados desde el servidor.
- Definir permisos por intención (ver, crear, recibir, confirmar, mover, ajustar, aprobar, cancelar, administrar), no por nombre de pantalla.
- Verificar permiso en el caso de uso y volver a respetar la respuesta del servidor. La UI puede ocultar/deshabilitar acciones, pero no es frontera de seguridad.
- No confundir permiso global con permiso sobre un almacén o recurso concreto.
- Manejar 401 (sesión), 403 (sin permiso), 404 (recurso/scope no visible) y 409 (conflicto) sin filtrar información de otro almacén.
- No asumir que ser administrador permite saltarse invariantes de stock, capacidad o auditoría.

### 3.2 Warehouse Context

- Resolver almacén activo y conjunto de almacenes accesibles.
- Toda consulta/mutación con scope de almacén debe derivarlo del contexto autorizado o del contrato real; nunca confiar en un warehouse_id editable sin validación.
- Revalidar el almacén al abrir un recurso y antes de confirmar una mutación.
- Cambiar almacén invalida listados, detalles, contadores, bins, selecciones, reservas y formularios previos.
- Transferencias entre almacenes requieren autorización en origen y destino según reglas del servidor; el acceso a uno no concede acceso al otro.
- Los recursos sin almacén explícito deben documentar su scope (global, usuario, almacén o multi-almacén).

### 3.3 Inventario y capacidad física

Definir conceptos separados:
- existencia física;
- cantidad disponible;
- cantidad reservada/comprometida;
- cantidad en staging;
- cantidad en tránsito;
- cantidad bloqueada/dañada;
- capacidad de bin/ubicación (volumen, peso, unidades o capacidad configurada);
- capacidad restante.

No inferir que "stock vacío" equivale a "ubicación apta". Antes de sugerir o confirmar ubicación, evaluar compatibilidad de producto, capacidad restante, restricciones de zona/bin, estado de ubicación y concurrencia. Usar únicamente dimensiones y límites que existan en el modelo/servidor. Si Flask no tiene capacidad de bins, implementar la política y UI futura en frontend, marcar la comprobación como no disponible y no prometer que el servidor la aplica.

La validación de frontend mejora feedback; el backend debe volver a validar de forma transaccional antes de persistir. No se puede garantizar capacidad real solo con una lectura previa porque otro usuario puede ocupar el espacio entre lectura y confirmación.

---

## 4. Plan de ejecución por recorridos completos (orden obligatorio)

Las etiquetas F0–F6 se conservan para rastrear las fases históricas, pero los paquetes de trabajo siguientes son los hitos de entrega. Cada paquete puede tocar varios features y debe cerrarlos conjuntamente en el recorrido descrito.

### R0 — Plataforma operativa y contratos transversales
**Trazabilidad:** F0, infraestructura compartida, permisos, warehouse context, i18n y CI.

**Objetivo:** que todos los recorridos posteriores compartan una base segura, observable y coherente.

Trabajo:
1. Inventariar el frontend React: rutas, pantallas, acciones, permisos, filtros, estados, validaciones y navegación.
2. Inventariar Flask: blueprints/rutas, schemas, middleware, servicios, permisos, queries y transacciones.
3. Construir matriz de capacidades y contratos con evidencia; marcar cada una Supported/Partial/Not supported/Unverified.
4. Completar sesión, refresh, grants, warehouse context, cliente HTTP, errores, paginación, cache e invalidación.
5. Establecer componentes UI comunes para Forbidden, Not supported, Empty, Loading, Error y Conflict.
6. Configurar pruebas de contratos y regresión de los recorridos críticos.

Aceptación:
- No hay llamadas HTTP desde componentes.
- Ningún caso de uso permite una mutación sin autorización y scope resuelto.
- Las respuestas 401/403/404/409 se distinguen.
- El cambio de almacén no deja datos del almacén anterior en pantalla.
- Catálogo de capacidades y evidencia actualizado.

**Seguimiento 2026-11-19:** estado de referencia `IN_PROGRESS` para la base frontend. Se verificaron los contratos transversales de sesión, page grants y listado operativo de almacenes; se corrigieron la recuperación de sesión tras 401, la carga de grants después del login, la selección de almacén sin datos ficticios y el fail-closed de rutas sin política. Se añadió el Capability Registry, `UiStatePanel` y pruebas frontend de sesión/almacén. La adopción de `UiStatePanel` se amplió a las pantallas operativas, administrativas y de plataforma; ver [R0-Session-Grants-Integration.md](./R0-Session-Grants-Integration.md).
 
La auditoría de Flask registró gaps de warehouse scope, ausencia de enforcement general de `allowed_functions` y otras limitaciones del servidor. **Estos hallazgos son dependencias documentadas, no tareas de implementación ni bloqueos automáticos para avanzar con R1.** No se deben corregir en Flask dentro de esta migración. El frontend debe respetar lo que el servidor realmente ofrece, evitar prometer garantías que no existen y dejar documentadas las capacidades pendientes.
 
Siguen siendo criterios de R0 únicamente los pendientes del frontend: correspondencia completa de rutas React/Svelte, verificación de que la UI no realiza HTTP directamente, uso coherente del contexto de almacén, pruebas frontend y verificación de los workflows de `webapp` sobre el HEAD definitivo. Las suites backend no forman parte de la aceptación. Evidencia de contratos y limitaciones: [R0-Routes-Authorization-Warehouse-Audit.md](./R0-Routes-Authorization-Warehouse-Audit.md), [R0-Platform-Contracts.md](./R0-Platform-Contracts.md) y [R0-Session-Grants-Integration.md](./R0-Session-Grants-Integration.md).

### R1 — Preparar catálogo y estructura física del almacén
**Trazabilidad:** F1 Items, Bins, Zones, Warehouses; partes de F2 Inventory.

**Estado:** `VERIFIED` para el alcance frontend de R1 (2026-11-20). La matriz completa y las evidencias del workflow Webapp CI sobre el HEAD `812837b1d62fc1f73d65b6f2d4d46f1b940c80e2` están registradas en [R1-Catalog-Warehouse-Structure-Audit.md](./R1-Catalog-Warehouse-Structure-Audit.md). Las limitaciones Flask de warehouse scope Zones/Bins y capacidad física permanecen documentadas como `BACKEND_LIMITATION`; no se presentan como capacidades resueltas ni bloquean el DoD frontend, conforme a la política de alcance de esta migración.

**Objetivo:** tener los datos maestros y ubicaciones necesarios antes de mover mercancía.

Recorrido:
1. Usuario entra y se resuelve permiso + almacén activo.
2. Consulta productos/items, estado, SKU/barcode, unidad y restricciones.
3. Consulta almacenes, zonas, bins y estado de ubicaciones permitidas.
4. Crea/edita/archiva productos y ubicaciones solo cuando Flask soporte cada operación.
5. Antes de eliminar un producto/bin, verificar dependencias (stock, movimientos, PO/SO, tareas, referencias) conforme a Flask.
6. La UI muestra errores de dependencias y no ofrece borrado destructivo cuando no está permitido.

Capas:
- Domain: Item, Warehouse, Zone, Bin, UnitOfMeasure, BinCapacity y reglas de compatibilidad (solo campos reales o futuros etiquetados).
- Application: SearchItems, GetItem, Create/Update/ArchiveItem, ListBins, GetBin, Create/UpdateBin, CheckItemBinCompatibility.
- Data: DTO y mappers contrastados con Flask.
- UI: catálogo, detalle, formularios, filtros, selección de almacén y estados de capacidad.

No soportado:
- Si Flask no expone capacidad física, modelar `BinCapacity` como capacidad futura y mostrar "validación de capacidad no disponible en el servidor"; no inventar un límite ni bloquear por un dato ficticio.
- Si no existe CRUD de un recurso, no enviar requests a rutas supuestas.

Aceptación:
- CRUD/paridad React donde exista backend.
- Filtros y paginación exactos.
- Borrado/archivo respeta dependencias.
- Ningún producto o bin de otro almacén se filtra por accidente.

### R2 — Ingresar mercancía y dejarla correctamente almacenada
**Trazabilidad:** F2 compras/PO, Receiving, Inventory, Bins, Put-Away, Audit; integra F1 y F0.

**Este es el recorrido de referencia para validar el enfoque multifeature.**

**Flujo completo esperado:**
1. **Identidad:** iniciar sesión y resolver usuario, grants y almacenes accesibles.
2. **Contexto:** seleccionar/confirmar almacén destino; verificar que el usuario puede recibir allí.
3. **Producto:** localizar la PO/recepción y validar que cada línea referencia un item existente y activo, unidad correcta y cantidad válida.
4. **Documento:** comprobar estado de PO, proveedor si aplica, líneas abiertas, cantidades esperadas/recibidas y política de sobre-recepción. No asumir reglas: contrastar React y Flask.
5. **Ubicación de recepción:** obtener staging bin/ubicación válida para el almacén. Validar que existe, está activa y es apta según reglas reales.
6. **Capacidad:** calcular capacidad restante y compatibilidad cuando el modelo lo permita. Si Flask no expone capacidad o no valida esa regla, marcarla como pendiente de servidor; nunca mostrarla como garantizada.
7. **Recepción:** revisar cantidades recibidas, faltantes, sobrantes, dañados y motivo; validar decimales/unidades y límites.
8. **Confirmación:** enviar una sola operación idempotente si el contrato lo soporta; evitar doble clic/doble envío; mostrar conflicto si otro usuario cambió la PO/stock.
9. **Persistencia:** confirmar qué hace realmente Flask: receipt, staging, stock, PO lines, ledger y auditoría. No asumir que recepción equivale a stock disponible.
10. **Put-away:** consultar mercancía pendiente en staging, sugerir bin, verificar compatibilidad/capacidad y confirmar movimiento al destino.
11. **Resultado:** refrescar inventario, ubicación, PO, recepción y actividad; presentar cantidades y estado persistidos por servidor.

**Regla crítica:** separar "recibido en staging" de "ubicado/disponible". No incrementar stock ni costo promedio en frontend ni anticipar disponibilidad antes de la confirmación que realmente lo produce en backend.

Capas:
- Domain: Receipt, ReceiptLine, PurchaseOrderLine, StagedStock, PutAwayTask, BinCapacity, Quantity, ReceiptPolicy, PutAwayPolicy.
- Application: GetReceivablePO, ValidateReceipt, ReceiveItems, ListStagedStock, SuggestPutAway, ValidatePutAway, ConfirmPutAway.
- Data: contratos reales de Receiving y Put-Away; mapear IDs de receipt, PO, item, bin y cantidades sin pérdida.
- UI: recepción por documento/escaneo, resumen de discrepancias, staging, put-away, selección de ubicación, confirmación y resultado.

**Capacidades futuras si Flask no las tiene:** validación de capacidad, compatibilidad avanzada, idempotency key, reserva transaccional de capacidad, recepción parcial/dañados si no existe, vista agregada de trazabilidad. Implementar domain/application/DTO futuro/UI deshabilitada; registrar endpoint, request/response, permiso, transacción, conflictos y auditoría requeridos para Flask.

Aceptación:
- Un usuario sin grant o sin acceso al almacén no puede iniciar/confirmar.
- Una PO cerrada o línea no receivable no se confirma.
- Cantidades y unidades se validan sin redondeo silencioso.
- Doble envío no duplica recepción.
- Recibido, staging, put-away y disponible no se confunden.
- La ubicación no supera capacidad conocida; si la capacidad no puede comprobarse en servidor, la UI lo indica y no afirma una garantía.
- Inventario y PO reflejan exactamente la respuesta persistida.
- Pruebas de permisos, cantidades, concurrencia, conflicto, staging y put-away.

### R3 — Consultar stock, localizar y ajustar inventario
**Trazabilidad:** F2 Inventory, Lookup, Adjustments, Bins, Audit.

Recorrido:
1. Resolver almacén y permiso de lectura.
2. Buscar item por SKU/nombre/barcode y consultar detalle de stock.
3. Mostrar stock por bin, estado, reservado, staging, disponible y en tránsito si el backend distingue esos estados.
4. Escanear bin y mostrar su contenido.
5. Ejecutar ajuste solo con permiso, motivo obligatorio y límites del contrato.
6. Mostrar impacto y confirmación antes de mutar.
7. Actualizar inventario, resumen, bin y auditoría tras confirmación del servidor.

Casos de uso: SearchInventory, GetItemStock, GetBinContents, LookupBarcode, PreviewAdjustment, CreateAdjustment, GetInventoryMovements.

No soportado: si Flask no permite preview/ledger/ajuste granular, documentar el contrato futuro y deshabilitar la acción; no hacer cálculos que se presenten como saldo oficial.

Aceptación: aislamiento por almacén, búsqueda por código, stock consistente, motivo/auditoría, concurrencia y no permitir stock negativo salvo política confirmada.

### R4 — Preparar y procesar pedidos de venta
**Trazabilidad:** F3.1 Sales Orders, F3.2 Backorders, Customers (F6.2), Inventory, Warehouse, Fraud (F6.1).

Recorrido:
1. Resolver permisos de ventas y almacén.
2. Listar/filtrar pedidos con paginación real.
3. Ver detalle completo: cliente, líneas, cantidades, estado, notas, riesgo/fraude si existe.
4. Crear/importar/editar pedidos solo según capacidades reales de Flask.
5. Validar items activos, unidades, almacén, disponibilidad, cantidades y reglas de estado.
6. Separar líneas disponibles y pendientes/backorder; calcular disponibilidad usando dato del servidor, no una copia obsoleta.
7. Reservar stock de forma atómica si el backend lo soporta; gestionar concurrencia y conflicto.
8. Liberar/cancelar reservas al cancelar o modificar pedido, según transición real.
9. Mostrar historial y estado sin deducir éxito de una respuesta parcial.
10. Clientes: mantener el alcance read-only de F6.2 mientras no exista API administrativa canónica. No ofrecer CRUD ficticio.

Casos de uso: ListSalesOrders, GetSalesOrder, Create/UpdateSalesOrder, ValidateOrder, CalculateAvailability, ReserveOrderLines, ReleaseReservation, GetBackorders, GetCustomerProjection, GetFraudAssessment.

Aceptación:
- No sobre-reservar bajo concurrencia.
- Un pedido de otro almacén no se puede leer ni mutar por manipulación de ID.
- Backorder refleja faltantes reales y no duplica cantidades.
- Filtros, detalle, historial y paginación corresponden a Flask.
- Clientes read-only indican limitación del servidor cuando no exista API de gestión.

### R5 — Transferir inventario entre almacenes
**Trazabilidad:** F3.8 Transfer Orders, F3.9 Inter-warehouse Transfers, Inventory, Warehouse, Picking, Receiving, Audit.

Recorrido:
1. Validar acceso y permiso sobre almacén origen y destino.
2. Verificar que son distintos y que la transferencia está permitida.
3. Crear documento con líneas, unidades y cantidades válidas.
4. Validar stock disponible (no físico bruto), reservas existentes y restricciones.
5. Reservar cantidades en origen atómicamente; impedir doble reserva y sobreventa.
6. Iniciar picking y confirmar cantidades realmente recogidas.
7. Gestionar faltantes/short close sin inventar unidades.
8. Marcar mercancía en tránsito y evitar que aparezca disponible en destino antes de recibirla.
9. Recibir en destino con permiso del almacén destino.
10. Validar bins/capacidad en destino; ubicar mercancía y cerrar transferencia.
11. Conciliar origen, tránsito y destino; mostrar historial y auditoría.

Casos de uso: CreateTransfer, GetTransfer, ReserveTransferStock, StartTransferPicking, SubmitPickedQuantities, ShortCloseTransfer, DispatchTransfer, ReceiveTransfer, PutAwayTransfer, CancelTransfer.

Aceptación:
- aislamiento por almacén en listado, detalle, memo y retorno a cola;
- origen y destino autorizados independientemente;
- reservas concurrentes y liberación correcta;
- no doble picking, dispatch ni recepción;
- stock en tránsito diferenciado;
- cierre/rechazo/cancelación respeta estados y ledger;
- pruebas con dos usuarios y dos almacenes.

Si Flask no soporta reserva exacta, dispatch/receive o ledger, implementarlos como contratos futuros en frontend y deshabilitar esas acciones; no dividir una transferencia en mutaciones inseguras improvisadas.

### R6 — Preparar, recoger, empaquetar y expedir pedidos
**Trazabilidad:** F3.3 Picking Tickets, F3.4 Picking Batches, F3.10 Picking/Packing/Shipping, Sales Orders, Inventory, Audit.

Recorrido:
1. Validar grant operativo y warehouse context.
2. Obtener pedidos/tickets elegibles en el almacén.
3. Crear/consultar batch con las reglas de Flask (prioridad, ruta, zona, etc.).
4. Cargar tarea siguiente y validar barcode de item/bin.
5. Confirmar pick de forma atómica: tarea pendiente, cantidad, item, bin, batch y usuario.
6. Impedir que dos operadores confirmen simultáneamente la misma tarea.
7. Reportar short pick y recalcular el resto sin perder trazabilidad.
8. Completar batch/ticket y pasar al packing cuando las condiciones se cumplan.
9. Packing: verificar pedido, items y cantidades escaneadas; no asumir que pick equivale a pack.
10. Shipping: validar paquete, transportista, tracking y estado; confirmar fulfillment una sola vez.
11. Actualizar pedido, reservas, stock y auditoría según la transacción real de Flask.

Casos de uso: ListPickTickets, GetPickTicket, ListPickBatches, GetPickBatch, CreatePickBatch, GetNextPickTask, ConfirmPick, ShortPick, CompletePicking, VerifyPacking, ConfirmPacking, ShipOrder, GetShipment.

Aceptación:
- warehouse context en las tres pantallas y sus estados;
- DTO completos, incluyendo batch_id donde el contrato lo exija;
- doble picking y doble fulfillment imposibles;
- cantidad pick/pack/ship conciliada;
- transición de estado permitida y persistida;
- reintento de red no duplica fulfillment;
- no reconstruir páginas administrativas independientes que React retiró al trasladar el flujo a escáneres: respetar el patrón operativo actual.
- pruebas reales de concurrencia sobre la persistencia utilizada por Flask, además de unitarias.

### R7 — Devoluciones, RMA y reembolsos
**Trazabilidad:** F3.5 Returns, F3.6 RMA, F3.7 Refunds, Inventory, Orders, Audit.

Recorrido:
1. Localizar pedido/fulfillment original con acceso autorizado.
2. Seleccionar líneas y cantidades que pueden devolverse; evitar devolver más de lo enviado menos devoluciones previas.
3. Crear solicitud/RMA según política y permiso.
4. Registrar recepción física de devolución y condición (vendible, dañado, cuarentena), si el backend lo permite.
5. Decidir reintegro a stock, cuarentena o descarte conforme a regla explícita.
6. Ejecutar reembolso solo si existe integración/capacidad real; no equiparar devolución física a reembolso monetario.
7. Conciliar pedido, stock, RMA, refund y auditoría.

Casos de uso: CreateReturn, GetReturn, ApproveRMA, ReceiveReturn, ClassifyReturnedItem, RestockReturn, CreateRefund, GetRefund.

Aceptación: límites de cantidad, estados válidos, permisos, no duplicar devolución/reembolso y separación entre inventario y dinero. Todo paso sin endpoint se marca NOT_SUPPORTED y se presenta como no ejecutable.

### R8 — Administración, usuarios, permisos y configuración
**Trazabilidad:** F4, F0, Settings, Users, Grants, Warehouses.

Recorridos:
- crear/editar usuario y asignar rol/grants;
- conceder acceso a almacenes;
- administrar configuración del almacén;
- consultar auditoría;
- importar datos;
- administrar conectores/integraciones.

Reglas:
- un administrador UI no sustituye autorización backend;
- cambios de grants invalidan sesión/claims/cache cuando corresponda;
- no mostrar ni permitir acceso a datos de almacenes no asignados;
- auditoría de acciones administrativas;
- importaciones con preview/validación/errores por fila y operación idempotente si Flask lo soporta;
- secretos nunca se devuelven a UI después de guardados; no loggear tokens.

No soportado: CRUD, grants, configuración, replay, import o conectores sin ruta real se modelan/documentan, pero la acción queda deshabilitada con explicación.

Aceptación: permisos efectivos comprobados en UI y Flask, aislamiento, validación y regresión de usuarios existentes.

### R9 — Integraciones, webhooks, auditoría y operaciones complementarias
**Trazabilidad:** F5, F6.1 Fraud, Audit Log, Webhooks, Connectors, Customers.

- Webhooks: CRUD, rotación de secreto, DLQ, estadísticas, errores y replay solo según contrato real.
- Connectors: configuración segura, estado de sincronización, health y errores sin exponer credenciales.
- Audit Log: lectura filtrada por permiso y scope; resolver nombres sin consultas que filtren otros almacenes.
- Fraud: mostrar evaluación y recomendación del servidor; no inventar un score ni tratarlo como decisión autónoma si el backend no lo soporta.
- Customers: mantener proyección read-only hasta disponer de API canónica; la deduplicación dentro de una página no equivale a identidad global ni paginación global.

Aceptación: DTO, permisos, scope, paginación, secretos, errores y pruebas. Las capacidades inexistentes quedan registradas como futuras y no se presentan como operativas.

### R10 — Paridad final, regresión y retirada segura de React
**Trazabilidad:** todas las fases.

1. Matriz de rutas React → ruta Svelte → recorrido → casos de uso → endpoints Flask → permisos → pruebas.
2. Ejecutar recorridos de punta a punta en el orden R1–R9 con usuarios y almacenes representativos.
3. Comparar resultados de negocio y transiciones, no solo capturas visuales.
4. Verificar navegación directa, refresh, deep links, responsive, accesibilidad, estados vacíos/error y traducciones.
5. Revisar que no queden mocks, fixtures o adaptadores temporales en runtime.
6. Confirmar que cada función no soportada está etiquetada, documentada y deshabilitada.
7. Eliminar código React solo después de evidencia de paridad y aprobación explícita; conservarlo hasta entonces como referencia.
8. Congelar una matriz de regresión para impedir que una feature posterior sobrescriba reglas ya cerradas.

---

## 5. Mapa de features históricos y su relación con los recorridos

Esta tabla evita confundir "fase completada" con "proceso de negocio terminado". Un feature puede participar en varios recorridos; el cierre se concede por recorrido y luego se refleja aquí.

| Feature histórico | Recorridos propietarios | Dependencias compartidas | Nota de cierre |
|---|---|---|---|
| F0 Auth / grants / warehouse | R0 y todos | Sesión, permisos, scope | Base transversal; no duplicar por feature |
| F1.1 Items | R1, R2, R3, R4, R6 | Item, barcode, unidad | CRUD solo donde Flask lo soporte |
| Warehouses / Zones / Bins | R1–R6 | Warehouse context, capacidad | No asumir capacidad si no existe contrato |
| F2 Purchase Orders / Receiving | R2 | Items, bins, stock, audit | Recibir ≠ put-away ≠ disponible |
| F2 Inventory / Adjustments | R2, R3, R5–R7 | Ledger, reservas, movimientos | Saldo oficial procede del servidor |
| F3.1 Sales Orders | R4, R6, R7 | Customers, Inventory | Validar DTO, estados y warehouse scope |
| F3.2 Backorders | R4 | Sales Orders, stock | No sobre-reservar |
| F3.3 Picking Tickets | R6 | Sales Orders, Inventory | No cerrar solo por pantalla |
| F3.4 Picking Batches | R6 | Picking, warehouse | Contratos y eliminación permitida |
| F3.5 Returns | R7 | Orders, Inventory | Retorno físico y refund separados |
| F3.6 RMA | R7 | Returns, permisos | Aprobación/recepción trazables |
| F3.7 Refunds | R7 | Orders, integración financiera | No simular movimiento monetario |
| F3.8 Transfer Orders | R5 | Inventory, Picking, Receiving | Reserva y tránsito atómicos |
| F3.9 Inter-warehouse | R5 | Dos scopes de almacén | Autorizar origen y destino |
| F3.10 Picking/Packing/Shipping | R6 | Orders, stock, fulfillment | Concurrencia y no duplicación |
| F4 Administration | R8 | Auth, grants, audit | Seguridad primero |
| F5 Integrations/Webhooks | R9 | Secrets, HTTP, audit | Solo contratos Flask reales |
| F6.1 Fraud | R4, R9 | Orders, evaluación | Mostrar solo dato respaldado |
| F6.2 Customers | R4, R9 | Sales Orders | Read-only mientras falte API canónica |

### Estado heredado que requiere revalidación

La documentación previa registraba F1.1 Items como implementado/cerrado en cuanto a CRUD, búsqueda y contratos anotados para `/api/admin/items`; F6.2 Customers como proyección read-only en curso y sin API administrativa canónica. Son estados históricos: antes de cerrar R1/R4 hay que comprobarlos de nuevo contra el Flask actual, el React original y el HEAD de Svelte.

---

## 6. Reglas para evitar sobrescrituras y retrabajo entre fases

### 6.1 Registro de propiedad funcional

Cada regla compartida debe tener:
- identificador estable (ej. `INV-AVAILABLE-STOCK`);
- definición y propietario de dominio;
- caso de uso que la aplica;
- consumidores;
- endpoint/backend que la refuerza;
- pruebas que la protegen.

Ejemplos:
- disponibilidad/reservas: Inventory/Sales Orders; consumida por transferencias y picking;
- warehouse scope: Core Auth/Warehouse; aplicado en todos los repositorios;
- transición de recepción: Receiving; consumida por put-away e inventario;
- transición de fulfillment: Shipping; consumida por Sales Orders y Returns.

### 6.2 Cambios transversales

Antes de modificar una regla compartida:
1. localizar propietario y consumidores;
2. explicar por qué la regla anterior es incorrecta/incompleta;
3. actualizar dominio y contrato, no solo UI;
4. añadir/ajustar pruebas de todos los consumidores;
5. actualizar matriz de recorridos;
6. ejecutar regresión de los recorridos cerrados;
7. documentar migración de datos/API si aplica.

Prohibido: copiar la regla en otro feature, cambiar el significado de un estado por conveniencia de UI o cerrar una fase antigua sin comprobar los recorridos superiores.

### 6.3 Estados de avance

Usar únicamente:
- `NOT_STARTED`: sin análisis/implementación suficiente.
- `ANALYZED`: React, Flask y reglas inspeccionados.
- `IN_PROGRESS`: trabajo en curso.
- `BLOCKED_BACKEND`: contrato futuro implementado/documentado en frontend, ejecución bloqueada por Flask.
- `IMPLEMENTED_UNVERIFIED`: código existe, falta evidencia de pruebas/contrato.
- `VERIFIED`: DoD satisfecho con evidencia.
- `REGRESSION`: recorrido antes verificado dejó de cumplir.

No marcar como VERIFIED una operación cuyo paso esencial esté BLOCKED_BACKEND. Se puede declarar "diseño frontend completo, ejecución backend bloqueada", pero no "función operativa completa".

---

## 7. Pruebas: estrategia mínima por recorrido

| Nivel | Qué demostrar | Ejemplos |
|---|---|---|
| Domain | Reglas puras e invariantes | unidades, capacidad, transiciones, stock disponible |
| Application | Orquestación y permisos | no recibir sin grant, no confirmar sin warehouse |
| Data/contract | DTO Flask real | campos opcionales, wrappers, paginación, errores |
| Integration | Flujo entre repositorios/casos de uso | receive → staging → put-away |
| UI | Estados e interacción | disabled, forbidden, conflict, not supported |
| E2E | Resultado real persistido | recepción, transfer, picking, fulfillment |
| Concurrency | Carreras sobre backend/DB | doble receive, reserva, pick, ship |
| Regression | No sobrescritura | recorridos cerrados después de cambio transversal |

Las pruebas unitarias con repositorios fake no prueban concurrencia real. Para reservas, picking, transferencias y fulfillment se requiere prueba concurrente contra la misma clase de persistencia/aislamiento que utiliza Flask. Si el entorno no permite ejecutarla, dejarlo como no verificado.

### Puerta CI por entrega

Como mínimo:
- `npm run check`
- `npm run test` (o suites completas pertinentes más justificación)
- `npm run build`
- pruebas Flask/contrato cuando el cambio dependa del backend;
- revisar logs completos y repetir sobre el HEAD final.

Registrar commit, comando, resultado, duración y fallos. No copiar resultados de un commit anterior como evidencia del nuevo.

---

## 8. Medición de migración funcional

Mantener la metodología histórica basada en funcionalidades, no en archivos.

### 8.1 Unidad de medida

Usar un inventario estable de capacidades atómicas agrupadas en recorridos R0–R10. Cada capacidad se evalúa con cinco dimensiones:
1. comportamiento funcional/paridad React;
2. reglas y dominio;
3. aplicación/orquestación;
4. contrato Flask y persistencia;
5. permisos, almacén y estados UI/pruebas.

Escala por dimensión:
- `0`: ausente o incorrecto;
- `0.5`: parcial, solo algunos caminos o no probado;
- `1`: completo y verificado.

La puntuación de una capacidad es el promedio de dimensiones; ponderar las capacidades por criticidad operativa (crítica 3, alta 2, normal 1). La puntuación total es la suma ponderada de capacidades cerradas dividida por el máximo ponderado.

### 8.2 Tratamiento de backend ausente

- El diseño, dominio y UI futura pueden estar completos, pero una operación sin endpoint Flask **no cuenta como función operativa migrada**.
- Registrar por separado "preparación frontend" y "ejecución operativa".
- No bajar la paridad de una función React existente solo porque Flask tampoco la soporta; registrar que la función está limitada por el servidor y mostrarla como bloqueada.
- Una feature nueva que no existía en React (ej. Customers) se informa aparte y no aumenta el porcentaje de paridad React.
- No cambiar pesos ni inventario de capacidades entre revisiones sin registrar una nueva versión de metodología y recalcular la serie histórica.

### 8.3 Informe por revisión

Publicar: HEAD, fecha, capacidades añadidas/eliminadas, puntuación global, cambio en puntos porcentuales, estado por recorrido, bloqueos backend, CI y pruebas realmente ejecutadas. Si no hay commits/cambios funcionales, indicar "sin variación".

---

## 9. Plantilla de cierre de recorrido

Copiar esta ficha en el PR o informe de cada recorrido:

```markdown
### Recorrido: Rn — Nombre
- Estado: NOT_STARTED | ANALYZED | IN_PROGRESS | BLOCKED_BACKEND | IMPLEMENTED_UNVERIFIED | VERIFIED | REGRESSION
- Commit:
- Features involucrados:
- Rutas React comparadas:
- Rutas/servicios Flask verificados:
- Capacidades Flask ausentes/no verificadas:
- Permisos y warehouse scope:
- Entidades/policies:
- Casos de uso:
- DTO/mappers:
- Pantallas y estados UI:
- Invariantes y concurrencia:
- Pruebas ejecutadas (comando + resultado):
- CI del HEAD:
- Riesgos/decisiones:
- Evidencias:
- Criterios DoD pendientes:
```

---

## 10. Orden concreto de trabajo y dependencias

No empezar un recorrido si sus dependencias transversales están sin contrato. Orden recomendado:

1. **R0** — Auth, permisos, warehouse context, HTTP, errores, capability registry y matriz React/Flask.
2. **R1** — Productos y estructura física (warehouses/zones/bins).
3. **R2** — Recepción → staging → put-away → inventario disponible.
4. **R3** — Consulta de stock, lookup y ajustes.
5. **R4** — Sales Orders → disponibilidad → reservas → backorders → clientes read-only.
6. **R5** — Transferencia entre almacenes → reserva → picking → tránsito → recepción destino.
7. **R6** — Picking → packing → shipping/fulfillment.
8. **R7** — Returns → RMA → recepción → disposición de stock → refund.
9. **R8** — Administración, grants, importación y configuración.
10. **R9** — Webhooks, conectores, auditoría y Fraud.
11. **R10** — Regresión completa, paridad React, CI y retirada controlada de referencias React.

La secuencia puede ajustarse solo si una dependencia real lo exige; registrar el motivo y preservar la propiedad de reglas compartidas.

---

## 11. Riesgos conocidos que deben entrar al primer ciclo

A partir de los informes de seguimiento previos (no equivalen a una nueva ejecución de pruebas):
- fallos de typecheck frontend y advertencias pendientes;
- discrepancias de contratos/cantidades en Picking, Shipping, Transferencias y Cycle Counts;
- aislamiento por almacén en operaciones de transferencia;
- reservas y concurrencia en F3.8/F3.10;
- DTO de Picking/Shipping con campos como `batch_id` que requieren cotejo con los esquemas Flask actuales;
- Customers sin API administrativa canónica;
- historial/auditoría y paginación con límites de contrato.

Cada riesgo debe reabrirse solo con evidencia del HEAD/Flask vigente. No asumir que sigue fallando ni que se corrigió sin comprobarlo.

---

## 12. Fuentes y trazabilidad

- Repositorio: https://github.com/danielitoCode/smart-wms
- Rama: `svelte-webapp`
- Webapp: https://github.com/danielitoCode/smart-wms/tree/svelte-webapp/webapp
- React original y documentación de producto: revisar el código fuente React y los contratos Flask de la misma revisión antes de implementar cada recorrido.
- Referencia de commit de la línea base auditada: https://github.com/danielitoCode/smart-wms/commit/9191bd8fd8cc62a38608f9db23202efdc3cf7687
- Documento rector: `webapp/docs/MigrationPlan.md`

**Principio final:** el resultado buscado no es una colección de módulos Svelte que compilan. Es una aplicación WMS cuyos recorridos completos son coherentes de extremo a extremo, respetan permisos y almacenes, mantienen la integridad del inventario, coinciden con React donde corresponde y comunican honestamente las capacidades que Flask todavía no ofrece.


## R0 — Integración transversal de sesión, grants y UI

La política observada de `allowed_functions`, el alcance real de `allowed_pages`, el scope de almacenes, las pruebas de integración añadidas y los criterios pendientes de cierre están documentados en [R0-Session-Grants-Integration.md](./R0-Session-Grants-Integration.md).

**No declarar R0 cerrado:** la adopción de `UiStatePanel` debe verificarse pantalla por pantalla; el nuevo bloque de tests debe ejecutarse con Node 26; y el resultado del workflow CI del HEAD definitivo debe quedar registrado. No se debe introducir enforcement genérico de `allowed_functions` en el frontend ni atribuírselo a Flask sin implementar y probar el contrato backend.

## 13. Evaluación de transición R0 → R1 (actualizado 2026-11-20)

**Decisión: el gate frontend mínimo de transición R0 → R1 está satisfecho.** Esto habilita declarar R1 `VERIFIED` en el alcance frontend; no equivale a declarar R0 completo ni a cerrar discrepancias de otros recorridos.

### Hallazgos que ya no bloquean R1

1. **Integración de sesión:** los dos tests que fallaban en `AuthHttpIntegration.test.ts` se alinearon con el contrato Flask comprobado:
   - `/refresh` está protegido por `require_auth`; cuando `/me` devuelve 401 por token expirado, el frontend no intenta un refresh que también exige una sesión válida.
   - Flask rechaza cuentas inactivas durante `/login` con 401; la prueba ahora verifica que no se llama a `/me` ni se crea sesión. No se reutiliza una misma instancia `Response` ni se lee dos veces su body.
   - Suite Integration: 24/24 PASS.
2. **Grant independiente de Bins:** `data/+layout.svelte` y `data/+page.svelte` ya no exigen también el grant `zones`. El helper `dataNavigationPermissions.ts` decide acceso/landing según el grant individual; una prueba específica cubre un usuario con solo `bins`.
3. **Warehouse context:** suites de dominio, estado y UI verifican selección, invalidación de solicitudes antiguas, contexto activo y protección de mutaciones/filas cruzadas en frontend.
4. **Webapp CI:** el workflow completo se ejecutó sobre el HEAD definitivo documentado abajo; check, build, suites y regresión pasaron.

### Evidencia de aceptación R1

- HEAD: `812837b1d62fc1f73d65b6f2d4d46f1b940c80e2`.
- Webapp CI: https://github.com/danielitoCode/smart-wms/actions/runs/44652143070
- Resultado: PASS en Typecheck, Build, Domain, Application, Infrastructure/Data, UI/Presentation, i18n, Integration, Full regression y Coverage by feature paths.
- Matriz, conteos y limitaciones: [R1-Catalog-Warehouse-Structure-Audit.md](./R1-Catalog-Warehouse-Structure-Audit.md).

### Limitaciones que no bloquean la aceptación frontend

- Las rutas administrativas Flask de Zones/Bins no aplican enforcement de warehouse scope por usuario en todos los handlers inspeccionados. La UI protege el contexto y evita presentar/operar sobre filas ajenas cargadas fuera de contexto, pero esto no sustituye autorización server-side.
- Flask no acepta ni devuelve `max_weight_lbs` / `max_volume_cuft`; la UI informa que la validación de capacidad física no está disponible.
- El catálogo y el detalle de Items son globales; la UI identifica ese alcance.
- Los tests/suites backend y el workflow de escaneo histórico de secretos no forman parte del DoD frontend R1. Sus resultados se registran aparte y no se usan para atribuir éxito o fallo a `webapp`.

**Conclusión operativa:** R1 queda `VERIFIED` para frontend. R0 no se declara globalmente cerrado; los pendientes ajenos a R1 siguen bajo su propio gate. No se modificó Flask.


## 14. Cierre R1 — verificación final en HEAD actualizado (2026-11-20)

**Estado:** `VERIFIED` — alcance frontend SvelteKit.  
**Rama:** `svelte-webapp`  
**HEAD validado por CI:** `bb78f8615e6b5205758b01f7c35f2fc19f9c4213`  
**Webapp CI:** [ejecución 44654858421 — SUCCESS](https://github.com/danielitoCode/smart-wms/actions/runs/44654858421)

La ejecución Webapp CI correspondiente exactamente al HEAD indicado terminó correctamente. El job único `Typecheck · Build · Test` completó con éxito todos estos pasos:

| Paso | Resultado |
|---|---|
| Setup Node.js / instalación / sincronización SvelteKit | PASS |
| Typecheck (`svelte-check + TypeScript`) | PASS |
| Build de producción (SvelteKit / Vite) | PASS |
| Domain | PASS |
| Application | PASS |
| Infrastructure / Data | PASS |
| UI / Presentation | PASS |
| i18n | PASS |
| Integration | PASS |
| Full regression | PASS |
| Coverage by feature paths | PASS |

Esta ejecución posterior confirma la regresión frontend sobre el HEAD actual y sustituye como evidencia de cierre a la ejecución histórica de R1 registrada en la sección 13. No se trasladan conteos de pruebas de ejecuciones anteriores como si fueran mediciones de este run.

### Separación de workflows no frontend

En el mismo HEAD, el workflow independiente **Tests** (run [44654858367](https://github.com/danielitoCode/smart-wms/actions/runs/44654858367)) terminó en `FAILURE` en el paso `Run tests`, dentro del job Python/backend. Ese resultado se registra como incidencia del backend y queda fuera del DoD de migración SvelteKit, según el límite de responsabilidad de este plan. No se modifica Flask ni se declara que sus pruebas hayan pasado.

El workflow independiente **gitleaks** (run [44654858470](https://github.com/danielitoCode/smart-wms/actions/runs/44654858470)) también terminó en `FAILURE`; es un control de secretos del repositorio, no una suite de pruebas SvelteKit. Se mantiene como revisión de seguridad separada y no se oculta ni se atribuye a la regresión funcional de R1.

### Decisión

R1 queda formalmente cerrado como `VERIFIED` para `webapp/`: el HEAD `bb78f8615e6b5205758b01f7c35f2fc19f9c4213` tiene Webapp CI verde, con check, build, suites por capas, integración, regresión global y coverage by feature paths completados. Los fallos Python/backend y gitleaks permanecen visibles como resultados independientes; no se consideran aprobados ni se usan para invalidar el resultado específico de Webapp CI.

Se mantienen las limitaciones Flask ya documentadas en R1 (warehouse scope server-side de Zones/Bins, capacidades físicas de bins y alcance global del inventario de Items). La verificación frontend no certifica ni sustituye esas garantías backend. R0 no se declara globalmente cerrado.
