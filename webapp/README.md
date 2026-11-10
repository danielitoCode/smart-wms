# Smart WMS — Webapp (SvelteKit)

Frontend web de **Smart WMS**, migrado desde la plantilla Vite + Svelte a **SvelteKit**.

## Requisitos de runtime

| Herramienta | Versión del equipo | Mínimo oficial SvelteKit 3 |
|-------------|--------------------|----------------------------|
| **Node.js** | `v22.14.0`         | `>= 22.17`                 |
| **npm**     | `10.9.2`           | `>= 10.9.0`                |

El proyecto está configurado con:

- `engines` en `package.json` (`node >=22.14.0`, `npm >=10.9.0`)
- `engine-strict=true` en `.npmrc` (npm falla si la versión no cumple)
- `.nvmrc` y `.node-version` fijados a `22.14.0`

> **Nota:** La documentación oficial de SvelteKit 3 indica Node `>=22.17`. Con `22.14.0` debería funcionar en la mayoría de casos; si aparece algún warning o error de runtime, actualiza a Node 22.17+.

## Stack

- Svelte 5 (runes)
- SvelteKit 3
- TypeScript 6
- Vite 8
- Adapter: `@sveltejs/adapter-auto`

## Desarrollo

```bash
cd webapp

# Opcional: usar la versión de Node del proyecto
# nvm use   # o fnm / asdf según tu gestor

npm install
npm run dev
```

## Scripts

| Comando           | Descripción                |
|-------------------|----------------------------|
| `npm run dev`     | Servidor de desarrollo     |
| `npm run build`   | Build de producción        |
| `npm run preview` | Previsualizar build        |
| `npm run check`   | Type-check + svelte-check  |

## Arquitectura objetivo

Feature-First + Clean Architecture (ver `AGENTS.md` del repositorio).

Próximos pasos:

1. Infraestructura compartida (`core/infrastructure/api`, auth…)
2. Feature piloto (Inventory / Auth)
3. Migración progresiva de módulos funcionales desde SentryWMS
