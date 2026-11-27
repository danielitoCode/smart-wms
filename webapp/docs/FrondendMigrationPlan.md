# Plan definitivo de migración e integración del frontend — Smart WMS

> **Documento rector de integración final del frontend React → SvelteKit.** Complementa y operacionaliza [MigrationPlan.md](./MigrationPlan.md): ese documento gobierna la migración de capacidades y recorridos de negocio; este documento gobierna cómo integrar, proteger, verificar y cerrar el frontend completo sin perder funcionalidades ya aceptadas.
>
> **Ámbito:** exclusivamente `webapp/` (SvelteKit/Svelte 5/TypeScript), sus pruebas, documentación y workflows frontend. React `admin/` se conserva como referencia funcional y fallback hasta la aprobación formal de retirada. Flask se inspecciona para verificar contratos, pero no se modifica como parte de este plan.

- Rama de trabajo de referencia: `svelte-webapp`.
- Snapshot de cierre F1.1: `13c71fc3957927aa63b5a81f0fd6e82907fc91d0`; snapshot de cierre F1.2: `f3fa76a0381dc5d5f75915a866693f31eb6cf455` (27-11-2026). Cada evidencia corresponde exactamente al SHA indicado; los commits documentales posteriores no alteran el snapshot de implementación validado.
- Archivo de plan funcional complementario: [MigrationPlan.md](./MigrationPlan.md).
- Runbook E2E existente: [R10-E2E-Regression-Runbook.md](../.code-review/R10-E2E-Regression-Runbook.md).
- Matriz operativa existente: [R10.1-Operation-Traceability-Matrix.md](../.code-review/R10.1-Operation-Traceability-Matrix.md).

---

## 1. Objetivo final y principio rector

El objetivo no es únicamente completar R0–R10 ni conseguir que todas las pantallas existan en Svelte. El objetivo es entregar **un frontend único, coherente, íntegro, verificable y mantenible**, donde:

1. Todas las capacidades que deban migrarse estén inventariadas y tengan un estado real, no supuesto.
2. Cada recorrido funcional tenga paridad aprobada o una limitación de servidor explícita, visible y segura.
3. Una integración nueva no pueda borrar, sustituir, degradar ni cambiar silenciosamente una capacidad integrada con anterioridad.
4. Los contratos compartidos, permisos, sesión, almacén, navegación, diseño, i18n y estados UI sean consistentes en toda la aplicación.
5. Los cambios transversales se validen contra todos sus consumidores, no solo contra el módulo que los introduce.
6. La aplicación pueda construirse, probarse, desplegarse, observarse y revertirse con un procedimiento repetible.
7. La retirada de React solo ocurra después de demostrar paridad, cobertura y aceptación explícita.

### Regla de integridad no negociable

**Una funcionalidad aceptada es una línea base protegida.** Ninguna rama, agente, feature o refactor puede reemplazar su implementación por otra versión, simplificar su comportamiento, eliminar sus pruebas o cambiar su contrato por conveniencia de una nueva integración.

Si un cambio necesita modificar una capacidad protegida, debe declararlo como cambio intencional, justificarlo, identificar todos sus consumidores, añadir/actualizar pruebas de regresión, demostrar que no pierde comportamiento y recibir revisión explícita. Si no puede demostrarse, el cambio no se integra.

La protección no significa congelar el código: significa que el comportamiento aprobado solo cambia mediante una evolución controlada y demostrable.

---

## 2. Relación con los planes y fuentes de verdad

Los documentos no deben competir entre sí:

| Documento | Responsabilidad |
|---|---|
| `docs/MigrationPlan.md` | Alcance, arquitectura, contratos, reglas de negocio, dependencias y DoD de cada recorrido funcional. |
| `docs/FrondendMigrationPlan.md` | Integración definitiva, protección contra regresiones/sobrescrituras, gates globales, calidad transversal, despliegue y cierre. |
| `.code-review/R10-E2E-Regression-Runbook.md` | Procedimiento ejecutable de comparación React/Svelte y recorridos E2E. |
| `.code-review/R10.1-Operation-Traceability-Matrix.md` | Inventario detallado de operaciones, estado y evidencia de cada capacidad. |
| Workflows CI | Evidencia automatizada reproducible para el SHA exacto evaluado. |

Si hay contradicción, prevalecen las restricciones de seguridad, contratos y alcance de `MigrationPlan.md`; este documento añade las reglas de integración y no autoriza a ampliar el backend. Los snapshots antiguos de los runbooks son históricos: nunca deben usarse como prueba del estado actual sin repetir la ejecución sobre el HEAD actual.

No usar porcentajes históricos como certificación. La finalización se determina por inventario atómico, estados, evidencias y gates; cualquier porcentaje debe calcularse con una matriz estable y reproducible.

---

## 3. Qué significa «frontend terminado»

El cierre exige completar seis dimensiones, no solo las features:

### 3.1 Integridad funcional
- Inventario de rutas, pantallas, acciones, flujos, filtros, formularios, diálogos, estados, navegación, exportaciones, impresión y casos límite de React.
- Correspondencia explícita con Svelte: equivalente, cambio aprobado, implementado con limitación de backend documentada, retirado con aprobación o pendiente por trabajo frontend real.
- Ninguna operación simulada como exitosa si no existe soporte real del servidor.
- Ninguna función de negocio cerrada solo porque compila o tiene una pantalla.

### 3.2 Integridad arquitectónica
- Mantener Feature-First + Clean Architecture.
- Reglas de dominio fuera de componentes y view-models.
- DTO Flask separados de entidades de dominio y modelos de presentación.
- Un único propietario para cada regla/caso de uso transversal.
- Dependencias en dirección UI → Application → Domain; Data implementa puertos y la composición conecta adaptadores.
- No introducir servicios globales monolíticos, repositorios duplicados ni estados paralelos para la misma entidad.

### 3.3 Integridad de datos y contexto
- Sesión, usuario, roles/grants, almacenes autorizados y almacén activo consistentes.
- Invalidación de caché, selecciones y formularios dependientes al cambiar sesión o almacén.
- Paginación, filtros, orden, nullability, unidades, estados y errores fieles al contrato.
- Mutaciones con feedback inequívoco: pendiente, confirmado, rechazado, conflicto o resultado desconocido.
- Evitar doble envío y reintentos peligrosos; no reintentar automáticamente operaciones no idempotentes sin contrato que lo permita.

### 3.4 Integridad visual y de interacción
- Sistema visual compartido y coherente: tipografía, espaciado, colores, densidad, jerarquía, tablas, formularios, diálogos, navegación y feedback.
- Responsive en tamaños de móvil, tablet y escritorio; no limitarse a que la pantalla «quepa».
- Loading, skeleton, empty, error, forbidden, not-supported, conflict y success consistentes.
- Accesibilidad por teclado, foco, labels, nombres accesibles, contraste, ARIA y movimiento reducido.
- Idiomas soportados completos y sin textos de interfaz incrustados directamente en componentes.

### 3.5 Integridad técnica y operativa
- Typecheck, build de producción, suites unitarias, integración, UI/i18n, regresión y browser E2E.
- Sin errores nuevos no explicados en consola, red, hydration, rutas o recursos estáticos.
- Rendimiento, carga diferida, cancelación de solicitudes y limpieza de suscripciones/efectos.
- Configuración por entorno sin secretos en el bundle.
- Logs útiles sin credenciales, tokens ni datos personales innecesarios.
- Despliegue reproducible, smoke post-deploy y procedimiento de rollback.

### 3.6 Integridad de mantenimiento
- Documentación y trazabilidad al día.
- Pruebas asociadas a cada capacidad y a sus consumidores.
- Dependencias fijadas y lockfiles consistentes.
- Ningún archivo de prueba, fixture, workflow o documentación de una capacidad aceptada se elimina sin análisis y aprobación.
- La rama principal de integración permanece construible y recuperable.

---

## 4. Sistema de protección contra sobrescrituras

