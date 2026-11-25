<script lang="ts">
	import SwapCard from '../../../lib/components/SwapCard.svelte';

	let theme = $state<'light' | 'dark'>('light');
	let last = $state<string | null>(null);
</script>

<svelte:head>
	<title>Swap Card · Component Lab</title>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link
		href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="lab" data-theme={theme}>
	<header class="lab-head">
		<a class="back" href="/lab">← Lab</a>
		<button type="button" class="theme" onclick={() => (theme = theme === 'dark' ? 'light' : 'dark')}>
			{theme === 'dark' ? 'Light' : 'Dark'}
		</button>
	</header>

	<main class="lab-main">
		<p class="lab-kicker">Finance</p>
		<h1 class="lab-title">Swap Card</h1>
		<p class="lab-lead">
			Swap, Buy and Stake on one card. Flip the pair, pick tokens, roll the quote, open route details.
			The liquid button ripples, sweeps while pending, and bursts when a trade lands.
			{#if last}<br /><strong>{last}</strong>{/if}
		</p>

		<div class="lab-demo">
			<SwapCard
				{theme}
				onSwap={(t) => {
					last = `${t.mode}: ${t.amount} ${t.pay} → ${t.received.toFixed(4)} ${t.receive}`;
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
		background: #eaecef;
		color: #18181b;
		font-family: Inter, ui-sans-serif, system-ui, sans-serif;
		display: flex;
		flex-direction: column;
		align-items: center;
	}
	.lab[data-theme='dark'] {
		background: #0e0f12;
		color: #e4e4e7;
	}
	.lab-head {
		width: 100%;
		max-width: 24rem;
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
		max-width: 24rem;
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
		margin: 0 0 1.75rem;
		font-size: 0.95rem;
		line-height: 1.55;
		opacity: 0.7;
	}
	.lab-demo {
		width: 100%;
	}
</style>
