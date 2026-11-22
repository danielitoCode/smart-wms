<script lang="ts">
	/**
	 * WarpBackground — caja 3D con rejilla y beams en las caras.
	 * Port Svelte 5 de Magic UI (CSS animation, sin motion/react).
	 */
	import type { Snippet } from 'svelte';

	interface Props {
		children?: Snippet;
		perspective?: number;
		beamsPerSide?: number;
		beamSize?: number;
		beamDelayMax?: number;
		beamDelayMin?: number;
		beamDuration?: number;
		gridColor?: string;
		class?: string;
	}

	let {
		children,
		perspective = 100,
		beamsPerSide = 3,
		beamSize = 5,
		beamDelayMax = 3,
		beamDelayMin = 0,
		beamDuration = 3,
		gridColor = 'color-mix(in srgb, var(--line, #d9e2ec) 70%, transparent)',
		class: className = ''
	}: Props = $props();

	function generateBeams() {
		const cellsPerSide = Math.floor(100 / beamSize);
		const step = cellsPerSide / beamsPerSide;
		const beams: { x: number; delay: number; hue: number; ar: number }[] = [];
		for (let i = 0; i < beamsPerSide; i++) {
			beams.push({
				x: Math.floor(i * step),
				delay: Math.random() * (beamDelayMax - beamDelayMin) + beamDelayMin,
				hue: Math.floor(Math.random() * 360),
				ar: Math.floor(Math.random() * 10) + 1
			});
		}
		return beams;
	}

	const topBeams = generateBeams();
	const rightBeams = generateBeams();
	const bottomBeams = generateBeams();
	const leftBeams = generateBeams();
</script>

<div class="warp {className}">
	<div
		class="warp-scene"
		style="--perspective: {perspective}px; --grid-color: {gridColor}; --beam-size: {beamSize}%;"
	>
		<div class="warp-face warp-face--top">
			{#each topBeams as beam, index (index)}
				<div
					class="warp-beam"
					style="
						--x: {beam.x * beamSize}%;
						--width: {beamSize}%;
						--aspect-ratio: {beam.ar};
						--background: linear-gradient(hsl({beam.hue} 80% 60%), transparent);
						--duration: {beamDuration}s;
						--delay: {beam.delay}s;
					"
				></div>
			{/each}
		</div>
		<div class="warp-face warp-face--bottom">
			{#each bottomBeams as beam, index (index)}
				<div
					class="warp-beam"
					style="
						--x: {beam.x * beamSize}%;
						--width: {beamSize}%;
						--aspect-ratio: {beam.ar};
						--background: linear-gradient(hsl({beam.hue} 80% 60%), transparent);
						--duration: {beamDuration}s;
						--delay: {beam.delay}s;
					"
				></div>
			{/each}
		</div>
		<div class="warp-face warp-face--left">
			{#each leftBeams as beam, index (index)}
				<div
					class="warp-beam"
					style="
						--x: {beam.x * beamSize}%;
						--width: {beamSize}%;
						--aspect-ratio: {beam.ar};
						--background: linear-gradient(hsl({beam.hue} 80% 60%), transparent);
						--duration: {beamDuration}s;
						--delay: {beam.delay}s;
					"
				></div>
			{/each}
		</div>
		<div class="warp-face warp-face--right">
			{#each rightBeams as beam, index (index)}
				<div
					class="warp-beam"
					style="
						--x: {beam.x * beamSize}%;
						--width: {beamSize}%;
						--aspect-ratio: {beam.ar};
						--background: linear-gradient(hsl({beam.hue} 80% 60%), transparent);
						--duration: {beamDuration}s;
						--delay: {beam.delay}s;
					"
				></div>
			{/each}
		</div>
	</div>
	<div class="warp-content">
		{#if children}
			{@render children()}
		{/if}
	</div>
</div>

<style>
	.warp {
		position: relative;
		border-radius: 0.75rem;
		border: 1px solid color-mix(in srgb, var(--line, #d9e2ec) 88%, transparent);
		padding: 5rem;
		overflow: hidden;
		background: color-mix(in srgb, var(--card, #fff) 92%, transparent);
	}

	.warp-scene {
		container-type: size;
		pointer-events: none;
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		overflow: hidden;
		clip-path: inset(0);
		perspective: var(--perspective);
		transform-style: preserve-3d;
	}

	.warp-face {
		container-type: size;
		position: absolute;
		height: 100cqmax;
		background-image:
			linear-gradient(var(--grid-color) 0 1px, transparent 1px var(--beam-size)),
			linear-gradient(90deg, var(--grid-color) 0 1px, transparent 1px var(--beam-size));
		background-size: var(--beam-size) var(--beam-size);
		background-position:
			50% -0.5px,
			50% 50%;
		transform-style: preserve-3d;
	}

	.warp-face--top {
		z-index: 20;
		width: 100cqi;
		top: 0;
		left: 0;
		transform-origin: 50% 0%;
		transform: rotateX(-90deg);
	}

	.warp-face--bottom {
		width: 100cqi;
		top: 100%;
		left: 0;
		transform-origin: 50% 0%;
		transform: rotateX(-90deg);
	}

	.warp-face--left {
		width: 100cqh;
		top: 0;
		left: 0;
		transform-origin: 0% 0%;
		transform: rotate(90deg) rotateX(-90deg);
	}

	.warp-face--right {
		width: 100cqh;
		top: 0;
		right: 0;
		left: auto;
		transform-origin: 100% 0%;
		transform: rotate(-90deg) rotateX(-90deg);
	}

	.warp-beam {
		position: absolute;
		top: 0;
		left: var(--x);
		width: var(--width);
		aspect-ratio: 1 / var(--aspect-ratio);
		background: var(--background);
		transform: translateX(-50%);
		animation: warp-beam-travel var(--duration) linear var(--delay) infinite;
	}

	@keyframes warp-beam-travel {
		from {
			transform: translateX(-50%) translateY(100cqmax);
		}
		to {
			transform: translateX(-50%) translateY(-100%);
		}
	}

	.warp-content {
		position: relative;
		z-index: 1;
	}

	@media (prefers-reduced-motion: reduce) {
		.warp-beam {
			animation: none;
			opacity: 0.35;
		}
	}
</style>