Este es el mecanismo principal para evitar que al integrar una funcionalidad se pierda otra previamente integrada.

### 4.1 Inventario de capacidades protegidas

Mantener una matriz de capacidades con, como mínimo:

- ID estable (por ejemplo, `AUTH-LOGIN-001`, `R2-RECEIVING-004`, `R4-BACKORDER-002`).
- Feature propietario y recorrido de negocio.
- Rutas, componentes, casos de uso, puertos, adaptadores y contratos implicados.
- Archivos de implementación y pruebas que la protegen.
- Permisos, almacenes y perfiles cubiertos.
- Estado: `DISCOVERED`, `IN_PROGRESS`, `INTEGRATED`, `RESOLVED`, `RESOLVED_WITH_BACKEND_LIMITATION`, `DEPRECATED_APPROVED`. No existe un estado terminal `RESOLVED_WITH_BACKEND_LIMITATION` para dejar una tarea frontend abierta.
- SHA en el que se aceptó, evidencia y responsable/revisor.
- Dependencias y consumidores conocidos.

Una capacidad solo se considera **protegida** al alcanzar `RESOLVED` o `RESOLVED_WITH_BACKEND_LIMITATION`, con pruebas y evidencia vinculadas al SHA. `INTEGRATED` significa incorporada, pero aún no certificada. La resolución con limitación backend significa que Svelte ya ofrece el flujo frontend completo y seguro, comunica con precisión la operación no disponible y documenta el contrato/endpoint ausente; no afirma que el servidor haya realizado una mutación que no soporta.

### 4.2 Contrato de integración por cambio

Todo PR/cambio debe incluir una ficha (en descripción o documento de trabajo) con:

1. Objetivo y capacidades nuevas/modificadas.
2. Capacidades protegidas potencialmente afectadas.
3. Archivos que se crearán, modificarán y eliminarán.
4. Contratos compartidos afectados (auth, grants, warehouse, HTTP, DTO, routing, UI shared, i18n, configuración).
5. Pruebas nuevas y suites de regresión que se ejecutarán.
6. Riesgos, migración/compatibilidad y plan de rollback.
7. Evidencia del resultado sobre el SHA candidato.

Un cambio que no pueda identificar sus efectos sobre el inventario no está listo para integrarse.

### 4.3 Propiedad de archivos y módulos

- Cada feature tiene un área de propiedad; los componentes transversales tienen propietario explícito.
- Evitar que dos ramas modifiquen simultáneamente el mismo archivo compartido.
- No copiar una implementación compartida para resolver una necesidad local: ampliar el contrato del propietario o crear una abstracción nueva justificada.
- No reemplazar archivos completos cuando el cambio requiere una modificación localizada.
- En conflictos Git, revisar semánticamente ambas versiones; no elegir automáticamente «ours» o «theirs».
- Revisar especialmente archivos de alto impacto: layout, rutas, auth/session, grants, warehouse context, cliente HTTP, manejo de errores, navegación, componentes compartidos, i18n, configuración, package manifests y workflows.
- Cambios de rutas o nombres de componentes requieren búsqueda de referencias y verificación de deep links/aliases.

### 4.4 Regla de no eliminación

No se elimina una ruta, pantalla, acción, campo, permiso, estado, traducción, test, fixture ni adaptador porque parezca obsoleto. Antes se debe demostrar:

1. Qué lo reemplaza y qué comportamiento conserva.
2. Que no existen consumidores, enlaces, permisos ni pruebas que dependan de ello.
3. Que la matriz React/Svelte y la documentación se actualizaron.
4. Que hay pruebas de la ruta nueva y de la retirada de la antigua.
5. Que la retirada fue aprobada explícitamente.

Si no se demuestra, se conserva.

### 4.5 Revisión de impacto obligatoria

Para cualquier cambio en un contrato transversal, ejecutar una búsqueda de consumidores y construir una lista explícita de afectados. Ejemplos:

- Auth/session: todas las rutas protegidas y operaciones que dependen de usuario/grants.
- Warehouse context: todos los listados, detalles, filtros, mutaciones, bins, stock, contadores y formularios.
- DTO/mapper: todos los casos de uso, view-models y pantallas que consumen el tipo.
- Routing/layout: login, deep links, guards, redirects, aliases y refresh.
- UI shared: todas las pantallas que lo utilizan, incluidos estados de error y permisos.
- i18n: todos los idiomas y claves que usan la pantalla/componente.
- CSS/tokens: todas las áreas que heredan el estilo o layout.

### 4.6 Política de integración

- Trabajar en ramas cortas desde el último HEAD aprobado de `svelte-webapp`.
- Actualizar/rebasar la rama de trabajo antes de pedir integración.
- Integrar cambios mediante PR revisable; evitar commits directos de features a la rama común.
- Serializar el merge de cambios que toquen contratos o archivos transversales.
- No aceptar un merge si el HEAD base cambió después de ejecutar las pruebas: actualizar la rama y repetir los gates afectados.
- La rama compartida debe quedar verde después de cada integración.
- No usar force-push para resolver conflictos o «hacer coincidir» una rama protegida.
- No fusionar un conjunto grande de features sin puntos de control intermedios.

**Criterio:** cada merge debe ser una evolución monotónica del comportamiento aceptado: añade capacidad o modifica explícitamente una ya existente con evidencia; nunca reduce silenciosamente la cobertura o el comportamiento.

---

## 5. Secuencia definitiva de ejecución

No son fases aisladas que se puedan sobrescribir entre sí. Son puertas consecutivas; una puerta no se considera cerrada por el mero hecho de que la siguiente haya empezado.

### Puerta 0 — Congelar y medir la línea base

1. Registrar HEAD, estado de Git y workflows del commit.
2. Confirmar rama, dependencias y configuración real.
3. Inventariar rutas/features React y Svelte, pruebas existentes y contratos.
4. Ejecutar baseline de check, build y suites frontend disponibles.
5. Guardar resultados y fallos preexistentes, sin mezclarlos con fallos nuevos.
6. Crear la matriz de capacidades protegidas y mapa de archivos/propietarios.

**Salida:** baseline reproducible con SHA, lista de pendientes y defectos preexistentes clasificados.

### Puerta 1 — Cerrar la plataforma transversal

Validar una sola implementación coherente para:

- arranque, layout, routing, deep links y aliases;
- autenticación, restauración/expiración de sesión y logout;
- grants, roles y guards fail-closed;
- selección y aislamiento de almacén;
- cliente HTTP, errores, timeouts, cancelación y configuración;
- cache, invalidación y sincronización de estado;
- componentes compartidos y estados UI;
- i18n, accesibilidad y tokens visuales;
- logging/diagnóstico sin filtrar secretos.

**Salida:** contratos transversales documentados y pruebas que los protegen. Ningún feature puede crear una variante local de estas reglas.

### Puerta 2 — Cerrar recorridos de negocio R0–R9

Usar el orden de dependencias y la trazabilidad de `MigrationPlan.md`; no asumir que el número de fase demuestra finalización.

- R0 Auth/Grants y contexto transversal.
- R1 Catálogos y maestros.
- R2 Purchase Orders / Receiving / Put-away / historial.
- R3 Inventario y disponibilidad.
- R4 Sales Orders / Backorders.
- R5 Transferencias.
- R6 Picking / Packing / Shipping.
- R7 Returns / RMA / Refunds.
- R8 Administración.
- R9 Integraciones.

Para cada recorrido:

1. Comparar el comportamiento React completo.
2. Verificar contratos Flask reales, permisos y scope.
3. Implementar dominio/aplicación/adaptadores/UI sin duplicar propietarios.
4. Añadir pruebas unitarias, integración y UI.
5. Ejecutar regresión de todos los recorridos protegidos que comparten contratos/archivos.
6. Completar en Svelte el comportamiento frontend previsto. Si Flask no soporta una operación, implementar su estado no disponible, validaciones, permisos, feedback y alternativa segura; documentar la limitación en la matriz y no simular éxito.
7. Marcar la tarea `RESOLVED` o `RESOLVED_WITH_BACKEND_LIMITATION` según corresponda. No dejarla pendiente por una limitación exclusivamente backend.
8. Registrar SHA y evidencia antes de pasar a la siguiente integración.

