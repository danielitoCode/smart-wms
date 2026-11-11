# Plan de migración funcional React → Svelte

> **Proyecto:** Smart WMS  
> **Origen funcional:** `admin/` (React)  
> **Destino:** `webapp/` (SvelteKit)  
> **Rama de trabajo:** `svelte-webapp`  
> **Estado inicial:** planificación  
> **Última revisión:** 2026-11-11

---

## 1. Propósito y resultado esperado

Este documento define una migración progresiva, verificable y completa de las funcionalidades administrativas y operativas que existen en el frontend React y que todavía no tienen una implementación equivalente en Svelte.

El objetivo no es reproducir cada pantalla de React de forma literal. Se debe conservar la **capacidad funcional**, las reglas de negocio, los permisos, los flujos, los estados y los resultados que espera el usuario, adaptando la experiencia a SvelteKit y a la arquitectura actual de `webapp/`.

La migración se considera terminada cuando:

- Todas las funcionalidades aplicables del inventario React tienen una decisión explícita: migrada, sustituida por un flujo operativo nuevo o retirada con justificación.
- Cada funcionalidad migrada está conectada al backend Flask real y respeta sus contratos.
- Las capas de dominio, aplicación, infraestructura y presentación están separadas y probadas de forma independiente.
- Los flujos integrados entre módulos están cubiertos por pruebas de integración y regresión.
- No quedan rutas placeholder, botones sin acción, datos simulados ni operaciones incompletas presentadas como terminadas.
- La compilación, el chequeo estático, las pruebas y la revisión de seguridad/autorización están aprobados.

## 2. Reglas que gobiernan toda la migración

1. **El backend Flask es la autoridad.** No duplicar reglas de negocio ni implementar persistencia directa desde Svelte.
2. **No acceder directamente a PostgreSQL o Redis desde el navegador.** Toda comunicación de datos pasa por los servicios HTTP existentes.
3. **Contrato antes que interfaz.** Antes de implementar una operación, localizar su endpoint real, método, payload, respuesta, errores, permisos y efectos secundarios. No inventar endpoints.
4. **Migración por capacidad, no por componente visual.** Una pantalla no está migrada porque exista una ruta o una entidad TypeScript.
5. **Feature-first + Clean Architecture.** Mantener límites claros entre dominio, aplicación, infraestructura y UI.
6. **Dependencias explícitas.** No iniciar un módulo si sus catálogos, contratos o flujos previos necesarios no están estabilizados.
7. **Pruebas independientes por capa.** Los tests de dominio no deben necesitar DOM ni backend; los de aplicación deben usar puertos simulados; los de infraestructura deben verificar HTTP; los de UI deben verificar interacción y estados.
8. **Autorización real.** Respetar sesión, permisos por usuario, almacenes asignados y restricciones devueltas por el backend. Ocultar una acción en UI no sustituye la autorización del servidor.
9. **No romper autenticación.** Mantener el contrato existente de cookies JWT HttpOnly + CSRF, consulta de sesión `/auth/me`, cambio obligatorio de contraseña, expiración y almacenes autorizados. No introducir tokens de sesión en `localStorage`.
10. **No migrar pantallas retiradas sin decisión.** Picking/Packing/Shipping administrativos antiguos fueron retirados en React al trasladar la operación a escáneres. Se preservan los flujos Svelte actuales; solo se migran capacidades administrativas que sigan teniendo sentido.
11. **No mezclar refactorizaciones ajenas.** Cada entrega debe limitarse al módulo y a las dependencias justificadas.
12. **Trazabilidad.** Toda casilla marcada debe enlazar en el PR o commit con pruebas, evidencias y cualquier desviación respecto a React.

## 3. Estado inicial y leyenda

La clasificación inicial procede de la auditoría comparativa de `admin/` y `webapp/`. Debe actualizarse cuando una inspección del código o del backend demuestre un estado diferente.

- [ ] Pendiente: no iniciado.
- [~] En curso: trabajo iniciado, todavía no cumple todos los criterios.
- [x] Verificado: cumple los criterios de aceptación y tiene evidencias.
- [!] Bloqueado: existe una dependencia o decisión pendiente.

Estados funcionales iniciales:

| Estado | Significado |
|---|---|
| Completo | Capacidad equivalente verificada, no solo una ruta o modelo |
| Parcial | Existe una parte del flujo, pero faltan operaciones, reglas o estados |
| Ausente | No existe una implementación funcional equivalente |
| Placeholder | Existe una ruta/pantalla provisional sin comportamiento real |
| Revisión | Requiere comparación detallada antes de decidir si hay brecha |

## 4. Arquitectura y entregables obligatorios por feature

Cada feature debe conservar la estructura y convenciones ya adoptadas en `webapp/`. Los nombres concretos de carpetas pueden adaptarse al módulo existente; no crear capas vacías para cumplir una plantilla.

### 4.1 Dominio

Responsabilidad: expresar conceptos y reglas propias del negocio, sin Svelte, HTTP ni almacenamiento.

- [ ] Entidades y tipos del dominio.
- [ ] Value Objects y enums cuando aporten invariantes.
- [ ] Reglas e invariantes, incluyendo transiciones de estado.
- [ ] Validaciones de negocio puras.
- [ ] Eventos/resultados de dominio si el flujo los necesita.
- [ ] Pruebas unitarias puras, deterministas y sin mocks de infraestructura.

**Prueba independiente:** ejecutar únicamente la suite de dominio del feature. Debe cubrir casos válidos, inválidos, límites, transiciones permitidas y prohibidas.

### 4.2 Aplicación

Responsabilidad: coordinar casos de uso sin conocer HTTP, base de datos ni componentes.

- [ ] Casos de uso por intención del usuario (consultar, crear, modificar, aprobar, cancelar, etc.).
- [ ] Puertos/interfaces para repositorios y servicios externos.
- [ ] DTO de entrada/salida de aplicación.
- [ ] Políticas de autorización que deban reflejarse en el caso de uso, sin sustituir el control del servidor.
- [ ] Manejo explícito de resultados, errores y cancelación.
- [ ] Pruebas unitarias con repositorios/puertos fake o mock.

**Prueba independiente:** ejecutar casos de uso sin navegador ni backend real; verificar llamadas, orden, datos enviados y comportamiento ante errores.

### 4.3 Infraestructura y contratos

Responsabilidad: adaptar el backend real a los puertos de aplicación.

- [ ] Inventario del endpoint real en Flask y su contrato.
- [ ] DTO de transporte separados de las entidades de dominio.
- [ ] Mappers explícitos API ↔ aplicación/dominio.
- [ ] Repositorios concretos sobre el cliente HTTP compartido.
- [ ] Registro/DI del módulo según el patrón existente.
- [ ] Paginación, filtros, ordenación y serialización compatibles con backend.
- [ ] Errores HTTP traducidos a errores de aplicación sin perder códigos ni contexto útil.
- [ ] Pruebas de repositorio con cliente HTTP simulado.
- [ ] Pruebas de contrato con respuestas representativas del backend.

**Prueba independiente:** ejecutar tests HTTP/contrato sin montar la UI. Verificar método, ruta real, query, payload, CSRF, respuesta, errores, timeout y cancelación.

### 4.4 Presentación Svelte

Responsabilidad: representar los casos de uso y permitir completar el flujo.

