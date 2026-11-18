# Design.md — Abellis Smart WMS

Sistema de interfaz interna para operaciones, control y configuración del almacén.

**Fuentes combinadas, por orden de autoridad:**
1. **Manual de Identidad Abellis v1.0 (10/11/2026)**: identidad, color, tipografía, tono, movimiento, accesibilidad, idiomas. **Manda siempre.**
2. **`global.css` / `tokens.css` / `motion.css`** del proyecto: nombres de tokens y base técnica.
3. **Referencia IronNest**: solo **composición y lenguaje de formas** (layout, componentes, mapa de almacén). Sus colores y sus efectos decorativos **no se usan**.

> **Regla de oro para la IA:** ningún valor literal de color, fuente, radio ni duración en componentes. Todo mediante tokens `var(--…)`. Todo texto visible mediante `i18n.t('Texto en español')`. Todo lo que no esté en este documento y el manual **no se inventa**.

---

## 1. Propósito y alcance

Abellis opera un centro de micro fulfillment para negocios que venden en línea. Smart WMS ayuda al equipo a ejecutar y controlar el ciclo completo de la mercancía:

**Recibir → Ubicar → Preparar → Empacar → Despachar**, más control de existencias, conteos, catálogo y administración de almacenes, zonas y ubicaciones.

La promesa: que un negocio pueda vender sin construir ni gestionar su propio almacén. La interfaz representa esa capacidad con **precisión, trazabilidad y resolución clara de incidencias**.

### Límites de implementación (innegociables)
- Los cambios se limitan a la **presentación de la app Svelte en `webapp/`**.
- No se modifican backend, API, modelos, DTO, reglas de negocio, contratos, autorización ni persistencia.
- No se eliminan operaciones existentes ni se **simulan capacidades que el backend no ofrece**.

---

## 2. Principios de experiencia

1. **La operación primero:** quien recibe, ubica o prepara mercancía encuentra la acción siguiente sin interpretar jerga técnica.
2. **Precisión visible:** cantidades, códigos, ubicaciones, estados y diferencias se leen sin ambigüedad.
3. **Trazabilidad:** cada operación muestra el pedido, producto, ubicación o referencia que la identifica, cuando existan.
4. **Cercanía sin informalidad:** tutear, frases directas, nada burocrático.
5. **Sin adornos que distraigan:** nada de degradados decorativos, glassmorphism, sombras pesadas, emojis ni animaciones repetitivas.
6. **No inventar datos:** los estados vacíos dicen que todavía no hay registros. Nunca métricas ficticias.
7. **Suave y aireado** *(aporte IronNest)*: espacio en blanco, jerarquía por tamaño y opacidad, formas redondeadas, separación por contraste de superficie.

### Cómo se reconcilia IronNest con Abellis

| Tema | IronNest | Decisión final |
|---|---|---|
| Colores | Azul petróleo + amarillo | **Paleta Abellis** (§4) |
| Ítem activo del sidebar | Píldora ancha en color de acento | **Azul profundo 2** + marca dorada fina (el oro no es superficie extensa; solo 1 acción dorada dominante por vista) |
| Tarjeta héroe 3D con degradado y chips translúcidos | Sí | **Eliminada** (prohibidos degradados decorativos y glassmorphism). Sustituida por tarjeta resumen sólida |
| Sombras | Casi ninguna | Discretas; la más intensa solo en diálogos |
| Radios | Todo píldora | **10 px campos, 12 px botones, 16 px tarjetas**. Píldora solo en chips, pestañas, toggle, buscador y estados |
| Texto pequeño | 11–13 px | **Mínimo 14 px** operativo |
| Animación | Count-up, gráficos que se dibujan, rebotes | **120–200 ms, sin rebotes ni bucles** (§11) |
| Navegación | Dashboard, Finance, Customers… | **Navegación Abellis** (§5) |

> Si prefieres que botones y buscador sean píldora total, basta con cambiar `--radius-button` y `--radius-search` (§6). Es la única decisión de forma que no está dictada por el manual.

---

## 3. Idiomas (servicio multilenguaje)

