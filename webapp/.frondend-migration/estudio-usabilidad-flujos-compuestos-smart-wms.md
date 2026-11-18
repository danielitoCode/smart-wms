# Estudio de usabilidad, fricción funcional y flujos compuestos — Smart WMS

**Proyecto:** Smart WMS  
**Base funcional:** Sentry WMS (hightower-systems/sentry-wms)  
**Frontend objetivo:** `webapp/` (SvelteKit + Feature-First + Clean Architecture)  
**Fecha:** 2026-11-12  
**Alcance:** Comprensión de features, relaciones, flujos operativos, reducción de fricción y diseño de pantallas de intención que orquestan casos de uso sin degradar seriedad ni trazabilidad.

---

## 1. Propósito del estudio

Este documento responde a dos necesidades encadenadas:

1. **Entender por completo** el significado de cada feature, la relación entre features, los flujos funcionales y qué features intervienen en cada parte del flujo.
2. **Diseñar flujos compuestos** (pantallas de intención) que reduzcan la fricción, mimetizan pasos y bajan la curva de adopción, usando los módulos Clean Architecture (casos de uso) sin fusionar el dominio.

El ejemplo guía del estudio:

> En un sistema de inserción de un producto hay que declarar el producto en la nomenclatura y luego usar otra vista para comprarlo. Son dos pantallas para una sola función. En el mismo formulario de compra se debería poder seleccionar el producto y, si no existe, añadirlo ahí mismo, reduciendo fricción y abstrayendo al usuario de aprender varios pasos para una sola intención.

El objetivo no es simplificar el modelo de datos ni debilitar el backend. Es **cambiar el modelo mental de la UI**: de “menú de features” a “intenciones de trabajo”.

---

## 2. Glosario de features (significado operativo)

### 2.1 Catálogo y estructura del almacén

| Feature | Significado |
|---------|-------------|
| **Items** | Catálogo maestro de productos (SKU, nombre, UPC, peso, categoría, activo/archivado). |
| **Vendors** | Proveedores de compra. |
| **Warehouses** | Almacenes físicos (contexto multi-warehouse). |
| **Zones** | Zonas dentro de un almacén (STORAGE, RECEIVING, STAGING, SHIPPING, QUALITY, DAMAGE…). |
| **Bins** | Ubicaciones concretas (pasillo-fila-nivel). Contienen inventario. |
| **Preferred Bins** | Prioridad de ubicación sugerida por producto para put-away y picking. |

### 2.2 Inventario y control

| Feature | Significado |
|---------|-------------|
| **Inventory** | Stock por bin (on-hand, allocated, available). |
| **Inventory Adjustments** | Corrección manual de cantidad (ADD/REMOVE + motivo). |
| **Cycle Counts** | Conteo físico periódico por bin. |
| **Cycle Count Approvals** | Aprobación de diferencias de conteo (separation of duties). |

### 2.3 Abastecimiento (inbound)

| Feature | Significado |
|---------|-------------|
| **Purchase Orders (PO)** | Órdenes de compra (líneas, cantidades esperadas, estados). |
| **Receiving** | Recepción física: verificar ítems de un PO y registrar recibido. |
| **Put-Away** | Colocar mercancía recibida en bins (con sugerencia de preferred bin). |
| **Inbound Activity** | Actividad reciente de entradas. |

### 2.4 Cumplimiento de pedidos (outbound)

| Feature | Significado |
|---------|-------------|
| **Sales Orders (SO)** | Pedidos de cliente a cumplir. |
| **Backorders** | Líneas/pedidos no cumplidos por falta de stock. |
| **Picking / Picking Tickets / Batches** | Extracción de stock hacia el pedido (individual u ola). |
| **Packing** | Verificación de lo pickeado antes de embalar. |
| **Shipping** | Cierre de envío (carrier, tracking). |
| **RMA / Returns / Refunds** | Devoluciones y reembolsos. |

### 2.5 Movimientos internos

| Feature | Significado |
|---------|-------------|
| **Transfer Orders** | Orden formal de reposición entre almacenes (con posible aprobación). |
| **Inter-Warehouse Transfers** | Movimiento físico confirmado entre almacenes. |