R5/R3/R6 u otras acciones no soportadas por Flask deben quedar completas en Svelte desde el punto de vista frontend: pantallas, navegación, estados, validación, permisos, mensajes de indisponibilidad y comportamiento seguro. Se documenta qué endpoint/regla/persistencia falta en Flask y qué resultado no puede garantizarse. No se inventa persistencia ni se presenta una acción como exitosa. La tarea frontend se resuelve con estado `RESOLVED_WITH_BACKEND_LIMITATION`; el trabajo backend, si se decide realizarlo, se registra aparte y no retiene el 100% de migración del frontend.

### Puerta 3 — Paridad de navegación y experiencia completa

Auditar la aplicación de extremo a extremo, no por capturas aisladas:

- todas las rutas canónicas y legacy aliases;
- login, logout, expiración y acceso directo;
- listados, filtros, orden, paginación y búsqueda;
- detalles, tabs, modales, drawers, breadcrumbs y retorno al contexto;
- formularios, validaciones, confirmaciones y cancelaciones;
- estados loading/empty/error/forbidden/not-supported/conflict/success;
- navegación atrás/adelante, refresh y deep links;
- responsive en móvil/tablet/escritorio;
- teclado, lector de pantalla, foco y contraste;
- idiomas soportados y movimiento reducido.

Las diferencias de interacción con React (por ejemplo, modal contextual frente a navegación a otra ruta, detalle completo frente a formulario reducido, o árbol jerárquico frente a lista plana) deben registrarse y resolverse o aprobarse explícitamente; no asumir equivalencia visual.

### Puerta 4 — Smoke tests y browser E2E integrados al CI

Los smoke tests deben evolucionar con la aplicación. No basta con que sus selectores sigan existiendo: deben detectar fallos reales de arranque, autenticación, permisos, rutas y operaciones.

**Suite smoke mínima objetivo:**

| ID | Cobertura | Resultado exigido |
|---|---|---|
| S00 | App readiness/hydration | La app arranca, hidrata y no presenta errores críticos de consola o recursos. |
| S01 | Login/logout/sesión | Login válido, credenciales inválidas, restauración y expiración. |
| S02 | Routing y grants | ADMIN, USER autorizado y USER sin grant; denegación UI y HTTP coherentes. |
| S03 | Warehouse context | Cambio de almacén invalida datos/selecciones; WH-A no filtra datos de WH-B. |
| S04 | Receiving | Operación permitida, validación, resultado persistido y recarga. |
| S05 | History/unreceive | Historial, reversión individual y permisos, cuando Flask lo soporte. |
| S06 | Dashboard | Datos, navegación y acciones contextuales principales. |
| S07 | Local Pickup | Detalle/acción contextual y retorno al flujo correcto. |
| S08 | Backorders | Cola, filtros, detalle y contexto de Sales Order. |
| S09 | Sales Orders | Listado, detalle, estados y operaciones permitidas. |
| S10 | Rutas legacy/deep links | Alias, refresh y navegación directa sin pérdida de contexto. |

Organización de ejecución:

- **Smoke rápido:** S00–S03 en cada PR.
- **Smoke operativo:** S04–S05 en PR que afecten Receiving/stock/warehouse y en merge a rama común.
- **Regresión de flujos:** S06–S10 en merge a rama común y nightly.
- **Full browser E2E:** recorridos R1–R9 según runbook, antes de release y después de cambios transversales.

El test de readiness actual es solo un smoke de hidratación y formulario; debe ampliarse para capturar errores de consola/red y validar login real. El smoke de Receiving actual demuestra navegación y una respuesta 403 por API para el usuario limitado, pero no certifica recepción persistida, historial, unreceive ni aislamiento WH-A/WH-B. No presentar estos tests parciales como cobertura completa.

**CI obligatorio:** añadir un job frontend E2E Playwright (o runner de navegador elegido y documentado) con entorno aislado, datos reiniciables y secretos fuera del repositorio. La suite no puede depender de producción. Si el entorno no está disponible, el job debe reportar explícitamente `BLOCKED_ENVIRONMENT`; no marcarlo como exitoso ni eliminarlo silenciosamente. Mantener lockfile reproducible para las dependencias del runner.

### Puerta 5 — Regresión cruzada e integridad final

1. Ejecutar todas las suites frontend y E2E requeridas sobre el mismo SHA candidato.
2. Ejecutar recorridos de regresión para cada contrato/archivo compartido modificado.
3. Comparar baseline contra candidato; separar fallos preexistentes de regresiones nuevas.
4. Revisar los diffs de rutas, permisos, DTO, componentes compartidos, estilos, traducciones, pruebas y configuración.
5. Revisar cambios de dependencias, lockfiles, bundle y warnings.
6. Repetir escenarios ADMIN/USER, grants positivos/negativos y warehouses disjuntos.
7. Verificar persistencia tras recarga y estados tras errores/conflictos.
8. Registrar todos los resultados y cerrar diferencias.

No se acepta «la suite global pasó» como sustituto de la revisión de cobertura: una suite puede pasar sin ejecutar una funcionalidad recién modificada.

### Puerta 6 — Release, observabilidad y rollback

- Build de producción reproducible para el SHA aprobado.
- Variables de entorno documentadas; secretos solo en configuración segura del entorno.
- Despliegue primero a staging con backend/contratos compatibles.
- Ejecutar smoke post-deploy S00–S05 y recorridos críticos de lectura/escritura.
- Verificar errores JS, errores de red, latencia, autenticación, grants y almacén.
- Publicar progresivamente si la infraestructura lo permite.
- Mantener versión anterior desplegable y procedimiento de rollback probado.
- No eliminar React ni recursos de fallback hasta cumplir la Puerta 7.

### Puerta 7 — Retirada formal de React y cierre

Retirar React únicamente cuando:

- [ ] Inventario React/Svelte completo y revisado.
- [ ] Cada capacidad está `RESOLVED`, `RESOLVED_WITH_BACKEND_LIMITATION` con experiencia frontend completa y limitación documentada, o `DEPRECATED_APPROVED`.
- [ ] No quedan capacidades críticas `DISCOVERED` o `IN_PROGRESS`.
- [ ] Paridad funcional y de navegación aprobada para recorridos críticos.
- [ ] CI frontend y browser E2E están integrados y verdes en el SHA candidato.
- [ ] No hay regresiones nuevas abiertas.
- [ ] Accesibilidad, responsive, i18n y rendimiento tienen evidencia.
- [ ] Staging y producción han pasado smoke post-deploy.
- [ ] Rollback está documentado y probado.
- [ ] La retirada de React fue aprobada explícitamente.

La existencia de una limitación backend no deja pendiente la tarea de migración frontend: la funcionalidad Svelte debe quedar terminada con una respuesta segura y la limitación documentada. La operación end-to-end solo puede declararse disponible cuando el backend realmente la soporte. No ocultar gaps detrás de una etiqueta genérica de paridad.

---

## 6. Estrategia de pruebas: pirámide y matriz de impacto

### 6.1 Pirámide obligatoria

1. **Domain:** invariantes, cálculos, transiciones y reglas puras.
2. **Application:** orquestación, permisos de aplicación, errores y límites.
3. **Data/Infrastructure:** DTO, mappers, serialización, errores HTTP, paginación y contratos simulados.
4. **Integration:** conexión real entre capas frontend con API simulada/controlada.
5. **UI/component:** render, interacción, estados, accesibilidad e i18n.
6. **Browser E2E:** login, rutas, permisos, almacenes y recorridos con backend de pruebas.
7. **Post-deploy smoke:** comportamiento del artefacto desplegado.

