<script lang="ts">
	import PixelFeatureCard from '../../../lib/components/PixelFeatureCard.svelte';

	let shape = $state<'square' | 'circle' | 'diamond'>('square');
	let floor = $state(false);
	let color = $state('#252528');
</script>

<svelte:head>
	<title>PixelFeatureCard · Component Lab</title>
</svelte:head>

<div class="lab">
	<header class="lab-head">
		<a class="back" href="/lab">← Lab</a>
		<div class="toggles">
			{#each ['square', 'circle', 'diamond'] as s}
				<button type="button" class="chip" class:on={shape === s} onclick={() => (shape = /** @type {'square'|'circle'|'diamond'} */ (s))}>
					{s}
				</button>
			{/each}
			<button type="button" class="chip" class:on={floor} onclick={() => (floor = !floor)}>floor</button>
		</div>
	</header>

	<main class="lab-main">
		<p class="lab-kicker">Interactive · Canvas</p>
		<h1 class="lab-title">PixelFeatureCard</h1>
		<p class="lab-lead">
			Campo de nubes dithered (Bayer) detrás de un teléfono. Hover ilumina, press lanza ripple. Avatar demo Unsplash.
		</p>
		<div class="lab-demo">
			{#key `${shape}-${floor}-${color}`}
				<PixelFeatureCard {shape} {floor} {color} />
			{/key}
		</div>
	</main>
</div>

<style>
	.lab {
		min-height: 100svh; margin: 0; padding: 1.25rem 1.25rem 3rem; background: #f4f4f5;
		color: #18181b; font-family: ui-sans-serif, system-ui, sans-serif;
		display: flex; flex-direction: column; align-items: center;
	}
	.lab-head {
		width: 100%; max-width: 640px; display: flex; align-items: center;
		justify-content: space-between; margin-bottom: 1.5rem; gap: 0.75rem; flex-wrap: wrap;
	}
	.back, .chip {
		padding: 0.35rem 0.75rem; border-radius: 999px; border: 1px solid rgba(24, 24, 27, 0.12);
		background: rgba(24, 24, 27, 0.04); font-size: 0.75rem; font-weight: 600;
		color: inherit; text-decoration: none; cursor: pointer;
	}
	.chip.on { border-color: rgba(24, 24, 27, 0.28); background: rgba(24, 24, 27, 0.1); }
	.toggles { display: flex; flex-wrap: wrap; gap: 0.35rem; }
	.lab-main { width: 100%; max-width: 640px; }
	.lab-kicker {
		margin: 0 0 0.35rem; font-size: 0.68rem; font-weight: 700;
		letter-spacing: 0.12em; text-transform: uppercase; opacity: 0.55;
	}
	.lab-title {
		margin: 0 0 0.5rem; font-size: clamp(1.4rem, 3vw, 1.85rem);
		font-weight: 700; letter-spacing: -0.03em;
	}
	.lab-lead { margin: 0 0 1.5rem; font-size: 0.95rem; line-height: 1.55; opacity: 0.7; }
	.lab-demo { display: flex; justify-content: center; }
</style>
