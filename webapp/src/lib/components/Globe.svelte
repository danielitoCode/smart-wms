<script lang="ts">
	/**
	 * Globe — canvas COBE con rotación inercial y drag.
	 * Port Svelte 5 del componente Magic UI (sin motion/react).
	 * Dependencia: `cobe`
	 */
	import { onMount } from 'svelte';
	import createGlobe, { type COBEOptions } from 'cobe';

	interface Props {
		class?: string;
		config?: Partial<COBEOptions>;
	}

	let { class: className = '', config }: Props = $props();

	const MOVEMENT_DAMPING = 1400;

	const DEFAULT_CONFIG: COBEOptions = {
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
		markerColor: [0 / 255, 76 / 255, 139 / 255],
		glowColor: [1, 1, 1],
		markers: [
			{ location: [40.4168, -3.7038], size: 0.1 },
			{ location: [41.3874, 2.1686], size: 0.07 },
			{ location: [40.7128, -74.006], size: 0.1 },
			{ location: [51.5074, -0.1278], size: 0.08 },
			{ location: [48.8566, 2.3522], size: 0.07 },
			{ location: [19.4326, -99.1332], size: 0.1 },
			{ location: [-23.5505, -46.6333], size: 0.1 },
			{ location: [35.6762, 139.6503], size: 0.08 },
			{ location: [1.3521, 103.8198], size: 0.06 },
			{ location: [25.2048, 55.2708], size: 0.07 }
		]
	};

	let canvasEl = $state<HTMLCanvasElement | null>(null);
	let ready = $state(false);

	onMount(() => {
		if (!canvasEl) return;

		let width = canvasEl.offsetWidth;
		let phi = 0;
		let pointerInteracting: number | null = null;

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

		const merged: COBEOptions = {
			...DEFAULT_CONFIG,
			...config,
			width: width * 2,
			height: width * 2,
			onRender: (state) => {
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
		};

		const globe = createGlobe(canvasEl, merged);

		const updateCursor = (grabbing: boolean) => {
			if (canvasEl) canvasEl.style.cursor = grabbing ? 'grabbing' : 'grab';
		};

		const onPointerDown = (e: PointerEvent) => {
			pointerInteracting = e.clientX;
			updateCursor(true);
			canvasEl?.setPointerCapture(e.pointerId);
		};
		const onPointerUp = (e: PointerEvent) => {
			pointerInteracting = null;
			updateCursor(false);
			try {
				canvasEl?.releasePointerCapture(e.pointerId);
			} catch {
				/* ignore */
			}
		};
		const onPointerMove = (e: PointerEvent) => {
			if (pointerInteracting === null) return;
			const delta = e.clientX - pointerInteracting;
			rTarget = rTarget + delta / MOVEMENT_DAMPING;
			pointerInteracting = e.clientX;
		};

		canvasEl.addEventListener('pointerdown', onPointerDown);
		canvasEl.addEventListener('pointerup', onPointerUp);
		canvasEl.addEventListener('pointercancel', onPointerUp);
		canvasEl.addEventListener('pointermove', onPointerMove);
		canvasEl.addEventListener('pointerout', onPointerUp);

		requestAnimationFrame(() => {
			ready = true;
		});

		return () => {
			globe.destroy();
			window.removeEventListener('resize', onResize);
			canvasEl?.removeEventListener('pointerdown', onPointerDown);
			canvasEl?.removeEventListener('pointerup', onPointerUp);
			canvasEl?.removeEventListener('pointercancel', onPointerUp);
			canvasEl?.removeEventListener('pointermove', onPointerMove);
			canvasEl?.removeEventListener('pointerout', onPointerUp);
		};
	});
</script>

<div class="globe {className}">
	<canvas
		bind:this={canvasEl}
		class="globe-canvas"
		class:globe-canvas--ready={ready}
		aria-label="Globo interactivo de ubicaciones"
	></canvas>
</div>

<style>
	.globe {
		position: relative;
		margin-left: auto;
		margin-right: auto;
		aspect-ratio: 1;
		width: 100%;
		max-width: 37.5rem;
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