### 2.6 Administración, seguridad e integración

| Feature | Significado |
|---------|-------------|
| **Auth** | Login, sesión, cambio de contraseña, alcance por almacén y permisos. |
| **Users** | Cuentas, roles, acceso a módulos, almacenes asignados. |
| **Dashboard** | Resumen del pipeline y alertas. |
| **Settings** | Parámetros de flujo (packing obligatorio, over-receiving, aprobación de conteos…). |
| **Audit Log** | Trazabilidad de acciones. |
| **Integrations / Tokens / Webhooks / Consumer Groups** | Conexión con ERP/comercio y eventos. |
| **Imports** | Carga masiva CSV/JSON. |
| **POS Activity / Fraud** | Ventas de punto de venta y retención por riesgo. |

---

## 3. Relaciones entre features

```
Auth ──────────────────────────────────────────────► (protege todo)
Users / Settings ──────────────────────────────────► (configuran permisos y reglas)

Items ◄──── Preferred Bins ────► Bins ◄──── Zones ◄──── Warehouses
  │                                    │
  │                                    ▼
  └──────────────► Inventory ◄──── Adjustments / Cycle Counts / Approvals

Vendors ──► Purchase Orders ──► Receiving ──► Put-Away ──► Inventory
                                      │
                                      └──────────────► Inbound Activity

Sales Orders ──► (allocation) ──► Picking ──► Packing ──► Shipping
     │                │              │
     │                ▼              ▼
     └──────────► Backorders    Inventory (decrementa allocated / on-hand)

Sales Orders ──► RMA / Returns ──► Refunds
Transfer Orders ──► Inter-Warehouse Transfers ──► Inventory (origen y destino)

Integrations / Tokens / Webhooks ◄──► (sincronizan Items, SO, PO, Inventory con ERP)
```

**Reglas de dependencia**

- Inventario y movimientos dependen de **Items + Bins**.
- Receiving y Put-Away dependen de **PO + Preferred Bins** (o de decisión en el momento).
- Picking / Packing / Shipping dependen de **SO + Inventory disponible**.
- Adjustments y Cycle Counts modifican **Inventory** y pueden requerir **Approvals**.
- Transfer Orders unen dos **Warehouses** y terminan en **Inventory**.
- **Users / Settings** gobiernan qué se puede hacer en cada feature.

---

## 4. Flujos funcionales principales y features intervinientes

### Flujo A — Alta de producto y disponibilidad para comprar / recibir

1. **Items** → crear SKU  
2. (Opcional) **Preferred Bins** → asociar ubicaciones  
3. **Vendors** → si se va a comprar  
4. **Purchase Orders** → crear PO con líneas  
5. **Receiving** → recibir  
6. **Put-Away** → ubicar  
7. **Inventory** refleja stock disponible  

**Features:** Items, Preferred Bins, Vendors, PO, Receiving, Put-Away, Inventory, Warehouses/Bins.

### Flujo B — Cumplir un pedido de cliente

1. **Sales Orders** (integración o alta manual)  
2. Allocation contra **Inventory**  
3. **Picking** (ticket / batch)  
4. **Packing** (si Settings lo exige)  
5. **Shipping**  
6. Actualización de Inventory  
7. Si falta stock → **Backorders**  

**Features:** SO, Inventory, Picking, Packing, Shipping, Backorders, Settings, (opcional) Integrations.

### Flujo C — Control de inventario

1. **Cycle Counts**  
2. Diferencias → **Cycle Count Approvals**  
3. Aprobación → efecto en **Inventory** (y/o **Adjustments**)  
4. **Audit Log**  

**Features:** Cycle Counts, Approvals, Adjustments, Inventory, Users, Settings.

### Flujo D — Reposición entre almacenes

1. **Transfer Orders**  
2. Picking en origen  
3. Aprobación (si aplica)  
4. **Inter-Warehouse Transfers**  
5. Inventory origen ↓ / destino ↑  

**Features:** Transfer Orders, Picking, Inventory, Warehouses, Approvals.

### Flujo E — Devolución

