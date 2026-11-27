<script lang="ts">
	import { page } from '$app/state';
</script>

<svelte:head>
	<title>{page.status} · Smart WMS</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main class="error-page" role="alert">
	<section>
		<p class="eyebrow">ABELLIS · Smart WMS</p>
		<p class="status">{page.status || 500}</p>
		<h1>No se pudo cargar esta página</h1>
		<p>La solicitud no pudo completarse. Puedes volver a intentarlo o regresar al inicio.</p>
		<div class="actions">
			<button type="button" onclick={() => window.location.reload()}>Reintentar</button>
			<a href="/">Ir al inicio</a>
		</div>
	</section>
</main>

<style>
	.error-page {
		min-height: 100dvh;
		display: grid;
		place-items: center;
		padding: 1.5rem;
		background: var(--bg, #f4f7fb);
		color: var(--ink, #172b43);
	}
	section { width: min(32rem, 100%); display: grid; justify-items: center; gap: 0.85rem; text-align: center; }
	.eyebrow { margin: 0; color: var(--navy, #012a50); font-size: 0.72rem; font-weight: 700; letter-spacing: 0.14em; }
	.status { margin: 0; color: var(--gold, #c99b38); font-size: 3rem; font-weight: 800; }
	h1 { margin: 0; font-size: clamp(1.3rem, 4vw, 1.7rem); }
	section > p:not(.eyebrow):not(.status) { margin: 0; max-width: 28rem; color: var(--slate, #64748b); line-height: 1.5; }
	.actions { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 0.75rem; margin-top: 0.5rem; }
	button, a { min-height: 42px; display: inline-flex; align-items: center; justify-content: center; padding: 0.55rem 1.1rem; border: 1px solid var(--navy, #012a50); border-radius: 10px; background: var(--navy, #012a50); color: white; font: inherit; font-weight: 600; text-decoration: none; cursor: pointer; }
	a { background: transparent; color: var(--ink, #172b43); border-color: var(--line, #d6deea); }
	button:focus-visible, a:focus-visible { outline: 2px solid var(--gold, #c99b38); outline-offset: 3px; }
</style>
