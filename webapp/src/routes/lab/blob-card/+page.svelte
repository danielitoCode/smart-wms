<script lang="ts">
	/**
	 * Lab detail — BlobCard
	 */
	import BlobCard from '../../../lib/components/BlobCard.svelte';
</script>

<svelte:head>
	<title>BlobCard · Component Lab</title>
</svelte:head>

<section class="detail-intro">
	<a class="detail-back" href="/lab">← Lab</a>
	<h1 class="detail-title">BlobCard</h1>
	<p class="detail-lead">
		Card con blob orgánico que sigue el cursor (lerp + rAF, sin GSAP). Migrado desde React + GSAP a
		Svelte 5. Colores configurables; children opcionales aparecen al hover.
	</p>
</section>

<section class="detail-block">
	<h2 class="detail-h2">Default palette</h2>
	<div class="detail-stage">
		<BlobCard />
	</div>
</section>

<section class="detail-block">
	<h2 class="detail-h2">Navy / coral (ejemplo)</h2>
	<div class="detail-stage">
		<BlobCard
			colorPrimary="#1a1a2e"
			colorSecondary="#16213e"
			colorAccent="#0f3460"
			colorHighlight="#e94560"
		/>
	</div>
</section>

<section class="detail-block">
	<h2 class="detail-h2">Abellis-ish + children</h2>
	<div class="detail-stage">
		<BlobCard colorPrimary="#004c8b" colorSecondary="#0a7ea4" colorAccent="#e9a50b" colorHighlight="#1e7a46">
			<div class="demo-overlay">
				<p class="demo-overlay__label">Hover overlay (snippet children)</p>
			</div>
		</BlobCard>
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
		display: flex;
		justify-content: center;
		padding: 1.5rem 0.75rem;
		border-radius: 16px;
		border: 1.5px solid var(--line, #d9e2ec);
		background: var(--surface-2, #f5f8fc);
	}

	.demo-overlay {
		position: absolute;
		inset: auto 1.5rem 5.5rem;
		padding: 0.75rem 1rem;
		border-radius: 12px;
		background: color-mix(in srgb, var(--card, #fff) 88%, transparent);
		backdrop-filter: blur(8px);
		border: 1px solid var(--line, #d9e2ec);
		pointer-events: none;
	}

	.demo-overlay__label {
		margin: 0;
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--head-ink, #012a50);
	}
</style>