1. **RMA / Returns** desde SO original  
2. Recepción de mercancía devuelta  
3. **Refunds** (si aplica)  
4. Reingreso a Inventory o zona DAMAGE  

**Features:** RMA, Returns, Refunds, Inventory, SO.

---

## 5. Análisis de fricción funcional

### 5.1 Patrones de fricción detectados

| Patrón | Ejemplo | Coste para el usuario |
|--------|---------|------------------------|
| Catálogo previo obligatorio | Crear Item → crear PO → recibir | Varias pantallas para “traer mercancía nueva” |
| Contexto perdido entre listado y detalle | Ver SO en Dashboard → ir a Sales Orders → buscar de nuevo | Re-búsqueda constante |
| Acción que requiere otra feature abierta | Put-Away necesita Preferred Bins ya definidos | Parada a mitad de flujo |
| Aprobaciones fuera de flujo | Conteo → otra pantalla de Approvals | Cambio de rol/pantalla |
| Creación de maestros fuera de contexto | No hay SKU al crear línea de PO/SO | Abandonar el formulario |
| Multi-warehouse + picker de contexto | Cambiar almacén y re-filtrar | Carga cognitiva de “dónde estoy” |
| Operación móvil vs admin desacoplada | Receiving en móvil, seguimiento en admin | Dos paradigmas mentales |

### 5.2 El ejemplo del producto y la compra

**Hoy (modelo feature):**

1. Ir a Items → crear producto.  
2. Ir a Vendors → (si hace falta).  
3. Ir a Purchase Orders → crear PO y líneas.  
4. Ir a Receiving → recibir.  
5. Ir a Put-Away → ubicar.

**Intención real del usuario:** “Ha llegado / quiero comprar y dejar disponible este producto.”

La fricción no está en la regla de negocio; está en **obligar a aprender y recorrer cinco contextos** para una sola intención.

---

## 6. Optimizaciones recomendadas (mimetizar pasos)

| Prioridad | Optimización | Features tocadas | Impacto |
|-----------|--------------|------------------|---------|
| 1 | Wizard **Inbound unificado** (Item + Vendor + PO + Receive + Put-Away) | Items, Vendors, PO, Receiving, Put-Away, Preferred Bins | Muy alto |
| 2 | **Inline create** Item/Vendor en líneas de PO/SO/Adjustments | Items, Vendors, PO, SO, Adjustments | Alto |
| 3 | Preferred Bin “aprender al usar” en Put-Away | Preferred Bins, Put-Away | Alto |
| 4 | Aprobaciones in-context (conteos y transferencias) | Cycle Count Approvals, Transfer Orders | Alto |
| 5 | Dashboard accionable (deep-link + acción) | Dashboard + operativos | Alto |
| 6 | Unificar Adjustments con resultado de Cycle Count | Adjustments, Cycle Counts, Approvals | Medio-alto |
| 7 | Flujo “Mover stock” simplificado | Transfer Orders, Inter-Warehouse Transfers | Medio |
| 8 | SO con disponibilidad en vivo + backorder automático | SO, Inventory, Backorders | Alto |

**Principios derivados**

1. Una intención de usuario = un flujo.  
2. Los maestros se crean en el momento de uso (datos mínimos).  
3. Las aprobaciones viven dentro del objeto que aprueban.  
4. El sistema sugiere y recuerda (bins, carriers, zonas).  
5. El Dashboard inicia trabajo; no solo informa.  
6. Separar rol operador (wizards) de rol administrador (configuración y excepciones).  
7. No obligar a entender el modelo interno (TO vs transfer físico, Adjustment vs variance de conteo).

---

## 7. Flujos compuestos (pantallas de intención)

### 7.1 Principios de composición

1. **Una intención = un flujo.**  
2. **Los módulos Clean Architecture no se fusionan.** Domain, data y usecases de cada feature se mantienen. La pantalla de intención **orquesta** casos de uso.  
3. **Creación mínima en contexto.**  
4. **Sugerencias del sistema.**  
5. **Aprobaciones y excepciones dentro del objeto** (salvo separation of duties obligatoria).  
6. **Dos modos:** operador (wizards) y administrador (listados y configuración).  
7. **El backend Flask sigue siendo la autoridad.**

