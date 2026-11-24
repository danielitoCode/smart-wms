<script lang="ts">
	/**
	 * Lab demo — PartyLabs Hero full-viewport.
	 */
	import PartyLabsHero from '../../../lib/components/PartyLabsHero.svelte';
</script>

<svelte:head>
	<title>PartyLabs Hero · Component Lab</title>
	<style>
		:global(body) {
			margin: 0;
		}
	</style>
</svelte:head>

<div class="wrap">
	<a class="back" href="/lab">← Lab</a>
	<PartyLabsHero />
</div>

<style>
	.wrap {
		position: relative;
		min-height: 100svh;
		margin: -1.5rem;
	}
	.back {
		position: fixed;
		top: 0.75rem;
		left: 0.75rem;
		z-index: 50;
		padding: 0.4rem 0.75rem;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.85);
		box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
		font-size: 0.75rem;
		font-weight: 600;
		color: #111;
		text-decoration: none;
		backdrop-filter: blur(8px);
	}
	.back:hover {
		background: #fff;
	}
</style>