Cada nivel detecta una clase diferente de fallo; no sustituir todas las pruebas por E2E ni E2E por Vitest.

### 6.2 Matriz de impacto

| Cambio | Regresión mínima |
|---|---|
| Auth/session/grants | S00–S02 + todas las rutas protegidas críticas |
| Warehouse context | S03 + list/detail/mutation de R1–R9 con scopes separados |
| HTTP/error/DTO compartido | Tests de adaptadores + todos los consumidores afectados + build |
| Routing/layout | S00–S02 + deep links y aliases |
| UI shared/design tokens | Tests de componentes + capturas/recorridos de pantallas consumidoras + responsive |
| i18n | Suite i18n + pantallas/estados afectados en todos los idiomas |
| Feature aislado | Tests de dominio/aplicación/data/UI del feature + smoke del recorrido |
| Dependencias/config/build | Check + build + suite completa + E2E de arranque |
| Workflow/test infrastructure | Validación del workflow en PR y evidencia de que el job ejecutó realmente |

### 6.3 Reglas para pruebas confiables

- Tests deterministas, datos sintéticos y fixtures reiniciables.
- No compartir credenciales reales ni tokens en logs/artifacts.
- Aislar warehouses y perfiles; un usuario limitado debe probar denegación.
- No usar mocks para afirmar persistencia real.
- No ocultar errores con retries ilimitados, timeouts inflados o assertions débiles.
- No cambiar un test para aceptar una regresión sin justificar el cambio esperado.
- Mantener IDs estables de test vinculados a la matriz de capacidades.
- Las pruebas E2E deben verificar resultado tras recarga/consulta, no solo el toast de éxito.
- Guardar reportes, trazas y capturas como evidencia de CI con retención razonable.

---

## 7. Contratos compartidos y control de compatibilidad

Cada contrato transversal tendrá un propietario y un registro de cambios:

- Auth/session/token lifecycle.
- Roles, grants y feature/page permissions.
- Warehouse context y warehouse scope.
- API client, configuración, errores, cancelación y retry.
- DTO, mappers y paginación.
- Cache, invalidación y sincronización.
- Routing, guards, redirects y aliases.
- Design system, componentes y tokens.
- i18n y convenciones de claves.
- Telemetría, logging y feature capability registry.

Reglas:

1. Los contratos se cambian de forma compatible cuando sea posible.
2. Una ruptura requiere migrar todos los consumidores en el mismo cambio lógico o usar una transición temporal explícita.
3. No introducir defaults silenciosos que conviertan ausencia/null en datos válidos.
4. No usar casts, `any` ni adaptadores genéricos para esconder incompatibilidades.
5. No confiar en permisos visuales como frontera de seguridad.
6. No permitir que el contexto de almacén quede fijado en un singleton obsoleto después de cambiar sesión/usuario.
7. No mostrar datos del almacén anterior mientras se resuelve el nuevo contexto.
8. No inventar rutas, endpoints, capacidades ni persistencia del servidor.

---

## 8. Calidad no funcional del frontend

Antes del cierre, realizar una pasada transversal que cubra:

### Seguridad frontend
- No secretos ni credenciales en código, logs, source maps públicos o variables `VITE_*`.
- Guards fail-closed y manejo consistente de 401/403/404.
- No filtrar datos entre almacenes por cache, stores, URL o estado residual.
- Validación de entrada para UX, sin confundirla con validación de servidor.
- Dependencias auditadas y actualizadas con cambios controlados.

### Rendimiento y estabilidad
- Evitar renders/consultas repetidas y waterfalls innecesarios.
- Lazy loading donde reduzca carga sin romper navegación.
- Cancelar solicitudes obsoletas al cambiar ruta/almacén o desmontar componentes.
- No dejar timers, listeners o subscriptions huérfanos.
- Medir bundle y tiempos de rutas críticas; comparar con baseline.
- Probar con datos de volumen representativo, no solo fixtures mínimos.

### Accesibilidad
- Navegación completa por teclado.
- Orden de foco lógico, foco visible y retorno de foco en modales.
- Labels, errores asociados y nombres accesibles.
- Contraste suficiente, semántica HTML y ARIA correcta.
- No depender exclusivamente de color, hover o iconos.
- Respetar `prefers-reduced-motion`.

### Responsive e i18n
- Probar al menos 375 px, 768 px y 1280 px, además de un viewport amplio.
- Revisar tablas densas, formularios, menús, modales y acciones principales.
- Ningún idioma debe quedar parcialmente traducido ni romper layout por cadenas largas.
- Formatos de fecha, número y moneda coherentes con configuración/locale.

### Compatibilidad
- Navegadores soportados definidos explícitamente.
- Refresh/deep link, atrás/adelante y apertura de enlaces en nueva pestaña.
- No depender de estado efímero para resolver una URL que debe ser autónoma.

---

## 9. Gates de CI y política de merge

El workflow `Webapp CI` actual ejecuta Node 26, check, build y suites Vitest (domain, application, infrastructure, UI/i18n, integration y regresión). La cobertura aparece como `continue-on-error`; no es actualmente un gate obligatorio. El paquete `webapp/package.json` no declara Playwright ni scripts E2E; existe un paquete separado bajo `webapp/e2e` con specs de smoke/R2. Por tanto, **la presencia de esos specs no significa que browser E2E esté integrado al CI**.

Objetivo de gates:

### En cada PR
- instalación reproducible desde lockfile;
- `npm run check`;
- `npm run build`;
- suites Vitest afectadas;
- suite frontend completa;
- smoke S00–S03;
- revisión de impacto y protección de capacidades.

### En merge a `svelte-webapp`
- todos los gates de PR;
- suites de regresión cruzada;
- smoke operativo S04–S05 cuando aplique;
- análisis de cambios compartidos;
- browser E2E de recorridos críticos.

### Nightly / release candidate
- full browser E2E R1–R9;
- regresión de rutas legacy/deep links;
- responsive, accesibilidad e i18n;
- análisis de dependencias y bundle;
- reporte de cobertura y deuda técnica.

**Política:** los checks críticos deben ser required checks cuando la configuración de GitHub lo permita. La cobertura no puede permanecer como warning indefinidamente: definir umbrales basados en baseline por dominio/caso de uso y aumentarlos gradualmente, sin reducirlos para hacer pasar una integración. No bloquear el frontend por fallos de suites Python ajenas al alcance, pero documentar las limitaciones del servidor que afecten al comportamiento.

---

## 10. Clasificación de hallazgos y decisiones

Usar exclusivamente categorías consistentes con el plan funcional:

- `FRONTEND_DEFECT`: regresión, paridad incompleta, error UI/estado/navegación/contrato frontend o test frontend defectuoso.
- `BACKEND_LIMITATION`: capacidad o enforcement que Flask no proporciona.
- `FRONTEND_GUARD_REQUIRED`: protección de UX necesaria frente a una capacidad ausente o respuesta insegura del servidor.
- `UNVERIFIED_CONTRACT`: no hay evidencia suficiente del contrato.
- `VERIFIED_PARITY`: comportamiento equivalente comprobado.
- `DEPRECATED_APPROVED`: capacidad retirada con aprobación y evidencia.

Para cada hallazgo registrar: ID, severidad, pasos, SHA, usuario/grants/warehouse, resultado esperado/real, evidencia, impacto sobre capacidades protegidas, responsable y criterio de cierre.

No cerrar un defecto como «no reproducible» sin registrar entorno, SHA, usuario, almacén y evidencia de la repetición.

---

## 11. Protocolo de integración de una funcionalidad nueva o modificada

Este protocolo se aplica a cada cambio, incluso si parece pequeño:

