<script lang="ts">
	/**
	 * DisperseCarousel — card carousel with shatter/disperse exit + soft enter.
	 * Migrated from React + GSAP to Svelte 5 (WAAPI + CSS, no GSAP).
	 *
	 * Uso:
	 *   <DisperseCarousel items={items} autoPlay={5000} />
	 */
	import type { DisperseItem } from './disperseCarousel.types';

	interface Props {
		items: DisperseItem[];
		autoPlay?: number;
		class?: string;
	}

	let { items, autoPlay = 0, class: className = '' }: Props = $props();

	function generateSlices(): string[] {
		const slices: string[] = [];
		const rows = 6;
		const cols = 5;
		for (let r = 0; r < rows; r++) {
			for (let c = 0; c < cols; c++) {
				const x1 = (c / cols) * 100;
				const x2 = ((c + 1) / cols) * 100;
				const y1 = (r / rows) * 100;
				const y2 = ((r + 1) / rows) * 100;
				if ((r + c) % 2 === 0) {
					slices.push(`polygon(${x1}% ${y1}%, ${x2}% ${y1}%, ${x2}% ${y2}%)`);
					slices.push(`polygon(${x1}% ${y1}%, ${x2}% ${y2}%, ${x1}% ${y2}%)`);
				} else {
					slices.push(`polygon(${x1}% ${y1}%, ${x2}% ${y1}%, ${x1}% ${y2}%)`);
					slices.push(`polygon(${x2}% ${y1}%, ${x2}% ${y2}%, ${x1}% ${y2}%)`);
				}
			}
		}
		return slices;
	}

	const SLICES = generateSlices();

	const SCATTER_SEEDS = SLICES.map((_, i) => {
		const a = Math.sin(i * 12.9898) * 43758.5453;
		const b = Math.sin(i * 78.233) * 43758.5453;
		const c = Math.sin(i * 39.346) * 43758.5453;
		const d = Math.sin(i * 93.989) * 43758.5453;
		const e = Math.sin(i * 54.321) * 43758.5453;
		const f = (n: number) => n - Math.floor(n);
		return {
			xBase: 200 + f(a) * 400,
			xOffset: (f(b) - 0.5) * 300,
			y: (f(c) - 0.5) * 600,
			rotation: (f(d) - 0.5) * 360,
			scale: 0.1 + f(e) * 0.5,
			duration: 1.5 + f(a + b) * 1.2
		};
	});

	interface GhostData {
		id: string;
		item: DisperseItem;
		direction: 1 | -1;
	}

	let currentIndex = $state(0);
	let direction = $state<1 | -1>(1);
	let ghosts = $state<GhostData[]>([]);
	let isAnimating = $state(false);
	let containerHeight = $state<number | null>(null);
	let containerEl = $state<HTMLDivElement | null>(null);
	let animatingTimeout: ReturnType<typeof setTimeout> | undefined;
	let animKey = $state(0);

	const current = $derived(items[currentIndex] ?? null);
	const len = $derived(items.length);

	const cardScale = $derived.by(() => {
		if (!containerHeight) return 1;
		const neededHeight = 480 + 40 + 6 + 32 + 56 + 48;
		if (containerHeight >= neededHeight) return 1;
		return Math.max(0.55, containerHeight / neededHeight);
	});

	$effect(() => {
		const el = containerEl;
		if (!el) return;
		const ro = new ResizeObserver((entries) => {
			for (const entry of entries) {
				containerHeight = entry.contentRect.height;
			}
		});
		ro.observe(el);
		return () => ro.disconnect();
	});

	$effect(() => {
		return () => clearTimeout(animatingTimeout);
	});

	function handleNavigate(newDirection: 1 | -1) {
		if (isAnimating || !len) return;
		isAnimating = true;
		clearTimeout(animatingTimeout);
		animatingTimeout = setTimeout(() => {
			isAnimating = false;
		}, 600);

		direction = newDirection;
		const ghost: GhostData = {
			id: crypto.randomUUID(),
			item: items[currentIndex],
			direction: newDirection
		};
		ghosts = [...ghosts, ghost];

		let next = currentIndex + newDirection;
		if (next < 0) next = len - 1;
		if (next >= len) next = 0;
		currentIndex = next;
		animKey += 1;
	}

	function removeGhost(id: string) {
		ghosts = ghosts.filter((g) => g.id !== id);
	}

	function goTo(idx: number) {
		if (idx === currentIndex || isAnimating) return;
		handleNavigate(idx > currentIndex ? 1 : -1);
	}

	$effect(() => {
		if (!autoPlay || autoPlay <= 0 || len < 2) return;
		const timer = setInterval(() => handleNavigate(1), autoPlay);
		return () => clearInterval(timer);
	});

	function ghostAction(node: HTMLDivElement, ghost: GhostData) {
		const apparition = node.querySelector('[data-apparition]') as HTMLElement | null;
		const fragments = Array.from(node.querySelectorAll('[data-fragment]')) as HTMLElement[];
		const anims: Animation[] = [];

		if (apparition) {
			anims.push(
				apparition.animate(
					[
						{ transform: 'scale(1)', opacity: 1 },
						{ transform: 'scale(1.05)', opacity: 0 }
					],
					{ duration: 500, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'forwards' }
				)
			);
		}

		fragments.forEach((fragment, i) => {
			const seed = SCATTER_SEEDS[i] ?? SCATTER_SEEDS[0];
			const x = ghost.direction * seed.xBase + seed.xOffset;
			anims.push(
				fragment.animate(
					[
						{ transform: 'translate(0,0) rotate(0deg) scale(1)', opacity: 1 },
						{
							transform: `translate(${x}px, ${seed.y}px) rotate(${seed.rotation}deg) scale(${seed.scale})`,
							opacity: 0
						}
					],
					{
						duration: seed.duration * 1000,
						easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
						fill: 'forwards'
					}
				)
			);
		});

		const longest = Math.max(...anims.map((a) => Number(a.effect?.getComputedTiming().duration ?? 0)), 500);
		const t = setTimeout(() => removeGhost(ghost.id), Number(longest) + 50);

		return {
			destroy() {
				clearTimeout(t);
				anims.forEach((a) => a.cancel());
			}
		};
	}
