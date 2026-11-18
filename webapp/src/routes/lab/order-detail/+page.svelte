<script lang="ts">
	/**
	 * Lab detail — OrderDetail
	 */
	import OrderDetail from '../../../lib/components/OrderDetail.svelte';
</script>

<svelte:head>
	<title>OrderDetail · Component Lab</title>
</svelte:head>

<section class="detail-intro">
	<a class="detail-back" href="/lab">← Lab</a>
	<h1 class="detail-title">OrderDetail</h1>
	<p class="detail-lead">
		Detalle de pedido admin: items, invoice, timeline y panel lateral (notes / customer / fraud).
		Migrado de React + Astrayx a Svelte 5 + CSS.
	</p>
</section>

<section class="detail-stage">
	<OrderDetail />
</section>

<style>
	.detail-intro {
		margin-bottom: 1rem;
	}

	.detail-back {
		display: inline-block;
		margin-bottom: 0.6rem;
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--link, #004c8b);
		text-decoration: none;
	}

	.detail-back:hover {
		text-decoration: underline;
	}

	.detail-title {
		margin: 0 0 0.4rem;
		font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-size: clamp(1.4rem, 2.6vw, 1.75rem);
		font-weight: 700;
		letter-spacing: -0.025em;
		color: var(--head-ink, #012a50);
	}

	.detail-lead {
		margin: 0;
		max-width: 42rem;
		font-size: 0.9rem;
		line-height: 1.55;
		color: var(--slate, #5c6b7d);
	}

	.detail-stage {
		padding: 1rem;
		border-radius: 16px;
		border: 1.5px solid var(--line, #d9e2ec);
		background: var(--surface-2, #f5f8fc);
	}

	@media (min-width: 640px) {
		.detail-stage {
			padding: 1.25rem;
		}
	}
</style>