- [ ] Ruta y navegación integradas.
- [ ] Pantalla/listado, detalle y formularios necesarios.
- [ ] Estados loading, vacío, error, éxito y permisos insuficientes.
- [ ] Validación de formulario y feedback comprensible en español.
- [ ] Accesibilidad de teclado, etiquetas, foco y mensajes.
- [ ] Confirmación para acciones destructivas o irreversibles.
- [ ] Paginación/filtros/orden/exportación cuando existan en React.
- [ ] Sin fixtures o datos hardcodeados en producción.
- [ ] Pruebas de componentes e interacción con dependencias simuladas.

**Prueba independiente:** ejecutar tests de UI sin backend real; verificar navegación, formularios, acciones, estados y accesibilidad básica.

### 4.5 Integración y regresión

- [ ] Prueba del flujo completo UI → caso de uso → repositorio → contrato HTTP simulado.
- [ ] Prueba de integración con backend de desarrollo cuando el entorno esté disponible.
- [ ] Pruebas de permisos por rol, usuario y almacén.
- [ ] Regresión de módulos dependientes.
- [ ] Revisión de logs, errores y efectos secundarios.
- [ ] Evidencia manual de aceptación para flujos críticos.

## 5. Secuencia global y dependencias

La migración se ejecutará en incrementos verticales pequeños. Cada incremento termina con pruebas propias antes de abrir el siguiente. Las fases expresan dependencias funcionales; pueden solaparse tareas de documentación o pruebas, pero no se debe saltar una dependencia crítica.

```text
Base transversal
   |
   +--> Catálogos: Items + Vendors + Warehouses/Zones/Bins
   |        |
   |        +--> Purchase Orders --> Receiving --> Putaway
   |        |                              |          |
   |        |                              |          +--> Preferred Bins
   |        |                              +--> Inbound Activity
   |        |
   |        +--> Inventory --> Adjustments
   |                    |
   |                    +--> Cycle Counts --> Cycle Count Approvals
   |
   +--> Sales Orders --> Backorders
   |        |
   |        +--> Picking Tickets --> Picking Batches
   |        |
   |        +--> Returns / RMA --> Refunds
   |
   +--> Transfer Orders
   |        |
   |        +--> Picking / Receiving / Inventory
   |
   +--> Inter-warehouse Transfers --> Inventory
   |
   +--> Users / Permissions --> Todas las rutas protegidas
   |
   +--> Settings --> módulos configurables + Dashboard
   |
   +--> Audit Log --> operaciones auditables
   |
   +--> Integrations --> Inbound Activity / Consumer Groups /
   |                    Webhooks / Channels / Notifications
   |
   +--> Imports --> catálogos y documentos compatibles
   |
   +--> POS Activity + Fraud --> Dashboard / Sales Orders
```

El diagrama es una guía de dependencias funcionales, no una afirmación de que todos los módulos deban compartir tablas o endpoints.

## 6. Fases de migración y objetivos marcables

### Fase 0 — Preparación transversal y control de calidad

**Objetivo:** establecer una base repetible para migrar features sin introducir arquitecturas paralelas.

- [x] F0.1. Congelar inventario de capacidades React por módulo, incluyendo acciones, filtros, permisos, estados y exportaciones. **Evidencia:** auditoría comparativa React `admin/` → Svelte `webapp/` registrada antes de iniciar esta fase.
- [x] F0.2. Confirmar el árbol actual de `webapp/src` y las convenciones de feature-first existentes. **Evidencia:** inspección de `core/feature`, `core/infrastructure`, `lib`, `routes` y `test/unitTest`.
- [ ] F0.3. Documentar para cada feature endpoints Flask reales, DTO, errores, permisos y efectos secundarios. **En curso:** inventario transversal de rutas, esquemas Pydantic, guards de página, sesión y alcance de almacén incorporado en `webapp/docs/API-Contracts.md`; los payloads/respuestas y side effects se verifican feature por feature mediante tests.
- [x] F0.4. Definir matriz de trazabilidad React → caso de uso → endpoint → ruta Svelte → prueba. **Evidencia:** matriz y plantilla de trazabilidad incorporadas en este documento; su rellenado por feature continúa durante cada migración.
- [~] F0.5. Establecer comandos de validación y suites separadas: dominio, aplicación, infraestructura, UI e integración. **En curso:** `npm run check`, `npm test` y `npm run build` están operativos; la suite Vitest completa pasa en CI. Existen pruebas de casos de uso, mapper e infraestructura, pero faltan suites independientes de aplicación, UI e integración y comandos filtrados por capa.
- [x] F0.6. Verificar cliente HTTP compartido: cookies, CSRF, expiración, timeout, cancelación y traducción de errores. **Evidencia:** cookies HttpOnly mediante `credentials: include`, CSRF de doble envío, respuesta 401/403, normalización de errores, timeout y cancelación cubiertos por código y pruebas; CI Webapp verde en el commit `46c0f48`.
- [~] F0.7. Verificar i18n en italiano (idioma principal), español e inglés; no introducir textos nuevos sin claves de traducción. **En curso:** catálogo registrado: 204 claves únicas; italiano 204/204, inglés inicialmente 201/204 (98,53%); se completaron `Contraseña actualizada`, `Código` y `¿Eliminar`. Test actualizado para recorrer las llamadas literales `t(...)` de todos los `.svelte`/`.ts` y medir claves reales; cerrar cuando CI confirme 100%. Español conserva fallback canónico.
- [~] F0.8. Verificar navegación, guardas de sesión, permisos y resolución de almacenes. **En curso:** matriz P-01…P-16 en `webapp/docs/API-Contracts.md`; política de acceso frontend extraída y probada; selección de almacén descarta IDs persistidos fuera de `warehouse_ids` y rechaza selección fuera del conjunto autorizado. Falta regresión HTTP real contra Flask.
- [x] F0.9. Definir convención de evidencia por PR: tests ejecutados, resultado, endpoints contrastados y limitaciones. **Evidencia:** protocolo de trabajo, Definition of Done y registro de progreso incluidos en este documento.

**Salida obligatoria:** plantilla de checklist aprobada, contratos localizados y validaciones base ejecutables.

### Ejecución Fase 0 — auditoría y avances

**Documentación de contratos:** `webapp/docs/API-Contracts.md` contiene el inventario de rutas Flask, request schemas, page grants, controles de sesión, WMS token scopes y matriz de regresión P-01…P-16. Se distingue el inventario de endpoints del cierre de cada response DTO: cada feature debe añadir pruebas de contrato para envelope, nulabilidad, errores y efectos secundarios.

**Corte de trabajo:** 2026-11-11. La fase permanece **en curso**; no se marca completa hasta cerrar contratos, suites independientes, cobertura de idioma y regresión de autorización. Se ha iniciado el levantamiento contractual de F1.1 (Items) para que el primer módulo de Fase 1 no arranque sobre DTO o endpoints supuestos.

#### Evidencia de arquitectura y contratos revisados

