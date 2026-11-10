# Smart WMS — Webapp (SvelteKit)

Frontend web de **Smart WMS**, migrado desde la plantilla Vite + Svelte a **SvelteKit**.

## Stack

- Svelte 5 (runes)
- SvelteKit 3
- TypeScript
- Vite 8
- Adapter: `@sveltejs/adapter-auto`

## Desarrollo

```bash
cd webapp
npm install
npm run dev
```

## Scripts

| Comando        | Descripción                          |
|----------------|--------------------------------------|
| `npm run dev`  | Servidor de desarrollo               |
| `npm run build`| Build de producción                  |
| `npm run preview` | Previsualizar build               |
| `npm run check`| Type-check + svelte-check            |

## Arquitectura objetivo

Feature-First + Clean Architecture (ver `AGENTS.md` del repositorio).

Próximos pasos:

1. Infraestructura compartida (`core/infrastructure/api`, auth…)
2. Feature piloto (Inventory / Auth)
3. Migración progresiva de módulos funcionales desde SentryWMS
