<script lang="ts">
	import DynamicDropZone from '../../../lib/components/DynamicDropZone.svelte';

	let theme = $state<'light' | 'dark'>('light');
	let lastDrop = $state<string | null>(null);
</script>

<svelte:head>
	<title>Dynamic Drop Zone · Component Lab</title>
</svelte:head>

<div class="lab" data-theme={theme}>
	<header class="lab-head">
		<a class="back" href="/lab">← Lab</a>
		<button type="button" class="theme" onclick={() => (theme = theme === 'dark' ? 'light' : 'dark')}>
			{theme === 'dark' ? 'Light' : 'Dark'}
		</button>
	</header>

	<main class="lab-main">
		<p class="lab-kicker">Interactive</p>
		<h1 class="lab-title">Dynamic Drop Zone</h1>
		<p class="lab-lead">
			Carry a file over the zone and it dims into a black hole: dashed rings tunnel toward the
			pointer. Drop to swallow, upload, check. Demo file below — drag or press Enter.
			{#if lastDrop}
				<br /><strong>Dropped:</strong> {lastDrop}
			{/if}
		</p>

		<div class="lab-demo">
			<DynamicDropZone
				{theme}
				onFiles={(files: File[]) => {
					lastDrop = files.map((f) => f.name).join(', ') || '(empty)';
				}}
			/>
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
	.lab[data-theme='dark'] {
		background: #0b0b0b;
		color: #e4e4e7;
	}
	.lab-head {
		width: 100%;
		max-width: 420px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1.5rem;
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
	.lab-main {
		width: 100%;
		max-width: 420px;
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
	.lab-demo {
		display: flex;
		justify-content: center;
		width: 100%;
	}
</style>