- Idiomas: **italiano (`it`, predeterminado)**, español (`es`) e inglés (`en`).
- Selector en el **inicio de sesión** y en la **barra superior** (`LocaleSwitcher.svelte`).
- Preferencia en `localStorage` bajo `abellis-locale`; también se aplica al atributo `lang` del documento.
- Implementación en `src/lib/i18n/`: `translations.ts` (catálogo), `i18n.svelte.ts` (estado reactivo), `LocaleSwitcher.svelte`.
- **Las claves son el texto español.** Para añadir una etiqueta: agrega su traducción italiana e inglesa y usa `i18n.t('Texto español')`.
- Si falta una traducción, se muestra el texto original (nunca una etiqueta vacía).
- **No se traducen ni alteran:** identificadores, SKU, códigos de barras, estados técnicos, unidades, datos de productos ni valores del backend.
- Sin dependencias externas de i18n (Svelte 5 + catálogo tipado y testeable).

### Consecuencias de diseño
- **El italiano suele ser ~15–30 % más largo** que el español: ningún botón, pestaña ni cabecera con ancho fijo. Usar `min-width` + padding y permitir salto de línea en títulos de tarjeta.
- No truncar con `…` etiquetas operativas (cantidades, ubicaciones, estados). Si hace falta, `text-wrap: balance` o dos líneas.
- Fechas, números y moneda con `Intl` según el locale activo; los **códigos y valores técnicos no cambian**.
- El estado nunca depende solo de la palabra traducida: lleva también icono (§8.2).

---

## 4. Identidad visual

### 4.1 Paleta oficial (tema claro)

| Token | Valor | Uso |
|---|---|---|
| `--navy-deep` | `#012A50` | Navegación, cabeceras, estructura, títulos |
| `--navy` | `#004C8B` | Enlaces, iconos, acciones secundarias |
| `--navy-2` | `#013A6B` | Hover y transiciones de azul; ítem activo del sidebar |
| `--gold` | `#E9A50B` | Acción principal destacada y señal puntual |
| `--gold-soft` | `#F6E4B8` | Avisos suaves |
| `--blue-light` | `#8FB4DA` | Apoyo gráfico y foco |
| `--success` | `#1E7A46` | Estado correcto y disponibilidad |
| `--bg` | `#EDF2F8` | Fondo general |
| `--surface` | `#FFFFFF` | Tarjetas, formularios y tablas |
| `--ink` | `#132234` | Texto principal |
| `--slate` | `#5C6B7D` | Texto secundario |
| `--line` | `#D9E2EC` | Separadores y bordes |

Mapeo a los tokens existentes en `global.css`: `--navy`, `--navy-deep`, `--gold`, `--gold-soft`, `--bg`, `--surface`, `--ink`, `--slate`, `--line`. Añadir los que faltan (`--navy-2`, `--blue-light`, `--success`) y los derivados de §4.3.

### 4.2 Reglas de uso del color
- **Proporción:** 60 % neutros · 30 % azules · 10 % oro.
- **Oro:** no se usa como texto corrido sobre blanco ni como superficie extensa.
- **Una sola acción dorada dominante por vista**, con **texto azul profundo** (`--navy-deep`).
- Acciones secundarias: azul o contorno. **Las destructivas nunca usan oro.**
- Verde y azul claro son colores de apoyo.
- **Nunca comunicar un estado solo con color:** cada estado lleva texto (y icono).

### 4.3 Tokens derivados / propuestos
No están en el manual; son **propuestas coherentes con la paleta** y deben validarse con Abellis.

```css
:root {
  /* Semánticos adicionales (el manual solo define verde) */
  --danger:        #B3261E;   /* errores y acciones destructivas */
  --danger-soft:   #F9DEDC;
  --warning-soft:  var(--gold-soft);
  --info-soft:     #DCE8F5;

  /* Superficie anidada, hover de fila, celda vacía */
  --surface-2:     #F5F8FC;
  --line-soft:     #E7EDF4;

  /* Categorías de zona del mapa (ver §8.6). Texto siempre --navy-deep */
  --cat-1-bg: #DCE8F5;   /* azul claro tenue */
  --cat-2-bg: #F6E4B8;   /* oro claro */
  --cat-3-bg: #E3E8EE;   /* pizarra tenue */
  --cat-4-bg: #BBD1E8;   /* azul medio tenue */
  --cat-ink:  var(--navy-deep);
}
```

> El verde queda **reservado a "correcto/disponible"**; no se usa como categoría para no mezclar significados.

### 4.4 Tema oscuro (mismos roles y jerarquía)
El manual define el criterio (fondos azul-negro, superficies azul profundo, texto claro) pero no los valores. **Propuesta:**