1. **Actualizar base:** comprobar HEAD de `svelte-webapp`; confirmar que la rama parte de ese commit.
2. **Identificar alcance:** asignar IDs de capacidades y feature propietario.
3. **Revisar dependencias:** localizar consumidores, contratos y archivos compartidos.
4. **Definir aceptación:** describir comportamiento y pruebas antes de implementar.
5. **Implementar sin duplicar:** respetar arquitectura y propietarios existentes.
6. **Proteger comportamiento previo:** añadir tests de caracterización si una capacidad anterior carece de pruebas.
7. **Ejecutar pruebas locales:** suites nuevas y regresión de impacto.
8. **Inspeccionar diff:** detectar eliminaciones, cambios de permisos, rutas, contratos, traducciones, fixtures y tests no previstos.
9. **Abrir PR:** incluir checklist de impacto, evidencia y rollback.
10. **Integrar serialmente:** no fusionar contra un HEAD que no haya sido probado.
11. **Repetir gates en el SHA candidato:** el resultado de una rama anterior no certifica el merge resultante.
12. **Actualizar matriz:** estado, SHA, pruebas y evidencia.
13. **Promover a protegida:** solo al alcanzar `VERIFIED`.
14. **Vigilar CI posterior:** si aparece una regresión, detener nuevas integraciones dependientes y corregir o revertir el cambio causante.

### Checklist obligatorio de PR

- [ ] El cambio declara capacidades nuevas/modificadas.
- [ ] Se identificaron consumidores y contratos compartidos.
- [ ] No se eliminó funcionalidad, ruta, permiso, test o traducción sin aprobación.
- [ ] No se duplicó una regla/caso de uso existente.
- [ ] No se inventó un contrato Flask.
- [ ] Hay pruebas nuevas o de caracterización para la conducta afectada.
- [ ] Se ejecutaron pruebas de impacto y regresión.
- [ ] Check y build pasan sobre el candidato.
- [ ] Se revisaron errores de consola/red, estados y accesibilidad cuando aplica.
- [ ] La matriz y documentación están actualizadas.
- [ ] Existe plan de rollback para cambios de riesgo.
- [ ] La revisión confirma que ninguna capacidad protegida se degradó.

---

## 12. Gestión de fallos, rollback y recuperación

- **Regresión funcional:** bloquear merges dependientes; identificar primer SHA que la introduce; revertir o corregir con pruebas de reproducción.
- **Fallo de contrato:** no adaptar silenciosamente el frontend a una respuesta inesperada; clasificar, documentar y proteger el comportamiento seguro.
- **Fallo de CI:** distinguir fallo real, flaky test, infraestructura y entorno; no convertirlo en éxito con `continue-on-error` sin aprobación.
- **Fallo post-deploy:** activar rollback al artefacto anterior; verificar smoke; conservar logs anonimizados.
- **Migración de estado/configuración:** usar cambios compatibles y reversibles; nunca borrar datos de usuario para resolver una regresión de UI.
- **Conflicto de ramas:** resolver semánticamente y ejecutar regresión de ambos lados; no aceptar resolución automática de archivos críticos.

Cada release debe conservar: SHA desplegado, artefacto, configuración (sin secretos), resultados CI/E2E, changelog, incidencias conocidas y SHA/artefacto de rollback.

---

## 13. Entregables finales

El frontend no se declara definitivo hasta producir estos artefactos:

1. Inventario React/Svelte de rutas, capacidades y recorridos.
2. Matriz de capacidades con estados, propietarios, dependencias y SHA de aceptación.
3. Registro de contratos reales Flask y limitaciones del servidor.
4. Mapa de ownership de módulos/archivos transversales.
5. Suite Vitest completa y browser E2E integrada al CI.
6. Matriz de smoke S00–S10 con evidencia por perfil y almacén.
7. Informe de paridad funcional y de experiencia.
8. Informe de accesibilidad, responsive, i18n y rendimiento.
9. Informe de regresión comparado con baseline.
10. Runbook de despliegue, smoke post-deploy y rollback.
11. Decisión aprobada de retirada o conservación de React.
12. Acta final con SHA, checks, limitaciones abiertas y responsables.

---

## 14. Criterio definitivo de aceptación

El frontend queda **FINALIZADO** únicamente cuando todas las condiciones siguientes se cumplen:

- [ ] Todos los recorridos y capacidades están inventariados; no quedan elementos desconocidos.
- [ ] Todas las capacidades frontend están `RESOLVED` o `RESOLVED_WITH_BACKEND_LIMITATION`; no quedan pendientes por limitaciones exclusivamente backend.
- [ ] Todas las capacidades previamente aceptadas conservan su comportamiento o tienen una evolución aprobada y probada.
- [ ] No existen duplicaciones de reglas compartidas ni contratos incompatibles sin transición.
- [ ] Auth, grants, warehouse context, routing, HTTP y estados UI son coherentes en toda la aplicación.
- [ ] Todas las rutas y deep links relevantes funcionan en acceso directo y refresh.
- [ ] La paridad funcional y de interacción está demostrada contra React o aprobada como cambio deliberado.
- [ ] Suites unitarias, integración, UI/i18n, regresión y browser E2E requeridas pasan en el mismo SHA.
- [ ] S00–S10 tienen cobertura real; los casos no aplicables están justificados, no omitidos por conveniencia.
- [ ] No hay regresiones nuevas abiertas de severidad crítica/alta.
- [ ] Responsive, accesibilidad, seguridad frontend, rendimiento e i18n tienen evidencia.
- [ ] CI protege la rama y bloquea integraciones que no cumplan los gates.
- [ ] Staging/producción pasan smoke y rollback está probado.
- [ ] Documentación, matriz y evidencias corresponden al SHA final.
- [ ] La retirada de React cuenta con aprobación explícita.

**Un build verde no equivale a migración terminada. Una pantalla existente no equivale a una funcionalidad integrada. Un test que no ejecuta un recorrido no lo protege. Y un merge que hace pasar el feature nuevo pero rompe uno anterior es una integración fallida.**

---

## 15. Primer orden de trabajo recomendado desde el estado actual

Antes de añadir más funcionalidades:

1. Confirmar HEAD y CI actual de `svelte-webapp`; actualizar el snapshot de este documento.
2. Crear/actualizar la matriz de capacidades protegidas y el mapa de ownership de archivos.
3. Auditar las diferencias entre los smoke existentes y las rutas/componentes actuales.
4. Cerrar S00–S03 y añadir detección de errores de consola/red al readiness.
5. Completar el entorno aislado E2E con perfiles ADMIN, USER autorizado, USER sin grant y dos almacenes disjuntos.
6. Integrar Playwright al CI con lockfile y gates explícitos; mantener el job bloqueado como tal si falta entorno.
7. Incorporar S04–S10 y los recorridos del runbook R1–R9.
8. Ejecutar una regresión transversal completa, corregir diferencias de paridad y registrar limitaciones backend.
9. Completar calidad no funcional y preparar release candidate.
10. Retirar React solo tras cumplir Puerta 7 y recibir aprobación.

Este orden prioriza primero la capacidad de detectar y prevenir pérdidas. A partir de ahí, cada feature que se integre quedará protegida por la misma cadena de contratos, pruebas, revisión y evidencia.


---

## 16. Backlog definitivo segmentado hasta el 100% del frontend

Esta sección transforma el plan en una secuencia ejecutable. Los pesos son fijos y suman exactamente **100%**. El porcentaje mide la contribución de cada tarea al frontend completo, no líneas de código, pantallas creadas ni esfuerzo estimado.

### 16.1 Estados de tarea y regla de resolución

| Estado | Significado | Aporte al progreso |
|---|---|---:|
| DISCOVERED | Identificada, no iniciada. | 0% |
| IN_PROGRESS | Trabajo frontend en curso. | 0% |
| INTEGRATED | Código incorporado, sin verificación final. | 0% |
| RESOLVED | Implementada, revisada, probada y documentada. | 100% de su peso |
| RESOLVED_WITH_BACKEND_LIMITATION | Frontend completo y seguro; limitación real de Flask documentada y probada. | 100% de su peso |
| DEPRECATED_APPROVED | Retirada aprobada, sin consumidores y con evidencia. | 100% de su peso, si el inventario confirma que no debe migrarse |

