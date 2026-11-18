<script lang="ts">
	/**
	 * BlobCard — card with mouse-following organic blob backdrop.
	 * Migrated from React + GSAP to Svelte 5 (lerp + rAF, no GSAP).
	 * Color props drive grid + blob palette; content via snippet children or defaults.
	 *
	 * Uso:
	 *   <BlobCard colorPrimary="#6100ff" colorAccent="#ff5c00" />
	 *   <BlobCard>...</BlobCard>  // optional overlay children (fade on hover)
	 */
	import type { Snippet } from 'svelte';

	interface Props {
		colorPrimary?: string;
		colorSecondary?: string;
		colorAccent?: string;
		colorHighlight?: string;
		class?: string;
		children?: Snippet;
	}

	let {
		colorPrimary = '#6100ff',
		colorSecondary = '#d91ae0',
		colorAccent = '#ff5c00',
		colorHighlight = '#ffaa00',
		class: className = '',
		children
	}: Props = $props();

	let cardEl = $state<HTMLDivElement | null>(null);
	let blobEl = $state<HTMLDivElement | null>(null);

	const BLOB_HALF = 300; // 600px blob, center offset

	$effect(() => {
		const card = cardEl;
		const blob = blobEl;
		if (!card || !blob) return;

		let targetX = 0;
		let targetY = 0;
		let currentX = 0;
		let currentY = 0;
		let currentRot = 0;
		let targetRot = 0;
		let lastX = 0;
		let raf = 0;
		let running = true;

		const LERP = 0.12;
		const ROT_LERP = 0.08;

		function centerTargets() {
			const w = card!.offsetWidth;
			const h = card!.offsetHeight;
			targetX = w / 2 - BLOB_HALF;
			targetY = h / 2 - BLOB_HALF;
			targetRot = 0;
		}

		centerTargets();
		currentX = targetX;
		currentY = targetY;
		blob.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) rotate(0deg)`;

		function tick() {
			if (!running) return;
			currentX += (targetX - currentX) * LERP;
			currentY += (targetY - currentY) * LERP;
			currentRot += (targetRot - currentRot) * ROT_LERP;
			blob!.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) rotate(${currentRot}deg)`;
			raf = requestAnimationFrame(tick);
		}
		raf = requestAnimationFrame(tick);

		function onMove(e: MouseEvent) {
			const rect = card!.getBoundingClientRect();
			const scaleX = rect.width / card!.offsetWidth || 1;
			const scaleY = rect.height / card!.offsetHeight || 1;
			const x = (e.clientX - rect.left) / scaleX;
			const y = (e.clientY - rect.top) / scaleY;
			targetX = x - BLOB_HALF;
			targetY = y - BLOB_HALF;
			const velocityX = x - lastX;
			targetRot = velocityX * 0.1;
			lastX = x;
		}

		function onLeave() {
			centerTargets();
		}

		card.addEventListener('mousemove', onMove);
		card.addEventListener('mouseleave', onLeave);

		return () => {
			running = false;
			cancelAnimationFrame(raf);
			card.removeEventListener('mousemove', onMove);
			card.removeEventListener('mouseleave', onLeave);
		};
	});
</script>

<div
	class="bc {className}"
	bind:this={cardEl}
	style:--bc-primary={colorPrimary}
	style:--bc-secondary={colorSecondary}
	style:--bc-accent={colorAccent}
	style:--bc-highlight={colorHighlight}