| Token | Oscuro (propuesto) |
|---|---|
| `--bg` | `#061423` |
| `--surface` | `#0A2238` |
| `--surface-2` | `#012A50` |
| `--ink` | `#EAF1F8` |
| `--slate` | `#9FB0C3` |
| `--line` | `#1F4468` |
| `--navy` (enlaces/iconos) | `#8FB4DA` |
| `--gold` | `#E9A50B` (igual; texto `#012A50`) |
| `--cat-n-bg` | versiones oscuras de cada tinte; texto `--ink` |

Estados y controles deben seguir siendo legibles (AA). Validar contraste de cada par al fijar valores definitivos.

---

## 5. Navegación y lenguaje

Sidebar agrupada por trabajo real del almacén (fondo `--navy-deep`):

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

- No añadir rutas que el manual no define (p. ej. "Finanzas", "Clientes", "Tracking"): **no se simulan capacidades**.
- Los títulos de grupo (Operaciones, Control, Catálogos) van en `eyebrow` (Space Grotesk, mayúsculas, `--tracking-label`).
- Icono + etiqueta siempre; el icono **no sustituye** el texto.
- En móvil la navegación se recoge en un menú lateral (drawer).

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

SKU, UPC y códigos de pedido pueden conservarse como identificadores técnicos, con etiqueta o ayuda cuando sea necesario. **Todas las etiquetas de ejemplo de la referencia IronNest ("Sort by", "Filter by", "Add Request"…) se sustituyen** por Ordenar, Filtrar, Añadir…, siempre vía `i18n.t`.

---

## 6. Tipografía, espaciado, forma

### Tipografía
| Rol | Fuente | Pesos |
|---|---|---|
| Titulares, cifras destacadas, etiquetas, nombres de sección | **Space Grotesk** (`--disp`) | 500, 600, 700 |
| Texto corrido, formularios, tablas, ayuda, mensajes | **Inter** (`--body`) | 400, 500, 600 |

- Lectura normal: **16 px / 26 px**. Metadatos: preferiblemente **14 px / 21 px**. **Nunca por debajo de 14 px** en texto operativo.
- Cifras y códigos en columnas: `font-variant-numeric: tabular-nums`.
- Jerarquía: título de página grande (`--fs-3xl`, 500–600); título de tarjeta 16–18 px (500–600); cifra KPI 24–28 px (600); etiquetas 14 px en `--slate`.
- Número grande arriba, etiqueta atenuada debajo.
- Sin fuentes externas disponibles: caer a las del sistema sin bloquear la interfaz (`font-display: swap` + fallback stack).

### Composición
- **Rejilla de 12 columnas**, canal **24 px**, ancho máximo de contenido **1180 px**.
- Márgenes laterales: **24 px** escritorio, **16 px** móvil.
- Espaciado base 4: `4, 8, 12, 16, 24, 32, 48, 64` (`--space-1 … --space-8`).
- Layout: sidebar fija izquierda (~240–272 px) · topbar · contenido con tarjetas anchas + columna lateral estrecha; la columna lateral baja bajo las principales en < 1024 px.

### Radios y sombras
```css
:root {
  --radius-field:  10px;   /* inputs, selects, textareas */
  --radius-button: 12px;   /* botones */
  --radius-card:   16px;   /* tarjetas, tablas, diálogos */
  --radius-tile:   12px;   /* mini-tarjetas KPI, columnas de zona */
  --radius-cell:   10px;   /* celdas de ubicación */
  --radius-search: 999px;  /* buscador de la topbar */
  --radius-pill:   999px;  /* chips, pestañas, toggle, estados */

  --shadow-1: /* discreta: separa superficies */;
  --shadow-3: /* intensa: SOLO diálogos y drawers */;
}
```
Bordes de 1 px en `--line`/`--line-soft`. Una tarjeta se distingue por contraste de superficie + borde; la sombra es apoyo, nunca protagonista.

### Objetivos táctiles
Campos y botones **mínimo 44 × 44 px**. Botones circulares de icono: 44 px.

---

## 7. Iconografía
- Lineal, **24 px**, **trazo 1,8 px**, extremos redondeados, **sin relleno salvo estado activo** (Lucide/Phosphor con esos ajustes).
- En KPI, icono dentro de contenedor circular con borde `--line`.
- Los iconos **acompañan** etiquetas; no las sustituyen en navegación ni acciones.
- Sin emojis en ninguna parte de la interfaz.

