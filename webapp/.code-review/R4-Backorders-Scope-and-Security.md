# R4 — Code review y limitaciones de integración

**Fecha:** 2026-11-20  
**Rama:** `svelte-webapp`  
**Ámbito:** frontend SvelteKit en `webapp/` exclusivamente. No se realizan cambios en Flask ni en el backend Python.

## 1. Regla de alcance

- Las correcciones de R4 se implementan en `webapp/`, incluidas Domain/Application/Data/UI, pruebas frontend e i18n.
- Flask se inspecciona únicamente para verificar contratos, permisos, scope, persistencia y efectos laterales.
- Una capacidad ausente o incompleta en Flask se modela y protege en el frontend, pero no se simula como operación persistida ni se presenta como exitosa.
- Los controles de UI no sustituyen la autorización ni el aislamiento que debe aplicar el servidor.
- Los gaps backend quedan registrados como `BACKEND_LIMITATION` o `UNVERIFIED_CONTRACT`; no se modificará Flask para resolverlos en R4.

## 2. Limitaciones backend que afectan R4

### R4-BE-01 — Aislamiento de la cola de Backorders

La auditoría de `GET /api/admin/backorders` encontró que el handler usa el `warehouse_id` recibido como filtro opcional, pero no aplica explícitamente el scope de almacenes autorizado del usuario. Un parámetro enviado por el navegador no constituye autorización.

**Tratamiento frontend:** resolver el almacén desde el contexto autenticado, restringir la consulta y las acciones visibles al almacén autorizado, volver a comprobar el almacén al cargar el detalle y antes de iniciar una mutación. Si no puede resolverse un scope seguro, no ejecutar la acción.

**Estado:** `BACKEND_LIMITATION`. Esto reduce el riesgo de uso accidental desde la UI, pero no evita una llamada HTTP directa manipulada. R4 no puede certificar aislamiento real del servidor.

### R4-BE-02 — Scope de cancelación de Backorder

La auditoría de `POST /api/admin/sales-orders/{id}/cancel-backorder` no encontró enforcement explícito de warehouse scope en el handler. El servicio compartido bloquea la fila para la transición, pero el bloqueo transaccional no equivale a autorización por almacén.

**Tratamiento frontend:** recuperar el detalle autoritativo, comprobar el almacén contra el contexto autorizado, validar la relación padre-hijo y el estado antes de enviar la cancelación, e impedir doble submit en el estado de UI.

**Estado:** `BACKEND_LIMITATION`. No declarar segura frente a acceso cross-warehouse directo.

### R4-BE-03 — Atomicidad completa del motivo de cancelación

La auditoría observó que el wrapper valida/actualiza `cancellation_reason` antes de que el servicio compartido complete el bloqueo y la transición. En llamadas concurrentes, el servicio evita una segunda transición, pero el motivo podría modificarse antes de que se detecte el estado terminal.

**Tratamiento frontend:** bloquear envíos simultáneos en la instancia de UI, actualizar el detalle tras la respuesta y mostrar conflictos/errores sin simular éxito. El cliente no puede garantizar atomicidad entre usuarios o clientes concurrentes.

**Estado:** `BACKEND_LIMITATION` pendiente de prueba/fix del servidor. Fuera del alcance de esta migración.

### R4-BE-04 — Funciones sin contrato de servidor

No se deben crear endpoints hipotéticos ni persistencia local que aparente ser real. Para cada capacidad no soportada, la UI debe mostrar el estado no disponible y mantener deshabilitada la acción mutante. El contrato futuro requerido debe describirse aquí con permiso, warehouse scope, request/response, efectos, idempotencia y errores esperados.

## 3. Gitleaks — hallazgo heredado del historial

En la ejecución de Gitleaks asociada al HEAD de referencia `a8739325c397a00f8f96519321579d95d224e83a`, el scanner reportó una coincidencia `generic-api-key` en:

