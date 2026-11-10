# Nivel de paridad con el backend original

## Objetivo

Mi criterio para considerar reemplazable una funcionalidad no es que el nuevo endpoint exista, sino que el frontend original pueda ejecutar el mismo caso de uso sin notar una diferencia incompatible y que el comportamiento de negocio sea equivalente.

La paridad se demuestra con pruebas comparativas. No se declara por intención ni por similitud de nombres.

## Escala de estado

- **No auditado:** todavía no se ha inspeccionado suficientemente el contrato o comportamiento.
- **Documentado:** se conoce el contrato o la intención, pero no existe implementación gemela validada.
- **Implementado sin validar:** hay código, pero faltan pruebas suficientes.
- **Validado parcialmente:** pasan escenarios concretos; existen límites conocidos.
- **Paridad verificada:** pruebas comparativas cubren contrato, permisos, efectos y escenarios relevantes.
- **Habilitado para sustitución:** además de paridad verificada, despliegue, observabilidad, recuperación y rollback han sido ensayados.

## Estado inicial honesto

**Paridad global: no demostrada. El backend original continúa siendo el backend operativo de referencia.**

| Área | Estado | Evidencia / brecha |
|---|---|---|
| Contrato HTTP admin | Documentado parcialmente | Se inspeccionó el cliente `admin/src/api.js`; falta inventario completo de rutas y DTO |
| Contrato HTTP mobile | No auditado | Falta revisar cliente móvil y todos sus flujos |
| Autenticación y sesión | No auditado | Se observó uso de cookies/credenciales y manejo de 401 en admin; falta reproducirlo |
| CSRF y CORS | Documentado parcialmente | Admin envía `X-CSRF-Token`; falta confirmar configuración completa y paridad |
| Roles y permisos | No auditado | Falta mapa exhaustivo de middleware, roles y respuestas 403 |
| Almacenes y ubicaciones | No auditado | Falta mapear rutas, modelos, invariantes y pruebas |
| Productos | No auditado | Falta mapear rutas, modelos, validaciones y consumidores |
| Inventario | No auditado | Deben reproducirse transacciones, concurrencia, auditoría e idempotencia |
| Recepción | No auditado | Falta mapa de flujos y efectos |
| Órdenes | No auditado | Falta mapa de flujos y estados |
| Picking / packing | No auditado | Falta mapa de flujos y estados |
| Envíos | No auditado | Falta mapa de flujos y conectores |
| Transferencias | No auditado | Falta verificar atomicidad y concurrencia |
| Conteos y ajustes | No auditado | Falta validar permisos, auditoría y efectos |
| Integraciones | No auditado | Falta identificar contratos externos y reintentos |
| Persistencia Core | No implementado | API concreta de Core pendiente de verificación |
| Eventos y replicación | No implementado | Falta integrar y probar entrega, deduplicación y recuperación |
| Frontend sin cambios | No verificado | El proxy es la estrategia; falta prueba admin y mobile |
| Ejecución paralela | No verificado | Falta despliegue aislado y datos de prueba |

## Condiciones de aceptación por endpoint

Para cada endpoint del backend original registraré:

1. método y ruta;
2. autenticación requerida;
3. roles/permisos;
4. request schema, campos opcionales y defaults;
5. validaciones y errores;
6. status codes y response schema;
7. entidades y efectos persistidos;
8. transacciones, locks e idempotencia;
9. eventos y auditoría;
10. pantallas/consumidores admin y mobile;
11. prueba original y prueba gemela equivalentes.

Una ruta solo sube a **Paridad verificada** cuando la prueba de contrato y las pruebas de comportamiento relevantes pasan. Los casos sensibles de inventario necesitan además pruebas de concurrencia, reintentos y recuperación.

## Procedimiento de comparación

- Ejecutar el caso sobre el backend original con una base/fixture aislada.
- Restaurar el mismo estado inicial en el entorno gemelo.
- Enviar requests equivalentes, ocultando secretos y normalizando únicamente campos no deterministas (por ejemplo timestamps).
- Comparar status, estructura JSON, errores y efectos de dominio.
- Verificar que eventos y auditoría tengan trazabilidad equivalente, aunque su representación interna difiera.
- Registrar diferencias y abrir una incidencia de paridad.
- Repetir la prueba tras corregir el detonante.

Nunca comparar mutaciones replicándolas a ambos backends sobre datos productivos compartidos.

## Umbral para sustitución

No recomendaré retirar el backend original hasta que:

- todas las rutas usadas por admin y mobile estén inventariadas;
- todas las rutas críticas tengan paridad verificada;
- autenticación, CSRF, roles y errores sean compatibles;
- inventario supere pruebas de concurrencia, idempotencia, partición y recuperación;
- la persistencia y la integración Core estén probadas con el runtime real;
- se hayan ensayado backup/restore, observabilidad y rollback;
- el equipo haya ejecutado el procedimiento de despliegue en un entorno equivalente a producción.

Hasta ese momento, ambos backends pueden coexistir en despliegues aislados, pero el original conserva la autoridad operativa.
