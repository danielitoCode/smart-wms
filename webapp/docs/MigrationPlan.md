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

**Estado:** `VERIFIED` para el alcance frontend de R1 (2026-11-20). La evidencia definitiva es Webapp CI [run 44654858421 — SUCCESS](https://github.com/danielitoCode/smart-wms/actions/runs/44654858421), sobre HEAD `bb78f8615e6b5205758b01f7c35f2fc19f9c4213`; la matriz, excepciones y cierre están en [R1-Catalog-Warehouse-Structure-Audit.md](./R1-Catalog-Warehouse-Structure-Audit.md). Las limitaciones Flask de warehouse scope Zones/Bins y capacidad física permanecen documentadas como `BACKEND_LIMITATION`; no se presentan como capacidades resueltas ni bloquean el DoD frontend, conforme a la política de alcance de esta migración.

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

**Estado:** `IN_PROGRESS` (2026-11-20). `LookupBarcode` y `GetBinContents` integrados en `InventoryScreen.svelte`, con contexto de almacén y descarte de respuestas obsoletas. El contrato Flask de ajuste directo está verificado: transacción atómica por item/bin, retirada limitada al stock no asignado y conflicto `409`; no existe preview server-side, por lo que el CTA de ajuste sigue deshabilitado. `GET /api/admin/audit-log` no aplica warehouse scope y no hay endpoint de ledger completo; no se presentan como capacidades soportadas. Se corrigieron los errores de Typecheck detectados en los tests de lookup; falta validar CI/regresión sobre el HEAD definitivo. Detalle: [R3-Inventory-Stock-Lookup-Adjustments-Audit.md](./R3-Inventory-Stock-Lookup-Adjustments-Audit.md). No se modifica Flask.

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

### Seguimiento de R4 — estado de ejecución

**Estado global:** `IN_PROGRESS`. El trabajo se limita a `webapp/`; no se modifica Flask ni se exige que sus suites pasen para aceptar la migración frontend.

| Subtarea | Estado actual | Evidencia / siguiente condición |
|---|---|---|
| R4.1 — Reparar CI | `VERIFIED` | Guard nullable, typecheck/build, Gitleaks, Dependency Audit, Lockfile Version Check y Webapp CI verdes en `cd343913a88168ef180b79a74c227354b3767015`. La cobertura opcional sigue sin proveedor. |
| R4.2 — Pruebas Backorders | `IN_PROGRESS` | Añadidos tests de carreras, detalle, historial/paginación, doble submit, errores, estados y motivos cancelables. Regresión frontend: 200 archivos / 871 tests. La liberación real y concurrencia multi-cliente siguen limitadas por Flask y se registran en R4.3. |
| R4.3 — Seguridad backend | `BLOCKED_BACKEND` | Scope de cola/cancelación y atomicidad del motivo permanecen documentados en `webapp/.code-review/R4-Backorders-Scope-and-Security.md`. Sin cambios Flask, no se pueden cerrar como seguridad real del servidor. |
| R4.4 — Regresión final | `NOT_STARTED` | Ejecutar suites frontend y comprobar todos los workflows en el SHA definitivo. |
| R4.5 — Cierre R4 | `NOT_STARTED` | Revisar matriz completa y actualizar este plan y la auditoría R4 con evidencias del HEAD final. |

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

**Seguimiento R8 (22-11-2026):** auditoría inicial realizada sobre HEAD `5a2cb48adb09e2942f58eade176222744fb9b463`. La base Svelte existente cubre Users/Grants, Warehouse CRUD, Settings, Audit Log, Imports y Integrations; no se reconstruyen esos módulos. Se registran los hallazgos y el orden de trabajo en [R8-Administration-Users-Permissions-Configuration-Audit.md](../.code-review/R8-Administration-Users-Permissions-Configuration-Audit.md). Prioridades iniciales: impedir que los grants sintéticos de ADMIN se conviertan en grants USER al degradar el rol; cerrar en UI el acceso no-ADMIN a audit y administración global de almacenes mientras Flask no aplique warehouse scope; hacer explícito que Settings es global; prevalidar warehouse IDs en importaciones y bloquear reintentos completos tras resultado incierto; revisar reconciliación de sesión y secretos. Flask no se modifica.

**Estado:** `AUDIT_IN_PROGRESS / FRONTEND_HARDENING_REQUIRED / BACKEND_LIMITATIONS`. R8 no está cerrado. El HEAD de referencia de esta auditoría tenía Webapp CI fallido en typecheck por dos errores en `TransactionList.svelte` y su ruta de laboratorio; instalación de dependencias sí pasó. Build y suites quedaron omitidos, por lo que el cierre requiere resolver el bloqueo global y ejecutar la regresión frontend sobre el HEAD definitivo.

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


## 15. Inicio R4 — Sales Orders, disponibilidad, reservas y backorders

**Estado:** `IN_PROGRESS` — auditoría de contratos y paridad completada en primera pasada; implementación frontend pendiente.  
**Rama:** `svelte-webapp`  
**HEAD inspeccionado:** `282a62e50e582cba3c49e9827b100b8575800ba8`  
**Auditoría:** [R4-Sales-Orders-Backorders-Audit.md](./R4-Sales-Orders-Backorders-Audit.md)

R4 parte de módulos Svelte ya existentes en Sales Orders, Backorders y Customers. Se inspeccionaron React, rutas Flask, schemas y capas Svelte. No se modificó código funcional ni Flask en esta pasada.

### Confirmado

1. GET Sales Orders aplica warehouse scope, filtros y paginación real; GET detalle aplica scope y devuelve cabecera, líneas y pick tasks.
2. POST Sales Orders valida el schema, comprueba existencia de item y duplica número, y reserva parcialmente stock dentro de la transacción mediante bloqueo de filas. Svelte debe confiar únicamente en `quantity_allocated` devuelto por Flask.
3. React lista con status/búsqueda y 50 filas por página; Svelte ya utiliza paginación real y `exclude_post_fulfillment=true`.
4. Backorders tiene tabs waiting/ready-to-ship, cantidades de líneas y PO abierto derivado. El GET no aplica warehouse scope del usuario.
5. Customers sigue siendo una proyección read-only; no se ha demostrado API CRUD canónica.
6. El permiso `fraud` para listar SO no acredita un assessment de fraude en el detalle.

### Bloqueos y defectos

- **BACKEND_LIMITATION:** los handlers auditados de edición de cabecera, dirección, líneas, cancelación y cancel-backorder no muestran enforcement explícito de warehouse scope. La cola Backorders tampoco. La UI no puede garantizar protección frente a manipulación directa de IDs.
- **UNVERIFIED_CONTRACT:** creación no demuestra autorización del `warehouse_id` recibido ni validación de item activo.
- **FRONTEND_DEFECT:** `salesOrdersState.load()` descarta llamadas mientras ya está cargando y no invalida respuestas antiguas; `open(id)` tampoco protege frente a aperturas rápidas.
- **FRONTEND_DEFECT de confirmación:** el estado de creación descarta el detalle autoritativo devuelto por POST y recarga el listado sin conservar la asignación real del servidor.

### Implementación frontend completada — concurrencia y creación

Se corrigieron las cargas concurrentes del listado y el detalle mediante secuencias de solicitud; las respuestas antiguas ya no reemplazan el resultado más reciente ni alteran el indicador de carga. También se invalida una apertura pendiente al cerrar el detalle y se protege la recarga del pedido seleccionado después de mutaciones.

La creación conserva el detalle autoritativo devuelto por Flask, incluyendo las cantidades asignadas por la transacción. La UI abre ese pedido y presenta las columnas `Asignada` y `Pendiente de asignar`; esta última es solo la diferencia entre cantidad pedida y asignada, no una medida de stock disponible. Se añadieron pruebas de estado para carreras, cierre y creación con asignación parcial.

**Pendiente de verificación:** Webapp CI del HEAD final, revisión de resultados y regresión. No cerrar R4.

### Siguiente ejecución

Corregir las carreras de listado/detalle y preservar el resultado de creación en Svelte; añadir pruebas de estado/UI. Después completar la auditoría de Fraud, historial y liberación/cancelación, y la reconciliación detallada de Backorders. No habilitar controles que dependan de autorización server-side ausente. R4 no puede declararse cerrado mientras el aislamiento cross-warehouse de lecturas/mutaciones siga sin garantía backend.



## 16. R4 — reconciliación Backorders, cancelación, historial y Fraud (pasada 2)

**Estado:** `IN_PROGRESS`; la reconciliación funcional se completó y la implementación frontend de historial/guardas se añadió. No cerrar R4 por la existencia de limitaciones de seguridad backend.

### Implementado en `webapp/`

- Backorders mantiene paridad con React en tabs `waiting` / `ready-to-ship`, estados, orden de antigüedad, cantidades por línea, fechas y PO abierto derivado. La PO se identifica por artículo/almacén y no se presenta como vínculo persistido al backorder.
- La cancelación frontend vuelve a leer el detalle SO autoritativo y compara su warehouse ID con el almacén de la fila antes de permitir el POST. El use case verifica padre, almacén y estados permitidos; el state bloquea doble submit.
- Se incorporó historial por SO mediante `GET /api/admin/sales-orders/{id}/audit-history`, con mapeo Domain/Data y paginación. La pantalla de detalle solo lo solicita/muestra para ADMIN o usuarios con grant `fraud` / `audit-log`.
- Fraud se trata como revisión manual de pedidos en estado `FRAUD_REVIEW`. Se verificaron listado, detalle, memo con `expected_memo` y conflicto 409, push-to-queue con transición `FRAUD_REVIEW → OPEN`, y audit-history. No se crea ni muestra un score inexistente.
- Se añadieron pruebas de contrato del datasource y casos de dominio para auditoría por pedido y warehouse guard.

### Limitaciones backend que siguen bloqueando aceptación operativa completa

1. `GET /api/admin/backorders` no aplica warehouse scope del usuario; `warehouse_id` es un filtro controlado por el cliente.
2. `POST /api/admin/sales-orders/{id}/cancel-backorder` no verifica warehouse scope en el wrapper. La guarda frontend no impide llamadas directas.
3. El wrapper actualiza `cancellation_reason` antes de que el servicio compartido obtenga su lock; el servicio evita una segunda transición, pero se necesita prueba/fix backend para evitar sobrescritura de motivo bajo llamadas concurrentes.
4. El historial por pedido es audit log de la SO, no un ledger completo de movimientos de stock.
5. No hay Fraud assessment/scoring contract; solo existe la bandeja de revisión manual y la transición a preparación.

### Criterios de aceptación pendientes de verificación

- Webapp typecheck, build, suites Domain/Application/Infrastructure/UI/i18n/Integration, regresión completa y coverage by feature paths en un único HEAD final.
- Verificar CI por SHA exacto, no reutilizar el resultado de commits intermedios.
- Pruebas backend/concurrencia para cross-warehouse Backorders GET/cancel y carrera de `cancellation_reason`; fuera del alcance frontend actual.
- Revalidar los contratos de creación y demás mutaciones SO registrados en las secciones anteriores.

La evidencia detallada y la matriz de R4 se mantienen en [R4-Sales-Orders-Backorders-Audit.md](./R4-Sales-Orders-Backorders-Audit.md).

## 17. R4.2 — cierre de implementación frontend (pasada integral)

**Implementación:** `0351dab45ac5ca9d5dffe44e8a7dda60fd55805d` (la documentación de cierre se añade en el commit siguiente).  
**Estado funcional frontend:** `IMPLEMENTED`; verificación CI final pendiente sobre el HEAD que incluya esta actualización documental.

### Cambios incluidos

- La carga inicial, el reintento y la recarga tras cancelar pasan por una única función `loadQueue()`, que vuelve a resolver `resolveBackorderWarehouseScope()` antes de llamar al caso de uso. Un usuario no ADMIN sin almacén seleccionado ya no puede ejecutar un retry con `warehouseId=null`.
- La elegibilidad de cancelación se centraliza en Domain (`isBackorderCancelableStatus`) y se comparte entre listado, detalle y caso de uso. Solo `WAITING_STOCK`, `OPEN`, `PICKED` y `PACKED` son cancelables; los estados enviados/terminales quedan fuera de la acción.
- El listado comprueba permiso, almacén asignado, almacén de la cola actual y estado antes de mostrar/abrir la acción. Si cambia el almacén con el diálogo abierto, este se invalida; el submit vuelve a validar scope y estado antes de enviar.
- El detalle usa la misma política de estados, revalida el almacén antes del POST y no mantiene visible el diálogo si el pedido deja de ser cancelable.
- Se añadieron pruebas de política de estados y de errores HTTP 400/403/404/409. Se mantienen las pruebas existentes de carreras, detalle, historial, paginación, doble submit y ausencia de mutación optimista del inventario.
- En Sales Orders, una mutación que el servidor ya confirmó devuelve éxito aunque falle la recarga posterior; el fallo se conserva por separado en `refreshError` para pedir una recarga, sin inducir un reintento de la mutación. Se aplica a mutaciones comunes, ajuste de asignación, despacho administrativo y cancelación.

### Criterios R4.2

| Criterio | Resultado frontend | Evidencia / límite |
|---|---|---|
| Estados y motivos permitidos | `IMPLEMENTED` | Política Domain compartida + tests |
| Cola, retry y refresh con warehouse scope | `IMPLEMENTED` | Todos pasan por `loadQueue()`; no-admin sin selección bloqueado |
| Cancelación desde lista y detalle | `IMPLEMENTED` | Permiso, scope, padre/estado y doble submit comprobados en cliente |
| Cambio de almacén con modal abierto | `IMPLEMENTED` | Modal invalidado y submit revalidado |
| Errores 400/403/404/409 | `TESTED` | Se conserva el mensaje de error y se libera `saving` |
| Historial y paginación | `IMPLEMENTED` | Endpoint audit-history, permisos y pruebas de estado previas |
| Liberación de inventario | `SERVER_OWNED` | No hay mutación optimista local; la liberación forma parte de la transacción Flask |
| Concurrencia dentro de una instancia UI | `TESTED` | Secuencias de carga + guard de doble submit |
| Aislamiento entre clientes / atomicidad del motivo | `BLOCKED_BACKEND` | R4-BE-01/02/03; no se puede certificar desde Svelte |

**Decisión:** R4.2 queda completada para el alcance frontend. Esto no significa que los tres riesgos de seguridad/atomicidad backend estén resueltos. R4 global continúa condicionada a R4.3 (enforcement backend o aceptación explícita del bloqueo) y a la regresión CI del HEAD definitivo. No se modificó Flask/Python.



## 18. R4.2 — verificación final del HEAD de implementación

**HEAD verificado:** `b581c260364d03d4e2b77dcb75eb3b6ff404dee0`  
**Webapp CI:** `success` — [run 44861463776](https://github.com/danielitoCode/smart-wms/actions/runs/44861463776).  
**Regresión:** 200 archivos de prueba y 877 tests aprobados. Typecheck, build, Domain, Application, Infrastructure, UI, i18n, Integration y Full regression finalizaron correctamente.

Gitleaks [44861463770](https://github.com/danielitoCode/smart-wms/actions/runs/44861463770), Dependency Audit [44861463799](https://github.com/danielitoCode/smart-wms/actions/runs/44861463799) y Lockfile Version Check [44861463774](https://github.com/danielitoCode/smart-wms/actions/runs/44861463774) también terminaron `success`.

El paso opcional de cobertura intentó ejecutarse, pero no pudo generar el informe porque el proyecto no instala `@vitest/coverage-v8`; está marcado `continue-on-error`, por lo que no invalida la regresión funcional. No se afirma que exista reporte de cobertura.

**Cierre:** R4.2 queda `VERIFIED_FRONTEND` en el HEAD indicado. El workflow `Tests` [44861463773](https://github.com/danielitoCode/smart-wms/actions/runs/44861463773) es el pipeline Python/backend independiente; se deja fuera del alcance Svelte y no se usa para afirmar que el backend esté validado. Los bloqueos R4-BE-01/02/03 continúan abiertos. R4 global no queda cerrado por este resultado.



## 19. R4.2 — revalidación final del contexto del diálogo de cancelación

En la reauditoría de R4.2 se detectó un caso residual en `BackordersScreen.svelte`: el diálogo de cancelación se invalidaba al cambiar de almacén solo para usuarios no ADMIN. Aunque ADMIN puede consultar varios almacenes, el diálogo seguía asociado a la fila/cola anterior y podía confirmar desde un contexto ya cambiado.

**Corrección frontend:**
- Se guarda el contexto (almacén seleccionado y pestaña) al abrir el diálogo.
- Cualquier cambio de almacén o pestaña invalida el diálogo, también para ADMIN.
- El submit vuelve a comparar el contexto capturado con el contexto actual antes de llamar a cancelación.
- La política pura `isBackorderQueueContextCurrent` tiene pruebas para cambio de almacén (incluido ADMIN), cambio de pestaña y contexto estable.

**Commit de implementación:** `c9d7214a2e7b64a3cfade816e0a7489fd3ffaa63`.

**Verificación:** pendiente de la ejecución Webapp CI asociada al HEAD que incorpora esta actualización documental. No se modifica Flask/Python. R4-BE-01/02/03 continúan como limitaciones backend: la protección de contexto del cliente no sustituye el aislamiento server-side ni la atomicidad de la razón de cancelación. La liberación de inventario sigue siendo responsabilidad de la transacción backend.


### R5 — estado de ejecución frontend (auditoría 1ebf0053)

**Estado: `FRONTEND_GUARDS_IMPLEMENTED / BLOCKED_BACKEND`.** Se inspeccionaron las rutas Flask de Transfer Orders y de Inter-warehouse Transfers. Las rutas de listado/detalle de Transfer Orders y el historial IWH exigen scope de origen y destino; el frontend ahora aplica una segunda comprobación con la lista de almacenes autorizados. El detalle Transfer Order también se descarta si uno de los dos extremos queda fuera del scope.

La creación/importación, reserva, picking, aprobación/rechazo, short-close, cancelación/eliminación y el movimiento directo IWH quedan deshabilitados en el recorrido R5. Transfer Orders reserva cantidades agregadas sin relación persistida exacta por línea/bin y la aprobación mueve stock directamente al destino. IWH mueve stock inmediatamente, aunque su operación sea atómica/idempotente, sin despacho, saldo en tránsito ni recepción/put-away separados. No se debe usar ninguno como sustituto del ciclo R5.

Se añadieron el contrato futuro tipado `TransferLifecycleContract` (comandos/versiones/idempotencia, puerto y diez casos de uso nombrados), la política de scope dual, guardas en estados/UI y pruebas frontend para permisos cruzados y bloqueo de mutaciones. El historial permanece de solo lectura. **No se modifica Flask/Python.**

Auditoría detallada, matriz de aceptación y requisitos de backend: `webapp/.code-review/R5-Transfer-Lifecycle-and-Scope.md`. CI frontend sobre el HEAD definitivo pendiente; R5 no puede cerrarse hasta que el backend aporte reserva exacta, dispatch, tránsito, receive, put-away y ledger.


**Endurecimiento de contexto:** listado y detalle Transfer Orders descartan respuestas obsoletas; los filtros limpian detalle/snapshot seleccionado; cualquier fila fuera de ambos almacenes autorizados se oculta sin conservar metadatos de paginación del resultado no filtrado. La verificación CI de esta revisión queda pendiente.


## 20. R5 — cierre del alcance frontend y bloqueo del ciclo integral

**Estado de entrega:** `FRONTEND_IMPLEMENTATION_COMPLETE / BLOCKED_BACKEND`. La parte frontend de R5 queda implementada y documentada como consulta protegida; R5 no se etiqueta como recorrido logístico integral verificado porque el servidor no expone las garantías necesarias.

En la revisión final se corrigió una debilidad de autorización en las vistas de transferencias: Transfer Orders ya no usa el rol literal `USER` y ambas vistas derivan rol y `warehouseIds` de `authSession.getUser()`, alimentado por el perfil autenticado `/me`. Los almacenes del selector y los registros del historial se filtran con esos grants; ADMIN conserva el comportamiento global definido por la política. Sin sesión o grants, el frontend falla de forma cerrada.

Las mutaciones que no representan el ciclo requerido permanecen deshabilitadas. No se utiliza el endpoint de movimiento inmediato IWH como sustituto de dispatch/receive y no se invoca el flujo de Transfer Orders que reserva cantidades agregadas sin ledger exacto por línea/bin. No hay simulación de reservas, stock en tránsito, recepciones ni put-away.

**Criterios frontend cerrados:** contrato futuro tipado, política dual de almacenes, autorización basada en sesión, aislamiento de listado/detalle/historial, descarte de respuestas obsoletas, bloqueo de mutaciones inseguras, mensajes de indisponibilidad y pruebas de estado/política/contrato/UI documentadas en `webapp/.code-review/R5-Transfer-Lifecycle-and-Scope.md`.

**Bloqueo para R5 integral:** Flask debe implementar y probar reserva exacta transaccional, picking idempotente, short-close con liberación exacta, dispatch que cree saldo IN_TRANSIT, receive con autorización destino y conciliación, put-away con validación de bin/capacidad, cancelación/rechazo con ledger y auditoría/versionado. Hasta entonces la etiqueta correcta sigue siendo `BLOCKED_BACKEND`.

**Verificación CI:** pendiente sobre el HEAD definitivo de esta revisión. No se declara verde ni se afirma ejecución local. No se modificó Flask/Python.



## R6 — Preparar, recoger, empaquetar y expedir pedidos

**Estado de ejecución:** FRONTEND_HARDENING_IN_PROGRESS / BLOCKED_BACKEND.  
**Auditoría:** .code-review/R6-Picking-Packing-Shipping-Audit.md.

R6 conserva el flujo operativo React de escáneres: validar SO/TO → crear wave → consultar tarea siguiente → confirmar pick/short → completar batch → escanear/verificar packing → completar packing → fulfillment. No se reconstruyen CRUDs administrativos de tickets o batches como sustituto del flujo móvil. La creación manual legacy de batch fue retirada de la pantalla operativa; la selección de pedidos para wave se alimenta únicamente de SOs validadas por barcode.

**Implementación frontend aplicada:**
- Cola existente de tickets imprimibles: búsqueda por SO ahora envía warehouse_id y las respuestas de listado/detalle se descartan al cambiar warehouse generation. Las pantallas de impresión validan el warehouse del ticket antes de mostrarlo o marcarlo impreso. El listado Flask usa permiso sales-orders/fraud, el detalle usa picking-tickets; la ruta Svelte refleja ambos grants.
- Guards de rutas y navegación por allowed_functions de /api/auth/me: pick, pack, ship; ADMIN conserva acceso.
- Contexto warehouseId + generation en Picking, Packing y Shipping; las respuestas tardías de otro contexto se descartan y los detalles quedan ligados a la generación que los cargó.
- Picking consulta batch/tarea y valida SO/TO por barcode, pero mantiene fail-closed las mutaciones de crear wave/lote, confirmar, short-pick y completar batch. La UI no simula exclusión global: el backend todavía carece de lock/UPDATE condicional en pick_task, bin barcode atómico y transición idempotente de batch.
- Packing distingue picked de packed, impide completar si quedan unidades recogidas sin verificar y reconcilia contra Flask tras un timeout antes de permitir nuevos scans.
- Shipping liga el detalle al warehouse generation, pero mantiene fulfillment bloqueado porque Flask no acepta ni valida un paquete físico: solo sintetiza un package por SO. El servidor exige carrier/tracking no vacíos y bloquea el agregado SO con FOR UPDATE; el estado evita normalmente un segundo fulfillment, pero no hay GET shipment ni package barcode/ID para validar o recuperar una respuesta perdida.

**Bloqueos backend confirmados (sin modificar Flask/Python):** confirm_pick y short_pick permiten carrera entre operadores; ConfirmPickRequest no acepta barcode de bin; complete_batch carece de guard terminal/idempotente del batch; wave-create no tiene idempotency key; las rutas Flask no validan server-side los grants allowed_functions; y no existe GET de shipment. El contrato de shipping no acepta paquete/barcode/dimensiones: Flask sintetiza un paquete por SO; el detalle de shipping consulta quantity_packed pero lo omite en JSON, impidiendo reconciliar explícitamente picked/packed/shipped en la pantalla. Por ello ShipOrder permanece deshabilitado hasta que exista validación de paquete. Packing verify sí tiene una prueba de concurrencia real en api/tests/test_packing.py::test_concurrent_duplicate_pack_scans_cannot_overpack (dos test clients, respuestas 200/400 y cantidad persistida conciliada). Faltan pruebas equivalentes de picking/short, complete packing frente a verify y doble fulfillment.

**Pruebas frontend añadidas/ampliadas:** grants operativos, capacidades fail-closed, cambio de almacén/generation durante lecturas, reconciliación packing tras timeout, no doble submit local de fulfillment y conciliación picked/packed antes de completar. CI Webapp sobre el HEAD definitivo de esta iteración sigue pendiente; no se declara verde hasta completar el workflow.

**Criterio de cierre:** R6 no puede marcarse VERIFIED integral hasta que Flask implemente grants operativos en endpoints, bloqueo condicional/idempotencia de picking y batch, validación atómica de bin, replay de wave, consulta/reconciliación de shipment y pruebas PostgreSQL de dos conexiones para los casos pendientes. No se modificó Flask/Python.


## 21. R6 — hardening frontend del flujo operativo de escáner

**Estado:** `FRONTEND_HARDENING_IN_PROGRESS / BLOCKED_BACKEND`.  
**Auditoría:** `.code-review/R6-Picking-Packing-Shipping-Audit.md`.

Se conserva el patrón React de escáner: validar SO/TO, wave/batch, tarea siguiente, pick/short, packing por escaneo de artículos y fulfillment con transportista/tracking. No se crean nuevas páginas administrativas de tickets/batches; las pantallas supervisoras que React mantiene siguen siendo independientes del flujo operativo.

**Autorización y contexto:** `/picking`, `/packing` y `/shipping` usan los grants operativos `pick`, `pack` y `ship` de `/api/auth/me`, tanto en rutas como en navegación. Los estados ligan la lectura al `warehouseId + generation`, descartan respuestas obsoletas y rechazan acciones sobre un pedido cargado en un contexto anterior.

**Picking:** wave-create no se ejecuta porque no acepta idempotency key/replay general. ConfirmPick y ShortPick quedan bloqueados por ausencia de lock/UPDATE condicional de la tarea; CompletePicking queda bloqueado por ausencia de guard terminal/idempotente del batch; no existe validación atómica del barcode de bin. El frontend permite validar y consultar el trabajo real, pero no simula la ejecución ni la protección entre operadores.

**Packing:** se mantiene la conciliación independiente entre `quantity_picked` y `quantity_packed`. Completar solo se habilita cuando todas las cantidades recogidas están verificadas. Ante un fallo incierto de verify se consulta de nuevo el pedido antes de aceptar otro scan; si no se puede reconciliar, la pantalla queda bloqueada hasta volver a cargarlo. El contrato Flask produce un único paquete sintético, sin identidad de paquete ni multi-package packing.

**Shipping:** el detalle real y el método del pedido/default React `GROUND` se conservan, pero el fulfillment queda deshabilitado. Flask no acepta `package_id`/barcode de paquete y el GET de shipping omite `quantity_packed`; por tanto, no puede verificarse el paquete físico ni conciliar pick/pack/ship como exige R6. Aunque `/fulfill` bloquea la SO con `FOR UPDATE` y el estado evita normalmente un segundo fulfillment, no existe GET shipment para recuperar el resultado original tras timeout. El contrato frontend marca `validateShipmentPackage = NOT_SUPPORTED_BY_SERVER` y `shipOrder = PARTIAL`.

**Bloqueos integrales backend:** enforcement server-side de `allowed_functions`; concurrencia PostgreSQL de doble pick/short y complete batch; validación de bin dentro de la transacción; replay idempotente de wave; validación/identidad de paquete físico; exposición y conciliación de `quantity_packed`; concurrencia complete packing/verify y doble fulfillment; consulta/reconciliación de shipment. La prueba backend existente `test_concurrent_duplicate_pack_scans_cannot_overpack` no sustituye las pruebas faltantes.

**Verificación:** ejecutar y registrar Webapp CI en el HEAD definitivo de esta revisión. No usar workflows Python como aceptación frontend. No se modificó Flask/Python.

## R6 — avance de cierre Picking y Packing (21-11-2026)

Se completó un bloque adicional frontend:
- Picking valida que la tarea consultada pertenece al batch activo y usa el gate global de ejecución además de las capacidades individuales para ConfirmPick, ShortPick y CompletePicking. Wave/batch creation permanece bloqueada por falta de replay idempotente.
- Packing preserva la respuesta estructurada de `/api/packing/verify` (artículo y progreso), muestra el progreso del servidor y recarga el pedido para reconciliar cantidades persistidas.
- La política compartida de packing solo permite completar con líneas no vacías y cantidades enteras/no negativas exactamente conciliadas (`quantity_picked === quantity_packed`); cantidades excedentes tampoco pasan el gate.
- Se añadieron pruebas unitarias de mapper/use case y política de conciliación.

Esto cierra el hardening frontend de este bloque a nivel de implementación, no la aceptación integral R6. Siguen bloqueados por contrato backend el doble picking/short atómico, validación de bin, finalización idempotente del batch, replay de wave y shipment físico/consultable. Las pruebas PostgreSQL multi-conexión faltantes pertenecen al backend y no se simulan con tests frontend. CI debe validarse sobre el HEAD definitivo. Flask/Python no fue modificado.


### R6 — cierre de contrato Shipping y estado de regresión (21-11-2026)

Shipping conserva el contrato real de Flask: consulta de pedido por barcode y warehouse; líneas con quantity_ordered y quantity_picked; fulfillment con so_id, warehouse_id, tracking_number, carrier y ship_method opcional. El backend no devuelve quantity_packed, no expone GET shipment y no acepta identidad/barcode de paquete físico. No se agregan DTO, rutas ni estados inventados para cubrir esas ausencias.

El gate de validateShipmentPackage y shipOrder se comprueba en UI/state y en el límite de Application (FulfillShipmentUseCase): un llamado directo tampoco puede enviar el POST mientras la validación física de paquete siga sin soporte. La consulta sigue protegida por warehouseId + generation; respuestas obsoletas y contexto de almacén cambiado se descartan. Se añaden pruebas para la barrera de Application y se mantienen pruebas de DTO/mappers/datasource.

**CI anterior a este bloque:** Webapp CI sobre aaae5009bd4cb6190b0951b50f227e2a4544d4d7 falló en typecheck (svelte-check: 1 error, 100 warnings), por lo que build y suites se omitieron. Lockfile, Dependency Audit y gitleaks terminaron correctamente. Este resultado no certifica regresión.

**Criterio de aceptación:** R6 sigue FRONTEND_IMPLEMENTATION_PARTIAL / BLOCKED_BACKEND hasta que el HEAD final pase typecheck, build y las suites frontend Domain, Application, Infrastructure, UI, i18n, Integration y Full regression. Las pruebas reales de concurrencia PostgreSQL (doble pick/short, packing complete frente a verify, doble fulfillment y replay tras timeout) son dependencias backend; no se simulan ni se ejecutan desde esta migración. Flask/Python no se modifica.


## 22. R6 — verificación frontend definitiva (21-11-2026)

**HEAD validado:** `d4fe8246477efd9e9134583186e87af2300afe8c`.  
**Webapp CI:** [44871706656](https://github.com/danielitoCode/smart-wms/actions/runs/44871706656) — SUCCESS.

Shipping queda endurecido en UI/state y Application: `FulfillShipmentUseCase` rechaza fulfillment antes del repositorio si Flask no valida un paquete físico. Los DTO y mappers conservan el contrato real; no inventan `quantity_packed`, package ID/barcode ni GET shipment. Se mantienen los guards de permisos, warehouse context, generaciones, respuestas obsoletas y doble submit local.

**Resultados de la regresión Webapp:**
- Typecheck y build: PASS.
- Domain: 87 archivos / 363 tests.
- Application: 60 archivos / 258 tests.
- Infrastructure: 69 archivos / 279 tests.
- UI/presentation: 43 archivos / 245 tests.
- i18n: 1 archivo / 5 tests.
- Integration: 5 archivos / 24 tests.
- Full regression: **204 archivos / 911 tests PASS**.
- Coverage by feature paths: PASS (sin porcentaje global publicado).
- Lockfile Version Check, gitleaks y Dependency Audit: SUCCESS.

**Estado:** `FRONTEND_HARDENING_COMPLETE / BLOCKED_BACKEND`. El alcance frontend R6 está implementado y verificado. R6 no es un ciclo integral certificado mientras Flask no aporte los contratos, garantías transaccionales, enforcement server-side y pruebas PostgreSQL de concurrencia documentadas en `.code-review/R6-Picking-Packing-Shipping-Audit.md`. No se modifica Flask/Python ni se usan tests backend para la aceptación de Svelte.


## 23. R7 — Returns, RMA and Refunds (21-11-2026)

**Trazabilidad:** F3.5 Returns, F3.6 RMA, F3.7 Refunds, Inventory, Orders, Audit.  
**Estado inicial de implementación:** FRONTEND_IMPLEMENTATION_IN_PROGRESS / BLOCKED_BACKEND.

Se incorporan contratos y gates explícitos para R7:
- RMA: búsqueda de ventas enviadas, cálculo de cantidades autorizables (quantity_shipped - devoluciones RMA no anuladas), creación del RMA y lectura de detalle/recepciones.
- La política frontend valida enteros positivos, referencias de línea/artículo, no duplica líneas ni artículos (el endpoint de recepción solo identifica por item_id) y no permite superar la cantidad restante. Flask vuelve a validar el límite de forma transaccional bajo bloqueo del pedido original.
- Recepción física: el endpoint real registra item_receipts, incrementa inventario y avanza OPEN → PARTIALLY_RECEIVED → RECEIVED. La clave idempotente se genera y conserva en el cliente para reintentos/reconciliación.
- Reembolsos: listado/detalle de credit memos son solo lectura. GetRefund está soportado; CreateRefund queda NOT_SUPPORTED desde el cliente administrativo porque el POST real exige token POS y contrato de tender.
- ApproveRMA, ClassifyReturnedItem y RestockReturn separado quedan NOT_SUPPORTED: no hay endpoints/estados independientes; la recepción ya reabastece stock automáticamente.
- Se añaden guards para no llamar endpoints de relaciones e historial sin warehouse scope desde usuarios no ADMIN; memo se habilita solo con ADMIN o grant fraud.

**Bloqueos backend críticos:** create/receive/return-receipts/related carecen de warehouse scope; receive no rechaza un RMA anulado y no identifica una línea por so_line_id; idempotency_key de recepción es opcional; create-rma no tiene idempotencia ni audit de creación dedicado; no existe clasificación/disposición por condición; RMA físico y refund POS pueden incrementar inventario de forma separada sin conciliación de unidades. Los hallazgos y el plan de pruebas PostgreSQL están en .code-review/R7-Returns-RMA-Refunds-Audit.md.

**Criterio:** no declarar R7 integral VERIFIED hasta corregir los bloqueos server-side y ejecutar pruebas PostgreSQL de concurrencia/aislamiento/reconciliación. No se modifica Flask/Python ni se simulan operaciones sin endpoint. La certificación CI del frontend queda pendiente del HEAD definitivo de esta iteración.


## 24. R7 — cierre de implementación frontend y bloqueo de verificación (22-11-2026)

**HEAD de implementación:** `5ef2ae98f23eb8f4ce345a71ddb33a45740b8f93` (rama `svelte-webapp`).

El alcance frontend R7 está implementado: contratos y políticas de Returns/RMA, cantidades autorizables, consulta y creación de RMA conforme al contrato existente, recepción física con clave idempotente estable en el cliente, guards por rol/contexto, restricciones fail-closed para operaciones no soportadas y Refunds de solo lectura desde la sesión administrativa. Se añadieron cinco pruebas de estado en `src/test/unitTest/feature/returns/ui/returnsState.test.ts` para RMA anulado, anulación con recepciones, respuesta incierta de create-RMA, orden de respuestas de detalle y cierre durante una consulta pendiente.

**Verificación del HEAD:**
- Webapp CI [45028167255](https://github.com/danielitoCode/smart-wms/actions/runs/45028167255): FAIL en `Install dependencies`, antes de typecheck/build/tests. `npm ci` detecta que `webapp/package-lock.json` no contiene las versiones requeridas por el manifiesto actual (entre ellas undici-types, esbuild y rollup). Es un bloqueo de dependencias del workspace, no un fallo demostrado de R7.
- Lockfile Version Check [45028167292](https://github.com/danielitoCode/smart-wms/actions/runs/45028167292): SUCCESS; solo valida versión/formato del lockfile.
- Dependency Audit [45028167300](https://github.com/danielitoCode/smart-wms/actions/runs/45028167300): SUCCESS.
- gitleaks [45028167359](https://github.com/danielitoCode/smart-wms/actions/runs/45028167359): SUCCESS.
- El workflow separado `Tests` ejecuta pruebas backend y no forma parte del criterio de aceptación frontend de esta migración.

**Estado:** `FRONTEND_IMPLEMENTATION_COMPLETE / CI_BLOCKED_BY_LOCKFILE`. No declarar `FRONTEND_VERIFIED` hasta regenerar el lockfile coherente con `webapp/package.json` y ejecutar satisfactoriamente en el HEAD resultante la instalación limpia, typecheck, build, suites UI y regresión completa de `webapp/`. Las limitaciones Flask/Python continúan en `.code-review/R7-Returns-RMA-Refunds-Audit.md`; no se modificó backend ni se usaron pruebas backend para aceptar Svelte.

## R8.1 y R8.2 — hardening de usuarios y aislamiento administrativo (22-11-2026)

**Estado:** `FRONTEND_HARDENING_IMPLEMENTED / CI_PENDING / BACKEND_SCOPE_LIMITATIONS`.

- R8.1: los grants sintéticos de ADMIN no se reutilizan como permisos USER al degradar el rol; las cargas asíncronas de grants descartan respuestas obsoletas; después de modificar la cuenta propia o sus permisos se refresca `/api/auth/me` y el contexto de almacén. El guardado de usuario y el reemplazo de grants siguen siendo dos operaciones separadas y el UI conserva el error/estado parcial si falla la segunda.
- R8.2: Audit log y las vistas administrativas globales de almacenes quedan restringidas a ADMIN en route policy, shell y navegación. El page grant `warehouses` no amplía el selector operativo: USER queda limitado a los almacenes asignados en `/api/auth/me` y disponibles en el catálogo operativo; ADMIN mantiene alcance global.
- Pruebas nuevas: `src/test/unitTest/feature/auth/domain/AccessPolicy.test.ts`; se mantienen las pruebas de `src/test/unitTest/feature/users/domain/UserPageGrantPolicy.test.ts`.
- Auditoría detallada: `.code-review/R8-Administration-Users-Permissions-Configuration-Audit.md`.

**No cerrar R8 todavía:** CI Webapp debe pasar sobre el HEAD definitivo. Flask continúa sin scope por almacén para audit-log y CRUD administrativo de almacenes; ADMIN-only es una barrera frontend, no enforcement server-side. No se modifica Flask/Python.

## R8.3 y R8.4 — configuración e importaciones (22-11-2026)

**Estado:** `FRONTEND_HARDENING_IMPLEMENTED / CI_PENDING / BACKEND_LIMITATIONS`.

- R8.3: ajustes etiquetados como globales; edición y guardado bloqueados hasta carga correcta del servidor; reintento de carga; validación de claves conocidas y confirmación de cambios sensibles conservadas. El PUT envía solo claves modificadas. No se representa configuración por almacén porque Flask no ofrece ese scope.
- R8.4: preflight limita filas con `warehouse_id` al almacén activo y valida bins/default_bin mediante el catálogo operativo paginado del almacén. La operación se bloquea si no puede verificarse el catálogo o cambia el almacén durante el preflight. Se valida 10 MiB de archivo y payload serializado, además de 5.000 filas.
- R8.4: eliminado el reintento de filas fallidas. Un resultado parcial requiere reconciliación manual; un fallo sin resultado confirmado se representa como `unknown` y bloquea el reenvío del mismo archivo. Plantillas de almacén usan el contexto activo y la de productos no incluye stock inicial/bin de ejemplo.
- Pruebas añadidas: `src/test/unitTest/feature/settings/domain/SettingValidation.test.ts` y `src/test/unitTest/feature/imports/domain/ImportWarehouseScopePolicy.test.ts`.
- Auditoría detallada: `.code-review/R8-Administration-Users-Permissions-Configuration-Audit.md`.

**No cerrar R8 todavía:** CI Webapp completo debe pasar sobre HEAD definitivo. Flask aún carece de idempotencia de importación y de validación por fila de la relación warehouse/bin; los guards Svelte son una defensa de UX/datos, no sustituyen autorización backend.


## 25. R8.5 y R8.6 — integraciones, secretos y matriz de auditoría (22-11-2026)

**Estado:** `FRONTEND_HARDENING_IMPLEMENTED / CI_PENDING / BLOCKED_BACKEND_AUDIT`.

### R8.5 — integraciones y secretos

- El backend cifra credenciales al guardar; GET devuelve únicamente claves con valor enmascarado `****`; POST devuelve nombres de claves, nunca plaintext. El mapper descarta el valor del DTO, incluso si el servidor devolviera por error un valor real.
- Los campos sensibles siempre se muestran como password por schema o nombre de clave; el formulario descarta el draft al guardar, cambiar de almacén/conector o destruir la pantalla. Las llamadas de credenciales/test/sync llevan warehouse_id y el estado descarta respuestas/polling de contextos anteriores.
- Pruebas ampliadas: mapper que rechaza incorporar plaintext al dominio, pantalla que verifica enmascaramiento/limpieza, y estado de integraciones con stale responses, warehouse switch, 409 y polling.
- Flask no registra save/delete credentials, test connection ni sync enqueue; sí registra `SYNC_RESET`. No se fabrican eventos frontend.

### R8.6 — auditoría y limitaciones Flask

- Se añadió la matriz por operación a `.code-review/R8-Administration-Users-Permissions-Configuration-Audit.md`, con endpoints, presencia/ausencia de `write_audit_log`, manejo frontend y acciones backend requeridas.
- Los handlers de user CRUD/grants, settings, warehouse/zone/bin CRUD, importación de items/bins/PO/SO y credentials save/delete/test/sync enqueue no escriben audit_log en las rutas inspeccionadas. La importación de inventory-adjustments escribe por ajuste aplicado; sync-reset escribe `SYNC_RESET`.
- El audit-log carece de warehouse filter/scope; warehouse admin CRUD carece de scope. Svelte limita ambas vistas a ADMIN, sin pretender que sea enforcement backend.
- Para cerrar integralmente R8 se requieren eventos transaccionales con redacción de secretos, aislamiento por almacén, idempotencia/validación por fila de importaciones y política de invalidación de sesiones.

**No se modifica Flask/Python.** La matriz documenta las limitaciones; no equivale a una certificación backend ni a un ledger completo.


## 26. R8.7 — diagnóstico del bloqueo global y regresión (22-11-2026)

**Cambios frontend aplicados para desbloquear Webapp CI:**
- Se actualizó `src/test/unitTest/feature/imports/ui/importsState.test.ts`: el test antiguo esperaba `failedRows/retryFailedRows`, APIs eliminadas intencionalmente por R8.4. Ahora verifica que no se reenvía el mismo archivo y que solo tras reconciliar y preparar otro archivo puede ejecutarse una nueva importación.
- Se corrigió el tipo de `combinedStyle` en `src/lib/components/GridReveal.svelte`: el atributo Svelte `style` recibe una cadena CSS válida, no una unión string/objeto incompatible.
- Se reforzó la máscara de credenciales: los nombres sensibles siempre usan input password aunque el schema declare `secret: false`; el draft se descarta al destruir la pantalla. Se añadieron aserciones de integración para que plaintext inesperado no pase al modelo de dominio.

**Diagnóstico del último Webapp CI completado antes de estas correcciones:** run [45037456473](https://github.com/danielitoCode/smart-wms/actions/runs/45037456473), HEAD `06bf86d00b6260dbeaa009f65175a0fe1a697156`. Instalación y SvelteKit sync pasaron; typecheck falló con 3 errores (dos referencias obsoletas a `failedRows/retryFailedRows` y el tipo de `GridReveal.style`). Build y suites frontend se omitieron por el fallo de typecheck. Lockfile Version Check, Dependency Audit y gitleaks pasaron.

**Workflow backend separado:** [45037456503](https://github.com/danielitoCode/smart-wms/actions/runs/45037456503), mismo HEAD, terminó con **122 failed / 3.049 passed / 1.519 warnings**. Los fallos incluyen incompatibilidades de resultados con `batch_id` y aserciones de inventario/transferencias. Este workflow ejecuta pytest/Flask, no Svelte. No se modifica Python/Flask ni se usa ese resultado como aceptación frontend.

**Verificación del HEAD actual de esta actualización:** `e562108fd62a29fc834804d52e7dde1e5b047ece`. Webapp CI [45039317140](https://github.com/danielitoCode/smart-wms/actions/runs/45039317140) estaba en estado `pending` al registrar este diagnóstico; no se afirma que typecheck, build o regresión hayan pasado. Lockfile Version Check [45039317213](https://github.com/danielitoCode/smart-wms/actions/runs/45039317213) y gitleaks [45039317215](https://github.com/danielitoCode/smart-wms/actions/runs/45039317215) finalizaron correctamente. Dependency Audit y Tests seguían en ejecución.

**Criterio de cierre R8.7:** Webapp CI debe completar en el HEAD final con install, typecheck, build, Domain, Application, Infrastructure, UI, i18n, Integration y Full regression en verde. El workflow Flask/Python permanece como bloqueo global independiente y requiere un trabajo backend separado; no se puede declarar todo el repositorio verde desde una migración limitada a `webapp/`.


## 27. R9 — Integraciones, webhooks, auditoría y operaciones complementarias (22-11-2026)

**Estado:** `R9.4_FRAUD_CONTEXT_GUARDS / R9.5_CUSTOMERS_RACE_FIXED / R9.6_CI_PENDING`. La aceptación integrada continúa pendiente del Webapp CI en el HEAD definitivo.

- R9.1 baseline: Flask soporta Webhooks CRUD, secreto one-time, rotación, DLQ paginada, stats, errores y replay simple/lote. Las rutas usan page grant `webhooks`, pero el conjunto es global y no valida scope de warehouses del actor; por ello `/management/webhooks` queda ADMIN-only en AccessPolicy como mitigación de interfaz.
- El secreto one-time se elimina del estado de pantalla al desmontar WebhooksScreen. Se añadieron pruebas de policy ADMIN-only y limpieza del secreto.
- R9.2: Connectors mantiene las defensas de R8.5: secretos enmascarados, contexto warehouse_id, limpieza del draft y errores/estado separados de ejecución de sync.
- R9.3: Audit Log es global y no ofrece filtro/scope warehouse_id; route policy sigue ADMIN-only. La historia de auditoría de un SO sí valida scope del pedido y warehouse_id. Se corrigió la carrera de solicitudes de listado: solo la respuesta más reciente actualiza estado y loading.
- R9.4: Fraud representa pedidos en estado `FRAUD_REVIEW` y acciones manuales soportadas; Flask no devuelve score ni recommendation. No se inventará evaluación.
- R9.5: Customers es una proyección read-only de sales_orders/customer_name; no hay ID canónico ni paginación global de clientes. Dedupe/counts no se presentan como identidad/total global.
- Auditoría detallada: `.code-review/R9-Integrations-Webhooks-Audit-Customers-Fraud.md`.

**No se modifica Flask/Python.** Los guards frontend no sustituyen scope/autorización backend. Pendiente completar pruebas por subfeature y regresión Webapp CI en HEAD definitivo.


### Evidencia de implementación R9.4–R9.6

- Commits funcionales: `dee436f` (invalidación inmediata de Customers al cambiar almacén), `87a7912` (pruebas de contexto Customers), `1321af6` (guards de mutaciones Fraud), `e9b5904` (pruebas de contexto Fraud), `0e83523` (respuestas stale de búsqueda/listado), `2eae4a5` (prueba de carrera de búsqueda).
- La prueba de Customers verifica que una búsqueda antigua que termina después no sustituye la consulta nueva. La invalidación del almacén borra inmediatamente lista, selección e historial y aumenta los epochs de lista/detalle.
- Fraud conserva la semántica del servidor: la acción manual push solo se considera refrescada cuando la recarga devuelve un resultado vigente. Una respuesta de memo/push posterior a un cambio de contexto no modifica el estado visible.
- No se ha afirmado éxito de CI: el workflow Webapp CI del commit `2eae4a5` estaba pendiente/en curso al consultar; la rama avanzó después con un commit adicional de laboratorio `6f01b0d`, por lo que el HEAD definitivo debe verificarse de nuevo.


### R9.6 — resultado de CI y bloqueo de aceptación (HEAD `4ee1428ff66a672125dcde6c4e27b967c9f6892b`)

- **Webapp CI:** [run 45042682060](https://github.com/danielitoCode/smart-wms/actions/runs/45042682060) terminó en failure en `svelte-check`. Install y SvelteKit sync pasaron; build, Domain, Application, Infrastructure, UI, i18n, Integration, Full regression y coverage quedaron skipped.
- Los 26 errores reportados están fuera de los módulos R9 y se concentran en cuatro piezas de UI/lab: `TrueFocus.svelte` (3 incompatibilidades de Shape/opacity), `routes/lab/branched-menu/+page.svelte` (no existe `BranchedMenu.svelte`, por lo que sus callbacks quedan implicit-any), `routes/lab/flowing-menu/+page.svelte` (props inferidas como `never` porque `FlowingMenu.svelte` está incompleto y termina en el placeholder “FULL FILE CONTINUES IN ARTIFACTS”), y `routes/lab/magic-bento/+page.svelte` (prop `enableTilt` no declarada en `MagicBentoProps`). No se detectaron errores de typecheck en los archivos R9 modificados dentro del log de este run, pero eso no sustituye ejecutar las suites.
- **Secret scan:** [run 45042682110](https://github.com/danielitoCode/smart-wms/actions/runs/45042682110) success. **Lockfile Version Check:** [run 45042682010](https://github.com/danielitoCode/smart-wms/actions/runs/45042682010) success. **Dependency Audit:** [run 45042682014](https://github.com/danielitoCode/smart-wms/actions/runs/45042682014) estaba in_progress al consultar. **Tests:** [run 45042682039](https://github.com/danielitoCode/smart-wms/actions/runs/45042682039) es el workflow backend Python separado, no la suite Svelte, y seguía in_progress.
- **Decisión:** R9.4 y R9.5 tienen los cambios y pruebas unitarias añadidas, pero R9.6 no puede cerrarse ni certificarse hasta corregir esos bloqueos generales de TypeScript/lab y repetir Webapp CI completo. No se tocaron esas demos ajenas a R9 ni se modificó Flask/Python en este incremento.


### R9.4–R9.6 — actualización de hardening y CI (22-11-2026)

- Fraud: además de descartar respuestas de mutaciones obsoletas, los errores tardíos de memo/push ya no pueden contaminar el estado tras cambiar de almacén. Se añadieron dos pruebas para rechazos tardíos después de invalidar el contexto.
- Webapp CI del HEAD 4ee1428ff66a672125dcde6c4e27b967c9f6892b falló en typecheck (26 errores, 122 warnings en 53 archivos); build y suites Domain/Application/Infrastructure/UI/i18n/Integration/Full regression quedaron omitidas. Los errores reportados son de componentes/rutas de laboratorio, no de los módulos Fraud/Customers revisados. Esto bloquea la aceptación integrada R9.6.
- Lockfile Version Check, Dependency Audit y gitleaks: SUCCESS en ese HEAD. El nuevo HEAD 37d2f3577f8fcfd221a59f5c3abca5a91baf37ef necesita su propia ejecución CI; no se extrapola el resultado anterior.

**Estado:** R9.4 y R9.5 con hardening/pruebas de concurrencia implementados, sujetos a regresión; R9.6 BLOCKED_TYPECHECK_BASELINE hasta resolver los errores de laboratorio y ejecutar toda la matriz frontend. No se modifica Flask/Python.


## 28. R9 — cierre de aceptación frontend en HEAD `f8602108587c00b8ed73eba7e54a755ddb962c07` (22-11-2026)

**Estado actualizado:** `WEBAPP_CI_GREEN / R9_FRONTEND_ACCEPTED_WITH_BACKEND_LIMITATIONS`.

La entrada histórica R9.6 que indicaba CI pendiente queda supersedida por esta verificación del HEAD definitivo:

- **Webapp CI:** [run 45045373539](https://github.com/danielitoCode/smart-wms/actions/runs/45045373539), job `Typecheck · Build · Test`, conclusión `success`.
- Pasaron instalación, SvelteKit sync, `svelte-check + TypeScript`, build de producción, Domain, Application, Infrastructure, UI/presentation, i18n, Integration, Full regression y Coverage by feature paths. No hubo etapas omitidas por fallo de typecheck.
- **Secret scan:** [run 45045373504](https://github.com/danielitoCode/smart-wms/actions/runs/45045373504), `success`.
- **Lockfile Version Check:** [run 45045373564](https://github.com/danielitoCode/smart-wms/actions/runs/45045373564), `success`.
- **Dependency Audit:** [run 45045373540](https://github.com/danielitoCode/smart-wms/actions/runs/45045373540), jobs pip-audit, npm-audit-admin, npm-audit-mobile y npm-audit-mobile-dev en `success`.

### Resolución de los dos fallos de pruebas observados localmente

- Imports: la política sigue limitando a 5.000 filas; el test se alineó con el mensaje real sin separador de millares (`5000`). No se cambió el límite funcional.
- AccessPolicy: la expectativa de la ruta `/data` se alineó con sus grants de datos reales (`bins`, `zones`, `preferred-bins`); no se amplió la ruta para incluir `warehouses`.
- Commits: [d22d426](https://github.com/danielitoCode/smart-wms/commit/d22d426a79d8bf9bc84cbddb56480b3f46430606) y [f860210](https://github.com/danielitoCode/smart-wms/commit/f8602108587c00b8ed73eba7e54a755ddb962c07).

### Aceptación por subfeature

- **R9.1 Webhooks — aceptado en frontend:** CRUD y estados expuestos por Flask, secreto one-time/rotación con limpieza de plaintext, replay simple/lote y acknowledgement, DLQ, estadísticas, errores, filtros/paginación y validaciones/límites tienen implementación y pruebas frontend. La pantalla global queda ADMIN-only como mitigación de interfaz.
- **R9.2 Connectors — aceptado en frontend:** catálogo/schema global; credenciales y operaciones de conector asociadas al warehouse; tratamiento de secretos enmascarados y limpieza de drafts; manejo de errores y estados asíncronos cubiertos por pruebas. El método legacy `IntegrationsRemoteDataSource.test(name)` sin warehouse no se ha eliminado en este cierre: su uso en la rama no quedó demostrado por la búsqueda disponible y permanece como deuda de revisión, no como una capacidad nueva ni como prueba de scope.
- **R9.3 Audit Log — aceptado en frontend dentro del contrato:** filtros, paginación, sorting, redacción de presentación, route policy ADMIN-only y descarte de respuestas obsoletas cubiertos. La pantalla global no se presenta como aislada por almacén.
- **R9.4 Fraud — aceptado en frontend:** cola/acciones manuales conforme a Flask; guards de warehouse y concurrencia para memo/push; respuestas y errores stale no contaminan contexto nuevo. No se inventa score ni recommendation.
- **R9.5 Customers — aceptado como proyección read-only:** invalidación por cambio de almacén y control de carreras de búsqueda/listado/detalle. No se afirma identidad canónica, paginación global de clientes ni CRUD/merge.
- **R9.6 Regresión — aceptado:** la matriz Webapp CI completa quedó verde en el HEAD señalado.

### Limitaciones backend que permanecen abiertas (fuera del alcance de esta migración)

1. Webhooks y Audit Log exponen datos/operaciones globales sin aislamiento completo por warehouse del actor en las rutas administrativas inspeccionadas. ADMIN-only en Svelte es una mitigación UX; no sustituye autorización del servidor.
2. Audit Log no ofrece filtro/scope por warehouse; la redacción de detalles en el mapper protege presentación, no almacenamiento/API.
3. Flask no registra todas las operaciones relevantes de conectores y administración; el frontend no fabrica eventos.
4. Customers sigue siendo una proyección por nombre desde sales orders, sin identidad canónica ni paginación por cliente.
5. Fraud no dispone de score/recommendation en el contrato actual y solo admite las acciones manuales expuestas.

**Workflow separado `Tests`:** [run 45045373500](https://github.com/danielitoCode/smart-wms/actions/runs/45045373500) corresponde a otro job Python (lint, OpenAPI/schema y pruebas Python), no a la suite Svelte. Al registrar este cierre, su paso `Run tests` seguía en ejecución; no se usa para bloquear ni certificar la aceptación de `webapp/`.

**Decisión:** R9 queda aceptado para el frontend SvelteKit en el HEAD indicado, con las limitaciones backend anteriores registradas como dependencias explícitas. No se modificó Flask/Python.


### R9.2 — cierre del adaptador legacy sin warehouse (22-11-2026)

La revisión de `IntegrationsRemoteDataSource`, `IntegrationsRepositoryImpl` y `integrations.dependencies.ts` confirmó que el método legacy `test(name)` no tenía consumidores en el flujo de repository/DI y enviaba la petición sin `warehouse_id`. Se eliminó; el flujo soportado `testConnection(name, warehouseId)` permanece y su prueba verifica el contexto de almacén. Commit: [a20220f](https://github.com/danielitoCode/smart-wms/commit/a20220f95fc29c5639c7f7f180ef2e7f6f3f46f0).


## R10 — Paridad final, regresión y retirada segura de React

**Estado:** `IN_PROGRESS — ROUTE INVENTORY STARTED`  
**Baseline de inicio:** `e01b3250faa218fd04a2c48dc019d4e08c17b744`  
**Matriz de auditoría:** `.code-review/R10-Final-Parity-Regression-React-Retirement.md`  
**Primer inventario:** commit `3649fc88c268575e59855ce87a72dd50a0bd0486`.

Se inicia R10 sin retirar ni modificar el frontend React. Se inventariaron las 41 pantallas declaradas en `admin/src/App.jsx` y sus destinos canónicos en SvelteKit. El inventario detecta consolidaciones bajo `/management/[feature]`, rutas de flujo operativo separadas y una brecha que requiere resolver compatibilidad de navegación para RMA. También quedan por verificar los aliases históricos de datos y los deep links de las pantallas consolidadas.

**Reglas de aceptación R10:**
- La paridad se demuestra por acción/recorrido y resultado de negocio, no por existencia de ruta, captura o test de render.
- Cada acción debe vincular pantalla React, destino Svelte, transición, caso de uso, endpoint/DTO Flask, permiso, warehouse scope y pruebas.
- Los recorridos E2E se ejecutan con usuarios y almacenes representativos; las limitaciones Flask se registran como tales y sus acciones quedan deshabilitadas en frontend.
- Navegación directa, refresh, responsive, accesibilidad, estados UI e i18n se validan de forma explícita.
- Los mocks/fixtures/adaptadores de prueba no pueden llegar al runtime de producción.
- La matriz de regresión se congela y protege invariantes de R1–R9.
- React permanece intacto hasta completar evidencia y recibir aprobación explícita para retirarlo.

**Primer hallazgo:** React ofrece `/rma → /returns/rma`, pero el árbol Svelte inspeccionado no contiene esas rutas. `ReturnsScreen` contiene capacidades RMA, pero eso no demuestra compatibilidad de URL. Este gap se investigará y corregirá con redirect y pruebas si no existe una decisión de producto documentada que lo sustituya.

**No se declara R10 completada ni se afirma que se hayan ejecutado recorridos E2E.** El Webapp CI verde de R9 es la línea base técnica; no sustituye la comparación integral de negocio de R10.


### R10.2 — compatibilidad de deep links (implementada, pendiente de CI)

Se añadieron redirects HTTP 308 para 28 URLs antiguas de React hacia las rutas canónicas SvelteKit. Incluye aliases top-level de gestión, conteo cíclico, datos maestros y las rutas antiguas RMA/Refunds. El mapa está centralizado en `src/lib/navigation/legacyRouteRedirects.ts`, con prueba unitaria de integridad. Los redirects llevan al destino protegido; no replican ni relajan permisos.

**Commits de implementación:** mapa `480d6ace`, test `dff600df` y wrappers/rutas de compatibilidad hasta `bc3d84a`.  
**Estado:** `IMPLEMENTED_PENDING_CI_AND_BROWSER`. El Webapp CI sobre `bc3d84a` debe terminar antes de aceptar este bloque; también se requiere prueba en navegador de acceso directo, refresh y permisos. No se considera paridad E2E.

Se mantiene React como referencia; no se ha borrado ni modificado `admin/`.