**No se permite dejar una tarea frontend pendiente por una limitación exclusiva de Flask.** En ese caso Svelte debe completar la experiencia frontend: pantallas, navegación, validaciones, permisos, estados, feedback, mensaje de indisponibilidad y alternativa segura cuando exista. Se documenta el endpoint, contrato, persistencia o enforcement que falta, la evidencia observada y la consecuencia. Nunca se simula una mutación ni se muestra éxito falso. La tarea se cierra como RESOLVED_WITH_BACKEND_LIMITATION.

Una tarea permanece pendiente únicamente si falta trabajo frontend, si el contrato no ha sido investigado o si no existe evidencia suficiente para resolverla.

### 16.2 Cálculo del progreso

El progreso es la suma de los pesos de las tareas cerradas en RESOLVED, RESOLVED_WITH_BACKEND_LIMITATION o DEPRECATED_APPROVED válido.

1. Tarea en curso: aporta cero; no hay prorrateo subjetivo.
2. Código integrado pero no verificado: aporta cero.
3. Limitación Flask documentada y protegida: aporta el 100% del peso frontend de esa tarea.
4. Si una regresión reabre una tarea, sus puntos se descuentan hasta que vuelva a pasar la verificación.
5. El denominador permanece en 100%; no se alteran pesos para inflar el avance.
6. Nuevas capacidades descubiertas se incorporan al segmento correspondiente y se redistribuyen sus pesos antes de continuar.
7. El informe de cada cierre muestra porcentaje anterior, puntos ganados/perdidos, porcentaje nuevo, SHA, pruebas y tareas pendientes.
8. El porcentaje solo se actualiza después de implementar y verificar la tarea completa.

### 16.3 Segmentos y pesos

| Segmento | Objetivo | Peso |
|---|---|---:|
| F0. Inventario, baseline y trazabilidad | Conocer todo el alcance y establecer la línea base. | 5% |
| F1. Plataforma frontend transversal | Sesión, permisos, almacén, routing, HTTP, estado y componentes comunes. | 12% |
| F2. Migración funcional R0–R9 | Todas las capacidades de negocio implementadas en Svelte. | 43% |
| F3. Coherencia estructural y experiencia | Navegación, paridad contextual, diseño, responsive, accesibilidad e i18n. | 8% |
| F4. Pruebas, smoke, E2E y CI | Protección automatizada de capacidades e integraciones. | 12% |
| F5. Calidad no funcional | Seguridad, rendimiento, estabilidad y compatibilidad. | 8% |
| F6. Regresión final, release y retirada controlada de React | Certificación y cierre. | 7% |
| F7. Gobierno de integración y documentación viva | Ownership, política anti-sobrescritura y trazabilidad continua. | 5% |
| **TOTAL** | | **100%** |

### 16.4 F0 — Inventario, baseline y trazabilidad (5%)

- [x] F0.1 — Baseline remoto cerrado: HEAD, commit, workflows de push, estados y fallo de Webapp CI registrados; limitación del working tree local declarada. Evidencia en [F0-Frontend-Inventory-Baseline.md](./F0-Frontend-Inventory-Baseline.md), sección 8. (0,5%)
- [x] F0.2 — Inventario React/Svelte completado: 41/41 módulos, 46/46 rutas React, catálogo estático de interacciones, contexto transversal, parámetros y divergencias; evidencia en [F0-Frontend-Inventory-Baseline.md](./F0-Frontend-Inventory-Baseline.md), sección 8. (1%)
- [x] F0.3 — Correspondencia estática React → Svelte cerrada para 41/41 módulos; clasifica candidatos parciales/directos, ausencias, cambios estructurales y mappings dudosos. No declara paridad runtime ni limitación Flask sin evidencia. Evidencia: [F0-Frontend-Inventory-Baseline.md](./F0-Frontend-Inventory-Baseline.md), sección 9; snapshot analizado `01601718ce835cb4d0e6f252c6df4698b81e626d`. (1%)
- [x] F0.4 — Catálogo estable creado: 10 capacidades transversales + 35 capacidades operativas R1–R9, IDs estables, propietarios, dependencias y referencias a archivos/consumidores/permisos/almacenes/tests en R10.1; huecos explícitos para completar durante F2/F4. Evidencia: [F0.4-Capability-Catalog.md](./F0.4-Capability-Catalog.md) y [F0-Frontend-Inventory-Baseline.md](./F0-Frontend-Inventory-Baseline.md), sección 10. (1%)
- [x] F0.5 — RESOLVED: baseline local cerrada con check sin errores reportados, Vitest 216/216 archivos y 976/976 tests (exit 0), build OK y Playwright R2.11 4/4; escenario USER con grant receiving también pasó aislado 1/1. Se documentan limitaciones: npm ci local bloqueado por EPERM sobre esbuild.exe; no hay CI Webapp verificable en el SHA posterior a las correcciones; timeout E2E intermitente no reproducido y trace ZIP no utilizable. Evidencia y seguimiento: [F0.5-Reproducible-Quality-Baseline.md](./F0.5-Reproducible-Quality-Baseline.md). (1%)
- [x] F0.6 — RESOLVED: mapa de ownership lógico creado a partir del árbol real de `webapp/src`: 37 módulos feature, 10 contratos transversales, propietarios, anclajes, consumidores, límites, reglas de cambio y regresión. Se documentan expresamente los módulos sin ID R1–R9 individual, fronteras compartidas y gaps de ownership por completar en F1–F4; no se inventan responsables humanos ni CODEOWNERS. Evidencia: [F0.6-Module-and-Contract-Ownership.md](./F0.6-Module-and-Contract-Ownership.md). (0,5%)

**Estado actualizado tras F0.6:** F0.1–F0.6 están RESOLVED y acreditan 5% de 5%. F0 queda completada como fase de inventario, baseline, trazabilidad y ownership documental. Se mantienen como seguimientos de calidad/integración (no bloqueantes para el cierre documental F0) la instalación limpia local bloqueada por EPERM y la verificación de Webapp CI sobre el HEAD posterior a los fixes; no se afirma CI remoto verde. El mapa F0.6 es ownership lógico y no configura CODEOWNERS ni asigna responsables humanos.

**Aclaración de alcance y atribución de commits (27-11-2026):** los commits posteriores a la implementación F1.1 no deben atribuirse a F1.1 ni utilizarse como evidencia de su progreso. La comparación GitHub entre `d05fcdfaf2455917244ef14ab8b008ec003a98e5` (último commit documental/ajuste de F1.1 previo al trabajo visual) y `18e4a793932e9072679fba39505b384157697e6a` muestra un único commit adicional, limitado a `webapp/src/lib/components/LineChart.svelte` (41 adiciones y 20 eliminaciones): es un componente visual preparado para integración futura, no un cambio del bootstrap, layout raíz, hydration, readiness ni recuperación. Se excluye por tanto de la implementación y validación de F1.1. Los commits `5e66d74` y `c8a8cda` son únicamente actualizaciones documentales de F1.1/este plan; tampoco representan cambios funcionales de la aplicación. El avance de F1.1 se determina exclusivamente por sus archivos/cambios propios y sus gates de validación sobre un SHA identificado.

### 16.5 F1 — Plataforma frontend transversal (12%)

