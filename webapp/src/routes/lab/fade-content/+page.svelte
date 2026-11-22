<script lang="ts">
	/**
	 * Lab demo — FadeContent: fade / focus / develop / mist reveals (WAAPI).
	 */
	import FadeContent from '../../../lib/components/FadeContent.svelte';
	import type { FadeContentEffect } from '../../../lib/components/FadeContent.svelte';

	let effect = $state<FadeContentEffect>('mist');
	let stagger = $state(0.1);
	let blur = $state(0);
	let key = $state(0);

	const effects: FadeContentEffect[] = ['fade', 'focus', 'develop', 'mist', 'dissolve', 'pixel'];

	const cards = [
		{ title: 'Dock inbound', body: 'ASN closed · 24 pallets staged.' },
		{ title: 'Putaway', body: 'Zone B · 18 bins confirmed.' },
		{ title: 'Wave #4821', body: '128 lines · pick started.' },
		{ title: 'Ship window', body: 'Carrier ETA 16:40 · 3 loads.' }
	];

	function replay() {
		key += 1;
	}
</script>

<svelte:head>
	<title>FadeContent · Component Lab</title>
</svelte:head>

<section class="detail-intro">
	<a class="detail-back" href="/lab">← Lab</a>
	<h1 class="detail-title">FadeContent · WMS</h1>
	<p class="detail-lead">
		Reveal por efecto (fade, focus, develop, mist, dissolve, pixel) con stagger. WAAPI, sin GSAP.
		Demo con tarjetas de estado floor ops.
	</p>
</section>

<div class="toolbar">
	{#each effects as e}
		<button type="button" class="btn" class:active={effect === e} onclick={() => (effect = e)}>{e}</button>
	{/each}
	<button type="button" class="btn" onclick={() => (stagger = stagger === 0 ? 0.1 : 0)}>
		Stagger {stagger ? 'on' : 'off'}
	</button>
	<button type="button" class="btn" onclick={() => (blur = blur ? 0 : 8)}>Blur {blur ? 'on' : 'off'}</button>
	<button type="button" class="btn" onclick={replay}>Replay</button>
</div>

<div class="stage">
	{#key `${key}-${effect}-${stagger}-${blur}`}
		<FadeContent
			{effect}
			duration={1.2}
			{stagger}
			blur={blur}
			initialOpacity={0}
			staggerFrom="start"
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
		</FadeContent>
	{/key}
</div>

<p class="hint">Cambia el efecto y pulsa Replay. Abajo: reveal al scroll.</p>

<section class="scroll-zone">
	<p class="scroll-label">Scroll reveal · {effect}</p>
	{#key `scroll-${key}-${effect}`}
		<FadeContent
			{effect}
			duration={1}
			stagger={0.12}
			threshold={0.2}
			trigger="scroll"
			once
			class="demo-stack light"
		>
			{#each ['Inventory variance cleared', 'Count approval queued', 'RMA receive complete', 'Transfer TO-991 shipped'] as label}
				<div class="row">{label}</div>
			{/each}
		</FadeContent>
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
		text-transform: capitalize;
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
