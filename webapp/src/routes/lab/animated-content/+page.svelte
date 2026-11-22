<script lang="ts">
	/**
	 * Lab demo — AnimatedContent: scroll/mount reveals (WAAPI, no GSAP).
	 */
	import AnimatedContent from '../../../lib/components/AnimatedContent.svelte';
	import type { AnimatedContentWipe } from '../../../lib/components/AnimatedContent.svelte';

	let wipe = $state<AnimatedContentWipe>('none');
	let stagger = $state(0.08);
	let blur = $state(0);
	let scale = $state(0.94);
	let direction = $state<'vertical' | 'horizontal'>('vertical');
	let key = $state(0);

	const cards = [
		{ title: 'Receiving', body: 'ASN scan → dock → putaway queue.' },
		{ title: 'Picking', body: 'Wave #4821 · 128 lines · zone A/B.' },
		{ title: 'Packing', body: 'Verify weight, seal, label.' },
		{ title: 'Shipping', body: 'Carrier handoff · BOL ready.' }
	];

	function replay() {
		key += 1;
	}
</script>

<svelte:head>
	<title>AnimatedContent · Component Lab</title>
</svelte:head>

<section class="detail-intro">
	<a class="detail-back" href="/lab">← Lab</a>
	<h1 class="detail-title">AnimatedContent · WMS</h1>
	<p class="detail-lead">
		Reveal al scroll o al mount: distance, stagger, blur, scale, wipe mask. Implementación WAAPI
		(sin GSAP). Demo con tarjetas de flujo floor ops.
	</p>
</section>

<div class="toolbar">
	<button type="button" class="btn" class:active={wipe === 'none'} onclick={() => (wipe = 'none')}>Wipe none</button>
	<button type="button" class="btn" class:active={wipe === 'up'} onclick={() => (wipe = 'up')}>Up</button>
	<button type="button" class="btn" class:active={wipe === 'center'} onclick={() => (wipe = 'center')}>Center</button>
	<button type="button" class="btn" class:active={direction === 'vertical'} onclick={() => (direction = 'vertical')}>Vertical</button>
	<button type="button" class="btn" class:active={direction === 'horizontal'} onclick={() => (direction = 'horizontal')}>Horizontal</button>
	<button type="button" class="btn" onclick={() => (stagger = stagger === 0 ? 0.1 : 0)}>Stagger {stagger ? 'on' : 'off'}</button>
	<button type="button" class="btn" onclick={() => (blur = blur ? 0 : 8)}>Blur {blur ? 'on' : 'off'}</button>
	<button type="button" class="btn" onclick={replay}>Replay</button>
</div>

<div class="stage">
	{#key `${key}-${wipe}-${direction}-${stagger}-${blur}`}
		<AnimatedContent
			distance={80}
			{direction}
			duration={0.75}
			{blur}
			{stagger}
			{wipe}
			scale={scale}
			threshold={0.15}
			trigger="mount"
			once
			class="demo-stack"
		>
			{#each cards as c}
				<article class="card">
					<h3>{c.title}</h3>
					<p>{c.body}</p>
				</article>
			{/each}
		</AnimatedContent>
	{/key}
</div>

<p class="hint">Scroll down for more · trigger mount on this block. Change wipe / direction and Replay.</p>

<section class="scroll-zone">
	<p class="scroll-label">Scroll reveal</p>
	{#key `scroll-${key}-${wipe}`}
		<AnimatedContent
			distance={60}
			direction="vertical"
			duration={0.7}
			stagger={0.12}
			staggerFrom="start"
			wipe={wipe === 'none' ? 'up' : wipe}
			threshold={0.2}
			trigger="scroll"
			once
			class="demo-stack"
		>
			{#each ['Inbound dock', 'Cycle count A-12', 'Wave release', 'Carrier pickup'] as label}
				<div class="row">{label}</div>
			{/each}
		</AnimatedContent>
	{/key}
</section>

<style>
	.detail-intro { margin-bottom: 1.25rem; }
	.detail-back {
		display: inline-block; margin-bottom: 0.65rem; font-size: 0.8125rem; font-weight: 600;
		color: var(--navy, #004c8b); text-decoration: none;
	}
	.detail-back:hover { text-decoration: underline; }
	.detail-title {
		margin: 0 0 0.45rem; font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-size: clamp(1.35rem, 2.5vw, 1.75rem); font-weight: 700; letter-spacing: -0.03em;
		color: var(--head-ink, #012a50);
	}
	.detail-lead {
		margin: 0; max-width: 44rem; font-size: 0.95rem; line-height: 1.55; color: var(--slate, #5c6b7d);
	}
	.toolbar { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1.25rem; }
	.btn {
		height: 2.1rem; padding: 0 0.85rem; border-radius: 8px;
		border: 1px solid color-mix(in srgb, var(--navy, #004c8b) 28%, transparent);
		background: transparent; color: var(--navy, #004c8b); font-size: 0.75rem; font-weight: 600; cursor: pointer;
	}
	.btn.active { background: var(--navy, #004c8b); color: #fff; border-color: transparent; }

	.stage {
		padding: 1.5rem; border-radius: 16px;
		border: 1px solid color-mix(in srgb, var(--line, #d9e2ec) 80%, transparent);
		background: #0f1419;
		min-height: 18rem;
	}
	:global(.demo-stack) {
		display: flex; flex-direction: column; gap: 0.75rem;
	}
	.card {
		padding: 1rem 1.15rem; border-radius: 12px;
		background: color-mix(in srgb, #fff 6%, transparent);
		border: 1px solid color-mix(in srgb, #fff 10%, transparent);
		color: #e8eef5;
	}
	.card h3 {
		margin: 0 0 0.35rem; font-size: 1rem; font-weight: 700;
		font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
	}
	.card p { margin: 0; font-size: 0.875rem; opacity: 0.75; }

	.hint { margin: 0.85rem 0 2rem; font-size: 0.8125rem; color: var(--slate, #5c6b7d); }

	.scroll-zone {
		padding: 3rem 1.5rem 6rem; border-radius: 16px;
		background: #f4f6f9;
		border: 1px solid color-mix(in srgb, var(--line, #d9e2ec) 80%, transparent);
	}
	.scroll-label {
		margin: 0 0 1rem; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.08em;
		text-transform: uppercase; color: var(--navy, #004c8b);
	}
	.row {
		padding: 0.85rem 1rem; border-radius: 10px; margin-bottom: 0.5rem;
		background: #fff; border: 1px solid color-mix(in srgb, var(--line, #d9e2ec) 90%, transparent);
		font-weight: 600; color: var(--head-ink, #012a50);
	}
</style>
