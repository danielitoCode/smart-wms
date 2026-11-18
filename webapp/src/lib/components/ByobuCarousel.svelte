<script lang="ts">
	/**
	 * ByobuCarousel — 3D folded-panel (byōbu) infinite carousel.
	 * Migrated from React to Svelte 5. Same RAF physics (friction, drag, fold curve).
	 *
	 * Uso:
	 *   <ByobuCarousel items={items} autoplay />
	 */
	import type { ByobuItem } from './byobuCarousel.types';

	const HALF_WINDOW = 8;
	const FRICTION = 0.94;
	const VELOCITY_STOP = 0.0001;
	const KEY_STEP = 1;
	const FOLD_FALLOFF_SIGMA2 = 1.2;
	const FOLD_MIN_RATIO = 0.4;
	const FOLD_MAX_RATIO = 1.0;

	interface Props {
		items: ByobuItem[];
		panelWidth?: number;
		panelHeight?: number;
		foldAngle?: number;
		perspective?: number;
		background?: string;
		borderColor?: string;
		showLabels?: boolean;
		vignette?: boolean;
		autoplay?: boolean;
		autoplaySpeed?: number;
		class?: string;
		ariaLabel?: string;
	}

	let {
		items,
		panelWidth = 240,
		panelHeight = 380,
		foldAngle = 32,
		perspective = 850,
		background = '#0a0a0a',
		borderColor = 'rgba(255,255,255,0.08)',
		showLabels = true,
		vignette = true,
		autoplay = false,
		autoplaySpeed = 0.25,
		class: className = '',
		ariaLabel = 'Folded panel carousel'
	}: Props = $props();

	const slotCount = HALF_WINDOW * 2 + 1;

	let containerEl = $state<HTMLDivElement | null>(null);
	let slotEls: (HTMLDivElement | null)[] = [];
	let containerW = $state(0);

	/** Mutable RAF physics (not a Svelte rune — name must not be `state`). */
	const physics = {
		scroll: 0,
		velocity: 0,
		isDragging: false,
		pointerId: -1,
		lastPointerX: 0,
		lastPointerTime: 0,
		hovering: false,
		reducedMotion: false
	};

	let projW = panelWidth * Math.cos((foldAngle * Math.PI) / 180);

	function slotAction(node: HTMLDivElement, k: number) {
		slotEls[k] = node;
		return {
			destroy() {
				slotEls[k] = null;
			}
		};
	}

	$effect(() => {
		for (const it of items) {
			const img = new Image();
			img.src = it.image;
		}
	});

	$effect(() => {
		if (typeof window === 'undefined') return;
		const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
		const update = () => {
			physics.reducedMotion = mq.matches;
		};
		update();
		mq.addEventListener('change', update);
		return () => mq.removeEventListener('change', update);
	});

	$effect(() => {
		const el = containerEl;
		if (!el) return;
		const measure = () => {
			containerW = el.getBoundingClientRect().width;
		};
		measure();
		const ro = new ResizeObserver(measure);
		ro.observe(el);
		return () => ro.disconnect();
	});

	$effect(() => {
		const w = containerW;
		const itemCount = items.length;
		if (w === 0 || itemCount === 0) return;

		let rafId = 0;
		let lastTs = performance.now();
		const slots = slotEls;
		const localItems = items;
		const pw = panelWidth;
		const fa = foldAngle;
		const ap = autoplay;
		const apSpeed = autoplaySpeed;

		const tick = (ts: number) => {
			const dt = Math.min(50, ts - lastTs);
			lastTs = ts;
			const s = physics;

			if (!s.isDragging) {
				s.scroll += s.velocity * dt;
				s.velocity *= Math.pow(FRICTION, dt / 16);
				if (Math.abs(s.velocity) < VELOCITY_STOP) {
					if (ap && !s.hovering && !s.reducedMotion) {
						s.velocity = apSpeed / 1000;
					} else {
						s.velocity = 0;
					}
				}
			}

			const baseAngleRad = (fa * Math.PI) / 180;
			const baseProjW = pw * Math.cos(baseAngleRad);
			const baseDepthZ = (pw * Math.sin(baseAngleRad)) / 3;
			const recessionPerPanel = pw * 0.16;
			projW = baseProjW;

			const startVi = Math.floor(s.scroll) - HALF_WINDOW;

			for (let k = 0; k < slotCount; k++) {
				const node = slots[k];
				if (!node) continue;
				const vi = startVi + k;
				const domIdx = ((vi % itemCount) + itemCount) % itemCount;
				const parity = (((vi % 2) + 2) % 2) as 0 | 1;
				const item = localItems[domIdx];

				if (node.dataset.idx !== String(domIdx)) {
					node.dataset.idx = String(domIdx);
					const img = node.firstElementChild as HTMLImageElement | null;
					if (img && img.tagName === 'IMG') {
						if (img.src !== item.image) img.src = item.image;
						img.alt = item.alt ?? '';
					}
					const labelEl = node.querySelector('[data-label]') as HTMLElement | null;
					if (labelEl) labelEl.textContent = item.label ?? '';
				}

				if (node.dataset.parity !== String(parity)) {
					node.dataset.parity = String(parity);
					const shade = node.querySelector('[data-shade]') as HTMLElement | null;
					if (shade) {
						shade.style.background =
							parity === 0
								? 'linear-gradient(90deg, transparent 0%, transparent 50%, rgba(0,0,0,0.45) 100%)'
								: 'linear-gradient(90deg, rgba(0,0,0,0.45) 0%, transparent 50%, transparent 100%)';
					}
				}

				const dist = vi - s.scroll;
				const flatness = Math.exp(-(dist * dist) / FOLD_FALLOFF_SIGMA2);
				const ratio = FOLD_MIN_RATIO + (FOLD_MAX_RATIO - FOLD_MIN_RATIO) * (1 - flatness);
				const sign = parity === 0 ? 1 : -1;
				const rot = sign * fa * ratio;
				const tx = dist * baseProjW;
				const parityZ = parity === 0 ? 0 : baseDepthZ;
				const recession = -Math.abs(dist) * recessionPerPanel;
				const tz = parityZ + recession;
				node.style.transform = `translate3d(${tx}px, 0, ${tz}px) rotateY(${rot}deg)`;
			}

			rafId = requestAnimationFrame(tick);
		};

		rafId = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(rafId);
	});

	function onPointerDown(e: PointerEvent) {
		const s = physics;
		s.isDragging = true;
		s.pointerId = e.pointerId;
		s.lastPointerX = e.clientX;
		s.lastPointerTime = performance.now();
		s.velocity = 0;
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	}

	function onPointerMove(e: PointerEvent) {
		const s = physics;
		if (!s.isDragging) return;
		const dx = e.clientX - s.lastPointerX;
		const now = performance.now();
		const dt = Math.max(1, now - s.lastPointerTime);
		s.lastPointerX = e.clientX;
		s.lastPointerTime = now;
		const w = projW || 1;
		s.scroll -= dx / w;
		const inst = -dx / w / dt;
		s.velocity = s.velocity * 0.7 + inst * 0.3;
	}

	function onPointerUp(e: PointerEvent) {
		const s = physics;
		if (!s.isDragging) return;
		s.isDragging = false;
		try {
			(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
		} catch {
			/* ignore */
		}
	}

	function onKeyDown(e: KeyboardEvent) {
		const s = physics;
		if (e.key === 'ArrowLeft') {
			s.scroll -= KEY_STEP;
			s.velocity = 0;
			e.preventDefault();
		} else if (e.key === 'ArrowRight') {
			s.scroll += KEY_STEP;
			s.velocity = 0;
			e.preventDefault();
		}
	}
</script>

{#if items.length > 0}
	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<div
		class="byobu {className}"
		bind:this={containerEl}
		style:background
		style:--byobu-border={borderColor}
		style:--byobu-panel-w="{panelWidth}px"
		style:--byobu-panel-h="{panelHeight}px"
		onpointerdown={onPointerDown}
		onpointermove={onPointerMove}
		onpointerup={onPointerUp}
		onpointercancel={onPointerUp}
		onmouseenter={() => {
			physics.hovering = true;
		}}
		onmouseleave={() => {
			physics.hovering = false;
		}}
		onkeydown={onKeyDown}
		tabindex="0"
		role="region"
		aria-roledescription="carousel"
		aria-label={ariaLabel}
	>
		<div class="byobu__stage" style:perspective="{perspective}px" aria-hidden="true">
			<div class="byobu__track" style:height="{panelHeight}px">
				{#each Array(slotCount) as _, k (k)}
					{@const initialVi = k - HALF_WINDOW}
					{@const initialIdx = ((initialVi % items.length) + items.length) % items.length}
					{@const initialItem = items[initialIdx]}
					<div
						class="byobu__panel"
						style:width="{panelWidth}px"
						style:height="{panelHeight}px"
						style:margin-left="{-panelWidth / 2}px"
						style:border-left="1px solid {borderColor}"
						style:border-right="1px solid {borderColor}"
						use:slotAction={k}
					>
						<img
							src={initialItem.image}
							alt={initialItem.alt ?? ''}
							draggable="false"
							class="byobu__img"
						/>
						<div data-shade class="byobu__shade"></div>
						{#if showLabels}
							<div data-label class="byobu__label">{initialItem.label ?? ''}</div>
						{/if}
					</div>
				{/each}
			</div>
		</div>

		{#if vignette}
			<div
				class="byobu__vignette byobu__vignette--l"
				style:background="linear-gradient(to right, {background}, transparent)"
				aria-hidden="true"
			></div>
			<div
				class="byobu__vignette byobu__vignette--r"
				style:background="linear-gradient(to left, {background}, transparent)"
				aria-hidden="true"
			></div>
		{/if}
	</div>
{/if}

<style>
	.byobu {
		position: relative;
		width: 100%;
		height: 100%;
		overflow: clip;
		touch-action: none;
		user-select: none;
		cursor: grab;
		outline: none;
	}

	.byobu:active {
		cursor: grabbing;
	}

	.byobu:focus-visible {
		box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.4);
	}

	.byobu__stage {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		perspective-origin: 50% 50%;
	}

	.byobu__track {
		position: relative;
		width: 100%;
		transform-style: preserve-3d;
	}

	.byobu__panel {
		position: absolute;
		top: 0;
		left: 50%;
		overflow: clip;
		transform-origin: 50% 50%;
		backface-visibility: hidden;
		will-change: transform;
		box-shadow: 0 30px 60px -20px rgba(0, 0, 0, 0.6);
		transform: translate3d(-99999px, 0, 0);
	}

	.byobu__img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		pointer-events: none;
	}

	.byobu__shade {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	.byobu__label {
		position: absolute;
		inset-inline: 0;
		bottom: 0;
		padding: 0.75rem;
		font-size: 0.75rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.95);
		background: linear-gradient(to top, rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.3), transparent);
		pointer-events: none;
	}

	.byobu__label:empty {
		display: none;
	}

	@media (min-width: 768px) {
		.byobu__label {
			font-size: 0.875rem;
		}
	}

	.byobu__vignette {
		position: absolute;
		inset-block: 0;
		width: 20%;
		pointer-events: none;
	}

	.byobu__vignette--l {
		left: 0;
	}

	.byobu__vignette--r {
		right: 0;
	}
</style>