---

## 8. Componentes

### 8.1 Topbar
Buscador (`--radius-search`, lupa a la derecha, texto "Buscar…") · botón circular de notificaciones · **selector de idioma** · **toggle claro/oscuro** (píldora con sol y luna; círculo activo en `--navy`) · chip de usuario (avatar + nombre + chevron). Todos con etiqueta accesible (`aria-label`) vía `i18n.t`.

### 8.2 Estados (chips de estado)
Píldora con **icono + texto traducido + color de apoyo**. Nunca solo color.
| Estado | Color | Icono |
|---|---|---|
| Correcto / disponible | `--success` sobre fondo suave | check |
| Aviso | `--gold-soft` con texto `--navy-deep` | triángulo/aviso |
| Error / bloqueado | `--danger` sobre `--danger-soft` | círculo-x |
| Informativo | `--info-soft` con `--navy` | info |
El **valor técnico del estado** que envía el backend se conserva; se traduce solo la etiqueta visible.

### 8.3 Cabecera de página
`h1` + `.subtitle`; a la derecha acciones: **máximo una acción dorada dominante**; el resto, secundarias (contorno azul). "Ordenar" y "Filtrar (n)" como botones de contorno con icono.

### 8.4 Botones
| Tipo | Estilo |
|---|---|
| Principal (1 por vista) | Fondo `--gold`, texto `--navy-deep` |
| Secundario | Fondo `--navy` con texto blanco, o contorno `--navy` |
| Terciario | Texto `--navy`, sin borde |
| Destructivo | `--danger`; **nunca dorado** |
Radio 12 px, altura ≥ 44 px. Hover: `--navy-2` (azules) o luminosidad del oro (-6 %).

### 8.5 Pestañas de almacén
Píldoras en fila: activa en `--navy-deep` con texto claro, inactivas con borde `--line`. Flechas ‹ › circulares y botón **+** circular. Si hay muchas, scroll horizontal con `scroll-snap`. Nombres vienen del backend: no se traducen.

### 8.6 Mapa de almacén (componente estrella)
Tarjeta "Resumen de zonas" con **una columna por zona**, dentro de **Almacenes**.
- Columna: `--radius-tile`, cabecera con nombre de zona (izq.) y ocupación `5/12` (der., tabular).
- Cuadrícula de **2 columnas** de celdas, gap 8 px. Cada celda muestra el **ID de ubicación** (p. ej. `A-01-03-B`).
- **Celda ocupada:** `--cat-n-bg` + texto `--cat-ink`. El color **no es la única señal**: la celda lleva código y, al enfocar/pasar, el nombre de la zona; en vista accesible, `aria-label="A-01-03-B, ocupada, Zona A"`.
- **Celda vacía:** fondo `--surface-2` con rayas diagonales muy sutiles + texto `--slate`.
  ```css
  .cell--empty {
    background:
      repeating-linear-gradient(135deg, var(--line-soft) 0 1px, transparent 1px 7px),
      var(--surface-2);
    color: var(--slate);
  }
  ```
  *(Las rayas son un patrón funcional de estado, no un degradado decorativo.)*
- **Zona seleccionada:** borde 1,5 px `--navy`.
- Acciones (Añadir, Editar zona, Eliminar zona): botones pequeños de contorno con icono a la izquierda; el destructivo en `--danger`.
- **Sin datos:** estado vacío "Todavía no hay ubicaciones registradas." con el siguiente paso posible.

### 8.7 KPI y resumen
- Mini-tarjeta `--radius-tile`: icono circular, cifra grande (`--disp`, tabular), etiqueta 14 px en `--slate`; delta **con texto** ("+26 %", "−8 %") y flecha ↗/↘ (verde/rojo + signo, nunca solo color).
- **Solo datos reales del backend.** Si no hay datos: "Todavía no hay registros." (nunca cifras de ejemplo).
- **Tarjeta resumen** (sustituye a la héroe 3D): fondo sólido `--navy-deep`, texto claro, cifra grande y desglose en chips **sólidos** (no translúcidos). Máximo una por pantalla.

