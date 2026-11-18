<script lang="ts">
	/**
	 * Lab detail — PremiumTestimonial
	 */
	import PremiumTestimonial from '../../../lib/components/PremiumTestimonial.svelte';
</script>

<svelte:head>
	<title>PremiumTestimonial · Component Lab</title>
</svelte:head>

<section class="detail-intro">
	<a class="detail-back" href="/lab">← Lab</a>
	<h1 class="detail-title">PremiumTestimonial</h1>
	<p class="detail-lead">
		Carrusel de testimonios con autoplay, dots y flechas. Migrado de React + Framer Motion a Svelte 5
		con transiciones CSS. Props de copy + lista opcional de items.
	</p>
</section>

<section class="detail-block">
	<h2 class="detail-h2">Default</h2>
	<div class="detail-stage detail-stage--flush">
		<PremiumTestimonial />
	</div>
</section>

<section class="detail-block">
	<h2 class="detail-h2">Copy personalizado + autoplay off</h2>
	<div class="detail-stage detail-stage--flush">
		<PremiumTestimonial
			title="Chosen by"
			subTitle="Warehouse Teams"
			tagline="Smart WMS feedback"
			des="Equipos que ya operan con procesos más claros y menos fricción diaria."
			autoplayMs={0}
		/>
	</div>
</section>

<style>
	.detail-intro {
		margin-bottom: 1.5rem;
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

	.detail-block {
		margin-bottom: 2rem;
	}

	.detail-h2 {
		margin: 0 0 0.75rem;
		font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--head-ink, #012a50);
	}

	.detail-stage {
		padding: 1.25rem 0.75rem;
		border-radius: 16px;
		border: 1.5px solid var(--line, #d9e2ec);
		background: var(--surface-2, #f5f8fc);
	}

	.detail-stage--flush {
		padding: 0;
		overflow: hidden;
	}
</style>