- Archivo: `wms-twin/doc/API_ENDPOINTS_FRONTEND.md`
- Línea reportada: 76
- Commit de origen reportado: `03169fe385a187aa797661272d025b7b945faa75`
- Fingerprint: `03169fe385a187aa797661272d025b7b945faa75:wms-twin/doc/API_ENDPOINTS_FRONTEND.md:generic-api-key:76`

El log de CI redacta el valor detectado. No se copia ni reproduce ningún secreto en esta documentación.

**Evaluación:** el detector encontró un patrón en el historial Git; la evidencia disponible no permite concluir si es una credencial real o un ejemplo/documentación. Tampoco debe asumirse que el archivo o la línea siguen presentes en el árbol actual.

**Acciones requeridas:**
1. Inspeccionar de forma controlada el contenido histórico exacto y determinar si el valor es una credencial válida, revocada o un ejemplo ficticio.
2. Si fue real o pudo serlo, revocar/rotar la credencial en el proveedor correspondiente; eliminar el secreto del historial no revoca una credencial.
3. Si es un falso positivo, añadir una allowlist estrecha y justificada solo después de verificar el contenido y el contexto. No desactivar la regla ni ignorar todo el archivo.
4. Repetir Gitleaks sobre el HEAD final y conservar el resultado del scanner.

**Estado:** `PENDING_REVIEW`; no se declara falso positivo ni secreto comprometido sin evidencia.

## 4. Cambios frontend R4 registrados

- `BackorderDetailScreen.svelte`: una orden cuyo `warehouseId` sea `null` ya no se considera cancelable. La función de submit contiene una comprobación defensiva y la pantalla explica por qué no puede ejecutarse la cancelación. Esto evita pasar un valor nullable a un caso de uso que requiere un almacén válido.
- Este guard es una protección de experiencia/consistencia del frontend, no una solución del scope backend descrito arriba.

## 5. Criterio para cerrar los bloqueos

Los gaps R4-BE-01/02/03 solo podrán marcarse resueltos si existe evidencia de enforcement y atomicidad del lado del servidor en un alcance backend autorizado. Mientras Flask permanezca fuera del alcance, se conservarán como bloqueos formales y R4 no se declarará completamente seguro/operativo en esos criterios.


## 6. R4.1 — CI frontend y hallazgo Gitleaks

**HEAD evaluado:** `00bc8b93239c82aa5c7237b8442a1f184f62f295`.

- La pantalla `BackorderDetailScreen.svelte` rechaza la cancelación cuando `order.warehouseId` es `null`, comprueba el scope antes de ejecutar y solo pasa un `number` válido al estado/caso de uso.
- El workflow **Webapp CI** del HEAD evaluado terminó en `success`; su job `Typecheck · Build · Test` pasó. Esto confirma typecheck, build y tests frontend en ese commit.
- Gitleaks 8.21.2 reportó una coincidencia histórica `generic-api-key` en la línea 76 de `wms-twin/doc/API_ENDPOINTS_FRONTEND.md`, commit de origen `03169fe385a187aa797661272d025b7b945faa75`. La línea es un ejemplo JSON de respuesta con un JWT truncado literalmente mediante puntos suspensivos; no contiene un token completo utilizable.
- Se añadió a `.gitleaks.toml` una allowlist anclada al valor exacto del placeholder. No se excluyó el archivo, el path ni la regla; cualquier otro valor sigue sujeto al escaneo normal.

**Estado R4.1:** `VERIFIED` en el HEAD `cd343913a88168ef180b79a74c227354b3767015`: guard frontend, typecheck, build, Gitleaks, Dependency Audit, Lockfile Version Check y Webapp CI terminaron correctamente. La cobertura adicional no bloqueó el job, pero su paso quedó sin ejecutar por falta de `@vitest/coverage-v8`; está anotado como mejora de tooling, no como suite funcional fallida. No se modifica Flask.


