# Smart WMS — Webapp (SvelteKit)

Frontend web de **Smart WMS**, migrado desde la plantilla Vite + Svelte a **SvelteKit**.

## Requisitos de runtime

| Herramienta | Versión del equipo | Mínimo oficial SvelteKit 3 |
|-------------|--------------------|----------------------------|
| **Node.js** | `26`               | `>= 22.17`                 |
| **npm**     | `>= 10.9.0`        | `>= 10.9.0`                |

El proyecto está configurado con:

- `engines` en `package.json` (`node >=26.0.0`, `npm >=10.9.0`)
- `engine-strict=true` en `.npmrc` (npm falla si la versión no cumple)
- `.nvmrc` y `.node-version` fijados a `26`

Node 26 cumple y supera el mínimo requerido por SvelteKit 3.

## Stack

- Svelte 5 (runes)
- SvelteKit 3
- TypeScript 6
- Vite 8
- Adapter: `@sveltejs/adapter-auto`

## Desarrollo

```bash
cd webapp

# El backend corre fuera de Docker en localhost:5000
# Si necesitas cambiarlo, edita .env y/o VITE_API_BASE_URL
# nvm use   # o fnm / asdf según tu gestor

npm install
npm run dev -- --host 0.0.0.0
```

La app consume el backend local con `VITE_API_BASE_URL=http://localhost:5000` y no está acoplada a la red Docker.

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
