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
