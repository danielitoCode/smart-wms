<script lang="ts">
	/**
	 * Lab demo — Orbit Hero (space + live Earth WebGL).
	 */
	import OrbitHero from '../../../lib/components/OrbitHero.svelte';
</script>

<svelte:head>
	<title>Orbit Hero · Component Lab</title>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600&display=swap"
		rel="stylesheet"
	/>
	<style>
		:root {
			--font-geist-sans: Inter, ui-sans-serif, system-ui, sans-serif;
		}
	</style>
</svelte:head>

<div class="lab-chrome">
	<a class="back" href="/lab">← Lab</a>
</div>

<OrbitHero />

<style>
	:global(body) {
		margin: 0;
		background: #121317;
	}
	.lab-chrome {
		position: fixed;
		top: 0.65rem;
		left: 0.65rem;
		z-index: 60;
	}
	.back {
		padding: 0.35rem 0.7rem;
		border-radius: 999px;
		background: color-mix(in oklch, white 12%, transparent);
		border: 1px solid color-mix(in oklch, white 18%, transparent);
		font-size: 0.75rem;
		font-weight: 600;
		color: #fff;
		text-decoration: none;
		backdrop-filter: blur(8px);
	}
</style>