| Área | Evidencia inspeccionada | Resultado |
|---|---|---|
| Arquitectura | `src/core/feature`, `src/core/infrastructure`, `src/lib`, `src/routes` | Feature-first presente; infraestructura compartida centralizada |
| Cliente HTTP | `core/infrastructure/api/ApiClient.ts` | Cookies incluidas, CSRF en mutaciones, parseo de respuesta y normalización de errores |
| Sesión | `core/infrastructure/auth/AuthSession.ts` | Usuario en memoria; credencial permanece en cookie HttpOnly |
| Autenticación | `AuthRemoteDataSource.ts`, `EnsureAuthenticatedUseCase.ts`, `authGuardState.svelte.ts` | Endpoints `/api/auth/login`, `/api/auth/me`, `/api/auth/refresh`, `/api/auth/logout`, `/api/auth/change-password`; 401 limpia sesión y 403 no se confunde con sesión inexistente |
| Pruebas | `src/test/unitTest/feature/**`, `src/test/unitTest/infrastructure/**`, `src/lib/i18n/translations.test.ts` | Casos de uso, mapper, cliente HTTP e i18n; no se localizaron suites UI ni integración |
| CI | `.github/workflows/webapp-ci.yml` | Ejecuta sync, `npm run check`, `npm run build` y `npm test` con Node 26 |

#### Hallazgos y acciones correctivas

1. **Timeout y cancelación HTTP:** el cliente original seleccionaba `options.signal ?? controller.signal`; al suministrar señal externa, el timeout interno dejaba de controlar la petición. Se implementó un único `AbortController` que combina timeout y cancelación externa, limpia el listener al finalizar y distingue `timeout` de `cancelled`. Pruebas aprobadas en CI.
2. **Pruebas de validaciones síncronas:** el primer CI encontró 16 aserciones distribuidas en 12 archivos que usaban `.rejects.toThrow()` sobre casos de uso que lanzan el error de validación sincrónicamente. Se alinearon esas aserciones con el comportamiento real mediante `.toThrow()`; también se corrigió una expectativa que no coincidía con el nombre real del campo (`scannedBarcode`). No se modificó la lógica de negocio para satisfacer tests incorrectos. La suite completa terminó aprobada.
3. **Suites por capa:** la estructura actual separa parcialmente pruebas de casos de uso y de infraestructura, pero no garantiza independencia para aplicación, UI e integración. Se debe completar antes de dar F0.5 por terminado.
4. **Idiomas:** el diccionario español vacío es intencional porque las claves fuente ya están en español; el riesgo real está en la cobertura incompleta de inglés y en verificar que italiano tenga traducción para todas las claves visibles.
5. **Permisos:** la comprobación de páginas existe en el layout, pero se necesita contrastar acciones sensibles con el backend y probar usuarios con distintos almacenes y permisos.

#### Contrato backend verificado — F1.1 Items

Fuentes inspeccionadas en la rama: `api/routes/admin/admin_items.py`, `api/routes/lookup.py`, `api/schemas/items.py`, `admin/src/pages/Items.jsx` y la implementación Svelte de `core/feature/items/**`.

| Operación | Endpoint real | Contrato / comportamiento |
|---|---|---|
| Listado | `GET /api/admin/items` | Query: `page` (1 por defecto), `per_page` (50 por defecto, máximo 1000), `category`, `active=true/false`, `q`. Respuesta: `{ items, total, page, per_page, pages }`. Búsqueda backend: SKU, nombre, UPC, MPN y alias de código de barras. |
| Detalle | `GET /api/admin/items/{id}` | Respuesta envolvente `{ item, inventory, preferred_bins }`; el detalle incluye descripción, alias, dimensiones, reorden, tracking por lote/serie, fechas y estado. |
| Alta | `POST /api/admin/items` | Obligatorios: `sku` (1–128) y `item_name` (1–256). Opcionales: descripción (máx. 1000), UPC (128), MPN (64), categoría (128), peso 0–99999 y `default_bin_id > 0`. Responde 201. SKU y UPC duplicados devuelven 400. |
| Edición | `PUT /api/admin/items/{id}` | Actualización parcial de campos permitidos: SKU, nombre, descripción, UPC, MPN, categoría, peso, ubicación por defecto, punto/cantidad de reposición y estado. 404 si no existe; 400 si no hay campos válidos. |
| Archivar/restaurar | `POST /api/admin/items/{id}/archive` | Alterna `is_active`; no elimina el registro. 404 si no existe. |
| Borrado físico | `DELETE /api/admin/items/{id}` | Bloqueado si hay stock positivo, líneas históricas de ventas o compras. En caso permitido elimina primero referencias de preferred bins, conteos, ajustes e inventario. 404 si no existe; 400 si hay restricciones. |
| Búsqueda operativa | `GET /api/lookup/item/search?q=` | Devuelve array plano, máximo 50. Admin ve catálogo completo; usuarios no admin solo ítems con inventario o preferred bin en almacenes asignados. |
| Lookup por código | `GET /api/lookup/item/{barcode}` | Respuesta `{ item, locations }`; incluye UPC/SKU/alias y filtra ubicaciones por almacenes autorizados para usuarios no admin. |

**Autorización:** endpoints administrativos protegidos por `require_auth` + `require_admin_or_page_permission("items")`. Lookup requiere autenticación y aplica alcance de almacén en resultados operativos. La autorización de página en Svelte no sustituye estos controles del servidor.

**Efectos secundarios:** alta y cambios persisten en `items`; archive alterna estado; delete puede eliminar físicamente y limpia relaciones solo tras validar que no hay stock positivo ni historial PO/SO. No se debe ofrecer delete como alternativa a archive cuando el backend lo rechaza.

**Brechas concretas detectadas en Svelte (no corregidas todavía):**
1. `ItemRemoteDataSource.getById()` declara que recibe `ItemDto`, pero Flask devuelve `{ item, inventory, preferred_bins }`; el mapper actual no desempaqueta `item`.
2. `list()` descarta `total/page/per_page/pages`, y la pantalla no implementa paginación ni los filtros Active / Archived / All presentes en React.
3. Svelte solo implementa listado/búsqueda; faltan detalle, alta, edición, archive/restore, delete con confirmación y presentación de restricciones del servidor.
4. El DTO actual no representa campos reales de listado/detalle (por ejemplo `weight_lbs`, `default_bin_code`, `description`, dimensiones, reorden, tracking, inventario y preferred bins).
5. La búsqueda administrativa y la búsqueda operativa son contratos distintos; no se debe sustituir una por otra ni perder la autorización de almacén de lookup.

**Decisión de arranque:** F1.1 está contractualmente preparada para implementación, pero la Fase 1 no se declara iniciada formalmente hasta cerrar F0-B, F0-C y F0-E. Estos hallazgos se convierten en criterios obligatorios de aceptación de F1.1.

#### Cambios de código vinculados a Fase 0

| Cambio | Commit |
|---|---|
| Combinar timeout y cancelación externa en ApiClient | `268bfd0` |
| Añadir pruebas de timeout/cancelación al cliente HTTP | `cde8ebe` |
| Alinear aserciones síncronas en 12 archivos de tests | `0105ac4` |
| Corregir expectativa del campo `scannedBarcode` | `46c0f48` |

#### Plantilla de trazabilidad por capacidad

Completar una fila por operación significativa; no basta con una fila por pantalla.

| React (pantalla/acción) | Caso de uso Svelte | Endpoint Flask real | DTO / mapper | Ruta / componente Svelte | Test de dominio/aplicación | Test HTTP/contrato | Test UI/integración |
|---|---|---|---|---|---|---|---|
| Auth: validar sesión | `EnsureAuthenticatedUseCase` | `GET /api/auth/me` | `MeResponseDto` / `AuthMapper` | Layout protegido | `EnsureAuthenticatedUseCase.test.ts` | Pendiente de aislar contrato | Pendiente |
| Completar por feature | Pendiente | Pendiente de verificar | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente |

#### Próximos cierres de Fase 0

