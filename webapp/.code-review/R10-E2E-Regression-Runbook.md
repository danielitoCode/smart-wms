# R10 — Runbook de regresión E2E R1–R9

**Estado:** API-level R2 ADMIN/USER verificado en CI; browser E2E R1–R9 pendiente de entorno aislado, usuarios de prueba y runner de navegador.  
**Objetivo:** comparar resultados y transiciones React vs SvelteKit sobre el mismo dataset y con el mismo usuario/grants/almacén. No aceptar capturas visuales como única evidencia.

## 1. Preparación del entorno

- Usar un entorno aislado de pruebas con Flask y datos reiniciables; nunca producción.
- Desplegar React `admin/` y SvelteKit `webapp/` contra el mismo backend, base de datos y configuración.
- Registrar SHA de ambos frontends, versión/commit del backend, navegador y fecha.
- No compartir ni guardar contraseñas/tokens en el informe. Usar identificadores de cuentas de prueba y almacenar secretos fuera del repositorio.
- Antes de cada recorrido, tomar snapshot de los recursos relevantes por API (PO/SO/stock/receipts/bins/transfer/audit) y repetir el mismo estado inicial para ambos frontends.
- Registrar request/response real, HTTP status y estado persistido después de cada mutación. Distinguir respuesta aceptada de resultado confirmado tras recarga.

## 2. Usuarios y almacenes representativos

Crear en el entorno de pruebas perfiles equivalentes a estos; los grants concretos se seleccionan según la ruta probada y el catálogo real de Flask.

| Perfil | Rol / scope | Uso |
|---|---|---|
| U-ADMIN | ADMIN; acceso a WH-A y WH-B | Administración global, configuración y comparación multi-almacén |
| U-A | USER; asignado solo a WH-A; grants operativos de recepción/inventario/ventas según caso | Aislamiento positivo del almacén A |
| U-B | USER; asignado solo a WH-B; grants equivalentes a U-A | Aislamiento positivo del almacén B y destino/origen cruzado |
| U-LIMITED | USER; sin grant de la feature bajo prueba | 403 y denegación de ruta/acción |
| U-SCANNER | USER; `allowed_functions` limitado a pick/pack/ship según cada caso | Guards de los flujos de escáner |
| U-MULTI | USER; asignado a WH-A y WH-B | Operaciones que requieren scope dual, solo donde Flask lo permite |

**Datos mínimos:** dos almacenes distintos; bins/staging diferenciados; items activos con SKU/barcode; una PO receivable y otra terminal; stock disponible/reservado; SO en estados OPEN/PICKED/PACKED/FRAUD_REVIEW según los tests; registros de devolución/reembolso; usuario con grants revocables. No crear recursos usando endpoints no confirmados.

## 3. Recorridos en orden R1–R9

