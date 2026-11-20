<script lang="ts">
	/**
	 * Lab detail — About3
	 */
	import About3 from '../../../lib/components/About3.svelte';
</script>

<svelte:head>
	<title>About3 · Component Lab</title>
</svelte:head>

<section class="detail-intro">
	<a class="detail-back" href="/lab">← Lab</a>
	<h1 class="detail-title">About3</h1>
	<p class="detail-lead">
		Bloque About (shadcnblocks about3): hero tipográfico, grid de imágenes + breakout, marquee de
		logos, logros numéricos y secciones de visión. Port Svelte 5 con Marquee CSS y tokens Abellis.
	</p>
</section>

<section class="detail-block">
	<div class="detail-stage">
		<About3 />
	</div>
</section>

<style>
	.detail-intro {
		margin-bottom: 1.5rem;
		padding: 0 1.25rem;
		max-width: 1120px;
		margin-left: auto;
		margin-right: auto;
	}
	.detail-back {
		display: inline-block;
		margin-bottom: 0.65rem;
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--navy, #004c8b);
		text-decoration: none;
	}
	.detail-back:hover { text-decoration: underline; }
	.detail-title {
		margin: 0 0 0.45rem;
		font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-size: clamp(1.35rem, 2.5vw, 1.75rem);
		font-weight: 700;
		letter-spacing: -0.03em;
		color: var(--head-ink, #012a50);
	}
	.detail-lead {
		margin: 0;
		max-width: 42rem;
		font-size: 0.95rem;
		line-height: 1.55;
		color: var(--slate, #5c6b7d);
	}
	.detail-stage {
		border-top: 1px solid color-mix(in srgb, var(--line, #d9e2ec) 80%, transparent);
	}
</style>
