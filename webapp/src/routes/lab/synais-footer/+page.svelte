<script lang="ts">
	import SynaisFooter from '../../../lib/components/SynaisFooter.svelte';
</script>

<svelte:head>
	<title>Synais Footer · Component Lab</title>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600&display=swap"
		rel="stylesheet"
	/>
	<style>
		:root {
			--sy-font: 'Inter Tight', ui-sans-serif, system-ui, sans-serif;
		}
	</style>
</svelte:head>

<div class="lab-chrome">
	<a class="back" href="/lab">← Lab</a>
</div>

<SynaisFooter />

<style>
	:global(html),
	:global(body) {
		margin: 0;
		background: #0b0b0b;
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
		background: color-mix(in oklch, white 8%, transparent);
		border: 1px solid color-mix(in oklch, white 14%, transparent);
		font-size: 0.75rem;
		font-weight: 600;
		color: #ebe6d6;
		text-decoration: none;
		backdrop-filter: blur(8px);
	}
</style>
