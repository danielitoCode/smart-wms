<script lang="ts">
	import DuoFlip, { DEFAULT_IMAGES, type DuoFlipImage } from '../../../lib/components/DuoFlip.svelte';

	/** Placeholder Unsplash samples — replace with your own URLs for production. */
	const samples = DEFAULT_IMAGES;

	const wmsHubs: DuoFlipImage[] = [
		{
			src: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1400&h=780&fit=crop&q=80',
			alt: 'Warehouse aisles with racking',
			label: 'Aisles'
		},
		{
			src: 'https://images.unsplash.com/photo-1553413077-190dd305871c?w=1400&h=780&fit=crop&q=80',
			alt: 'Forklift in a distribution centre',
			label: 'Putaway'
		},
		{
			src: 'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=1400&h=780&fit=crop&q=80',
			alt: 'Parcels on a packing bench',
			label: 'Packing'
		},
		{
			src: 'https://images.unsplash.com/photo-1578574577315-52ac8755fb63?w=1400&h=780&fit=crop&q=80',
			alt: 'Loading dock with trucks',
			label: 'Shipping'
		}
	];

	let mode = $state<'nature' | 'wms'>('nature');
	let idx = $state(0);
	const images = $derived(mode === 'wms' ? wmsHubs : samples);
</script>

<svelte:head>
	<title>DuoFlip · Component Lab</title>
</svelte:head>

<div class="lab">
	<header class="lab-head">
		<a class="back" href="/lab">← Lab</a>
		<div class="toggles">
			<button type="button" class="chip" class:on={mode === 'nature'} onclick={() => (mode = 'nature')}>
				Samples
			</button>
			<button type="button" class="chip" class:on={mode === 'wms'} onclick={() => (mode = 'wms')}>
				WMS hubs
			</button>
		</div>
	</header>

	<main class="lab-main">
		<p class="lab-kicker">Interactive · WebGL</p>
		<h1 class="lab-title">DuoFlip</h1>
		<p class="lab-lead">
			Fold líquido entre fotos (shader WebGL). Click, drag, flechas o autoplay. Las imágenes de
			muestra son de Unsplash — sustituye por las tuyas vía <code>images</code>. Índice actual:
			<strong>{idx + 1}</strong>.
		</p>

		<div class="lab-demo">
			{#key mode}
				<DuoFlip {images} onChange={(i) => (idx = i)} />
			{/key}
		</div>
	</main>
</div>

<style>
	.lab {
		min-height: 100svh;
		margin: 0;
		padding: 1.25rem 1.25rem 3rem;
		background: #f4f4f5;
		color: #18181b;
		font-family: ui-sans-serif, system-ui, sans-serif;
		display: flex;
		flex-direction: column;
		align-items: center;
	}
	.lab-head {
		width: 100%;
		max-width: 640px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1.5rem;
		gap: 0.75rem;
	}
	.back,
	.chip {
		padding: 0.35rem 0.75rem;
		border-radius: 999px;
		border: 1px solid rgba(24, 24, 27, 0.12);
		background: rgba(24, 24, 27, 0.04);
		font-size: 0.75rem;
		font-weight: 600;
		color: inherit;
		text-decoration: none;
		cursor: pointer;
	}
	.chip.on {
		border-color: rgba(24, 24, 27, 0.28);
		background: rgba(24, 24, 27, 0.1);
	}
	.toggles {
		display: flex;
		gap: 0.4rem;
	}
	.lab-main {
		width: 100%;
		max-width: 640px;
	}
	.lab-kicker {
		margin: 0 0 0.35rem;
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		opacity: 0.55;
	}
	.lab-title {
		margin: 0 0 0.5rem;
		font-size: clamp(1.4rem, 3vw, 1.85rem);
		font-weight: 700;
		letter-spacing: -0.03em;
	}
	.lab-lead {
		margin: 0 0 1.5rem;
		font-size: 0.95rem;
		line-height: 1.55;
		opacity: 0.7;
	}
	.lab-lead code {
		font-size: 0.85em;
		padding: 0.1em 0.35em;
		border-radius: 4px;
		background: rgba(0, 0, 0, 0.06);
	}
	.lab-demo {
		display: flex;
		justify-content: center;
	}
</style>
