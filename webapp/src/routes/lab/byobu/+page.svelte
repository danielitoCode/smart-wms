<script lang="ts">
	/**
	 * Lab detail — ByobuCarousel
	 */
	import ByobuCarousel from '../../../lib/components/ByobuCarousel.svelte';
	import type { ByobuItem } from '../../../lib/components/byobuCarousel.types';

	const items: ByobuItem[] = [
		{ image: 'https://picsum.photos/seed/byobu01/480/760', label: 'Wave', alt: 'Wave' },
		{ image: 'https://picsum.photos/seed/byobu02/480/760', label: 'Koi', alt: 'Koi' },
		{ image: 'https://picsum.photos/seed/byobu03/480/760', label: 'Moon', alt: 'Moon' },
		{ image: 'https://picsum.photos/seed/byobu04/480/760', label: 'Tokyo', alt: 'Tokyo' },
		{ image: 'https://picsum.photos/seed/byobu05/480/760', label: 'Pine', alt: 'Pine' },
		{ image: 'https://picsum.photos/seed/byobu06/480/760', label: 'Mountain', alt: 'Mountain' },
		{ image: 'https://picsum.photos/seed/byobu07/480/760', label: 'Mist', alt: 'Mist' },
		{ image: 'https://picsum.photos/seed/byobu08/480/760', label: 'Harbor', alt: 'Harbor' }
	];
</script>

<svelte:head>
	<title>ByobuCarousel · Component Lab</title>
</svelte:head>

<section class="detail-intro">
	<a class="detail-back" href="/lab">← Lab</a>
	<h1 class="detail-title">ByobuCarousel</h1>
	<p class="detail-lead">
		Carrusel 3D tipo biombo (byōbu): paneles plegados con física de arrastre, inercia y fold
		continuo. Migrado de React a Svelte 5 (RAF, sin librerías). Arrastra, usa ← → o autoplay.
	</p>
</section>

<section class="detail-block">
	<h2 class="detail-h2">Default + autoplay</h2>
	<div class="detail-stage detail-stage--tall">
		<ByobuCarousel {items} autoplay foldAngle={28} panelWidth={240} panelHeight={380} />
	</div>
</section>

<section class="detail-block">
	<h2 class="detail-h2">Ángulo más cerrado</h2>
	<div class="detail-stage detail-stage--tall">
		<ByobuCarousel
			{items}
			foldAngle={42}
			panelWidth={200}
			panelHeight={320}
			background="#111827"
			autoplay={false}
		/>
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
		height: min(60vh, 520px);
		background: #0a0a0a;
	}
</style>
