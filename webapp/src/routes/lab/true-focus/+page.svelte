<script lang="ts">
	/**
	 * Lab demo — TrueFocus: focus frame over words (brackets / box / underline / highlight).
	 */
	import TrueFocus from '../../../lib/components/TrueFocus.svelte';

	const SENTENCES = [
		'Receiving Putaway Picking Packing Shipping',
		'Smart WMS cycle count approvals',
		'Wave batch carton label gate'
	] as const;

	let sentenceIdx = $state(0);
	let focusStyle = $state<'brackets' | 'box' | 'underline' | 'highlight'>('brackets');
	let order = $state<'sequential' | 'random'>('sequential');
	let easing = $state<'smooth' | 'spring'>('smooth');
	let manualMode = $state(false);
	let borderColor = $state('#c9a227');

	const sentence = $derived(SENTENCES[sentenceIdx % SENTENCES.length]);
</script>

<svelte:head>
	<title>TrueFocus · Component Lab</title>
</svelte:head>

<section class="detail-intro">
	<a class="detail-back" href="/lab">← Lab</a>
	<h1 class="detail-title">TrueFocus · WMS</h1>
	<p class="detail-lead">
		Foco animado sobre palabras: brackets, box, underline o highlight. Autoplay sequential/random
		o modo manual al hover. Reduced-motion respetado.
	</p>
</section>

<div class="toolbar">
	<button
		type="button"
		class="btn"
		class:active={focusStyle === 'brackets'}
		onclick={() => (focusStyle = 'brackets')}
	>
		Brackets
	</button>
	<button type="button" class="btn" class:active={focusStyle === 'box'} onclick={() => (focusStyle = 'box')}>
		Box
	</button>
	<button
		type="button"
		class="btn"
		class:active={focusStyle === 'underline'}
		onclick={() => (focusStyle = 'underline')}
	>
		Underline
	</button>
	<button
		type="button"
		class="btn"
		class:active={focusStyle === 'highlight'}
		onclick={() => (focusStyle = 'highlight')}
	>
		Highlight
	</button>
	<button
		type="button"
		class="btn"
		class:active={order === 'sequential'}
		onclick={() => (order = order === 'sequential' ? 'random' : 'sequential')}
	>
		Order: {order}
	</button>
	<button
		type="button"
		class="btn"
		class:active={easing === 'spring'}
		onclick={() => (easing = easing === 'smooth' ? 'spring' : 'smooth')}
	>
		Ease: {easing}
	</button>
	<button type="button" class="btn" class:active={manualMode} onclick={() => (manualMode = !manualMode)}>
		Manual
	</button>
	<button type="button" class="btn" onclick={() => (sentenceIdx = (sentenceIdx + 1) % SENTENCES.length)}>
		Next phrase
	</button>
	<button
		type="button"
		class="btn"
		class:active={borderColor === '#c9a227'}
		onclick={() => (borderColor = borderColor === '#c9a227' ? '#004c8b' : '#c9a227')}
	>
		Accent
	</button>
</div>

<div class="stage">
	{#key `${sentence}-${focusStyle}-${order}-${easing}-${manualMode}-${borderColor}`}
		<TrueFocus
			{sentence}
			{focusStyle}
			{order}
			{easing}
			{manualMode}
			{borderColor}
			highlightColor={borderColor}
			glowColor="color-mix(in srgb, {borderColor} 45%, transparent)"
			blurAmount={4}
			focusScale={1.04}
			animationDuration={0.55}
			pauseBetweenAnimations={1.1}
			cornerSize={14}
			borderWidth={3}
			unfocusedOpacity={0.45}
		/>
	{/key}
</div>

<p class="hint">
	{#if manualMode}
		Hover una palabra para fijar el foco.
	{:else}
		Autoplay {order}. Reduced-motion desactiva el intervalo y las animaciones de marco.
	{/if}
</p>

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
		max-width: 44rem;
		font-size: 0.95rem;
		line-height: 1.55;
		color: var(--slate, #5c6b7d);
	}

	.toolbar {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 1.25rem;
	}
	.btn {
		height: 2.1rem;
		padding: 0 0.85rem;
		border-radius: 8px;
		border: 1px solid color-mix(in srgb, var(--navy, #004c8b) 28%, transparent);
		background: transparent;
		color: var(--navy, #004c8b);
		font-size: 0.75rem;
		font-weight: 600;
		cursor: pointer;
	}
	.btn.active {
		background: var(--navy, #004c8b);
		color: #fff;
		border-color: transparent;
	}

	.stage {
		display: flex;
		min-height: 12rem;
		align-items: center;
		justify-content: center;
		padding: 2rem 1.25rem;
		border-radius: 16px;
		border: 1px solid color-mix(in srgb, var(--line, #d9e2ec) 80%, transparent);
		background: color-mix(in srgb, var(--card, #fff) 92%, transparent);
	}

	.hint {
		margin: 0.85rem 0 0;
		font-size: 0.8125rem;
		color: var(--slate, #5c6b7d);
	}
</style>
