# Abellis WMS · Sistema de interfaz interna

**Fuente de identidad:** Manual de Identidad Abellis v1.0 (10/11/2026).  
**Producto:** Smart WMS.  
**Ámbito:** interfaz interna de operaciones, control y configuración.  
**Idioma de esta interfaz:** español.

> El manual establece que los materiales de Abellis se publiquen en español e italiano. Esta fase de la interfaz interna sigue tu decisión explícita de usar solo español; no se mezclan etiquetas en italiano ni se cambia el idioma de los datos recibidos del backend.

## 1. Propósito del producto

Abellis opera un centro de micro fulfillment para negocios que venden en línea. Smart WMS debe ayudar al equipo a ejecutar y controlar el ciclo completo de la mercancía:

1. **Recibir:** registrar lo que llega y comprobarlo contra la orden de compra.
2. **Ubicar:** trasladar cada producto a una ubicación física identificable.
3. **Preparar:** recoger las unidades que forman cada pedido.
4. **Empacar:** verificar cantidades y cerrar el paquete.
5. **Despachar:** registrar transportista, método y seguimiento de salida.

El sistema también debe permitir controlar existencias, realizar conteos, mantener el catálogo de productos y administrar almacenes, zonas y ubicaciones.

La promesa de Abellis es que un negocio pueda vender sin construir ni gestionar su propio almacén. La interfaz interna representa esa capacidad con precisión, trazabilidad y resolución clara de incidencias.

## 2. Principios de experiencia

- **La operación primero:** la persona que recibe, ubica o prepara mercancía debe encontrar la acción siguiente sin interpretar jerga técnica.
- **Precisión visible:** cantidades, códigos, ubicaciones, estados y diferencias deben leerse sin ambigüedad.
- **Trazabilidad:** cada operación debe mostrar el pedido, producto, ubicación o referencia que la identifica cuando esos datos existan.
- **Cercanía sin informalidad:** tutear, escribir frases directas y evitar mensajes burocráticos.
- **Sin adornos que distraigan:** no usar degradados decorativos, glassmorphism, sombras pesadas, emojis ni animaciones repetitivas.
- **No inventar datos:** los estados vacíos deben decir que todavía no hay registros; nunca mostrar métricas ficticias.
- **La interfaz no cambia las reglas del negocio:** este sistema visual no altera endpoints, DTO, entidades, permisos ni flujos de operación.

## 3. Navegación y lenguaje

La navegación agrupa las tareas según el trabajo real del almacén:

| Grupo | Nombre visible | Ruta |
|---|---|---|
| Operaciones | Recepción | `/receiving` |
| Operaciones | Ubicación | `/putaway` |
| Operaciones | Preparación | `/picking` |
| Operaciones | Empaque | `/packing` |
| Operaciones | Despacho | `/shipping` |
| Control | Inventario | `/inventory` |
| Control | Conteo cíclico | `/cycle-count` |
| Catálogos | Productos | `/items` |
| Catálogos | Almacenes | `/warehouses` |
| Catálogos | Datos maestros | `/data` |

### Glosario de interfaz

| Evitar en pantalla | Usar |
|---|---|
| Lookup | Buscar |
| PO | Orden de compra |
| SO | Pedido de venta |
| Putaway | Ubicación |
| Picking | Preparación de pedidos |
| Packing | Empaque |
| Shipping / Fulfillment | Despacho |
| Cycle count | Conteo cíclico |
| Bin | Ubicación |
| Bin ID | ID de ubicación |
| Warehouse ID | ID de almacén |
| Barcode | Código de barras |
| Qty | Cantidad |
| Batch | Lote de trabajo |
| Wave | Ola de preparación |
| Carrier | Transportista |
| Tracking | Código de seguimiento |

SKU, UPC y los códigos de pedido pueden conservarse como identificadores técnicos, pero deben tener una etiqueta o ayuda en español cuando sea necesario.

## 4. Identidad visual

### Paleta oficial

| Token | Valor | Uso |
|---|---|---|
| Azul profundo | `#012A50` | Navegación, cabeceras y estructura |
| Azul de marca | `#004C8B` | Enlaces, iconos y acciones secundarias |
| Azul profundo 2 | `#013A6B` | Hover y transiciones de azul |
| Oro | `#E9A50B` | Acción principal destacada y señal puntual |
| Oro claro | `#F6E4B8` | Avisos suaves |
| Azul claro | `#8FB4DA` | Apoyo gráfico y foco |
| Verde | `#1E7A46` | Estado correcto y disponibilidad |
| Fondo | `#EDF2F8` | Fondo general |
| Superficie | `#FFFFFF` | Tarjetas, formularios y tablas |
| Tinta | `#132234` | Texto principal |
| Pizarra | `#5C6B7D` | Texto secundario |
| Línea | `#D9E2EC` | Separadores y bordes |

