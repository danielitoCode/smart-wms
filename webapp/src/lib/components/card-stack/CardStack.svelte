<script lang="ts" generics="T extends { id: string }">
	/**
	 * CardStack — pila de cards con promote, throw-out y autoplay.
	 * Port Svelte 5 (CSS transitions; sin Motion).
	 */
	import type { Snippet } from 'svelte';
	import { getPrefersReducedMotion } from './prefersReducedMotion.svelte';

	interface Layer {
		y: string;
		scale: number;
		rotate: number;
		zIndex: number;
	}

	interface Props {
		items: T[];
		depth?: number;
		autoplay?: boolean;
		autoplayInterval?: number;
		class?: string;
		children: Snippet<[T, number, Layer]>;
	}

	let {
		items,
		depth = 3,
		autoplay = false,
		autoplayInterval = 4500,
		class: className = '',
		children
	}: Props = $props();

	const PRESETS: Layer[] = [
		{ y: '0%', scale: 1, rotate: 0, zIndex: 20 },
		{ y: '-5%', scale: 0.84, rotate: -1, zIndex: 5 },
		{ y: '-7.5%', scale: 0.72, rotate: 1, zIndex: 0 }
	];

	const stackDepth = $derived(Math.min(Math.max(1, depth), PRESETS.length));
	const reducedMotion = $derived(getPrefersReducedMotion());

	let list = $state<T[]>([...items]);
	let isAnimating = $state(false);
	let pressActive = $state(false);
	let exitingId = $state<string | null>(null);
	let throwX = $state('0%');
	let throwRotate = $state(0);

	$effect(() => {
		list = [...items];
		isAnimating = false;
		exitingId = null;
	});

	const visible = $derived(list.slice(0, stackDepth));

	function createThrow() {
		const drift = Math.random() - 0.5;
		throwX = `${(drift * 7).toFixed(2)}%`;
		throwRotate = drift * 6 + (Math.random() - 0.5) * 1.5;
	}

	function rotateOne() {
		if (list.length <= 1) return;
		const next = [...list];
		next.push(next.shift()!);
		list = next;
	}

	const STEP_MS = 280;

	function advance() {
		if (list.length <= 1 || isAnimating) return;

		if (reducedMotion) {
			rotateOne();
			return;
		}

		isAnimating = true;
		createThrow();
		const top = list[0];
		exitingId = top?.id ?? null;

		window.setTimeout(() => {
			rotateOne();
			exitingId = null;
			isAnimating = false;
		}, STEP_MS);
	}

	$effect(() => {
		if (!autoplay || reducedMotion || list.length <= 1) return;
		if (typeof document !== 'undefined' && document.hidden) return;

		const id = window.setTimeout(() => {
			advance();
		}, autoplayInterval);

		return () => clearTimeout(id);
	});

	function onPointerDown() {
		if (!isAnimating && !reducedMotion) pressActive = true;
	}
	function onPointerUp() {
		pressActive = false;
	}
	function onClick() {
		advance();
	}
	function onKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			advance();
		}
	}
</script>

<div class="cs {className}">
	<div class="cs-viewport">
		{#each visible as item, index (item.id)}
			{@const layer = PRESETS[index]!}
			{@const isTop = index === 0}
			{@const isExiting = exitingId === item.id}
			{@const pressed = isTop && pressActive && !isAnimating && !reducedMotion}
			<div
				class="cs-card"
				class:cs-card--exit={isExiting}
				class:cs-card--press={pressed}
				class:cs-card--rm={reducedMotion}
				style:--cs-y={layer.y}
				style:--cs-scale={layer.scale}
				style:--cs-rotate="{layer.rotate}deg"
				style:--cs-z={layer.zIndex}
				style:--cs-throw-x={throwX}
				style:--cs-throw-r="{throwRotate}deg"
				aria-roledescription="Card {index + 1} of {stackDepth}"
			>
				{@render children(item, index, layer)}
			</div>
		{/each}

		<button
			type="button"
			class="cs-hit"
			aria-label="Show next card"
			onpointerdown={onPointerDown}
			onpointerup={onPointerUp}
			onpointerleave={onPointerUp}
			onpointercancel={onPointerUp}
			onclick={onClick}
			onkeydown={onKeyDown}
		></button>
	</div>
</div>

<style>
	.cs {
		width: 100%;
		max-width: 22rem;
	}

	.cs-viewport {
		position: relative;
		width: 100%;
		padding-top: 12%;
		overflow: visible;
	}

	.cs-card {
		position: absolute;
		inset-inline: 0;
		top: 0;
		width: 100%;
		transform-origin: 50% 0%;
		z-index: var(--cs-z, 0);
		transform: translateY(var(--cs-y, 0%)) scale(var(--cs-scale, 1)) rotate(var(--cs-rotate, 0deg));
		transition:
			transform 220ms cubic-bezier(0.22, 1, 0.36, 1),
			opacity 160ms ease;
		will-change: transform, opacity;
	}

	.cs-card--press {
		transform: translateY(var(--cs-y, 0%)) scale(calc(var(--cs-scale, 1) * 0.985))
			rotate(var(--cs-rotate, 0deg));
		transition-duration: 100ms;
	}

	.cs-card--exit {
		z-index: 30;
		opacity: 0;
		transform: translateY(200%) translateX(var(--cs-throw-x, 0%)) scale(0.9)
			rotate(var(--cs-throw-r, 0deg));
		transition:
			transform 240ms cubic-bezier(0.22, 1, 0.36, 1),
			opacity 160ms ease;
		pointer-events: none;
	}

	.cs-card--rm {
		transition: none !important;
	}

	.cs-hit {
		position: absolute;
		inset: 0;
		z-index: 40;
		border: 0;
		padding: 0;
		margin: 0;
		background: transparent;
		cursor: pointer;
		outline: none;
	}

	.cs-hit:focus-visible {
		box-shadow: inset 0 0 0 2px var(--navy, #004c8b);
		border-radius: 12px;
	}

	@media (prefers-reduced-motion: reduce) {
		.cs-card {
			transition: none;
		}
	}
</style>