### 8.8 Gauge de uso
Anillo de grosor medio con extremos redondeados, color `--navy`; sin pista visible o con pista `--line-soft`. Porcentaje grande en el centro (Space Grotesk) + etiqueta y cuadrícula 2×2 de métricas. El oro solo como umbral puntual (p. ej. > 90 % de ocupación), junto con texto.

### 8.9 Gráficos
Barras agrupadas con tope redondeado, **sin grid ni eje Y**, etiquetas en eje X en `--slate`. Series en `--navy` y `--blue-light`. Cada serie con **leyenda textual**. Siempre con alternativa en tabla (visible o `sr-only`) para lectores de pantalla.

### 8.10 Medidor segmentado
Segmentos en píldora: rellenos `--navy`, vacíos `--line-soft`. Valor y % en el centro. Texto explicativo asociado.

### 8.11 Tablas y listas
- Encabezado diferenciado (`--surface-2`, `--slate`, peso 600), filas legibles (≥ 44 px), cifras alineadas a la derecha y tabulares, **scroll horizontal en pantallas pequeñas** (`.table-wrap`).
- Vistas de trabajo: tabla clásica. Vistas de resumen (p. ej. top productos): lista sin bordes con miniatura circular, nombre + ID atenuado, estado (chip), fecha, cantidad (`x2` + unitario debajo) y total a la derecha.
- Columnas siempre con la trazabilidad: pedido, producto, ubicación o referencia cuando existan.

### 8.12 Formularios
Label encima (14 px, `--slate`), input 10 px de radio, altura ≥ 44 px, borde `--line`. Foco: ver §12. Errores bajo el campo, con `role="alert"` y texto que explique **qué pasó y cómo seguir**.

### 8.13 Diálogos
`--radius-card`, `--shadow-3`, overlay sólido semitransparente (sin blur decorativo). Un único botón dorado (la acción que avanza); el destructivo en `--danger`.

### 8.14 Estados vacíos y de carga
- **Vacío:** dice qué falta y cuál es el siguiente paso. Ej.: «Todavía no hay productos registrados.»
- **Carga:** texto claro o **progreso real**. **No usar spinner decorativo** ni skeleton con brillo en bucle.
- **Error:** explica qué ocurrió y, si se puede, cómo continuar.

---

## 9. Microcopy

Escribe como alguien que conoce el almacén: tutea, frases directas, mantiene unidades e identificadores del sistema.

| Bien | Evitar |
|---|---|
| «Faltan 3 unidades en esta línea. Revisa la cantidad recibida.» | «Se ha producido una incidencia en el proceso.» |
| «No encontramos la ubicación A-01-03-B. Revisa el código.» | «Error de ubicación no válida.» |
| «Todavía no hay productos registrados.» | «No data.» |

Las variantes italiana e inglesa mantienen el mismo tono directo. Los valores técnicos del backend **no se traducen ni alteran**.

---

## 10. Estructura de pantalla de ejemplo (Almacenes)

```
┌ Sidebar (--navy-deep) ─┬ Topbar: Buscar · 🔔 · IT/ES/EN · ☀/☾ · Usuario ┐
│ OPERACIONES            ├───────────────────────────────────────────────┤
│  Recepción             │ Almacenes (8)            [Ordenar] [Filtrar 4] │
│  Ubicación             │ [Almacén 1][Almacén 2][Almacén 3] ‹ › (+)      │
│  …                     │ ┌ Resumen de zonas ─────────┐ ┌ Uso de zona ─┐ │
│ CONTROL                │ │ [A] [B*] [C] [D]  columnas │ │ gauge + 2×2  │ │
│  Inventario            │ │ celdas 2 col, ID ubicación │ ├──────────────┤ │
│  Conteo cíclico        │ └────────────────────────────┘ │ Inventario   │ │
│ CATÁLOGOS              │                                 └──────────────┘ │
└────────────────────────┴───────────────────────────────────────────────┘
(El 🔔 es solo notación del esquema: en la interfaz real es un icono lineal.)
```

---

## 11. Movimiento (motion design)

### 11.1 Filosofía
El movimiento **explica, no decora**. Confirma una acción, orienta sobre de dónde viene algo y da continuidad entre estados. En un almacén se repite cientos de veces al día: tiene que ser **rápido, silencioso y nunca bloquear**.