### 7.2 Dónde vive la intención en la arquitectura

```
Pantalla de intención (UI)
        │
        ▼
Orquestador de flujo (application / UI state)
  - coordina pasos
  - llama usecases de distintas features
  - gestiona estado del wizard
        │
        ├──► ItemsUseCases
        ├──► PurchaseOrdersUseCases
        ├──► ReceivingUseCases
        ├──► PutAwayUseCases
        ├──► InventoryUseCases
        └──► …
```

Estructura sugerida:

```text
src/core/feature/
  items/ …
  receiving/ …
  putaway/ …
  flows/                      ← solo composición
    inbound/
      application/RunInboundFlow.ts
      ui/InboundWizard.svelte
    outbound/
    stock-correction/
    transfer-stock/
```

### 7.3 Catálogo de flujos compuestos

#### Flujo 1 — Recibir mercancía (Inbound unificado)

**Intención:** “Ha llegado mercancía y quiero dejarla lista en ubicación.”

| Paso fragmentado | Paso compuesto |
|------------------|----------------|
| Crear Item | Inline en la línea |
| Crear Vendor | Inline |
| Crear / buscar PO | Buscar PO o recepción ad-hoc |
| Receiving | Mismo wizard |
| Put-Away | Paso final opcional |
| Preferred Bins | “Recordar esta ubicación” |

**Casos de uso orquestados (ejemplos):**  
`SearchItems` / `CreateItem`, `SearchVendors` / `CreateVendor`, `GetPurchaseOrder` / `CreatePurchaseOrder`, `ReceivePurchaseOrderLines`, `SuggestPutAwayBin` / `ConfirmPutAway`, `UpsertPreferredBin`.

#### Flujo 2 — Preparar y enviar pedido (Outbound unificado)

**Intención:** “Este pedido debe salir hoy.”

1. Seleccionar / escanear SO.  
2. Disponibilidad en vivo.  
3. Picking.  
4. Packing (si Settings lo exige).  
5. Shipping.  
6. Backorder automático de líneas sin stock.

**Casos de uso:**  
`GetSalesOrder`, `ListReadyToPick`, `GetInventoryAvailability`, `StartPicking` / `ConfirmPickLine`, `StartPack` / `ConfirmPackLine`, `ShipOrder`, `CreateBackorderLine`.

#### Flujo 3 — Corregir stock

**Intención:** “El físico no coincide con el sistema.”

Orígenes unificados: ajuste directo, variance de cycle count, short pick.

**Casos de uso:**  
`CreateAdjustment`, `ListPendingCycleCountApprovals`, `ApproveCycleCountVariance` / `RejectCycleCountVariance`, `GetBinInventory`.

#### Flujo 4 — Mover stock entre almacenes

**Intención:** “Necesito stock en el otro almacén.”

Origen, destino, ítems, cantidades; aprobación embebida si la política lo exige; confirmación física cierra el movimiento.

**Casos de uso:**  
`CreateTransferOrder`, `SubmitTransferForApproval` / `ApproveTransferOrder`, `ConfirmInterWarehouseTransfer`, `GetInventoryAvailability`.

#### Flujo 5 — Alta rápida de producto usable

**Intención:** “Necesito este SKU ya.”

Crear Item + opcional Preferred Bin + opcional añadir a PO.

**Casos de uso:** `CreateItem`, `UpsertPreferredBin`, `AddLineToPurchaseOrder` / `CreatePurchaseOrder`.

#### Flujo 6 — Devolver mercancía de un pedido

**Intención:** “El cliente devuelve; reingresar o liquidar.”

SO original → líneas → RMA/Return → recepción → Refund opcional.

**Casos de uso:** `GetSalesOrder`, `CreateRma`, `ReceiveReturn`, `CreateRefund`, ajuste de Inventory.

#### Flujo 7 — Centro de trabajo del día

**Intención:** “¿Qué me queda pendiente en mi almacén?”