>
	<div
		class="bc__grid"
		aria-hidden="true"
		style:background-image={`linear-gradient(to right, ${colorAccent} 1px, transparent 1px), linear-gradient(to bottom, ${colorAccent} 1px, transparent 1px)`}
	></div>

	<div class="bc__blob-mask" aria-hidden="true">
		<div class="bc__blob" bind:this={blobEl}>
			<div class="bc__blob-inner">
				<div class="bc__orb bc__orb--p"></div>
				<div class="bc__orb bc__orb--s"></div>
				<div class="bc__orb bc__orb--a"></div>
				<div class="bc__orb bc__orb--h"></div>
				<div class="bc__orb bc__orb--w1"></div>
				<div class="bc__orb bc__orb--w2"></div>
			</div>
		</div>
	</div>

	<div class="bc__fade" aria-hidden="true"></div>

	<div class="bc__content">
		<div class="bc__top">
			<div class="bc__eyebrow">
				<svg aria-hidden="true" class="bc__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<line x1="18" y1="20" x2="18" y2="10" />
					<line x1="12" y1="20" x2="12" y2="4" />
					<line x1="6" y1="20" x2="6" y2="14" />
				</svg>
				Data Visualization
			</div>

			<h1 class="bc__title">Data Insights</h1>

			<div class="bc__tags">
				<span class="bc__tag">
					Heatmaps
					<svg aria-hidden="true" class="bc__tag-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<rect x="3" y="3" width="7" height="7" rx="1" />
						<rect x="14" y="3" width="7" height="7" rx="1" />
						<rect x="14" y="14" width="7" height="7" rx="1" />
						<rect x="3" y="14" width="7" height="7" rx="1" />
					</svg>
				</span>
				<span class="bc__tag">
					Analytics
					<svg aria-hidden="true" class="bc__tag-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
						<polyline points="16 7 22 7 22 13" />
					</svg>
				</span>
			</div>

			<p class="bc__desc">
				Visualizing complex datasets with vibrant, intentional gradients to show remarkable change.
			</p>
		</div>

		<div class="bc__bottom">
			<button type="button" class="bc__cta">
				<svg aria-hidden="true" class="bc__cta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M7 17L17 7" />
					<path d="M7 7h10v10" />
				</svg>
				Explore Data
			</button>
			<span class="bc__brand">Future UI</span>
		</div>

		{#if children}
			<div class="bc__children">
				{@render children()}
			</div>
		{/if}
	</div>
</div>

<style>
	.bc {
		position: relative;
		width: 100%;
		max-width: 500px;
		height: 550px;
		overflow: hidden;
		border-radius: 2rem;
		border: 1.5px solid var(--line, #d9e2ec);
		background: var(--surface-2, #f5f8fc);
		box-shadow: var(--shadow-3, 0 22px 48px rgba(10, 30, 60, 0.16));
		cursor: crosshair;
		color: var(--ink, #132234);
	}

	@media (min-width: 640px) {
		.bc {
			height: 750px;
		}
	}

	.bc__grid {
		position: absolute;
		inset: 0;
		z-index: 0;
		opacity: 0.07;
		pointer-events: none;
		background-size: 48px 48px;
		background-position: center;
	}

	.bc__blob-mask {
		position: absolute;
		inset: 0;
		z-index: 0;
		pointer-events: none;
		mask-image: linear-gradient(to bottom, transparent 0%, transparent 35%, black 50%, black 100%);
		-webkit-mask-image: linear-gradient(to bottom, transparent 0%, transparent 35%, black 50%, black 100%);
	}

	.bc__blob {
		position: absolute;
		top: 0;
		left: 0;
		width: 600px;
		height: 600px;
		pointer-events: none;
		opacity: 0.8;
		will-change: transform;
		transition: opacity 700ms ease;
	}

	.bc:hover .bc__blob {
		opacity: 1;
	}

	.bc__blob-inner {
		position: relative;
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		transform: scale(0.9);
	}

	.bc__orb {
		position: absolute;
		border-radius: 999px;
		filter: blur(50px);
		opacity: 0.7;
		pointer-events: none;
	}

	.bc__orb--p {
		top: 40%;
		left: 20%;
		width: 350px;
		height: 350px;
		background: var(--bc-primary);
		filter: blur(60px);
	}

	.bc__orb--s {
		top: 20%;
		left: 45%;
		width: 250px;
		height: 250px;
		background: var(--bc-secondary);
		filter: blur(50px);
	}

	.bc__orb--a {
		top: 30%;
		left: 15%;
		width: 200px;
		height: 200px;
		background: var(--bc-accent);
		filter: blur(45px);
	}

	.bc__orb--h {
		top: 45%;
		left: 45%;
		width: 250px;
		height: 300px;
		border-radius: 100px;
		background: var(--bc-highlight);
		filter: blur(50px);
		transform: rotate(-12deg);
	}

	.bc__orb--w1 {
		top: 35%;
		left: 30%;
		width: 250px;
		height: 200px;
		border-radius: 100px;
		background: color-mix(in srgb, var(--ink, #132234) 18%, white);
		filter: blur(40px);
		opacity: 0.5;
		transform: rotate(12deg);
	}

	.bc__orb--w2 {
		top: 38%;
		left: 35%;
		width: 150px;
		height: 150px;
		background: color-mix(in srgb, var(--ink, #132234) 12%, white);
		filter: blur(40px);
		opacity: 0.55;
	}

	.bc__fade {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 45%;
		z-index: 10;
		pointer-events: none;
		background: linear-gradient(
			to bottom,
			var(--surface-2, #f5f8fc) 0%,
			color-mix(in srgb, var(--surface-2, #f5f8fc) 90%, transparent) 55%,
			transparent 100%
		);
	}

	.bc__content {
		position: relative;
		z-index: 20;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		width: 100%;
		height: 100%;
		padding: 1.5rem;
		pointer-events: none;
	}

	@media (min-width: 640px) {
		.bc__content {
			padding: 2.5rem;
		}
	}

	.bc__top {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding-top: 0.25rem;
		pointer-events: auto;
	}

	@media (min-width: 640px) {
		.bc__top {
			gap: 1.35rem;
		}
	}

	.bc__eyebrow {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		font-weight: 500;
		letter-spacing: 0.04em;
		color: var(--bc-accent);
	}

	.bc__icon {
		width: 1rem;
		height: 1rem;
		flex-shrink: 0;
	}

	.bc__title {
		margin: 0;
		font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-size: clamp(1.75rem, 4vw, 3rem);
		font-weight: 700;
		letter-spacing: -0.03em;
		line-height: 1.1;
		color: var(--head-ink, #012a50);
	}

	.bc__tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.bc__tag {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.4rem 0.85rem;
		border-radius: 12px;
		border: 1px solid var(--line, #d9e2ec);
		background: color-mix(in srgb, var(--card, #fff) 85%, transparent);
		backdrop-filter: blur(6px);
		font-size: 0.8125rem;
		color: var(--ink, #132234);
		cursor: pointer;
		transition: background 160ms ease;
	}

	.bc__tag:hover {
		background: var(--card, #fff);
	}

	.bc__tag-icon {
		width: 0.875rem;
		height: 0.875rem;
		opacity: 0.8;
	}

	.bc__desc {
		margin: 0;
		max-width: 85%;
		font-size: clamp(0.95rem, 2vw, 1.125rem);
		line-height: 1.55;
		font-weight: 300;
		color: var(--slate, #5c6b7d);
	}

	.bc__bottom {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		pointer-events: auto;
	}

	.bc__cta {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.7rem 1.15rem;
		border: 0;
		border-radius: 12px;
		background: var(--ink, #132234);
		color: var(--card, #fff);
		font-size: 0.875rem;
		font-weight: 600;
		font-family: inherit;
		cursor: pointer;
		box-shadow: var(--shadow-2, 0 6px 18px rgba(16, 38, 64, 0.12));
		transition: transform 200ms ease, filter 200ms ease;
	}

	.bc__cta:hover {
		filter: brightness(1.08);
		transform: scale(1.04);
	}

	.bc__cta:active {
		transform: scale(0.96);
	}

	.bc__cta-icon {
		width: 1rem;
		height: 1rem;
	}

	.bc__brand {
		padding-bottom: 0.35rem;
		font-size: 0.7rem;
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-weight: 500;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: color-mix(in srgb, var(--ink, #132234) 22%, transparent);
		user-select: none;
	}

	.bc__children {
		position: absolute;
		inset: 0;
		z-index: 15;
		pointer-events: none;
		opacity: 0;
		transition: opacity 700ms ease;
	}

	.bc:hover .bc__children {
		opacity: 1;
	}
</style>