| ID | Recorrido y pasos | Comparación de negocio / evidencia |
|---|---|---|
| E2E-R1 | U-A consulta items, SKU/barcode, bins/zones y warehouse; U-LIMITED intenta abrir ruta y consultar recurso fuera de WH-A; U-ADMIN verifica catálogo multi-almacén | Mismos registros, filtros, paginación, campos y errores que React. Confirmar que capacidades físicas de bin no se presentan como garantizadas si Flask no las expone |
| E2E-R2 | U-A selecciona WH-A; consulta PO y proveedor; registra recepción permitida; consulta staging; ejecuta put-away permitido; recarga PO, receipt y stock | Comparar cantidades por línea, estados PO/receipt, staging y stock persistido. No asumir que recepción equivale a stock disponible. Verificar doble submit/conflicto |
| E2E-R3 | U-A busca item por SKU/barcode, consulta stock por bin y escanea bin; intenta la acción de ajuste | Comparar stock/reservas/staging/ubicación y errores. La preview/acción de ajuste que esté bloqueada por contrato debe permanecer deshabilitada; no debe mutar stock |
| E2E-R4 | U-A lista/filtra SO, abre detalle, revisa líneas/asignaciones, backorders e historial; ejecuta solo transiciones soportadas; U-B intenta abrir/mutar un SO de WH-A | Comparar filtros, paginación, detalle, estado, cantidades y auditoría. Comprobar que la recarga fallida tras una mutación confirmada no invita a repetir la mutación |
| E2E-R5 | U-A y U-B consultan Transfer Orders/IWH desde ambos almacenes; U-LIMITED intenta acceso; U-MULTI prueba scope de origen/destino | Comparar historial y detalle; acciones de reserva/picking/dispatch/receive que no soporte Flask deben estar deshabilitadas y no emitir POST ni alterar stock |
| E2E-R6 | U-SCANNER entra a picking, packing y shipping; valida barcode de SO/TO; revisa tarea/batch; prueba packing verify; intenta acciones bloqueadas de picking/short/complete/ship | Comparar estado picked vs packed vs shipped y respuestas persistidas. Confirmar fail-closed cuando no existe lock/idempotencia/identidad de paquete o GET de shipment |
| E2E-R7 | U-ADMIN autoriza RMA desde pedido enviado; prueba cantidades máximas y recepción de devolución; consulta refund y detalle; usuario no autorizado intenta acciones | Comparar cantidades elegibles, RMA, warehouse/bin, estados y auditoría. Reembolso monetario se compara como consulta POS/read-only; no duplicar devolución o crédito |
| E2E-R8 | U-ADMIN crea/edita usuario de prueba, asigna almacenes y grants, cambia grants con sesión activa, modifica settings, valida import preview/errores y credenciales de connector | Confirmar que Flask aplica los cambios en la siguiente petición con JWT existente; omisión vs lista vacía de warehouse_ids; secretos nunca vuelven en GET ni logs |
| E2E-R9 | U-ADMIN administra webhook (crear/rotar/pausar/replay según contrato), consulta DLQ/stats/errors y Audit Log; U-A verifica bloqueo ADMIN-only; U-A consulta Fraud/Customers en su almacén | Comparar entrega/replay y estados reales; secreto visible una sola vez; audit global solo ADMIN; Fraud no muestra score inexistente; Customers se etiqueta como proyección read-only y paginada por pedidos |

**Importante:** los pasos marcados como bloqueados por Flask son pruebas negativas de guardas; no se deben forzar para conseguir una ejecución completa ficticia. La etiqueta del resultado será `BACKEND_LIMITATION`, no fallo Svelte.

## 4. Navegación y experiencia transversal

Para cada ruta canónica y cada alias React documentado en `R10-Final-Parity-Regression-React-Retirement.md`:

- Abrir URL directamente en una pestaña nueva con sesión activa.
- Recargar (F5) y comprobar que no aparece 404 ni se pierde el contexto válido.
- Abrir deep link a detalle/impresión y volver a listado.
- Probar sesión inexistente, expirada, `must_change_password`, 401, 403 y recurso fuera de scope.
- Verificar navegación atrás/adelante y cambio de almacén durante carga o diálogo abierto.
- Verificar layouts a 375 px, 768 px y 1280 px; sin scroll horizontal involuntario ni acciones inaccesibles.
- Recorrer teclado: Tab/Shift+Tab, Enter/Espacio, Escape en diálogos, foco visible y retorno de foco al cerrar.
- Verificar nombres accesibles, labels, errores asociados, roles/estados ARIA y contraste.
- Repetir en italiano, español e inglés; revisar textos vacíos, loading, error, forbidden y not-supported. Comprobar `prefers-reduced-motion`.

## 5. Comparación de resultado

Por cada acción, guardar una fila con:
- Test ID, fecha, SHA React/Svelte, backend version y navegador.
- Perfil de usuario, grants y warehouse IDs antes de ejecutar.
- URL abierta y ruta final después de redirect.
- Estado inicial del recurso (IDs y valores relevantes).
- Acción realizada, request HTTP y response/status de Flask.
- Estado final reconsultado por API; diferencias de cantidades/estado/auditoría.
- Resultado React, resultado Svelte, diferencia explicada y clasificación.
- Evidencia reproducible (log anonimizado, test report o vídeo/captura complementaria).