Hub accionable: POs por recibir, SO listos para pick, conteos por aprobar, transferencias pendientes, short picks. Cada fila abre el flujo compuesto correspondiente.

### 7.4 Prioridad de implementación

| Orden | Flujo | Impacto | Esfuerzo |
|-------|-------|---------|----------|
| 1 | Recibir mercancía (Inbound) | Muy alto | Medio-alto |
| 2 | Alta rápida de producto | Alto | Bajo-medio |
| 3 | Corregir stock | Alto | Medio |
| 4 | Preparar y enviar pedido (Outbound) | Muy alto | Alto |
| 5 | Mover stock entre almacenes | Medio-alto | Medio |
| 6 | Devolver mercancía | Medio | Medio |
| 7 | Centro de trabajo del día | Alto (adopción) | Bajo-medio |

### 7.5 Qué no hacer

- No fusionar entidades de dominio.  
- No saltarse permisos ni aprobaciones obligatorias de Settings.  
- No ocultar estados críticos (short pick, variance, hold por fraude).  
- No crear un orquestador global; un orquestador pequeño por intención, testeable.

---

## 8. Ventajas de la simplificación por flujos compuestos

### 8.1 Para el usuario operativo

- **Menos pasos visibles** para la misma capacidad funcional.  
- **Menor carga cognitiva:** no hace falta memorizar el mapa de features.  
- **Curva de adopción más baja:** se aprenden 4–6 intenciones, no 20+ pantallas.  
- **Menos errores de navegación** (olvidar preferred bin, abandonar el PO a medias, etc.).  
- **Trabajo guiado por escaneo y sugerencias**, alineado al uso real en planta.

### 8.2 Para el administrador y el negocio

- **Misma trazabilidad y auditoría:** cada paso sigue llamando a los mismos endpoints y deja rastro en Audit Log.  
- **Mismos permisos y separation of duties:** la UI no es la frontera de seguridad.  
- **Menos formación y menos dependencia de “usuarios power”.**  
- **Mayor productividad percibida** en receiving, fulfillment y correcciones de stock.  
- **Mejor onboarding** de turnos nuevos o almacenes adicionales.

### 8.3 Para el equipo de desarrollo

- **Clean Architecture se refuerza, no se debilita:** los usecases permanecen testeables y reutilizables.  
- **La UI de intención es una capa de composición**, fácil de evolucionar sin tocar dominio.  
- **Migración React → Svelte** se puede hacer por capacidad de negocio (flujo), no solo por pantalla legacy.  
- **Paridad funcional medible:** cada flujo compuesto tiene criterios de aceptación claros frente al flujo fragmentado original.

### 8.4 Para el producto Smart WMS

- Diferenciación frente a un admin “espejo del modelo de datos”.  
- Experiencia más cercana a “herramienta de trabajo” que a “panel de configuración de entidades”.  
- Base sólida para modos operador / administrador y, a medio plazo, asistentes o automatizaciones encima de los mismos usecases.

---

## 9. Comparativa: Smart WMS (visión de flujos compuestos) vs Sentry WMS vs Easy WMS (Mecalux)

La comparación se hace sobre **experiencia de uso, complejidad percibida y posicionamiento**, no sobre paridad de automatización industrial.

