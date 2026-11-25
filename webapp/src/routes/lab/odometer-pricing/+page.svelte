<script lang="ts">
	import OdometerPricing from '../../../lib/components/OdometerPricing.svelte';
</script>

<svelte:head>
	<title>Odometer Pricing · Component Lab</title>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="lab-chrome">
	<a class="back" href="/lab">← Lab</a>
</div>

<div class="frame">
	<OdometerPricing />
</div>

<style>
	:global(html),
	:global(body) {
		margin: 0;
		height: 100%;
		background: #fff;
	}
	.frame {
		height: 100svh;
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
		background: color-mix(in oklch, black 6%, white);
		border: 1px solid color-mix(in oklch, black 12%, transparent);
		font-size: 0.75rem;
		font-weight: 600;
		color: #10161f;
		text-decoration: none;
		backdrop-filter: blur(8px);
	}
</style>