Clasificaciones válidas: `VERIFIED_PARITY`, `FRONTEND_DEFECT`, `BACKEND_LIMITATION`, `FRONTEND_GUARD_REQUIRED`, `UNVERIFIED_CONTRACT`, `PRODUCT_RETIREMENT_APPROVED`.

## 6. Bloqueos y requisitos para ejecutar

- Este repositorio no declara Playwright/Cypress ni scripts `test:e2e` en `webapp/package.json`; los 213 archivos de pruebas detectados son pruebas Vitest/unitarias/integración simulada, no una ejecución de navegador autenticado contra Flask.
- Para ejecutar los recorridos se necesita URL de entorno de pruebas, cuentas U-ADMIN/U-A/U-B/U-LIMITED/U-SCANNER y dataset controlado. No se deben incluir credenciales en GitHub ni en esta documentación.
- Las pruebas backend/Python no son gate de aceptación de Svelte, pero Flask debe estar disponible y con datos coherentes para las pruebas E2E de contrato.
- Los bloqueos ya documentados en R3, R5 y R6 se verifican como acciones correctamente deshabilitadas; no se reinterpretan como paridad de una operación que el servidor no soporta.

## 6.1 Snapshot de ejecución R2.7–R2.11

- HEAD: `6a62b9b876999fc49a4ae9bcd34923dd82903292`.
- Webapp CI: [45075037579](https://github.com/danielitoCode/smart-wms/actions/runs/45075037579), completo en verde (Typecheck, build y todas las suites frontend).
- API R2 ADMIN/USER: [Tests run 45075037495](https://github.com/danielitoCode/smart-wms/actions/runs/45075037495), paso dirigido de warehouse scope/receiving completado correctamente. Cubre creación ADMIN, aislamiento USER por warehouse, grant receiving requerido, recepción persistida en WH-A, denegación de PO WH-B, historial/unreceive/cancel fuera de scope y bin listing.
- El fixture de WH-B crea una zona y un bin Staging propios, de modo que el test de recibos cruzados se ejecuta sin skip por falta de bin.
- **No confundir API integration con browser E2E:** no hay Playwright/Cypress ni script E2E en `webapp/package.json`. Los recorridos con usuario real en navegador siguen pendientes de entorno aislado, URL, usuarios ADMIN/USER y dataset equivalente. No declarar R2 cerrado ni retirar React.
**Criterio de salida:** los nueve recorridos ejecutados con datos equivalentes; diferencias resueltas o clasificadas; rutas, responsive, accesibilidad, estados e i18n comprobados; matriz firmada. La retirada de React continúa bloqueada hasta aprobación explícita.


## 6.2 Revalidación R2.10/R2.11 — 24-11-2026

- HEAD evaluado: `17d1730a48142a0571d24c5a27f4daf859d67cda`.
- Webapp CI [45075646591](https://github.com/danielitoCode/smart-wms/actions/runs/45075646591): todas las etapas, incluido build y Full regression, SUCCESS.
- Python [45075646702](https://github.com/danielitoCode/smart-wms/actions/runs/45075646702): el paso específico R2 pasó; suite global: 122 failed / 3054 passed / 1529 warnings.
- Baseline previo a R2.7 [45070599723](https://github.com/danielitoCode/smart-wms/actions/runs/45070599723): 125 failed / 3049 passed / 1525 warnings. Comparación por identificador de test: 122 fallos comunes, 0 nuevos y 3 resueltos (dos casos de `test_purchase_order_warehouse_scope.py` y `test_admin_unreceive.py::TestUnreceiveGuards::test_receipt_not_found_returns_404`).
- No se han ejecutado browser E2E: el paquete webapp carece de Playwright/Cypress/script E2E y el runbook no registra URL/credenciales/dataset aislado. No etiquetar API tests como E2E.
- **Estado: `R2_API_REGRESSION_VERIFIED / R2_BROWSER_E2E_BLOCKED / R2_NOT_CLOSED`.** Para ejecutar se necesita URL del entorno aislado y perfiles de prueba ADMIN/USER; secretos siempre fuera del repositorio. React permanece intacto.