### 11.2 Reglas del manual (obligatorias)
- Transiciones **entre 120 y 200 ms**, con **salida suave**.
- **Sin** rebotes, parpadeos, escalados llamativos ni animaciones en bucle.
- Respetar `prefers-reduced-motion`.
- La carga muestra texto claro o progreso real.
- Confirmaciones y errores se anuncian con `role="status"` / `role="alert"`.

### 11.3 Tokens de movimiento
```css
:root {
  --dur-fast:  120ms;   /* hover, color, foco, press */
  --dur-base:  160ms;   /* menús, pestañas, selección */
  --dur-slow:  200ms;   /* paneles, diálogos, entrada de tarjetas (máximo permitido) */

  --ease-out:    cubic-bezier(.2, .7, .2, 1);   /* por defecto: entradas */
  --ease-in:     cubic-bezier(.4, 0, 1, 1);     /* salidas */
  --ease-in-out: cubic-bezier(.4, 0, .2, 1);    /* desplazamientos entre posiciones */

  --stagger: 20ms;  /* retardo entre hermanos, máx. 6 elementos */
}
```
No se usan `ease-spring` ni curvas con rebote.

### 11.4 Patrones permitidos

| Patrón | Comportamiento | Duración |
|---|---|---|
| **Entrada de página** (`page-in`) | `opacity 0→1` + `translateY(8px→0)` | `--dur-slow` |
| **Entrada de tarjetas** | Mismo patrón con `--stagger` entre ellas (máx. 6) | `--dur-slow` |
| **Hover** | Cambio de color/luminosidad de fondo; sin escalado | `--dur-fast` |
| **Press** | `translateY(1px)` o leve oscurecimiento; sin `scale` llamativo | `--dur-fast` |
| **Pestaña / ítem activo** | El indicador **se desliza** entre posiciones con `transform` | `--dur-base`, `--ease-in-out` |
| **Menú / dropdown** | `opacity` + `translateY(-4px→0)` | `--dur-fast` |
| **Diálogo / drawer** | Overlay fade + panel `translateY(8px→0)` o `translateX` corto; salida con `--ease-in` | `--dur-slow` |
| **Selección de zona (mapa)** | Borde 1,5 px aparece; las demás zonas bajan a `opacity .7` | `--dur-base` |
| **Celda cambia de estado** | Transición de fondo/color + texto de estado actualizado; **sin pulso ni escalado** | `--dur-base` |
| **Cambio de pestaña de almacén** | Fade corto del contenido (saliente `--dur-fast`, entrante `--dur-base`); reservar altura para evitar saltos | ≤ 200 ms |
| **Toggle claro/oscuro** | El círculo desliza entre sol y luna; colores transicionan (`background-color, color, border-color`) | `--dur-base` |
| **Toast / confirmación** | Aparece con fade + `translateY(8px→0)`, `role="status"`; se retira solo | `--dur-slow` |
| **Error** | Cambio de color de borde + mensaje (`role="alert"`). **Sin shake** | `--dur-fast` |
| **Gráficos** | Aparecen con fade (`opacity`) al montar; **sin animar el valor** | `--dur-slow` |

```css
@keyframes rise-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: none; }
}

.card-enter {
  animation: rise-in var(--dur-slow) var(--ease-out) both;
  animation-delay: calc(min(var(--i, 0), 5) * var(--stagger));
}

.tab-indicator {
  transition: transform var(--dur-base) var(--ease-in-out),
              width     var(--dur-base) var(--ease-in-out);
}

:root { transition-property: none; }
body.theme-ready,
body.theme-ready * {
  transition: background-color var(--dur-base) var(--ease-in-out),
              color var(--dur-base) var(--ease-in-out),
              border-color var(--dur-base) var(--ease-in-out);
}
```

### 11.5 Cifras y datos: sin teatro
**Las cifras muestran su valor real inmediatamente** (nada de count-up). Cuando un dato cambia en vivo, se actualiza el número y, como máximo, el fondo de la celda cambia de tono en `--dur-base`. La precisión visible es más importante que el efecto.

### 11.6 Carga
- Texto explícito ("Cargando recepciones…") o **barra de progreso real** si existe progreso medible.
- En botones: mostrar etiqueta de estado ("Guardando…"), conservar el ancho, deshabilitar.
- Sin skeletons con shimmer ni spinners decorativos. Si se usa un indicador de actividad en una espera inevitable, va **siempre acompañado de texto**.
- Al terminar, el contenido sustituye al texto sin salto de layout.

