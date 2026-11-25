<script lang="ts">
	import SlingSlider from '../../../lib/components/SlingSlider.svelte';

	let value = $state(36);
	let theme = $state<'dark' | 'light'>('dark');
</script>

<svelte:head>
	<title>Sling Slider · Component Lab</title>
</svelte:head>

<div class="lab" data-theme={theme}>
	<header class="lab-head">
		<a class="back" href="/lab">← Lab</a>
		<button type="button" class="theme" onclick={() => (theme = theme === 'dark' ? 'light' : 'dark')}>
			{theme === 'dark' ? 'Light' : 'Dark'}
		</button>
	</header>

	<main class="lab-main">
		<p class="lab-kicker">Input</p>
		<h1 class="lab-title">Sling Slider</h1>
		<p class="lab-lead">
			Drag the bars for a normal slider with spring wake. Pull the red ball back to aim — dashed arc
			previews the landing — then release to sling.
		</p>

		<div class="lab-demo">
			<SlingSlider defaultValue={36} theme={theme} onChange={(v) => (value = v)} />
			<p class="lab-readout">Value: <strong>{value}</strong></p>
		</div>
	</main>
</div>

<style>
	.lab {
		min-height: 100svh;
		margin: 0;
		padding: 1.25rem 1.25rem 3rem;
		background: #0b0b0b;
		color: #e4e4e7;
		font-family: ui-sans-serif, system-ui, sans-serif;
	}
	.lab[data-theme='light'] {
		background: #fafafa;
		color: #18181b;
	}
	.lab-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 2rem;
	}
	.back,
	.theme {
		padding: 0.35rem 0.7rem;
		border-radius: 999px;
		border: 1px solid color-mix(in oklch, currentColor 18%, transparent);
		background: color-mix(in oklch, currentColor 6%, transparent);
		font-size: 0.75rem;
		font-weight: 600;
		color: inherit;
		text-decoration: none;
		cursor: pointer;
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
		margin: 0 0 2rem;
		max-width: 36rem;
		font-size: 0.95rem;
		line-height: 1.55;
		opacity: 0.7;
	}
	.lab-demo {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.25rem;
		padding: 2rem 1rem;
		border-radius: 16px;
		border: 1px solid color-mix(in oklch, currentColor 10%, transparent);
		background: color-mix(in oklch, currentColor 3%, transparent);
		overflow-x: auto;
	}
	.lab-readout {
		margin: 0;
		font-size: 0.9rem;
		opacity: 0.75;
	}
	.lab-readout strong {
		font-variant-numeric: tabular-nums;
	}
</style>
