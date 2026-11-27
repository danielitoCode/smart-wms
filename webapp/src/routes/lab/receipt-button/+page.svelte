<script lang="ts">
	import ReceiptButton from '../../../lib/components/ReceiptButton.svelte';
</script>

<svelte:head>
	<title>ReceiptButton · Component Lab</title>
</svelte:head>

<div class="lab">
	<header class="lab-head">
		<a class="back" href="/lab">← Lab</a>
	</header>
	<main class="lab-main">
		<p class="lab-kicker">Payment · WAAPI</p>
		<h1 class="lab-title">ReceiptButton</h1>
		<p class="lab-lead">
			Pulsa Pay: relleno con borde de agua, check, ticket térmico y desgarro. Clic en el
			recibo o espera el reset.
		</p>
		<div class="lab-stage">
			<ReceiptButton />
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
	.lab-head {
		width: 100%;
		max-width: 44rem;
		margin-bottom: 1.5rem;
	}
	.back {
		display: inline-block;
		padding: 0.35rem 0.75rem;
		border-radius: 999px;
		border: 1px solid rgba(24, 24, 27, 0.12);
		background: rgba(24, 24, 27, 0.04);
		font-size: 0.75rem;
		font-weight: 600;
		color: inherit;
		text-decoration: none;
	}
	.lab-main {
		width: 100%;
		max-width: 44rem;
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
	.lab-stage {
		display: flex;
		justify-content: center;
		min-height: 28rem;
	}
</style>
