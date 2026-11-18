<script lang="ts">
	/**
	 * Lab detail — DisperseCarousel
	 */
	import DisperseCarousel from '../../../lib/components/DisperseCarousel.svelte';
	import type { DisperseItem } from '../../../lib/components/disperseCarousel.types';

	const items: DisperseItem[] = [
		{ title: 'Mountain Peak', image: 'https://picsum.photos/seed/disp01/640/960', alt: 'Mountain' },
		{ title: 'Ocean Wave', image: 'https://picsum.photos/seed/disp02/640/960', alt: 'Ocean' },
		{ title: 'Forest Path', image: 'https://picsum.photos/seed/disp03/640/960', alt: 'Forest' },
		{ title: 'Desert Dune', image: 'https://picsum.photos/seed/disp04/640/960', alt: 'Desert' }
	];
</script>

<svelte:head>
	<title>DisperseCarousel · Component Lab</title>
</svelte:head>

<section class="detail-intro">
	<a class="detail-back" href="/lab">← Lab</a>
	<h1 class="detail-title">DisperseCarousel</h1>
	<p class="detail-lead">
		Carrusel de cards con salida en fragmentos (clip-path + WAAPI) y entrada suave. Migrado de React
		+ GSAP a Svelte 5 sin librerías de animación.
	</p>
</section>

<section class="detail-block">
	<h2 class="detail-h2">Autoplay 5s</h2>
	<div class="detail-stage detail-stage--tall">
		<DisperseCarousel {items} autoPlay={5000} />
	</div>
</section>

<style>
	.detail-intro {
		margin-bottom: 1.5rem;
	}

	.detail-back {
		display: inline-block;
		margin-bottom: 0.6rem;
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--link, #004c8b);
		text-decoration: none;
	}

	.detail-back:hover {
		text-decoration: underline;
	}

	.detail-title {
		margin: 0 0 0.4rem;
		font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-size: clamp(1.4rem, 2.6vw, 1.75rem);
		font-weight: 700;
		letter-spacing: -0.025em;
		color: var(--head-ink, #012a50);
	}

	.detail-lead {
		margin: 0;
		max-width: 42rem;
		font-size: 0.9rem;
		line-height: 1.55;
		color: var(--slate, #5c6b7d);
	}

	.detail-block {
		margin-bottom: 2rem;
	}

	.detail-h2 {
		margin: 0 0 0.75rem;
		font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--head-ink, #012a50);
	}

	.detail-stage {
		border-radius: 16px;
		border: 1.5px solid var(--line, #d9e2ec);
		overflow: hidden;
	}

	.detail-stage--tall {
		height: min(70vh, 720px);
		background: #0f1218;
	}
</style>
