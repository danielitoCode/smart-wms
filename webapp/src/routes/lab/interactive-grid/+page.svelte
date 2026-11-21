<script lang="ts">
	/**
	 * Lab detail — InteractiveGridPattern
	 */
	import InteractiveGridPattern from '../../../lib/components/InteractiveGridPattern.svelte';
</script>

<svelte:head>
	<title>InteractiveGridPattern · Component Lab</title>
</svelte:head>

<section class="detail-intro">
	<a class="detail-back" href="/lab">← Lab</a>
	<h1 class="detail-title">InteractiveGridPattern</h1>
	<p class="detail-lead">
		Rejilla SVG de celdas interactivas: al pasar el cursor se rellena la celda (fade-in rápido,
		fade-out lento). Útil como fondo decorativo en hero o cards.
	</p>
</section>

<section class="detail-block">
	<h2 class="detail-h2">Demo</h2>
	<div class="detail-stage">
		<div class="grid-wrap">
			<InteractiveGridPattern width={32} height={32} squares={[20, 12]} />
			<p class="grid-hint">Pasa el cursor por las celdas</p>
		</div>
	</div>
</section>

<style>
	.detail-intro { margin-bottom: 1.75rem; }
	.detail-back {
		display: inline-block;
		margin-bottom: 0.65rem;
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--navy, #004c8b);
		text-decoration: none;
	}
	.detail-back:hover { text-decoration: underline; }
	.detail-title {
		margin: 0 0 0.45rem;
		font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-size: clamp(1.35rem, 2.5vw, 1.75rem);
		font-weight: 700;
		letter-spacing: -0.03em;
		color: var(--head-ink, #012a50);
	}
	.detail-lead {
		margin: 0;
		max-width: 42rem;
		font-size: 0.95rem;
		line-height: 1.55;
		color: var(--slate, #5c6b7d);
	}
	.detail-block { margin-bottom: 2rem; }
	.detail-h2 {
		margin: 0 0 0.75rem;
		font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-size: 0.95rem;
		font-weight: 700;
		color: var(--head-ink, #012a50);
	}
	.detail-stage {
		padding: 0;
		border-radius: 14px;
		overflow: hidden;
		border: 1px solid color-mix(in srgb, var(--line, #d9e2ec) 88%, transparent);
		background: color-mix(in srgb, var(--card, #fff) 92%, transparent);
	}
	.grid-wrap {
		position: relative;
		width: 100%;
		height: 24rem;
		overflow: hidden;
	}
	.grid-hint {
		position: absolute;
		bottom: 1rem;
		left: 50%;
		transform: translateX(-50%);
		margin: 0;
		font-size: 0.8rem;
		color: var(--slate, #5c6b7d);
		pointer-events: none;
		z-index: 1;
	}
</style>