- [x] F0-A. Confirmar CI verde después de corregir las aserciones síncronas y añadir pruebas de timeout/cancelación. **CI:** [Webapp CI — commit `46c0f48`](https://github.com/danielitoCode/smart-wms/actions/runs/42974442039).
- [~] F0-B. Crear suites ejecutables independientes para dominio, aplicación, infraestructura, UI e integración. **Implementado:** scripts separados y CI por suite; pendiente confirmar todos los jobs verdes.
- [~] F0-C. Medir cobertura de claves por locale y cerrar brechas de italiano/inglés. **Implementado:** completadas las tres claves detectadas en el catálogo; test escanea llamadas literales `t(...)` del código fuente. Pendiente confirmar que no existan claves fuera de catálogo.
- [~] F0-D. Completar inventario de endpoints Flask por feature. **Avance:** F1.1 Items tiene identificadas rutas, métodos, parámetros, esquemas Pydantic, respuestas, permisos y restricciones de borrado; faltan sus pruebas de contrato y el resto de features.
- [~] F0-E. Crear y ejecutar matriz de regresión de sesión, permisos y ámbito de almacén. **Implementado:** matriz P-01…P-16 y pruebas de política; pendiente regresión HTTP con usuarios y almacenes de prueba.
- [x] F0-F. Registrar comandos y evidencias de CI por commit y dejar el checklist listo para el primer módulo.

### Fase 1 — Catálogos maestros y estructura del almacén

**Objetivo:** completar los datos maestros que alimentan recepción, inventario, compras, ventas y movimientos.

#### F1.1 Items / Productos — Parcial

Dependencias: base transversal.

- [ ] Dominio: identidad, SKU/código, unidad, estado, atributos y reglas de unicidad confirmadas con backend.
- [ ] Aplicación: listar, consultar detalle, crear, editar, archivar/eliminar según contrato y buscar.
- [ ] Infraestructura: repositorio y mappers contra endpoints reales.
- [ ] UI: tabla, filtros/búsqueda, detalle y formularios con errores por campo.
- [ ] Tests: invariantes de producto; casos de uso CRUD; contrato HTTP; formularios, estados y permisos.
- [ ] Paridad: comparar acciones y campos de React Items.

#### F1.2 Vendors / Proveedores — Ausente

Dependencias: F1.1 solo si el contrato de proveedor referencia productos; confirmar relación real.

- [ ] Dominio: proveedor y reglas de identificación/estado.
- [ ] Aplicación: listar, detalle, crear, editar y eliminar/desactivar según backend.
- [ ] Infraestructura: DTO, mapper y repositorio.
- [ ] UI: listado, búsqueda, formularios y confirmaciones.
- [ ] Tests: dominio, CRUD, contrato y UI.
- [ ] Paridad: comparar CRUD y filtros de React Vendors.

#### F1.3 Warehouses / Zones / Bins — Parcial

Dependencias: base transversal.

- [ ] Dominio: almacén, zona, ubicación y relaciones; reglas de pertenencia y códigos.
- [ ] Aplicación: operaciones CRUD permitidas y consultas jerárquicas.
- [ ] Infraestructura: contratos reales y mappers.
- [ ] UI: completar listado/detalle/edición, relaciones y exportación si aplica.
- [ ] Tests: jerarquía, integridad, CRUD, errores y permisos por almacén.
- [ ] Paridad: comparar operaciones React Warehouses, Zones y Bins.
- [ ] Regresión: validar Inventory, Receiving, Putaway y Picking actuales.

**Salida de fase:** catálogos maestros utilizables por todos los flujos dependientes.

### Fase 2 — Inventario, ajustes y conteos

**Objetivo:** garantizar una visión fiable de existencias y sus correcciones controladas.

#### F2.1 Inventory — Parcial

Dependencias: F1.1 y F1.3.

- [ ] Dominio: modelos de existencias, disponibilidad, reservas y ubicación según contrato real.
- [ ] Aplicación: consulta por producto/almacén/ubicación, filtros y detalle de existencias.
- [ ] Infraestructura: endpoints, paginación y mappers.
- [ ] UI: completar vistas, filtros, estados y exportación si existía en React.
- [ ] Tests: consultas y filtros, DTO, paginación, UI y permisos.
- [ ] Paridad: matriz de capacidades React Inventory frente a Svelte.

#### F2.2 Inventory Adjustments — Ausente

Dependencias: F2.1, F1.1 y F1.3.

- [ ] Dominio: tipos/motivos, cantidades, signo, límites y reglas de ajuste respaldadas por backend.
- [ ] Aplicación: consultar historial y registrar ajuste.
- [ ] Infraestructura: verificar endpoint y formato de movimiento; no simular escrituras.
- [ ] UI: formulario de ajuste, selección de producto/ubicación, motivo, confirmación y resultado.
- [ ] Tests: cantidades y límites; caso de uso; contrato; doble envío; errores; permisos.
- [ ] Integración: comprobar actualización de inventario y auditoría.

#### F2.3 Cycle Counts — Parcial

Dependencias: F1.3 y F2.1.

- [ ] Dominio: ciclo, líneas, cantidades esperadas/contadas y estados.
- [ ] Aplicación: crear, consultar, editar/contar y enviar según el contrato.
- [ ] Infraestructura: DTO y endpoints reales.
- [ ] UI: completar el flujo existente y estados parciales.
- [ ] Tests: reglas de conteo, transiciones, envío, errores y UI.
- [ ] Paridad: comparar React CycleCounts.

#### F2.4 Cycle Count Approvals — Parcial/Ausente

Dependencias: F2.3; requiere confirmar política de separación de funciones en Settings.

- [ ] Dominio: decisiones de aprobación/rechazo, actor y estado.
- [ ] Aplicación: aprobar/rechazar una línea o grupo si backend lo permite.
- [ ] Infraestructura: contrato real y permisos.
- [ ] UI: cola de aprobación, detalle, acciones individuales y grupales.
- [ ] Tests: transición permitida/prohibida, separación de funciones, concurrencia, autorización y UI.
- [ ] Integración: verificar impacto final en inventario solo después de aprobación.

**Salida de fase:** inventario consultable y modificable mediante operaciones auditables; conteos con aprobación donde corresponda.

### Fase 3 — Abastecimiento: compras, recepción y ubicación

**Objetivo:** completar el flujo de entrada desde la orden de compra hasta la ubicación física.

#### F3.1 Purchase Orders — Ausente

Dependencias: F1.1, F1.2 si Vendor es obligatorio, F1.3.

- [ ] Dominio: orden, líneas, cantidades, estados y restricciones de edición.
- [ ] Aplicación: listar, filtrar, consultar, crear/editar, modificar líneas, archivar y exportar según capacidades reales.
- [ ] Infraestructura: endpoints Flask confirmados, DTO y mappers.
- [ ] UI: listado, detalle, edición de líneas/cantidades, filtros, paginación y CSV si corresponde.
- [ ] Tests: reglas de estado/cantidad, CRUD, contratos, exportación y UI.
- [ ] Paridad: comparar React PurchaseOrders.

#### F3.2 Receiving — Parcial

Dependencias: F3.1, F1.1, F1.3.

- [ ] Dominio: recepción total/parcial, líneas, cantidades recibidas y reversión si está permitida.
- [ ] Aplicación: consultar órdenes abiertas, detalle, registrar recepción y revertir recepción cuando el backend lo soporte.
- [ ] Infraestructura: confirmar rutas, payloads, errores y trazabilidad.
- [ ] UI: completar historial, recepción parcial, validaciones y feedback.
- [ ] Tests: cantidades, recepción parcial, repetición, reversión, contrato y UI.
- [ ] Integración: comprobar consistencia de estados de PO y recepción.
- [ ] Paridad: comparar React Receiving, incluidas las acciones de unreceive/reverse.

#### F3.3 Putaway — Parcial

Dependencias: F3.2, F1.3, F2.1.

- [ ] Dominio: tareas pendientes, origen/staging, destino y cantidades.
- [ ] Aplicación: consultar resumen, detalle por ubicación y confirmar movimiento.
- [ ] Infraestructura: endpoints y DTO reales.
- [ ] UI: completar resumen, detalle, filtros y exportación si aplica.
- [ ] Tests: movimientos, cantidades, estados, contrato y UI.
- [ ] Integración: comprobar decremento/aumento en ubicaciones correctas.

#### F3.4 Preferred Bins — Placeholder

Dependencias: F1.1, F1.3, F2.1.

- [ ] Dominio: preferencia producto–ubicación, prioridad y estado.
- [ ] Aplicación: consultar, asignar, modificar prioridad, eliminar y exportar si el backend lo permite.
- [ ] Infraestructura: confirmar endpoints y reglas de unicidad.
- [ ] UI: sustituir placeholder por gestión funcional, búsqueda de producto/ubicación y orden de prioridad.
- [ ] Tests: prioridad, duplicados, asignación, eliminación, contrato y UI.
- [ ] Paridad: comparar React PreferredBins.

#### F3.5 Inbound Activity — Ausente

Dependencias: F3.1/F3.2 y Fase 6 de integraciones.

- [ ] Dominio: evento/registro de entrada y origen.
- [ ] Aplicación: listar, filtrar y consultar detalle/payload.
- [ ] Infraestructura: contrato real de actividad entrante.
- [ ] UI: listado y detalle de payload fuente/canónico con presentación segura.
- [ ] Tests: parsing defensivo, filtros, acceso y UI.
- [ ] Paridad: comparar React InboundActivity.

**Salida de fase:** compras y entrada de mercancía completan el recorrido hasta la ubicación; las preferencias de ubicación están operativas.

### Fase 4 — Salida, preparación y pedidos

**Objetivo:** completar la gestión administrativa del flujo de salida sin reintroducir pantallas operativas retiradas.

#### F4.1 Sales Orders — Ausente

Dependencias: F1.1, F1.3; POS Activity si el origen del pedido lo requiere.

- [ ] Dominio: pedido, líneas, estados, cantidades y restricciones.
- [ ] Aplicación: listar, filtrar, consultar, crear/editar si el backend lo soporta.
- [ ] Infraestructura: endpoints, DTO y mappers reales.
- [ ] UI: listado, detalle, filtros, paginación y acciones equivalentes.
- [ ] Tests: estados, líneas, cantidades, contratos y UI.
- [ ] Paridad: comparar React SalesOrders.

#### F4.2 Backorders — Ausente

Dependencias: F4.1, F2.1 y reglas de disponibilidad.

- [ ] Dominio: faltantes, cantidades pendientes y relación con pedido.
- [ ] Aplicación: consultar, filtrar, ver detalle y cancelar según backend.
- [ ] Infraestructura: contrato real.
- [ ] UI: pestañas/estados, detalle y cancelación confirmada.
- [ ] Tests: cálculo/representación de faltantes según respuesta del servidor, cancelación y permisos.
- [ ] Paridad: comparar React Backorders.

#### F4.3 Picking Tickets — Ausente

Dependencias: F4.1; revisar integración con los flujos actuales de picking por escáner.

- [ ] Dominio: ticket, líneas, agrupación y estado de impresión.
- [ ] Aplicación: listar, consultar, imprimir uno/todos, ocultar impresos y agrupar pedidos por dirección si backend lo admite.
- [ ] Infraestructura: verificar endpoints y datos de impresión.
- [ ] UI: cola administrativa, filtros de pedidos largos, agrupación y vista imprimible.
- [ ] Tests: agrupación, filtros, impresión, idempotencia y UI.
- [ ] Paridad: comparar React PickingTickets.
- [ ] Decisión: documentar qué capacidades son administrativas y cuáles permanecen en escáneres.

#### F4.4 Picking Batches — Ausente

Dependencias: F4.3 y contrato de lotes del backend.

- [ ] Dominio: lote, tickets asociados y estados.
- [ ] Aplicación: listar, liberar y eliminar según reglas.
- [ ] Infraestructura: endpoints reales.
- [ ] UI: lista, detalle/miembros y acciones protegidas.
- [ ] Tests: transiciones, liberación, eliminación, conflictos y permisos.
- [ ] Paridad: comparar React PickingBatches.

#### F4.5 RMA / Returns — Ausente

Dependencias: F4.1, F2.1 y políticas de devolución.

- [ ] Dominio: autorización de devolución, líneas, recepción y estados.
- [ ] Aplicación: consultar, recibir devolución, anular/void y registrar memo según backend.
- [ ] Infraestructura: contratos de RMA y Returns.
- [ ] UI: listado, detalle, selección de almacén y acciones.
- [ ] Tests: transiciones, recepción, anulación, permisos y contrato.
- [ ] Paridad: comparar React RMA y Returns.

#### F4.6 Refunds — Ausente

Dependencias: F4.5 y contratos financieros existentes.

- [ ] Dominio: devolución monetaria, importes, estado y referencias; no recalcular reglas financieras en frontend.
- [ ] Aplicación: consultar y ejecutar acciones que permita el backend.
- [ ] Infraestructura: contrato y tratamiento de errores financieros.
- [ ] UI: cola/detalle y confirmaciones.
- [ ] Tests: importes límite, idempotencia, permisos, contrato y UI.
- [ ] Paridad: comparar React Refunds.

#### F4.7 Transfer Orders — Ausente

Dependencias: F1.1, F1.3, F2.1; se integra con picking/receiving según el ciclo definido por backend.

- [ ] Dominio: orden de transferencia, líneas, faltantes y transiciones.
- [ ] Aplicación: listar, detalle, cancelar/eliminar, iniciar picking, cerrar líneas cortas, aprobar/rechazar, importar y consultar faltantes según backend.
- [ ] Infraestructura: verificar cada operación contra endpoints reales.
- [ ] UI: listado, detalle, estados, acciones por permiso y exportación CSV si existe.
- [ ] Tests: máquina de estados, faltantes, short-close, aprobación, concurrencia y contrato.
- [ ] Paridad: comparar React TransferOrders.

#### F4.8 Inter-warehouse Transfers — Ausente

Dependencias: F1.3 y F2.1.

- [ ] Dominio: almacén/ubicación origen y destino, producto, cantidad y movimiento.
- [ ] Aplicación: consultar y registrar transferencia directa si el backend lo permite.
- [ ] Infraestructura: contrato y efectos de inventario.
- [ ] UI: selección de origen/destino, producto, cantidad y confirmación.
- [ ] Tests: origen distinto de destino, disponibilidad, cantidades, atomicidad y permisos.
- [ ] Paridad: comparar React InterWarehouseTransfers.

**Salida de fase:** pedidos y excepciones de salida gestionables; preparación administrativa conectada con operación por escáner; devoluciones y transferencias auditables.

### Fase 5 — Administración, seguridad y configuración

**Objetivo:** completar el gobierno del sistema y habilitar la operación segura de los módulos migrados.

#### F5.1 Users / Permissions — Ausente

Dependencias: Fase 0; debe acompañar la salida de cada módulo protegido, no dejarse solo para el final.

- [ ] Dominio: usuario, roles, grants, scopes y almacenes asignados según contrato.
- [ ] Aplicación: listar, crear, editar, activar/desactivar y administrar permisos.
- [ ] Infraestructura: endpoints reales y normalización de permisos.
- [ ] UI: CRUD, buscador predictivo, permisos por página/función y ámbito de almacén.
- [ ] Tests: matrices rol–permiso–almacén, escalada de privilegios, denegación y UI.
- [ ] Integración: verificar que rutas y acciones respetan la sesión real.
- [ ] Paridad: comparar React Users.

#### F5.2 API Tokens — Ausente

Dependencias: F5.1 y contrato de seguridad del backend.

- [ ] Dominio: token, scopes, estado y rotación/revocación.
- [ ] Aplicación: crear, listar si se permite, rotar, revocar y eliminar.
- [ ] Infraestructura: endpoints y tratamiento seguro de secretos.
- [ ] UI: creación con scopes, visualización única del secreto, copiar, rotar y revocar.
- [ ] Tests: scopes, secretos, revocación, exposición accidental y permisos.
- [ ] Paridad: comparar React Tokens.

#### F5.3 Settings — Ausente

Dependencias: módulos que consumen cada ajuste; migrar ajustes junto al feature consumidor cuando sea más seguro.

- [ ] Dominio: claves, tipos, ámbitos y valores válidos según backend.
- [ ] Aplicación: consultar y actualizar ajustes globales y por almacén.
- [ ] Infraestructura: catálogo real de settings, defaults y validación.
- [ ] UI: formularios agrupados por área, ámbito y explicación contextual.
- [ ] Tests: valores permitidos, defaults, ámbito, persistencia y UI.
- [ ] Paridad: inventariar y cubrir los ajustes React: conteos, packing/shipping, over-receiving, receiving bin, separación de aprobación, datos de tickets, POS, fraude y dashboard.
- [ ] Seguridad: no exponer ni permitir modificar claves fuera del permiso del usuario.

#### F5.4 Audit Log — Ausente

Dependencias: operaciones migradas; comenzar con el contrato y habilitar cobertura progresiva.

- [ ] Dominio: evento de auditoría y metadatos.
- [ ] Aplicación: consultar, filtrar, ordenar y consultar historial de producto.
- [ ] Infraestructura: endpoint real, paginación y payload.
- [ ] UI: filtros, detalle, historial y copia de JSON con datos sensibles protegidos.
- [ ] Tests: filtros, orden, paginación, acceso y redacción de datos sensibles.
- [ ] Paridad: comparar React AuditLog.
- [ ] Integración: verificar que ajustes, aprobaciones, recepciones y transferencias producen registros en backend.

#### F5.5 Dashboard — Ausente

Dependencias: datos de inventario, compras, recepción, salida, settings y POS cuando aplique.

- [ ] Dominio/aplicación: definir consultas agregadas; no recalcular métricas de autoridad en cliente.
- [ ] Infraestructura: identificar endpoints de KPIs y productividad existentes.
- [ ] UI: rango de fechas, indicadores, gráficos/tablas, recibidos hoy, salud de envíos y recogida local si el backend los ofrece.
- [ ] Tests: rangos de fecha/zona horaria, estados vacíos, fallos parciales, settings y exportación CSV.
- [ ] Paridad: comparar React Dashboard y sus preferencias.
- [ ] Rendimiento: evitar peticiones redundantes y gráficos con datos inconsistentes.

**Salida de fase:** administración segura, configuración efectiva y trazabilidad de las operaciones.

### Fase 6 — Integraciones, mensajería e importación

**Objetivo:** trasladar la administración de conectores y procesos de intercambio de datos.

#### F6.1 Integrations — Ausente

Dependencias: contratos de conectores y permisos administrativos.

- [ ] Dominio: conector, credenciales referenciadas, estado y sincronización.
- [ ] Aplicación: listar, probar, sincronizar, consultar estado y eliminar credenciales según backend.
- [ ] Infraestructura: endpoints y manejo de secretos.
- [ ] UI: catálogo, estado de sincronización, test y acciones protegidas.
- [ ] Tests: errores de conexión, credenciales, permisos, estados y UI.
- [ ] Paridad: comparar React Integrations.

#### F6.2 Consumer Groups — Ausente

Dependencias: F6.1 y backend de mensajería.

- [ ] Dominio: grupo, consumidor y registro de conectores.
- [ ] Aplicación: consultar/crear/editar/eliminar según operaciones soportadas.
- [ ] Infraestructura: contrato real.
- [ ] UI: gestión y estado.
- [ ] Tests: operaciones CRUD, estados y permisos.
- [ ] Paridad: comparar React ConsumerGroups.

#### F6.3 Webhooks — Ausente

Dependencias: F6.1, F6.2 si el backend los relaciona.

- [ ] Dominio: webhook, scopes, estado, errores y dead-letter queue (DLQ).
- [ ] Aplicación: crear, editar, pausar, reanudar, consultar estadísticas/errores y replay DLQ si existe.
- [ ] Infraestructura: endpoints, secretos y payloads.
- [ ] UI: formularios, estado, estadísticas, errores y replay protegido.
- [ ] Tests: scopes, pausa, reintentos, DLQ, idempotencia, secretos y permisos.
- [ ] Paridad: comparar React Webhooks.

#### F6.4 Channels — Ausente

Dependencias: F6.1 y arquitectura de conectores.

- [ ] Dominio: canal, configuración y estado.
- [ ] Aplicación: crear, editar, cambiar estado y eliminar según backend.
- [ ] Infraestructura: endpoints y validaciones.
- [ ] UI: listado, formularios y estado de DLQ.
- [ ] Tests: transiciones, configuración, errores y UI.
- [ ] Paridad: comparar React Channels.

#### F6.5 Notifications — Ausente

Dependencias: F6.1 y contrato de notificaciones.

- [ ] Dominio: destino/webhook de notificación y estado.
- [ ] Aplicación: crear, activar/desactivar, rotar, probar y eliminar.
- [ ] Infraestructura: endpoints y protección de secretos.
- [ ] UI: gestión de destinos y feedback de prueba.
- [ ] Tests: rotación, prueba, permisos, exposición de secretos y UI.
- [ ] Paridad: comparar React Notifications.

#### F6.6 Imports — Ausente

Dependencias: F1.1/F1.2/F1.3 y módulos de documentos importables.

- [ ] Dominio: tipo de importación, resultado, errores por fila y estado.
- [ ] Aplicación: descargar plantilla, validar archivo, importar y consultar resultado según backend.
- [ ] Infraestructura: contrato multipart/CSV y límites de archivo.
- [ ] UI: selector de archivo, plantilla, vista previa si existe, progreso y reporte de errores.
- [ ] Tests: CSV malformado, codificación, duplicados, filas inválidas, tamaño, errores parciales y UI.
- [ ] Seguridad: validar tipo/tamaño y no confiar en extensión o MIME del navegador.
- [ ] Paridad: comparar React Imports.

**Salida de fase:** integraciones y procesos de importación administrables con visibilidad de errores y recuperación.

### Fase 7 — POS Activity y Fraud

**Objetivo:** migrar las capacidades de análisis y revisión que dependen de datos comerciales.

#### F7.1 POS Activity — Ausente

Dependencias: F4.1/Sales Orders, canales/tenders y endpoints de analítica.

- [ ] Dominio/aplicación: consultas de resumen, pedidos, desglose por canal/medio de pago, ritmo y agregados semanales.
- [ ] Infraestructura: localizar endpoints de analítica; no reconstruir métricas si el servidor las proporciona.
- [ ] UI: resumen, filtros de fechas, gráficos y tablas.
- [ ] Tests: rangos, agregaciones, datos vacíos, zona horaria, permisos y UI.
- [ ] Paridad: comparar React POSActivity.

#### F7.2 Fraud — Ausente

Dependencias: F4.1, F7.1 y Settings de revisión.

- [ ] Dominio: alerta/caso, motivo, memo y estado.
- [ ] Aplicación: consultar cola, incorporar caso y registrar revisión/memo según backend.
- [ ] Infraestructura: contrato real y datos sensibles.
- [ ] UI: cola de revisión, detalle, filtros y acciones.
- [ ] Tests: reglas de acceso, estados, memo, errores y UI.
- [ ] Paridad: comparar React Fraud.

**Salida de fase:** analítica POS y revisión de fraude completas y conectadas con pedidos y configuración.

### Fase 8 — Cierre de paridad, estabilización y retirada del legado

**Objetivo:** demostrar que no quedan brechas funcionales no justificadas.

- [ ] F8.1. Repetir inventario de todas las páginas/acciones de React.
- [ ] F8.2. Marcar cada capacidad como migrada, reemplazada o retirada con decisión aprobada.
- [ ] F8.3. Verificar todas las rutas Svelte y eliminar placeholders.
- [ ] F8.4. Ejecutar suites unitarias de dominio y aplicación de todos los módulos.
- [ ] F8.5. Ejecutar suites de infraestructura/contrato.
- [ ] F8.6. Ejecutar suites de UI y flujos integrados.
- [ ] F8.7. Ejecutar regresión de permisos, almacenes y sesión.
- [ ] F8.8. Ejecutar `npm run check`, `npm test` y `npm run build` desde `webapp/`.
- [ ] F8.9. Revisar errores de consola, red, logs y accesibilidad básica.
- [ ] F8.10. Verificar rendimiento de listados, paginación, filtros y dashboards.
- [ ] F8.11. Documentar diferencias intencionales frente a React.
- [ ] F8.12. Obtener aceptación funcional de los flujos críticos.
- [ ] F8.13. Declarar React legacy/retirable solo cuando el despliegue Svelte esté validado y exista plan de reversión.

## 7. Matriz resumida de features y orden recomendado

| ID | Feature | Estado inicial | Fase | Dependencias principales |
|---|---|---|---:|---|
| F1.1 | Items | Parcial | 1 | Base |
| F1.2 | Vendors | Ausente | 1 | Base / Items si aplica |
| F1.3 | Warehouses, Zones, Bins | Parcial | 1 | Base |
| F2.1 | Inventory | Parcial | 2 | Items, ubicaciones |
| F2.2 | Inventory Adjustments | Ausente | 2 | Inventory, Items, ubicaciones |
| F2.3 | Cycle Counts | Parcial | 2 | Inventory, ubicaciones |
| F2.4 | Cycle Count Approvals | Parcial/Ausente | 2 | Cycle Counts, Settings |
| F3.1 | Purchase Orders | Ausente | 3 | Items, Vendors, almacenes |
| F3.2 | Receiving | Parcial | 3 | Purchase Orders, Items, ubicaciones |
| F3.3 | Putaway | Parcial | 3 | Receiving, Inventory, ubicaciones |
| F3.4 | Preferred Bins | Placeholder | 3 | Items, Inventory, ubicaciones |
| F3.5 | Inbound Activity | Ausente | 3 | Receiving, Integrations |
| F4.1 | Sales Orders | Ausente | 4 | Items, almacenes |
| F4.2 | Backorders | Ausente | 4 | Sales Orders, Inventory |
| F4.3 | Picking Tickets | Ausente | 4 | Sales Orders, operación de picking |
| F4.4 | Picking Batches | Ausente | 4 | Picking Tickets |
| F4.5 | RMA / Returns | Ausente | 4 | Sales Orders, Inventory |
| F4.6 | Refunds | Ausente | 4 | Returns, contrato financiero |
| F4.7 | Transfer Orders | Ausente | 4 | Items, ubicaciones, Inventory |
| F4.8 | Inter-warehouse Transfers | Ausente | 4 | Inventory, almacenes |
| F5.1 | Users / Permissions | Ausente | 5* | Base; transversal |
| F5.2 | API Tokens | Ausente | 5 | Users, seguridad |
| F5.3 | Settings | Ausente | 5* | Consumidores de cada ajuste |
| F5.4 | Audit Log | Ausente | 5* | Operaciones migradas |
| F5.5 | Dashboard | Ausente | 5 | Datos de módulos previos |
| F6.1 | Integrations | Ausente | 6 | Permisos, conectores |
| F6.2 | Consumer Groups | Ausente | 6 | Integrations |
| F6.3 | Webhooks | Ausente | 6 | Integrations / mensajería |
| F6.4 | Channels | Ausente | 6 | Integrations |
| F6.5 | Notifications | Ausente | 6 | Integrations |
| F6.6 | Imports | Ausente | 6 | Catálogos y documentos |
| F7.1 | POS Activity | Ausente | 7 | Sales Orders, canales |
| F7.2 | Fraud | Ausente | 7 | Sales Orders, POS, Settings |
| F8 | Paridad y estabilización | Pendiente | 8 | Todas |

\* **Trabajo transversal anticipado:** permisos deben integrarse desde la primera feature protegida; los ajustes se migran junto al módulo que los consume cuando sea necesario; la auditoría se valida desde las primeras operaciones que generan eventos. La fase indica cierre administrativo, no que deban posponerse esos controles.

## 8. Matriz de pruebas independiente

Cada feature debe entregar las cinco suites siguientes. No es obligatorio crear cinco proyectos o comandos npm distintos: pueden ser carpetas/suites filtrables dentro de Vitest, siempre que se puedan ejecutar independientemente.

| Suite | Qué verifica | Qué NO debe necesitar |
|---|---|---|
| Dominio | invariantes, value objects, transiciones, cálculos puros | DOM, HTTP, DB |
| Aplicación | casos de uso, puertos, secuencia y errores | Svelte, backend real |
| Infraestructura/contrato | URL/método/payload, DTO, mappers, errores HTTP | componentes UI |
| UI | formularios, navegación, permisos visuales, loading/error/empty/success | backend real |
| Integración | flujo vertical y coordinación entre features | mocks de todas las capas a la vez |

### Cobertura mínima por operación

- [ ] Consulta: éxito, vacío, filtros, paginación, error, cancelación.
- [ ] Alta: datos válidos, inválidos, duplicados, permisos y fallo de red.
- [ ] Edición: cambios válidos, conflictos, datos obsoletos y restricciones de estado.
- [ ] Eliminación/anulación: confirmación, permisos, irreversibilidad e idempotencia cuando aplique.
- [ ] Transición de estado: transiciones permitidas y prohibidas, concurrencia y respuesta del servidor.
- [ ] Exportación/impresión: filtros aplicados, datos completos, errores y límites.
- [ ] Autorización: usuario sin permiso, usuario con permiso, almacén fuera de alcance y sesión expirada.
- [ ] Accesibilidad: labels, teclado, foco, mensajes y controles operables.

### Independencia de las pruebas

- Las pruebas de dominio deben poder ejecutarse aunque el backend esté apagado.
- Las pruebas de aplicación deben usar repositorios fake y comprobar el contrato de los puertos.
- Las pruebas de infraestructura deben usar un servidor/cliente HTTP simulado y fixtures versionados; no depender de datos reales.
- Las pruebas de UI deben simular los casos de uso y cubrir estados visuales y acciones.
- Las pruebas de integración deben ser un conjunto separado; si requieren backend, declararlo y usar una base de datos/entorno de prueba aislado.
- Ninguna prueba debe depender del orden de ejecución ni reutilizar estado mutable de otra suite.

## 9. Criterio de terminado por feature (Definition of Done)

Una feature solo pasa a [x] cuando todos los puntos aplicables están demostrados:

- [ ] Inventario React comparado con la implementación Svelte.
- [ ] Contratos Flask localizados y verificados; las operaciones no soportadas están documentadas como bloqueos, no simuladas.
- [ ] Dominio completo y con pruebas independientes.
- [ ] Casos de uso completos y con pruebas independientes.
- [ ] DTO/mappers/repositorios/DI implementados y con pruebas de contrato.
- [ ] UI completa: rutas, operaciones, filtros, estados y errores.
- [ ] Permisos y ámbito de almacén verificados en UI y backend.
- [ ] i18n italiano/español/inglés sin textos nuevos sin traducir.
- [ ] Pruebas UI e integración aprobadas.
- [ ] Regresión de features dependientes aprobada.
- [ ] `npm run check`, `npm test` y `npm run build` aprobados en el commit candidato.
- [ ] Sin TODO funcional, mocks de producción, botones inertes ni placeholders.
- [ ] Evidencia de aceptación manual para flujos críticos.
- [ ] Documentación y decisión de paridad actualizadas.

Si una operación no existe en el backend, se marca **bloqueada por contrato** y se documenta la necesidad de backend por separado. No se debe fingir que está migrada ni introducir lógica de persistencia en el cliente.

## 10. Registro de progreso

Actualizar esta sección al cerrar cada PR/feature. Mantener una única fuente de verdad para evitar que la matriz y las fases se contradigan.

| Hito | Estado | PR/commit | Evidencia / notas |
|---|---|---|---|
| Fase 0 — Preparación | [~] En curso | commits de preparación previos + cambios actuales | Contratos y matriz documentados; suites separadas; política de permisos y selección de almacén probadas; cobertura i18n medida y test estático añadido; pendiente CI y regresión backend real |
| Fase 1 — Catálogos | [ ] Pendiente | — | — |
| Fase 2 — Inventario y conteos | [ ] Pendiente | — | — |
| Fase 3 — Abastecimiento | [ ] Pendiente | — | — |
| Fase 4 — Salida y pedidos | [ ] Pendiente | — | — |
| Fase 5 — Administración | [ ] Pendiente | — | — |
| Fase 6 — Integraciones | [ ] Pendiente | — | — |
| Fase 7 — POS y fraude | [ ] Pendiente | — | — |
| Fase 8 — Cierre de paridad | [ ] Pendiente | — | — |

### Registro por feature

| Feature ID | Dominio | Aplicación | Infraestructura | UI | Tests | Integración | Estado |
|---|---|---|---|---|---|---|---|
| F1.1 Items | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Pendiente |
| F1.2 Vendors | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Pendiente |
| F1.3 Warehouses/Zones/Bins | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Pendiente |
| F2.1 Inventory | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Pendiente |
| F2.2 Adjustments | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Pendiente |
| F2.3 Cycle Counts | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Pendiente |
| F2.4 Count Approvals | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Pendiente |
| F3.1 Purchase Orders | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Pendiente |
| F3.2 Receiving | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Pendiente |
| F3.3 Putaway | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Pendiente |
| F3.4 Preferred Bins | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Pendiente |
| F3.5 Inbound Activity | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Pendiente |
| F4.1 Sales Orders | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Pendiente |
| F4.2 Backorders | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Pendiente |
| F4.3 Picking Tickets | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Pendiente |
| F4.4 Picking Batches | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Pendiente |
| F4.5 RMA/Returns | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Pendiente |
| F4.6 Refunds | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Pendiente |
| F4.7 Transfer Orders | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Pendiente |
| F4.8 Inter-warehouse Transfers | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Pendiente |
| F5.1 Users/Permissions | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Pendiente |
| F5.2 API Tokens | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Pendiente |
| F5.3 Settings | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Pendiente |
| F5.4 Audit Log | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Pendiente |
| F5.5 Dashboard | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Pendiente |
| F6.1 Integrations | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Pendiente |
| F6.2 Consumer Groups | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Pendiente |
| F6.3 Webhooks | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Pendiente |
| F6.4 Channels | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Pendiente |
| F6.5 Notifications | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Pendiente |
| F6.6 Imports | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Pendiente |
| F7.1 POS Activity | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Pendiente |
| F7.2 Fraud | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Pendiente |

## 11. Protocolo de trabajo para cada incremento

1. Seleccionar una feature pendiente y comprobar sus dependencias.
2. Leer la implementación React y registrar todas sus capacidades, incluidos estados límite y permisos.
3. Inspeccionar el backend Flask y registrar contratos reales. Si falta una operación, detener esa parte y documentar el bloqueo.
4. Revisar los modelos y capas Svelte existentes antes de crear archivos; reutilizar lo válido y corregir lo incompleto.
5. Implementar dominio y sus pruebas; aprobar esa suite antes de avanzar.
6. Implementar casos de uso y pruebas independientes con puertos simulados.
7. Implementar DTO, mappers y repositorios; aprobar tests de contrato HTTP.
8. Implementar UI y pruebas de interacción con casos de uso simulados.
9. Conectar el flujo vertical y ejecutar pruebas de integración/regresión.
10. Ejecutar chequeo estático, tests y build; revisar diff para evitar cambios fuera de alcance.
11. Actualizar las casillas de este documento solo con evidencia real.
12. Entregar resumen de capacidades migradas, brechas restantes, endpoints utilizados, pruebas ejecutadas y commit/PR.

## 12. Decisiones y exclusiones explícitas

- **Picking/Packing/Shipping operativos:** conservar los flujos Svelte actuales orientados a la operación. No recrear automáticamente las antiguas pantallas administrativas React que fueron retiradas por trasladarse la operación a escáneres.
- **Picking Tickets y Picking Batches:** sí se consideran funcionalidades administrativas separadas y están incluidas en Fase 4.
- **Backend:** este plan cubre la migración del frontend. Los cambios Flask solo se proponen como dependencias separadas cuando un contrato necesario no exista o sea insuficiente; no se ocultan como trabajo frontend.
- **Persistencia:** prohibido conectar la UI directamente a PostgreSQL/Redis o duplicar escrituras en el navegador.
- **Autorización:** los permisos se aplican tanto en presentación como en backend; la UI nunca es la frontera de seguridad.
- **Datos financieros y de inventario:** el frontend presenta y solicita operaciones; los cálculos y efectos autoritativos permanecen en el backend.
- **Cambios de alcance:** cualquier feature retirada, fusionada o sustituida requiere motivo y equivalencia documentada en la matriz de paridad.

---

**Regla final:** el progreso se mide por capacidades verificadas y pruebas aprobadas, no por cantidad de rutas, componentes, entidades o archivos creados.
