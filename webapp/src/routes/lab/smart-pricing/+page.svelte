<script lang="ts">
	import SmartPricing from '../../../lib/components/SmartPricing.svelte';
</script>

<svelte:head>
	<title>Smart Pricing · Component Lab</title>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600&family=Inter:wght@400;500;600&family=Urbanist:wght@500&display=swap"
		rel="stylesheet"
	/>
	<style>
		:root {
			--sp-bricolage: 'Bricolage Grotesque', ui-sans-serif, system-ui, sans-serif;
			--sp-urbanist: 'Urbanist', ui-sans-serif, system-ui, sans-serif;
			--sp-inter: 'Inter', ui-sans-serif, system-ui, sans-serif;
		}
	</style>
</svelte:head>

<div class="lab-chrome">
	<a class="back" href="/lab">← Lab</a>
</div>

<SmartPricing />

<style>
	:global(html),
	:global(body) {
		margin: 0;
		background: #fff;
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
		background: color-mix(in oklch, black 5%, white);
		border: 1px solid color-mix(in oklch, black 12%, transparent);
		font-size: 0.75rem;
		font-weight: 600;
		color: #102d16;
		text-decoration: none;
		backdrop-filter: blur(8px);
	}
</style>