### 11.7 Qué NO hacer
- Rebotes, `ease-spring`, parpadeos, escalados llamativos, rotaciones, parallax.
- Animaciones en bucle (pulsos, shimmer, "respiración").
- Count-up, gráficos que "se dibujan" lentamente, animaciones > 200 ms.
- Animar `width`, `height`, `top`, `left`; usar `transform` y `opacity`.
- Transmitir información únicamente con el movimiento.

### 11.8 Reducción de movimiento (obligatoria)
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .01ms !important;
    scroll-behavior: auto !important;
  }
  .snap-y, .main-nav, .table-wrap.snap-x { scroll-snap-type: none; }
}
```
(Coherente con el bloque ya existente en `global.css`.)

### 11.9 Scroll
Se mantiene lo ya definido: `scroll-behavior: smooth`, `overscroll-behavior: contain`, `.snap-y` con `proximity` (nunca `mandatory`), `.snap-section`, y scrollbars finas con `--scrollbar-*`.

---

## 12. Accesibilidad

- Contraste **AA** mínimo en texto y controles (incluidas celdas de zona y chips en ambos temas).
- **Foco visible de 3 px, separado del elemento** (`outline-offset: 3px`).
  - El manual asigna el **azul claro (`--blue-light`)** al foco. Sobre fondos oscuros (sidebar, tema oscuro) usar `--blue-light`; **sobre fondos claros usar `--navy`** si `--blue-light` no alcanza 3:1 de contraste no textual.
  - Nota: el `global.css` actual usa `--gold` para `:focus-visible`; conviene migrarlo a esta regla (el oro está reservado a la acción principal y señales puntuales).
- Estados expresados con **texto e iconografía**, además del color.
- Navegación operable por teclado; `aria-label` en controles de icono; `aria-current="page"` en el ítem activo.
- La información importante **no depende de hover**.
- Confirmaciones `role="status"`, errores `role="alert"`.
- Adaptación escritorio / tableta / móvil; en móvil, menú lateral (drawer).
- `lang` del documento sincronizado con el idioma activo.

---

## 13. Compatibilidad con el CSS existente

No romper: `.page`, `.inventory`, `.filters`, `.toolbar`, `.table-wrap`, `.empty`, `.status`, `.eyebrow`, `.lead`, `.subtitle`, `.main-nav`, `.content`, `.snap-y`, `.snap-section`, ni los tokens `--bg`, `--surface`, `--ink`, `--slate`, `--navy`, `--navy-deep`, `--gold`, `--gold-soft`, `--line`, `--line-soft`, `--surface-2`, `--radius-pill`, `--radius-card`, `--radius-field`, `--shadow-1`, `--disp`, `--body`, `--fs-*`, `--lh-*`, `--tracking-*`, `--scrollbar-*`, `--motion-page`, `--ease-out`.

Ajustes sugeridos a `global.css`:
1. `--radius-field` → 10 px; `--radius-card` → 16 px; añadir `--radius-button`, `--radius-tile`, `--radius-cell`.
2. `:focus-visible` → regla de §12.
3. Sin shimmer ni spinners decorativos en `motion.css`.
4. `--motion-page` ≤ 200 ms.
5. Añadir tokens de §4.3 y §11.3.

---

## 14. Checklist de revisión (antes de dar una pantalla por terminada)

- [ ] ¿Solo tokens `var(--…)`, sin colores/radios/duraciones literales?
- [ ] ¿Todo texto visible pasa por `i18n.t('Texto español')` y existen la traducción it y en?
- [ ] ¿Resiste textos italianos ~30 % más largos sin truncar?
- [ ] ¿Hay **una sola** acción dorada dominante y con texto `--navy-deep`?
- [ ] ¿Las acciones destructivas no usan oro?
- [ ] ¿Ningún estado se comunica solo con color?
- [ ] ¿Texto operativo ≥ 14 px y cifras tabulares?
- [ ] ¿Objetivos táctiles ≥ 44 × 44 px?
- [ ] ¿Cero degradados decorativos, glassmorphism, emojis y sombras pesadas?
- [ ] ¿Todas las transiciones entre 120 y 200 ms, sin rebotes ni bucles, y con `prefers-reduced-motion`?
- [ ] ¿Estados vacíos honestos (sin métricas ficticias) y con siguiente paso?
- [ ] ¿Errores explican qué pasó y cómo continuar, con `role="alert"`?
- [ ] ¿No se tocó backend, DTO, permisos ni flujos?

---

## 15. Prompt listo para pegar a una IA

```
Implementa pantallas del Abellis Smart WMS (SvelteKit 5, carpeta webapp/)
siguiendo Design.md. Solo presentación: NO modifiques backend, API,
DTO, permisos ni flujos, y no simules capacidades inexistentes.

