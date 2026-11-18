<script lang="ts">
	/**
	 * Lab detail — ProductDetail
	 */
	import ProductDetail from '../../../lib/components/ProductDetail.svelte';
</script>

<svelte:head>
	<title>ProductDetail · Component Lab</title>
</svelte:head>

<section class="detail-intro">
	<a class="detail-back" href="/lab">← Lab</a>
	<h1 class="detail-title">ProductDetail</h1>
	<p class="detail-lead">
		PDP de producto: galería con thumbs, info sticky, glaze/finish, cantidad y acordeones. Migrado de
		React + Astrayx a Svelte 5 + CSS.
	</p>
</section>

<section class="detail-stage">
	<ProductDetail />
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
		background: var(--card, #fff);
	}

	@media (min-width: 640px) {
		.detail-stage {
			padding: 1.5rem;
		}
	}
</style>
