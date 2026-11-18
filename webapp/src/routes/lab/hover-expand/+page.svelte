<script lang="ts">
	/**
	 * Lab detail — HoverExpand
	 * Strip horizontal de imágenes que se expanden al hover/click.
	 */
	import HoverExpand from '../../../lib/components/HoverExpand.svelte';
	import type { HoverExpandImage } from '../../../lib/components/hoverExpand.types';

	/** Demo images (picsum) — sustituir por assets del producto cuando existan */
	const DEMO: HoverExpandImage[] = [
		{ src: 'https://picsum.photos/seed/he01/600/900', alt: 'Panel 1', code: '# 01' },
		{ src: 'https://picsum.photos/seed/he02/600/900', alt: 'Panel 2', code: '# 23' },
		{ src: 'https://picsum.photos/seed/he03/600/900', alt: 'Panel 3', code: '# 07' },
		{ src: 'https://picsum.photos/seed/he04/600/900', alt: 'Panel 4', code: '# 12' },
		{ src: 'https://picsum.photos/seed/he05/600/900', alt: 'Panel 5', code: '# 18' },
		{ src: 'https://picsum.photos/seed/he06/600/900', alt: 'Panel 6', code: '# 04' },
		{ src: 'https://picsum.photos/seed/he07/600/900', alt: 'Panel 7', code: '# 31' },
		{ src: 'https://picsum.photos/seed/he08/600/900', alt: 'Panel 8', code: '# 09' },
		{ src: 'https://picsum.photos/seed/he09/600/900', alt: 'Panel 9', code: '# 15' }
	];
</script>

<svelte:head>
	<title>HoverExpand · Component Lab</title>
</svelte:head>

<section class="detail-intro">
	<a class="detail-back" href="/lab">← Lab</a>
	<h1 class="detail-title">HoverExpand</h1>
	<p class="detail-lead">
		Franja horizontal de imágenes: el panel activo se expande al hover o click. Migrado desde React
		+ Framer Motion a Svelte 5 con transiciones CSS y tokens Abellis. Flechas ← → y Enter/Space
		para teclado.
	</p>
</section>

<section class="detail-block">
	<h2 class="detail-h2">Default (active = 1)</h2>
	<div class="detail-stage detail-stage--wide">
		<HoverExpand images={DEMO} />
	</div>
</section>

<section class="detail-block">
	<h2 class="detail-h2">Sin selección inicial</h2>
	<div class="detail-stage detail-stage--wide">
		<HoverExpand images={DEMO.slice(0, 5)} initialActive={null} />
	</div>
</section>

<style>
	.detail-intro {
		margin-bottom: 2rem;
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
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		padding: 1.5rem 0.5rem;
		border-radius: 16px;
		border: 1.5px solid var(--line, #d9e2ec);
		background: var(--surface-2, #f5f8fc);
	}

	.detail-stage--wide {
		overflow-x: auto;
		padding-block: 2rem;
	}
</style>
