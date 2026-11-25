<script lang="ts">
	/**
	 * Progress Image — rollout card whose photograph is the progress bar.
	 * Svelte 5 port. Full engine in progress-image-engine.ts
	 * Source also in artifacts/ProgressImage.svelte
	 */
	import { onMount } from 'svelte';
	import './progress-image.css';
	import { createRevealEngine, type RevealFx } from './progress-image-engine';

	export type ProgressImageProps = {
		theme?: 'light' | 'dark';
		src?: string;
		alt?: string;
		defaultValue?: number;
		defaultFx?: RevealFx;
	};

	let {
		theme = 'light',
		src = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1200&q=80',
		alt = 'Mountain landscape',
		defaultValue = 100,
		defaultFx = 'pixel'
	}: ProgressImageProps = $props();

	let value = $state(defaultValue);
	let fx = $state<RevealFx>(defaultFx);
	let canvas: HTMLCanvasElement | null = $state(null);
	let slider: HTMLInputElement | null = $state(null);
	let engine: ReturnType<typeof createRevealEngine> | null = null;

	const FX_LIST: { id: RevealFx; label: string }[] = [
		{ id: 'pixel', label: 'Pixel' },
		{ id: 'fog', label: 'Fog' },
		{ id: 'sketch', label: 'Sketch' },
		{ id: 'halftone', label: 'Halftone' },
		{ id: 'dissolve', label: 'Dissolve' },
		{ id: 'ink', label: 'Ink' }
	];

	function setValue(v: number) {
		value = Math.max(0, Math.min(100, Math.round(v)));
		engine?.setProgress(value / 100);
	}

	function setFx(next: RevealFx) {
		fx = next;
		engine?.setFx(next);
	}

	onMount(() => {
		if (!canvas) return;
		engine = createRevealEngine(canvas, { src, fx, progress: value / 100 });
		return () => engine?.destroy();
	});

	$effect(() => {
		engine?.setProgress(value / 100);
	});
</script>

<div class="ppimg" data-theme={theme}>
	<div class="ppimg__card">
		<canvas bind:this={canvas} class="ppimg__canvas" aria-label={alt}></canvas>
		<div class="ppimg__meta">
			<span class="ppimg__pct">{value}%</span>
			<span class="ppimg__fx-label">{FX_LIST.find((f) => f.id === fx)?.label}</span>
		</div>
		<input
			bind:this={slider}
			type="range"
			min="0"
			max="100"
			step="1"
			value={value}
			class="ppimg__slider"
			aria-label="Reveal progress"
			oninput={(e) => setValue(Number(e.currentTarget.value))}
		/>
	</div>
	<div class="ppimg__fx" role="radiogroup" aria-label="Reveal effect">
		{#each FX_LIST as item}
			<button
				type="button"
				class="ppimg__fx-btn"
				role="radio"
				aria-checked={fx === item.id}
				onclick={() => setFx(item.id)}
			>
				{item.label}
			</button>
		{/each}
	</div>
</div>
