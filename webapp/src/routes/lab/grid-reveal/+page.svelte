<script lang="ts">
	/**
	 * Lab demo — GridReveal: BSP canvas split → photo.
	 */
	import GridReveal from '../../../lib/components/GridReveal.svelte';

	const IMAGES = [
		{
			src: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1600&q=80',
			alt: 'Snow mountain under stars',
			caption: 'Sampling luminance…',
			aspect: 16 / 10
		},
		{
			src: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1600&q=80',
			alt: 'Alpine valley and river',
			caption: 'Building grid…',
			aspect: 4 / 3
		},
		{
			src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1600&q=80',
			alt: 'Mountain range at dusk',
			caption: 'Revealing photo…',
			aspect: 1
		}
	] as const;

	let index = $state(0);
	let key = $state(0);
	let status = $state('idle');
	let manual = $state(false);
	let progress = $state(0);

	const current = $derived(IMAGES[index % IMAGES.length]);

	function next() {
		index = (index + 1) % IMAGES.length;
		key += 1;
		status = 'idle';
		progress = 0;
	}

	function replay() {
		key += 1;
		status = 'idle';
		progress = 0;
	}

	function onComplete() {
		status = 'complete';
	}

	function onError() {
		status = 'error';
	}

	function nudge(delta: number) {
		manual = true;
		progress = Math.min(1, Math.max(0, progress + delta));
	}
</script>

<svelte:head>
	<title>GridReveal · Component Lab</title>
</svelte:head>

<section class="detail-intro">
	<a class="detail-back" href="/lab">← Lab</a>
	<h1 class="detail-title">GridReveal</h1>
	<p class="detail-lead">
		Revelado de imagen por partición BSP en canvas: celdas se separan, toman el color medio de la
		foto y al final aparece la imagen completa. Caption con shimmer y prefers-reduced-motion.
	</p>
</section>

<div class="stage">
	{#key key}
		<GridReveal
			src={current.src}
			alt={current.alt}
			aspect={current.aspect}
			caption={status === 'complete' ? undefined : current.caption}
			estimatedDuration={5000}
			progress={manual ? progress : undefined}
			onRevealComplete={onComplete}
			onError={onError}
			class="frame"
		/>
	{/key}

	<div class="meta">
		<span class="badge" data-status={status}>{status}</span>
		<span class="hint">{current.alt}</span>
	</div>

	<div class="controls">
		<button type="button" class="btn" onclick={replay}>Replay</button>
		<button type="button" class="btn" onclick={next}>Next image</button>
		<button
			type="button"
			class="btn btn--ghost"
			onclick={() => {
				manual = !manual;
				progress = 0.2;
			}}
		>
			{manual ? 'Auto pace' : 'Manual progress'}
		</button>
		{#if manual}
			<button type="button" class="btn btn--ghost" onclick={() => nudge(-0.08)}>−0.08</button>
			<button type="button" class="btn btn--ghost" onclick={() => nudge(0.08)}>+0.08</button>
			<span class="pct">{(progress * 100).toFixed(0)}%</span>
		{/if}
	</div>
</div>

<style>
	.detail-intro {
		margin-bottom: 1.25rem;
	}
	.detail-back {
		display: inline-block;
		margin-bottom: 0.65rem;
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--navy, #004c8b);
		text-decoration: none;
	}
	.detail-back:hover {
		text-decoration: underline;
	}
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

	.stage {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		max-width: 42rem;
	}
	.stage :global(.frame) {
		width: 100%;
		box-shadow: 0 12px 40px rgba(15, 23, 42, 0.12);
	}

	.meta {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	.badge {
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		padding: 0.2rem 0.5rem;
		border-radius: 999px;
		background: color-mix(in srgb, var(--navy, #004c8b) 12%, transparent);
		color: var(--navy, #004c8b);
	}
	.badge[data-status='complete'] {
		background: color-mix(in srgb, #16a34a 14%, transparent);
		color: #15803d;
	}
	.badge[data-status='error'] {
		background: color-mix(in srgb, #dc2626 14%, transparent);
		color: #b91c1c;
	}
	.hint {
		font-size: 0.8125rem;
		color: var(--slate, #5c6b7d);
	}

	.controls {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
	}
	.btn {
		height: 2.25rem;
		padding: 0 0.9rem;
		border-radius: 8px;
		border: none;
		background: var(--navy, #004c8b);
		color: #fff;
		font-size: 0.8125rem;
		font-weight: 600;
		cursor: pointer;
	}
	.btn:hover {
		filter: brightness(1.08);
	}
	.btn--ghost {
		background: transparent;
		color: var(--navy, #004c8b);
		border: 1px solid color-mix(in srgb, var(--navy, #004c8b) 35%, transparent);
	}
	.pct {
		font-size: 0.8125rem;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		color: var(--slate, #5c6b7d);
	}
</style>