</script>

{#if len > 0 && current}
	<div class="dc {className}" bind:this={containerEl}>
		<div class="dc__glow" aria-hidden="true"></div>

		<div class="dc__center">
			<div class="dc__stack" style:transform="scale({cardScale})">
				<div class="dc__frame">
					<div class="dc__ghosts" aria-hidden="true">
						{#each ghosts as ghost (ghost.id)}
							<div class="dc__ghost" use:ghostAction={ghost}>
								<div class="dc__card dc__card--ghost" data-apparition>
									<img src={ghost.item.image} alt="" class="dc__img" />
									<div class="dc__caption">
										<h2 class="dc__title">{ghost.item.title}</h2>
									</div>
								</div>
								{#each SLICES as clip, i (i)}
									<div class="dc__card dc__card--frag" data-fragment style:clip-path={clip}>
										<img src={ghost.item.image} alt="" class="dc__img" />
										<div class="dc__caption">
											<h2 class="dc__title">{ghost.item.title}</h2>
										</div>
									</div>
								{/each}
							</div>
						{/each}
					</div>

					{#key animKey}
						<div
							class="dc__active"
							class:dc__active--from-right={direction > 0}
							class:dc__active--from-left={direction < 0}
						>
							<div class="dc__card">
								<img src={current.image} alt={current.alt ?? current.title} class="dc__img" />
								<div class="dc__caption">
									<h2 class="dc__title">{current.title}</h2>
								</div>
							</div>
						</div>
					{/key}
				</div>

				<div class="dc__controls">
					<div class="dc__dots" role="tablist" aria-label="Carousel slides">
						{#each items as _, idx (idx)}
							<button
								type="button"
								class="dc__dot"
								class:dc__dot--active={idx === currentIndex}
								onclick={() => goTo(idx)}
								aria-label="Go to slide {idx + 1}"
								aria-current={idx === currentIndex ? true : undefined}
							></button>
						{/each}
					</div>

					<div class="dc__arrows">
						<button
							type="button"
							class="dc__arrow"
							onclick={() => handleNavigate(-1)}
							disabled={isAnimating}
							aria-label="Previous card"
						>
							<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M15 6 9 12l6 6" stroke-linecap="round" stroke-linejoin="round" />
							</svg>
						</button>
						<button
							type="button"
							class="dc__arrow"
							onclick={() => handleNavigate(1)}
							disabled={isAnimating}
							aria-label="Next card"
						>
							<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="m9 6 6 6-6 6" stroke-linecap="round" stroke-linejoin="round" />
							</svg>
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.dc {
		position: relative;
		width: 100%;
		height: 100%;
		overflow: hidden;
		background: var(--surface-2, #f5f8fc);
		font-family: var(--body, Inter, system-ui, sans-serif);
		transition: background 0.7s ease;
	}

	.dc__glow {
		position: absolute;
		inset: 0;
		pointer-events: none;
		background: radial-gradient(circle at center, rgba(0, 0, 0, 0.04) 0%, transparent 100%);
	}

	.dc__center {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.dc__stack {
		position: relative;
		z-index: 50;
		display: flex;
		flex-direction: column;
		align-items: center;
		transform-origin: center center;
	}

	.dc__frame {
		position: relative;
		border-radius: 1rem;
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
	}

	.dc__ghosts {
		position: absolute;
		inset: 0;
		z-index: 0;
		pointer-events: none;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.dc__ghost {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		pointer-events: none;
	}

	.dc__active {
		position: relative;
		z-index: 10;
		will-change: transform, opacity, filter;
		animation: dc-enter 1.2s cubic-bezier(0.16, 1, 0.3, 1) both;
		animation-delay: 0.1s;
	}

	.dc__active--from-right {
		--dc-x: -150px;
		--dc-rot: -8deg;
	}

	.dc__active--from-left {
		--dc-x: 150px;
		--dc-rot: 8deg;
	}

	@keyframes dc-enter {
		from {
			transform: translate(var(--dc-x, -150px), 20px) scale(0.85) rotate(var(--dc-rot, -8deg));
			opacity: 0;
			filter: blur(4px);
		}
		to {
			transform: translate(0, 0) scale(1) rotate(0deg);
			opacity: 1;
			filter: blur(0);
		}
	}

	.dc__card {
		position: relative;
		width: 320px;
		height: 480px;
		border-radius: 1rem;
		overflow: hidden;
		background: #111;
	}

	.dc__card--ghost {
		position: absolute;
		z-index: 0;
		mix-blend-mode: darken;
		will-change: transform, opacity;
	}

	.dc__card--frag {
		position: absolute;
		z-index: 10;
		will-change: transform, opacity;
	}

	.dc__img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.dc__caption {
		position: absolute;
		inset-inline: 0;
		bottom: 0;
		padding: 2rem;
	}

	.dc__title {
		margin: 0;
		font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-size: 1.75rem;
		font-weight: 700;
		color: #fff;
		text-shadow: 0 2px 12px rgba(0, 0, 0, 0.45);
	}

	.dc__controls {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2rem;
		margin-top: 2.5rem;
	}

	.dc__dots {
		display: flex;
		gap: 1rem;
	}

	.dc__dot {
		height: 0.375rem;
		width: 0.75rem;
		padding: 0;
		border: 0;
		border-radius: 999px;
		background: rgba(0, 0, 0, 0.2);
		cursor: pointer;
		transition: width 0.5s ease, background 0.5s ease;
	}

	.dc__dot--active {
		width: 2.5rem;
		background: var(--ink, #132234);
	}

	.dc__arrows {
		display: flex;
		justify-content: center;
		gap: 1.5rem;
	}

	.dc__arrow {
		display: grid;
		place-items: center;
		padding: 1rem;
		border-radius: 999px;
		border: 1px solid rgba(0, 0, 0, 0.1);
		background: rgba(0, 0, 0, 0.05);
		color: var(--ink, #132234);
		cursor: pointer;
		backdrop-filter: blur(8px);
		transition: transform 160ms ease, background 160ms ease, opacity 160ms ease;
	}

	.dc__arrow:hover:not(:disabled) {
		transform: scale(1.08);
		background: rgba(0, 0, 0, 0.1);
	}

	.dc__arrow:active:not(:disabled) {
		transform: scale(0.95);
	}

	.dc__arrow:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
