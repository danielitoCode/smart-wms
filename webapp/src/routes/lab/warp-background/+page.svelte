<script lang="ts">
	/**
	 * Lab detail — WarpBackground
	 */
	import WarpBackground from '../../../lib/components/WarpBackground.svelte';
</script>

<svelte:head>
	<title>WarpBackground · Component Lab</title>
</svelte:head>

<section class="detail-intro">
	<a class="detail-back" href="/lab">← Lab</a>
	<h1 class="detail-title">WarpBackground</h1>
	<p class="detail-lead">
		Contenedor con perspectiva 3D: rejilla en las cuatro caras y beams de color que viajan en bucle
		(CSS, sin Motion). Ideal como marco de hero o card destacada.
	</p>
</section>

<section class="detail-block">
	<h2 class="detail-h2">Demo</h2>
	<div class="detail-stage">
		<WarpBackground beamsPerSide={4} beamSize={5} beamDuration={4}>
			<div class="demo-card">
				<p class="demo-kicker">Smart WMS</p>
				<h3 class="demo-title">Operaciones en un solo flujo</h3>
				<p class="demo-body">Receiving → putaway → picking → packing → shipping</p>
			</div>
		</WarpBackground>
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
	}
	.demo-card {
		text-align: center;
		max-width: 22rem;
		margin: 0 auto;
	}
	.demo-kicker {
		margin: 0 0 0.35rem;
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--navy, #004c8b);
	}
	.demo-title {
		margin: 0 0 0.5rem;
		font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-size: 1.35rem;
		font-weight: 700;
		letter-spacing: -0.02em;
		color: var(--head-ink, #012a50);
	}
	.demo-body {
		margin: 0;
		font-size: 0.9rem;
		color: var(--slate, #5c6b7d);
	}
</style>