Proporción de referencia: 60 % neutros, 30 % azules y 10 % oro. El oro no se usa como texto corrido sobre blanco ni como superficie extensa. La acción principal de avance usa oro con texto azul profundo; las acciones secundarias usan azul o contorno y las destructivas nunca usan oro. Solo puede haber una acción dorada dominante por vista.

El verde y el azul claro son colores de apoyo. No se debe comunicar un estado únicamente mediante color: cada estado lleva texto.

### Temas

El tema claro y el oscuro conservan la misma jerarquía de color y contraste. El oscuro usa fondos azul-negro, superficies azul profundo y texto claro. Los estados y los controles deben seguir siendo legibles.

## 5. Tipografía

- **Space Grotesk:** titulares, cifras destacadas, etiquetas y nombres de sección. Pesos 500, 600 y 700.
- **Inter:** texto corrido, formularios, tablas, ayuda y mensajes. Pesos 400, 500 y 600.
- Si no se pueden cargar fuentes externas, usar las alternativas del sistema sin bloquear la interfaz.
- Cifras y códigos deben usar cifras tabulares cuando se comparen en columnas.
- Texto de lectura normal: 16 px / 26 px. Metadatos: preferiblemente 14 px / 21 px; no reducir el texto operativo por debajo de una lectura cómoda.

## 6. Composición y componentes

- Rejilla de 12 columnas, canal de 24 px y ancho máximo de contenido de 1180 px.
- Márgenes laterales: 24 px en escritorio y 16 px en móvil.
- Escala de espaciado basada en 4: 4, 8, 12, 16, 24, 32, 48 y 64 px.
- Radios: 10 px campos, 12 px botones y 16 px tarjetas.
- Sombras discretas para separar superficies; la sombra más intensa se reserva para diálogos.
- Tablas con encabezado diferenciado, filas legibles, cifras alineadas y desplazamiento horizontal en pantallas pequeñas.
- Campos y botones con objetivo táctil mínimo de 44 × 44 px.
- Iconografía lineal de 24 px, trazo 1,8 px, extremos redondeados y sin relleno salvo estado activo.
- Los iconos acompañan etiquetas; no sustituyen el texto de navegación ni las acciones.

## 7. Movimiento y estados

- Transiciones entre 120 y 200 ms con salida suave.
- Sin rebotes, parpadeos, escalados llamativos ni animaciones en bucle.
- Respetar `prefers-reduced-motion`.
- La carga debe mostrar un texto claro o progreso real. No usar un spinner decorativo como sustituto de información.
- Cada error explica qué ocurrió y, cuando se pueda, cómo continuar.
- Los estados vacíos explican qué falta y cuál es el siguiente paso posible.
- Confirmaciones y errores deben anunciarse con roles accesibles (`status` / `alert`).

## 8. Microcopy

Escribir como alguien que conoce el almacén:

- Bien: «Faltan 3 unidades en esta línea. Revisa la cantidad recibida.»
- Evitar: «Se ha producido una incidencia en el proceso.»
- Bien: «No encontramos la ubicación A-01-03-B. Revisa el código.»
- Evitar: «Error de ubicación no válida.»
- Bien: «Todavía no hay productos registrados.»
- Evitar: «No data.»

Los mensajes deben usar español claro y mantener las unidades, identificadores y cantidades que entregue el sistema. No traducir ni alterar valores técnicos enviados por el backend.

## 9. Accesibilidad y adaptación

- Contraste mínimo AA en texto y controles.
- Foco visible de 3 px, separado del elemento.
- Estados expresados mediante texto e iconografía, además del color.
- Navegación operable por teclado y etiquetas accesibles para controles.
- Diseño adaptable a escritorio, tableta y móvil; en móvil la navegación se recoge en un menú lateral.
- La información importante no debe depender de hover.

## 10. Límites de implementación

Los cambios de identidad y experiencia se limitan a la presentación de la aplicación Svelte en `webapp/`. No se deben modificar backend, API, modelos, DTO, reglas de negocio, contratos, autorización ni persistencia. No se eliminan operaciones existentes ni se simulan capacidades que el backend no ofrece.
