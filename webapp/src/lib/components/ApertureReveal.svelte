<script lang="ts">
	/**
	 * ApertureReveal — sticky scroll section: circular aperture opens over media.
	 * Port Svelte 5 (no Motion).
	 */
	import type { Snippet } from 'svelte';

	interface Props {
		length?: number;
		class?: string;
		style?: string;
		media?: Snippet;
		lead?: Snippet;
		trail?: Snippet;
		caption?: Snippet;
		action?: Snippet;
		hint?: Snippet;
		captionClass?: string;
		hintClass?: string;
	}

	let {
		length = 2.5,
		class: className = '',
		style = '',
		media,
		lead,
		trail,
		caption,
		action,
		hint,
		captionClass = '',
		hintClass = ''
	}: Props = $props();

	let rootEl = $state<HTMLDivElement | null>(null);
	let progress = $state(0);

	function clamp(n: number, a: number, b: number) {
		return Math.min(b, Math.max(a, n));
	}

	$effect(() => {
		const root = rootEl;
		if (!root) return;
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
			progress = 1;
			return;
		}

		let frame = 0;
		const update = () => {
			frame = 0;
			const rect = root.getBoundingClientRect();
			const total = root.offsetHeight - window.innerHeight;
			if (total <= 0) {
				progress = 1;
				return;
			}
			const scrolled = -rect.top;
			progress = clamp(scrolled / total, 0, 1);
		};

		const onScroll = () => {
			if (!frame) frame = requestAnimationFrame(update);
		};

		update();
		window.addEventListener('scroll', onScroll, { passive: true });
		window.addEventListener('resize', onScroll);
		return () => {
			window.removeEventListener('scroll', onScroll);
			window.removeEventListener('resize', onScroll);
			if (frame) cancelAnimationFrame(frame);
		};
	});

	const aperture = $derived.by(() => {
		const p = progress;
		const e = 1 - Math.pow(1 - p, 3);
		const minR = 4;
		const maxR = 150;
		return minR + (maxR - minR) * e;
	});

	const captionOpacity = $derived(clamp((progress - 0.35) / 0.35, 0, 1));
	const hintOpacity = $derived(clamp(1 - progress * 2.2, 0, 1));
	const textShift = $derived(progress * 12);
</script>

<div
	bind:this={rootEl}
	class="ap {className}"
	style="--ap-length: {length}; {style}"
	data-progress={progress.toFixed(3)}
>
	<div class="ap-pin">
		<div class="ap-media" style="clip-path: circle({aperture}% at 50% 45%)">
			{@render media?.()}
		</div>

		<div class="ap-veil" style="opacity: {1 - progress * 0.85}"></div>

		<div class="ap-copy" style="transform: translateY({-textShift}px)">
			<h2 class="ap-headline">
				<span class="ap-lead">{@render lead?.()}</span>
				<span class="ap-opening" aria-hidden="true" style="width: {4 + progress * 28}ch"></span>
				<span class="ap-trail">{@render trail?.()}</span>
			</h2>

			{#if caption}
				<div class="ap-caption {captionClass}" style="opacity: {captionOpacity}">
					{@render caption?.()}
					{#if action}
						<div class="ap-action">{@render action?.()}</div>
					{/if}
				</div>
			{/if}
		</div>

		{#if hint}
			<p class="ap-hint {hintClass}" style="opacity: {hintOpacity}">
				{@render hint?.()}
			</p>
		{/if}
	</div>
</div>

<style>
	.ap {
		position: relative;
		height: calc(var(--ap-length, 2.5) * 100vh);
		background: var(--aperture-ground, #0d0e12);
		color: var(--aperture-ink, #e9e7e1);
	}

	.ap-pin {
		position: sticky;
		top: 0;
		height: 100vh;
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.ap-media {
		position: absolute;
		inset: 0;
		z-index: 0;
		will-change: clip-path;
	}

	.ap-media :global(img),
	.ap-media :global(video) {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.ap-veil {
		position: absolute;
		inset: 0;
		z-index: 1;
		pointer-events: none;
		background: radial-gradient(
			circle at 50% 45%,
			transparent 0%,
			var(--aperture-ground, #0d0e12) 42%
		);
	}

	.ap-copy {
		position: relative;
		z-index: 2;
		width: min(92vw, 56rem);
		padding: 0 1.25rem;
		text-align: center;
		pointer-events: none;
	}

	.ap-headline {
		margin: 0;
		font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-size: clamp(1.85rem, 6vw, 3.75rem);
		font-weight: 600;
		line-height: 1.05;
		letter-spacing: -0.035em;
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: center;
		gap: 0.15em 0.2em;
		color: var(--aperture-ink, #e9e7e1);
		text-shadow: 0 1px 24px color-mix(in srgb, var(--aperture-ground, #0d0e12) 55%, transparent);
	}

	.ap-opening {
		display: inline-block;
		height: 0.15em;
		align-self: center;
		border-radius: 999px;
		background: var(--aperture-opening, #1d1f26);
		opacity: 0.35;
		min-width: 0.5ch;
	}

	.ap-caption {
		margin: 1.75rem auto 0;
		max-width: 36rem;
		font-size: 0.95rem;
		line-height: 1.65;
		color: color-mix(in srgb, var(--aperture-ink, #e9e7e1) 82%, transparent);
		pointer-events: auto;
	}

	.ap-action {
		margin-top: 1.25rem;
	}

	.ap-action :global(a) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.65rem 1.15rem;
		border-radius: 999px;
		background: color-mix(in srgb, var(--aperture-ink, #e9e7e1) 12%, transparent);
		color: var(--aperture-ink, #e9e7e1);
		font-size: 0.875rem;
		font-weight: 600;
		text-decoration: none;
		border: 1px solid color-mix(in srgb, var(--aperture-ink, #e9e7e1) 22%, transparent);
		transition: background 150ms ease;
	}

	.ap-action :global(a:hover) {
		background: color-mix(in srgb, var(--aperture-ink, #e9e7e1) 20%, transparent);
	}

	.ap-hint {
		position: absolute;
		left: 50%;
		bottom: 2rem;
		z-index: 3;
		margin: 0;
		transform: translateX(-50%);
		font-size: 0.75rem;
		font-weight: 600;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: color-mix(in srgb, var(--aperture-ink, #e9e7e1) 55%, transparent);
		pointer-events: none;
	}

	@media (prefers-reduced-motion: reduce) {
		.ap-media {
			clip-path: none !important;
		}
		.ap-veil {
			opacity: 0 !important;
		}
	}
</style>