IDENTIDAD (Manual Abellis v1.0): usa exclusivamente tokens var(--…):
--navy-deep #012A50, --navy #004C8B, --navy-2 #013A6B, --gold #E9A50B,
--gold-soft #F6E4B8, --blue-light #8FB4DA, --success #1E7A46,
--bg #EDF2F8, --surface #FFF, --ink #132234, --slate #5C6B7D,
--line #D9E2EC. Proporción 60/30/10. UNA sola acción dorada dominante
por vista (texto --navy-deep); las destructivas nunca en oro. El oro
nunca como texto corrido ni superficie extensa. Ningún estado solo por
color: siempre texto + icono. Tema claro y oscuro con la misma jerarquía.

TIPOGRAFÍA: Space Grotesk (--disp) 500/600/700 para títulos, cifras y
etiquetas; Inter (--body) 400/500/600 para el resto. Texto 16/26,
metadatos 14/21, nunca < 14 px. Cifras con tabular-nums.

COMPOSICIÓN: 12 columnas, canal 24px, max 1180px, márgenes 24/16px,
espaciado base 4. Radios: campo 10, botón 12, tarjeta 16, píldora solo
en chips/pestañas/toggle/buscador/estados. Sombras discretas; la fuerte
solo en diálogos. Objetivos táctiles ≥ 44px. Iconos lineales 24px,
trazo 1.8px, redondeados, sin relleno salvo activo.

ESTILO (aporte IronNest, sin sus colores ni efectos): layout aireado
con sidebar fija a la izquierda, topbar (buscador, notificaciones,
selector de idioma, toggle claro/oscuro, usuario), tarjetas anchas +
columna lateral; pestañas de almacén; mapa de almacén con una columna
por zona y celdas de 2 columnas (ocupada = tinte --cat-n-bg con ID de
ubicación; vacía = rayas sutiles; seleccionada = borde 1.5px --navy);
gauge de anillo; KPI 2×2 con delta en texto; barras sin grid ni eje Y;
lista de productos sin bordes. PROHIBIDO: degradados decorativos,
glassmorphism, emojis, sombras pesadas, tarjeta héroe 3D.

NAVEGACIÓN: Operaciones (Recepción /receiving, Ubicación /putaway,
Preparación /picking, Empaque /packing, Despacho /shipping), Control
(Inventario /inventory, Conteo cíclico /cycle-count), Catálogos
(Productos /items, Almacenes /warehouses, Datos maestros /data). No
añadas rutas. Usa el glosario: Buscar, Orden de compra, Pedido de venta,
Ubicación, Preparación de pedidos, Empaque, Despacho, Conteo cíclico,
ID de ubicación, Código de barras, Cantidad, Transportista, Código de
seguimiento. Ítem activo: --navy-2 con marca dorada fina.

IDIOMAS: todo texto visible con i18n.t('Texto en español'); añade
traducciones it (predeterminado) y en en translations.ts. Resiste
textos italianos ~30% más largos. No traduzcas SKU, códigos, estados
técnicos, unidades ni valores del backend.

MOVIMIENTO: transiciones 120–200 ms con salida suave (--dur-fast 120,
--dur-base 160, --dur-slow 200), solo transform y opacity. Entrada de
tarjetas con rise-in y stagger 20ms (máx. 6). Indicador de pestaña que
se desliza. SIN rebotes, escalados llamativos, count-up, shimmer ni
bucles. Cifras con su valor real al instante. Carga con texto claro o
progreso real. Respeta prefers-reduced-motion. role="status" en
confirmaciones y role="alert" en errores.

MICROCOPY: tutea, directo, sin burocracia. Estados vacíos honestos
("Todavía no hay productos registrados.") y nunca métricas ficticias.
Errores: qué pasó y cómo continuar.

ACCESIBILIDAD: contraste AA, foco 3px con offset (azul claro sobre
fondos oscuros, --navy sobre claros), teclado completo, aria-labels,
nada que dependa de hover.
```
