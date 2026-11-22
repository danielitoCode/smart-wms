<script lang="ts">
	/**
	 * Globe — canvas COBE con rotación inercial y drag.
	 * Port Svelte 5 de Magic UI / React (sin motion/react).
	 * Dependencia: `cobe`
	 */
	import { onMount } from 'svelte';
	import createGlobe, { type COBEOptions } from 'cobe';

	type GlobeRenderState = { phi: number; width: number; height: number };
	type InteractiveCOBEOptions = COBEOptions & { onRender?: (state: GlobeRenderState) => void };

	interface Props {
		class?: string;
		config?: InteractiveCOBEOptions;
	}

	let { class: className = '', config }: Props = $props();

	const MOVEMENT_DAMPING = 1400;

	/** Config por defecto — alineada con el componente React de referencia. */
	const GLOBE_CONFIG: InteractiveCOBEOptions = {
		width: 800,
		height: 800,
		onRender: () => {},
		devicePixelRatio: 2,
		phi: 0,
		theta: 0.3,
		dark: 0,
		diffuse: 0.4,
		mapSamples: 16000,
		mapBrightness: 1.2,
		baseColor: [1, 1, 1],
		markerColor: [251 / 255, 100 / 255, 21 / 255],
		glowColor: [1, 1, 1],
		markers: [
			{ location: [14.5995, 120.9842], size: 0.03 },
			{ location: [19.076, 72.8777], size: 0.1 },
			{ location: [23.8103, 90.4125], size: 0.05 },
			{ location: [30.0444, 31.2357], size: 0.07 },
			{ location: [39.9042, 116.4074], size: 0.08 },
			{ location: [-23.5505, -46.6333], size: 0.1 },
			{ location: [19.4326, -99.1332], size: 0.1 },
			{ location: [40.7128, -74.006], size: 0.1 },
			{ location: [34.6937, 135.5022], size: 0.05 },
			{ location: [41.0082, 28.9784], size: 0.06 }
		]
	};

	let canvasEl = $state<HTMLCanvasElement | null>(null);
	let ready = $state(false);

	onMount(() => {
		if (!canvasEl) return;

		let width = canvasEl.offsetWidth;
		let phi = 0;
		let pointerInteracting: number | null = null;

		// Spring (useMotionValue + useSpring: mass 1, damping 30, stiffness 100)
		let r = 0;
		let rTarget = 0;
		let rVel = 0;
		const mass = 1;
		const damping = 30;
		const stiffness = 100;

		const onResize = () => {
			if (canvasEl) width = canvasEl.offsetWidth;
		};
		window.addEventListener('resize', onResize);
		onResize();

		const base = config ?? GLOBE_CONFIG;

		const globe = createGlobe(canvasEl, {
			...base,
			width: width * 2,
			height: width * 2,
			onRender: (state: GlobeRenderState) => {
				const force = -stiffness * (r - rTarget);
				const damp = -damping * rVel;
				rVel += (force + damp) / mass / 60;
				r += rVel / 60;

				if (pointerInteracting === null) {
					phi += 0.005;
				}
				state.phi = phi + r;
				state.width = width * 2;
				state.height = width * 2;
			}
		} as COBEOptions);

		const setCursor = (grabbing: boolean) => {
			if (canvasEl) canvasEl.style.cursor = grabbing ? 'grabbing' : 'grab';
		};

		const updatePointerInteraction = (value: number | null) => {
			pointerInteracting = value;
			setCursor(value !== null);
		};

		const updateMovement = (clientX: number) => {
			if (pointerInteracting === null) return;
			const delta = clientX - pointerInteracting;
			// Incremental: ancla en cada move (evita acumulación del original)
			rTarget = rTarget + delta / MOVEMENT_DAMPING;
			pointerInteracting = clientX;
		};

		const onPointerDown = (e: PointerEvent) => {
			updatePointerInteraction(e.clientX);
			try {
				canvasEl?.setPointerCapture(e.pointerId);
			} catch {
				/* ignore */
			}
		};
		const onPointerUp = (e: PointerEvent) => {
			updatePointerInteraction(null);
			try {
				canvasEl?.releasePointerCapture(e.pointerId);
			} catch {
				/* ignore */
			}
		};
		const onPointerMove = (e: PointerEvent) => {
			updateMovement(e.clientX);
		};

		canvasEl.addEventListener('pointerdown', onPointerDown);
		canvasEl.addEventListener('pointerup', onPointerUp);
		canvasEl.addEventListener('pointercancel', onPointerUp);
		canvasEl.addEventListener('pointerout', onPointerUp);
		canvasEl.addEventListener('pointermove', onPointerMove);

		requestAnimationFrame(() => {
			ready = true;
		});

		return () => {
			globe.destroy();
			window.removeEventListener('resize', onResize);
			canvasEl?.removeEventListener('pointerdown', onPointerDown);
			canvasEl?.removeEventListener('pointerup', onPointerUp);
			canvasEl?.removeEventListener('pointercancel', onPointerUp);
			canvasEl?.removeEventListener('pointerout', onPointerUp);
			canvasEl?.removeEventListener('pointermove', onPointerMove);
		};
	});
</script>

<div class="globe {className}">
	<canvas
		bind:this={canvasEl}
		class="globe-canvas"
		class:globe-canvas--ready={ready}
		aria-label="Globo interactivo"
	></canvas>
</div>

<style>
	.globe {
		position: absolute;
		inset: 0;
		margin-left: auto;
		margin-right: auto;
		aspect-ratio: 1;
		width: 100%;
		max-width: 37.5rem; /* max-w-150 */
	}

	.globe-canvas {
		width: 100%;
		height: 100%;
		opacity: 0;
		cursor: grab;
		contain: layout paint size;
		transition: opacity 0.5s ease;
		touch-action: none;
	}

	.globe-canvas--ready {
		opacity: 1;
	}
</style>