| Dimensión | Sentry WMS (base actual) | Smart WMS (con flujos compuestos) | Easy WMS (Mecalux) |
|-----------|---------------------------|-----------------------------------|---------------------|
| **Modelo mental de la UI** | Menú de features / entidades administrativas | Intenciones de trabajo (wizards compuestos) | Operativa guiada + módulos avanzados; orientado a centros medianos/grandes |
| **Curva de adopción** | Media-alta (hay que aprender muchas pantallas y relaciones) | Baja-media (pocas intenciones principales) | Media: potente, pero con profundidad de configuración y módulos |
| **Granularidad de pantallas** | Alta (Items, PO, Receiving, Put-Away, etc. separados) | Baja en operativa diaria; alta en administración avanzada | Media-alta según módulos contratados |
| **Creación de maestros en contexto** | Limitada / fuera de flujo | Diseño explícito (inline create) | Suele existir en flujos maduros de recepción/pedido |
| **Arquitectura frontend** | React admin monolítico por páginas | SvelteKit + Feature-First + Clean Architecture + orquestadores de flujo | Propietaria; no aplicable el mismo criterio de open architecture |
| **Backend / reglas** | Flask + servicios; autoridad en servidor | Mismo principio: backend autoridad; UI solo compone | Motor WMS propietario + integraciones ERP/automatización |
| **Alcance típico** | Ejecución de almacén e-commerce, barcode-first, self-hosted | Igual base funcional, UX simplificada, comercializable por el equipo | Multi-almacén, omnicanal, integración fuerte con automatización Mecalux (AS/RS, shuttle, AGV/AMR, pick-to-light, etc.) |
| **Automatización física** | No es el foco (RF / escáner) | No es el foco inicial | Fortaleza central (robotics, AS/RS, WCS) |
| **IA / analítica avanzada** | Limitada / no central | Opcional a futuro sobre los mismos usecases | Easy AI (consultas y acciones en lenguaje natural), analytics, LMS |
| **Licenciamiento / TCO** | Open source (Apache 2.0), self-hosted | Open base + producto propio del equipo; control del código | Comercial (SaaS u on-premise); implementación y módulos con coste significativo |
| **Personalización profunda** | Alta (código abierto) | Alta (código propio + arquitectura limpia) | Alta vía configuración y servicios del fabricante; menos “fork del core” |
| **Seriedad operativa** | Alta (auditoría, permisos, estados) | Igual o superior si se respetan contratos y trazas | Muy alta en entornos industriales exigentes |
| **Riesgo de sobre-simplificar** | Bajo (UI ya es granular) | Medio si se ocultan estados críticos | Bajo en el núcleo; la complejidad aparece en módulos y automatización |

### Lectura estratégica

- **Frente a Sentry WMS:** Smart WMS no cambia el “qué puede hacer el almacén”; cambia el “cómo se presenta y se recorre”. La ganancia es usabilidad, adopción y velocidad operativa sin renunciar a la base open source ni a la trazabilidad.  
- **Frente a Easy WMS:** Easy WMS compite en el segmento de WMS industrial/omnicanal con automatización y ecosistema Mecalux. Smart WMS, con flujos compuestos, se posiciona mejor como **WMS de ejecución claro, mantenible y de baja fricción** para equipos que necesitan control del código, self-hosting o un producto propio sin la complejidad ni el coste de una suite industrial completa.  
- **No se pretende “ser Easy WMS”.** Se pretende ser **más usable que el admin React de Sentry** y **más simple de adoptar que un WMS enterprise**, manteniendo seriedad funcional y arquitectura limpia.

---

## 10. Conclusiones y siguientes pasos

1. Las features de Sentry/Smart WMS están bien delimitadas; el problema de usabilidad es de **orquestación de UI**, no de falta de capacidad.  
2. Los flujos compuestos permiten mimetizar pasos (como Item + compra/recepción en un solo wizard) sin romper Clean Architecture.  
3. Las ventajas son medibles en adopción, errores de navegación y tiempo por intención, sin sacrificar auditoría ni permisos.  
4. La prioridad de implementación recomendada empieza por **Inbound unificado** y **Alta rápida de producto**, seguida de **Corregir stock** y **Outbound unificado**.  
5. El posicionamiento resultante es un WMS de ejecución moderno: más simple que el admin legacy, más controlable y económico que un Easy WMS de automatización pesada, y alineado con la estrategia de modernización frontend del proyecto.

### Siguiente entregable sugerido

Diseño detallado del **Wizard de Inbound unificado**:

- Pasos de pantalla y estados.  
- Secuencia exacta de casos de uso.  
- Campos mínimos de creación inline (Item / Vendor).  
- Criterios de aceptación de paridad frente al flujo React fragmentado.  
- Puntos de permiso y de traza en Audit Log.

---

*Documento generado en el contexto del proyecto Smart WMS. La referencia funcional es Sentry WMS; la dirección de producto es una UI de intenciones sobre módulos Clean Architecture, sin alterar la autoridad del backend Flask.*
