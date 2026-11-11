# Smart WMS · UI (Abellis)

Fuente de verdad: **Manual Identidad Abellis v1.0**.

## Principios

- Operación de almacén primero: claridad, contraste, pocos elementos.
- Sin “AI slop”: no gradientes decorativos, no glass, no púrpuras genéricos, no sombras pesadas.
- Una acción dorada por pantalla como máximo. El oro nunca es texto sobre blanco ni superficie grande.
- Animaciones mínimas: entrada de página (~180 ms), sin loops.

## Tokens

| Token | Valor | Uso |
|-------|-------|-----|
| `--navy-deep` | `#012A50` | Topbar, texto fuerte |
| `--navy` | `#004C8B` | Primario, enlaces, focus |
| `--gold` | `#E9A50B` | Acento único (producto / CTA excepcional) |
| `--ink` | `#132234` | Texto |
| `--slate` | `#5C6B7D` | Secundario |
| `--bg` | `#EDF2F8` | Fondo app |
| `--card` | `#FFFFFF` | Paneles / tablas |
| `--line` | `#E4EAF1` | Bordes |

Tipografía: **Space Grotesk** (títulos) + **Inter** (cuerpo).

## Archivos

- `src/styles/tokens.css` — variables
- `src/styles/app.css` — base global
- `static/brand/*` — marcas SVG
- Shell: `src/routes/(app)/+layout.svelte`
- Login: `src/core/feature/auth/ui/screens/LoginScreen.svelte`
