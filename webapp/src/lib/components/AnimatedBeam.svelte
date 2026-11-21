<script lang="ts">
	/**
	 * AnimatedBeam — haz SVG curvo entre dos nodos (estilo Magic UI).
	 * Port Svelte 5 sin motion/react: path Q + gradiente SMIL.
	 */
	import { onMount } from 'svelte';

	interface Props {
		class?: string;
		containerEl?: HTMLElement | null;
		fromEl?: HTMLElement | null;
		toEl?: HTMLElement | null;
		curvature?: number;
		reverse?: boolean;
		pathColor?: string;
		pathWidth?: number;
		pathOpacity?: number;
		gradientStartColor?: string;
		gradientStopColor?: string;
		delay?: number;
		duration?: number;
		startXOffset?: number;
		startYOffset?: number;
		endXOffset?: number;
		endYOffset?: number;
	}

	let {
		class: className = '',
		containerEl = null,
		fromEl = null,
		toEl = null,
		curvature = 0,
		reverse = false,
		pathColor = '#94a3b8',
		pathWidth = 2,
		pathOpacity = 0.2,
		gradientStartColor = '#ffaa40',
		gradientStopColor = '#9c40ff',
		delay = 0,
		duration = 5,
		startXOffset = 0,
		startYOffset = 0,
		endXOffset = 0,
		endYOffset = 0
	}: Props = $props();

	const uid = `ab-${Math.random().toString(36).slice(2, 9)}`;

	let pathD = $state('');
	let svgW = $state(0);
	let svgH = $state(0);

	function updatePath() {
		if (!containerEl || !fromEl || !toEl) {
			pathD = '';
			return;
		}

		const containerRect = containerEl.getBoundingClientRect();
		const rectA = fromEl.getBoundingClientRect();
		const rectB = toEl.getBoundingClientRect();

		svgW = containerRect.width;
		svgH = containerRect.height;

		const startX = rectA.left - containerRect.left + rectA.width / 2 + startXOffset;
		const startY = rectA.top - containerRect.top + rectA.height / 2 + startYOffset;
		const endX = rectB.left - containerRect.left + rectB.width / 2 + endXOffset;
		const endY = rectB.top - containerRect.top + rectB.height / 2 + endYOffset;

		const controlY = startY - curvature;
		const midX = (startX + endX) / 2;
		pathD = `M ${startX},${startY} Q ${midX},${controlY} ${endX},${endY}`;
	}

	onMount(() => {
		updatePath();
		const ro = new ResizeObserver(() => updatePath());
		if (containerEl) ro.observe(containerEl);
		if (fromEl) ro.observe(fromEl);
		if (toEl) ro.observe(toEl);
		window.addEventListener('resize', updatePath);
		return () => {
			ro.disconnect();
			window.removeEventListener('resize', updatePath);
		};
	});

	$effect(() => {
		void containerEl;
		void fromEl;
		void toEl;
		void curvature;
		void startXOffset;
		void startYOffset;
		void endXOffset;
		void endYOffset;
		updatePath();
	});

	const gx1 = reverse ? ['90%', '-10%'] : ['10%', '110%'];
	const gx2 = reverse ? ['100%', '0%'] : ['0%', '100%'];
</script>

<svg
	class="ab {className}"
	fill="none"
	width={svgW}
	height={svgH}
	viewBox="0 0 {svgW} {svgH}"
	xmlns="http://www.w3.org/2000/svg"
	aria-hidden="true"
>
	{#if pathD}
		<path
			d={pathD}
			stroke={pathColor}
			stroke-width={pathWidth}
			stroke-opacity={pathOpacity}
			stroke-linecap="round"
		/>
		<path
			d={pathD}
			stroke="url(#{uid})"
			stroke-width={pathWidth}
			stroke-opacity="1"
			stroke-linecap="round"
		/>
		<defs>
			<linearGradient id={uid} gradientUnits="userSpaceOnUse">
				<stop stop-color={gradientStartColor} stop-opacity="0" />
				<stop stop-color={gradientStartColor} />
				<stop offset="32.5%" stop-color={gradientStopColor} />
				<stop offset="100%" stop-color={gradientStopColor} stop-opacity="0" />
				<animate
					attributeName="x1"
					values="{gx1[0]};{gx1[1]}"
					dur="{duration}s"
					begin="{delay}s"
					repeatCount="indefinite"
					calcMode="spline"
					keySplines="0.16 1 0.3 1"
					keyTimes="0;1"
				/>
				<animate
					attributeName="x2"
					values="{gx2[0]};{gx2[1]}"
					dur="{duration}s"
					begin="{delay}s"
					repeatCount="indefinite"
					calcMode="spline"
					keySplines="0.16 1 0.3 1"
					keyTimes="0;1"
				/>
			</linearGradient>
		</defs>
	{/if}
</svg>

<style>
	.ab {
		pointer-events: none;
		position: absolute;
		top: 0;
		left: 0;
		transform: translateZ(0);
	}

	@media (prefers-reduced-motion: reduce) {
		.ab :global(animate) {
			display: none;
		}
	}
</style>
