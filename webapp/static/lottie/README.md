# Lottie assets (DotLottie) — Splash ABELLIS

## Dónde subir el archivo

Carpeta del proyecto:

```text
webapp/static/lottie/
```

| Archivo a subir | Ruta en disco | URL en la app |
|-----------------|---------------|---------------|
| Animación DotLottie | `webapp/static/lottie/abellis-splash.lottie` | `/lottie/abellis-splash.lottie` |
| Frame estático (opcional) | `webapp/static/lottie/abellis-splash-still.png` | `/lottie/abellis-splash-still.png` |

En SvelteKit todo lo que está en `static/` se sirve desde la raíz (`/`).

## Instalación de la librería

```bash
cd webapp
npm install @lottiefiles/dotlottie-svelte@0.10.15
```

Ya está declarada en `package.json`. Tras `git pull`, ejecuta `npm install`.

## Uso

Componente: `src/lib/components/SplashLottie.svelte`  
Pantalla: splash de arranque (`SplashScreen.svelte`).

Si el usuario tiene `prefers-reduced-motion: reduce`, se muestra el frame estático (o el mark SVG de marca).