## 7. R4.2 — Cobertura de estado, cancelación, historial y concurrencia frontend

**HEAD verificado:** `cd343913a88168ef180b79a74c227354b3767015`.

Se añadieron pruebas frontend para:
- carreras entre cargas de cola con cambio de almacén/pestaña;
- aperturas consecutivas de detalle y descarte de respuestas antiguas;
- invalidación del historial que llega después de cambiar de pedido;
- paginación y metadatos del historial;
- prevención de doble envío mientras una cancelación sigue pendiente;
- propagación de error y liberación del flag `saving`;
- no mutar localmente cantidades/reservas tras cancelar: la liberación pertenece al resultado transaccional del servidor;
- estados cancelables admitidos (`WAITING_STOCK`, `OPEN`, `PICKED`, `PACKED`), estados terminales/no admitidos y los cuatro motivos válidos.

**Evidencia CI:** Webapp CI `44859962355` terminó en `success`; el paso de regresión completa informó **200 archivos y 871 tests aprobados**, incluyendo `backordersState.test.ts` (7 tests) y `BackorderUseCases.test.ts` (20 tests).

**Límite:** estas pruebas verifican el comportamiento del cliente y la delegación al endpoint. No prueban la liberación real de inventario, el aislamiento entre clientes ni la atomicidad bajo concurrencia en Flask. Esos puntos permanecen en R4.3 como `BACKEND_LIMITATION`; no se simulan ni se certifican desde Svelte.

**Nota de tooling:** el paso opcional `test:coverage:feature` no pudo ejecutarse porque falta el paquete `@vitest/coverage-v8`; el workflow lo define con `continue-on-error: true`, por eso el job general permanece verde. No se ocultó ningún fallo de tests: las 871 pruebas de regresión sí pasaron.


## 8. R4.2 — revisión de cambios frontend y cierre de alcance

**Código:** `0351dab45ac5ca9d5dffe44e8a7dda60fd55805d`.

- `BackordersScreen.svelte`: `loadQueue()` concentra carga inicial, retry y refresh posterior a cancelación; siempre resuelve scope desde auth + selección. El retry ya no pasa un `null` sin validar.
- La elegibilidad de cancelación usa la política Domain compartida; el listado no presenta la acción en estados no cancelables. El scope de la fila se compara con el scope actual.
- Cambio de almacén no-admin cierra/invalida el modal abierto. `submitCancel()` repite la comprobación de permiso/scope/estado para evitar usar una fila obsoleta.
- `BackorderDetailScreen.svelte` comparte la política de estados, vuelve a comprobar el warehouse antes del POST y oculta el diálogo si el estado dejó de ser cancelable.
- Pruebas añadidas para estados admitidos y errores HTTP 400/403/404/409; se conservan pruebas de doble submit, carreras, historial/paginación y ausencia de liberación local.
- Sales Orders separa éxito confirmado de fallo de refresh (`refreshError`) para no inducir un segundo POST tras una mutación ya aceptada.

**Dictamen R4.2:** `IMPLEMENTED_FRONTEND`. La UI no reemplaza controles backend: R4-BE-01 (GET cola), R4-BE-02 (POST cancelación) y R4-BE-03 (atomicidad de `cancellation_reason`) permanecen `BACKEND_LIMITATION`. La liberación de inventario sigue siendo propiedad de la transacción Flask. No se tocó backend.

### Corrección de estado Gitleaks histórico

La sección inicial que marcaba el hallazgo como `PENDING_REVIEW` queda supersedida por la verificación posterior: el patrón era un JWT de ejemplo truncado literalmente con puntos suspensivos, y `.gitleaks.toml` contiene una allowlist exacta y anclada para ese placeholder. El workflow Gitleaks terminó `success` en los HEAD posteriores; no se excluyó el archivo ni la regla genérica. Mantener como evidencia los runs específicos de cada SHA, no inferir estado del HEAD actual a partir de ejecuciones antiguas.