- [x] F1.1 — RESOLVED: bootstrap raíz, readiness SSR/hydration, recuperación de inicialización, `svelte:boundary` y `+error.svelte` publicados y validados. En el SHA `13c71fc3957927aa63b5a81f0fd6e82907fc91d0`, Webapp CI terminó SUCCESS: instalación `npm ci`, typecheck, build, suites Domain/Application/Infrastructure/UI/i18n/Integration/Full regression y Coverage by feature paths, todas verdes. `gitleaks`, `Dependency Audit` y `Lockfile Version Check` también SUCCESS. Smoke Playwright local reportado 4/4; `app-readiness.spec.ts` comprueba readiness y formulario hidratado. Tests unitarios cubren orden, propagación de fallo y reintento del bootstrap. Mejora no bloqueante: falta un E2E que induzca un fallo de render y pulse recuperación del boundary; el fallback está implementado y la cobertura unitaria de reintento del bootstrap está aprobada. Evidencia: [F1.1-Bootstrap-Hydration-Recovery.md](./F1.1-Bootstrap-Hydration-Recovery.md), [Webapp CI #46055845010](https://github.com/danielitoCode/smart-wms/actions/runs/46055845010). (1%)
- [x] F1.2 — RESOLVED: routing canónico global con 30 aliases legacy/no canónicos HTTP 308, conservación de query/hash, sanitización de redirects post-login, prioridad de cambio obligatorio de contraseña y guards fail-closed. Proxy Vite limitado a `/api` y subrutas para evitar interceptar `/api-tokens`. Validación local sobre `f3fa76a0381dc5d5f75915a866693f31eb6cf455`: check 0 errores/161 warnings; Vitest 218 archivos/1019 tests; build OK (aviso adapter-auto); Playwright routing 2/2; smoke HTTP `/api-tokens` 308 con destino canónico y query preservada. CI: Webapp CI, Dependency Audit, gitleaks y Lockfile Version Check SUCCESS; el endpoint de estado combinado reportó `pending`, discrepancia documentada. E2E con sesión autenticada para deep-link post-login queda como seguimiento F4/F5. Evidencia: [F1.2-Canonical-Routing-Guards-Redirects.md](./F1.2-Canonical-Routing-Guards-Redirects.md). (1,5%)
- [ ] F1.3 — Login, logout, restauración de sesión, expiración y errores de autenticación. (1,5%)
- [ ] F1.4 — Roles, grants y permisos por página/acción; denegación segura y coherente en UI. (1,5%)
- [ ] F1.5 — Contexto de almacén: selección, autorización, cambio, limpieza e invalidación de datos. (1,5%)
- [ ] F1.6 — Cliente HTTP único: base URL, headers, timeout, cancelación, errores y tratamiento 401/403. (1,5%)
- [ ] F1.7 — DTO, mappers, paginación, filtros y normalización de respuestas compartidas. (1%)
- [ ] F1.8 — Cache, stores, sincronización y prevención de datos obsoletos/duplicados. (1%)
- [ ] F1.9 — Sistema común de estados, notificaciones, diálogos, formularios y componentes base. (1%)
- [ ] F1.10 — Configuración por entorno, logging y diagnóstico sin secretos. (0,5%)

**Cierre F1:** una sola fuente de verdad para sesión, permisos, almacén, API y estados compartidos; pruebas de consumidores críticos.

### 16.6 F2 — Migración funcional R0–R9 (43%)

Los pesos por recorrido suman 43%. Cada recorrido se desglosa en la matriz de operaciones del runbook; se cierra por operación verificable, no por existencia de pantallas.

**F2.0 — R0 Auth, grants y contexto de usuario (3%)**
- [ ] Login/logout/sesión y recuperación de estados.
- [ ] Roles, grants, permisos por ruta y acción.
- [ ] Perfil, contexto de usuario y restricciones por almacén.
- [ ] Paridad de denegaciones y redirecciones frente a React.

**F2.1 — R1 Catálogos y datos maestros (4%)**
- [ ] Inventario de entidades, listados, detalle y búsqueda.
- [ ] Crear/editar/activar/desactivar según contratos reales.
- [ ] Validaciones, filtros, paginación, estados vacíos y errores.
- [ ] Permisos, alcance de almacén y acciones contextuales.

**F2.2 — R2 Purchase Orders, Receiving, Put-away e historial (6%)**
- [ ] Purchase Orders: consulta, detalle, estados y acciones permitidas.
- [ ] Receiving: cabecera, líneas, validaciones y cantidades.
- [ ] Confirmación y tratamiento de errores/conflictos.
- [ ] Put-away y asignación de ubicación según capacidades reales.
- [ ] Historial, reversión/unreceive y permisos; guardas seguras si Flask no lo soporta.
- [ ] No presentar stock/costo como actualizado antes de la confirmación exigida por el flujo de almacén.
- [ ] Persistencia tras recarga para operaciones realmente soportadas.

**F2.3 — R3 Inventario y disponibilidad (5%)**
- [ ] Consultas de stock, disponibilidad y detalle por almacén/ubicación.
- [ ] Filtros, búsqueda, paginación y estados de inventario.
- [ ] Ajustes/movimientos solo cuando exista contrato real.
- [ ] Estados no disponibles seguros para operaciones no soportadas.
- [ ] Aislamiento entre almacenes y refresco tras cambio de contexto.

**F2.4 — R4 Sales Orders y Backorders (6%)**
- [ ] Listados, búsqueda, filtros y estados.
- [ ] Detalle completo de Sales Order y navegación contextual.
- [ ] Cola Backorders, filtros y acciones permitidas.
- [ ] Related Sales Orders: jerarquía/relaciones y contexto equivalente.
- [ ] Local Pickup y retorno al contexto de origen.
- [ ] Permisos, errores y consistencia de estado.
- [ ] Resolver diferencias conocidas: modal contextual React frente a navegación/formulario Svelte.

**F2.5 — R5 Transferencias (4%)**
- [ ] Listado y detalle de transferencias.
- [ ] Selección origen/destino y validaciones de almacén.
- [ ] Preparación, envío, recepción y estados definidos por contratos existentes.
- [ ] Si Flask no implementa una operación, UI completa con acción no disponible/explicada; nunca simular movimiento de stock.
- [ ] Documentar endpoint/operación ausente y probar la guarda frontend.

**F2.6 — R6 Picking, Packing y Shipping (5%)**
- [ ] Colas de trabajo, filtros y selección.
- [ ] Picking y validación de cantidades/ubicaciones.
- [ ] Packing, paquetes y resumen.
- [ ] Shipping, etiquetas/documentos y confirmaciones según contrato.
- [ ] Guardas seguras para capacidades no soportadas.
- [ ] Mantener contexto de Sales Order y warehouse durante el recorrido.

**F2.7 — R7 Returns, RMA y Refunds (4%)**
- [ ] Consulta y detalle de devoluciones/RMA.
- [ ] Autorización, recepción y validaciones.
- [ ] Reembolsos/estados según contrato.
- [ ] Permisos, scope de almacén y controles de datos relacionados.
- [ ] Guardas y documentación de limitaciones backend.
- [ ] Paridad de contexto, errores y navegación.

**F2.8 — R8 Administración (4%)**
- [ ] Usuarios, roles, grants y asignaciones.
- [ ] Configuración y catálogos administrativos.
- [ ] Gestión de empleados/ámbitos cuando forme parte del alcance React.
- [ ] Formularios, validaciones, permisos y auditoría visual.
- [ ] No asumir que ocultar controles sustituye el enforcement del servidor.

**F2.9 — R9 Integraciones (2%)**
- [ ] Inventario de integraciones y configuración visible.
- [ ] Estados, conexión, errores y diagnóstico.
- [ ] Operaciones con contrato verificable.
- [ ] Estados no soportados y limitaciones claramente presentados.
- [ ] Protección de secretos y datos sensibles.

**Cierre F2:** cada operación del inventario queda RESOLVED, RESOLVED_WITH_BACKEND_LIMITATION o DEPRECATED_APPROVED con aprobación. No queda una tarea pendiente solo porque Flask no implemente un endpoint.

### 16.7 F3 — Coherencia estructural y experiencia integrada (8%)

- [ ] F3.1 — Unificar navegación, menús, breadcrumbs, tabs y retorno al contexto de origen. (1%)
- [ ] F3.2 — Resolver paridad contextual: modal/ruta, detalle/formulario, árbol/lista y acciones en contexto. (1,5%)
- [ ] F3.3 — Unificar listados, tablas, filtros, paginación y búsqueda. (1%)
- [ ] F3.4 — Unificar formularios, validaciones, confirmaciones y prevención de doble envío. (1%)
- [ ] F3.5 — Unificar loading, skeleton, empty, error, forbidden, not-supported, conflict y success. (1%)
- [ ] F3.6 — Responsive de flujos completos en móvil, tablet y escritorio. (1%)
- [ ] F3.7 — Accesibilidad: teclado, foco, labels, contraste y movimiento reducido. (0,75%)
- [ ] F3.8 — i18n completo, formatos regionales y ausencia de textos incrustados. (0,75%)

**Cierre F3:** experiencia coherente; diferencias intencionales frente a React documentadas y aprobadas.

### 16.8 F4 — Pruebas, smoke, E2E y CI (12%)

- [ ] F4.1 — Tests de dominio: invariantes y transiciones. (0,9%)
- [ ] F4.2 — Tests de aplicación: orquestación, permisos y errores. (0,9%)
- [ ] F4.3 — Tests de infraestructura: DTO, mappers, HTTP y paginación. (0,9%)
- [ ] F4.4 — Tests de integración entre capas y contratos controlados. (0,9%)
- [ ] F4.5 — Tests UI/componentes, estados e i18n. (0,9%)
- [ ] F4.6 — Smoke S00 readiness: consola, red, hydration y recursos. (0,5%)
- [ ] F4.7 — Smoke S01 login/logout/sesión y credenciales inválidas. (0,5%)
- [ ] F4.8 — Smoke S02 roles/grants positivos y negativos. (0,5%)
- [ ] F4.9 — Smoke S03 aislamiento WH-A/WH-B y cambio de almacén. (0,75%)
- [ ] F4.10 — Smoke S04/S05 Receiving, persistencia, historial y reversión según soporte real. (0,75%)
- [ ] F4.11 — Smoke S06–S10 Dashboard, Local Pickup, Backorders, Sales Orders y rutas legacy. (1,25%)
- [ ] F4.12 — Integrar Playwright al CI con lockfile y entorno reproducible. (1%)
- [ ] F4.13 — Required checks, artefactos, reportes y política de flaky tests. (1,25%)
- [ ] F4.14 — Regresión de impacto obligatoria para contratos/archivos transversales. (1%)

**Cierre F4:** los tests ejecutan los recorridos reales. Un job omitido o bloqueado por infraestructura no se presenta como verde. Las operaciones backend no soportadas se prueban como guardas, no como persistencia.

### 16.9 F5 — Calidad no funcional y endurecimiento (8%)

- [ ] F5.1 — Seguridad frontend: secretos, permisos, errores y exposición de datos. (1,5%)
- [ ] F5.2 — Aislamiento de sesión/almacén, cache y datos residuales. (1,5%)
- [ ] F5.3 — Rendimiento: bundle, carga, consultas, render y lazy loading. (1%)
- [ ] F5.4 — Estabilidad: cancelación, cleanup, memory leaks y errores no controlados. (1%)
- [ ] F5.5 — Responsive y compatibilidad de navegadores soportados. (1%)
- [ ] F5.6 — Accesibilidad auditada en recorridos críticos. (1%)
- [ ] F5.7 — Dependencias, lockfiles, configuración y supply-chain básica. (1%)

**Cierre F5:** resultados medidos contra baseline; defectos críticos/altos corregidos o formalmente aceptados.

### 16.10 F6 — Regresión final, release y retirada controlada de React (7%)

- [ ] F6.1 — Regresión completa R0–R9 en un único SHA candidato. (1,5%)
- [ ] F6.2 — S00–S10 y full browser E2E con perfiles y almacenes disjuntos. (1%)
- [ ] F6.3 — Comparar React/Svelte y cerrar diferencias funcionales/contextuales. (1%)
- [ ] F6.4 — Build release, configuración, staging y smoke post-deploy. (1%)
- [ ] F6.5 — Ensayar rollback y verificar artefacto anterior. (0,5%)
- [ ] F6.6 — Confirmar inventario sin pendientes frontend y limitaciones Flask documentadas. (0,75%)
- [ ] F6.7 — Aprobar retirada de React, fallback y rutas/recursos legacy. (0,75%)
- [ ] F6.8 — Publicar acta final con SHA, porcentaje 100%, pruebas, limitaciones y aprobación. (0,5%)

**Cierre F6:** frontend desplegable, regresión completa, rollback probado y decisión formal sobre React.

### 16.11 F7 — Gobierno de integración y documentación viva (5%)

- [ ] F7.1 — Ownership por feature, módulo, contrato y archivos críticos. (1%)
- [ ] F7.2 — Matriz de capacidades, dependencias, consumidores y pruebas actualizada. (1%)
- [ ] F7.3 — Checklist anti-sobrescritura y revisión semántica de diffs en cada PR. (1%)
- [ ] F7.4 — Runbook, smoke matrix, contratos y limitaciones Flask actualizados. (1%)
- [ ] F7.5 — Cada cierre registra SHA, evidencia, estado y porcentaje recalculado. (1%)

**Cierre F7:** ninguna integración se acepta sin análisis de impacto, pruebas y actualización de trazabilidad.

### 16.12 Ficha obligatoria de cierre por tarea

| Campo | Información requerida |
|---|---|
| ID / tarea | ID estable del backlog |
| Alcance | Capacidades y operaciones incluidas |
| Estado | IN_PROGRESS → RESOLVED o RESOLVED_WITH_BACKEND_LIMITATION |
| Implementación Svelte | Archivos, rutas, componentes, casos de uso y contratos |
| Limitación Flask | Ninguna o descripción exacta, endpoint/enforcement ausente |
| Integridad | Consumidores revisados y regresiones ejecutadas |
| Evidencia | Tests, E2E, capturas/logs sanitizados y resultados |
| SHA verificado | Commit exacto donde pasó la validación |
| Peso ganado | Puntos porcentuales de la tarea |
| Progreso global | Porcentaje anterior → porcentaje nuevo |

### 16.13 Informe obligatorio al terminar cada tarea

1. **Tarea resuelta:** ID, nombre y alcance.
2. **Resultado:** qué quedó implementado en Svelte.
3. **Limitaciones Flask:** qué no puede ejecutarse en backend y cómo queda protegido/documentado en frontend; indicar «ninguna» si no aplica.
4. **Integridad:** funcionalidades existentes revisadas y regresiones ejecutadas.
5. **Evidencias:** comandos, tests, E2E y workflows; indicar qué se ejecutó realmente.
6. **SHA:** commit exacto validado.
7. **Aporte:** peso de la tarea completada.
8. **Progreso global:** porcentaje anterior, puntos añadidos y porcentaje nuevo.
9. **Siguiente tarea:** siguiente elemento no resuelto según dependencias.

No anunciar avance por código parcialmente escrito, test pendiente, PR abierto o integración sin verificar.

### 16.14 Condición de 100% de migración frontend

El 100% se alcanza cuando:
- todas las tareas F0–F7 están cerradas y sus pesos suman 100%;
- todas las capacidades React inventariadas tienen destino explícito en Svelte o retirada aprobada;
- toda funcionalidad que Flask no soporte está implementada en Svelte hasta donde corresponde al frontend, con estado seguro y limitación documentada;
- no quedan tareas frontend pendientes ni capacidades sin clasificar;
- no hay regresiones abiertas que degraden tareas ya cerradas;
- pruebas y gates requeridos pasan sobre el SHA final;
- documentación, matriz y acta final corresponden al mismo SHA.

**100% de migración frontend no significa que Flask tenga el 100% de las operaciones implementadas.** Significa que Svelte está completo, coherente, protegido, probado y transparente respecto a las capacidades que el backend no ofrece. Si posteriormente se amplía Flask, se actualiza la funcionalidad Svelte como evolución controlada, sin reabrir el alcance histórico de migración salvo que cambie el comportamiento frontend.
