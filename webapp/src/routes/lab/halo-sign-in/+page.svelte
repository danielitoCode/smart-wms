<script lang="ts">
	import HaloSignIn from '../../../lib/components/HaloSignIn.svelte';
</script>

<svelte:head>
	<title>Halo Sign In · Component Lab</title>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap"
		rel="stylesheet"
	/>
	<style>
		:root {
			--hsi-font: 'Inter', ui-sans-serif, system-ui, sans-serif;
		}
	</style>
</svelte:head>

<div class="lab-chrome">
	<a class="back" href="/lab">← Lab</a>
</div>

<HaloSignIn />

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
		color: #18181b;
		text-decoration: none;
		backdrop-filter: blur(8px);
	}
</style>
