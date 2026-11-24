<script lang="ts">
	/**
	 * Lab demo — Luna Hero digital storefront.
	 */
	import LunaHero from '../../../lib/components/LunaHero.svelte';

	let theme = $state<'light' | 'dark' | 'system'>('system');
</script>

<svelte:head>
	<title>Luna Hero · Component Lab</title>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Schibsted+Grotesk:wght@500;600&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="lab-chrome">
	<a class="back" href="/lab">← Lab</a>
	<div class="theme-row">
		{#each ['system', 'light', 'dark'] as t}
			<button type="button" class:active={theme === t} onclick={() => (theme = t as typeof theme)}>{t}</button>
		{/each}
	</div>
</div>

<LunaHero {theme} />

<style>
	.lab-chrome {
		position: fixed;
		top: 0.65rem;
		left: 0.65rem;
		right: 0.65rem;
		z-index: 60;
		display: flex;
		align-items: center;
		justify-content: space-between;
		pointer-events: none;
	}
	.lab-chrome > * {
		pointer-events: auto;
	}
	.back {
		padding: 0.35rem 0.7rem;
		border-radius: 999px;
		background: color-mix(in oklch, white 85%, transparent);
		box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
		font-size: 0.75rem;
		font-weight: 600;
		color: #111;
		text-decoration: none;
		backdrop-filter: blur(8px);
	}
	.theme-row {
		display: flex;
		gap: 0.35rem;
		padding: 0.25rem;
		border-radius: 999px;
		background: color-mix(in oklch, white 80%, transparent);
		backdrop-filter: blur(8px);
		box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
	}
	.theme-row button {
		border: 0;
		background: transparent;
		padding: 0.3rem 0.65rem;
		border-radius: 999px;
		font-size: 0.7rem;
		font-weight: 600;
		cursor: pointer;
		text-transform: capitalize;
		color: #444;
	}
	.theme-row button.active {
		background: #111;
		color: #fff;
	}
</style>
