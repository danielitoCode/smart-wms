<script lang="ts">
	/**
	 * InteractiveGridPattern — grid SVG de celdas que se rellenan al hover.
	 * Port Svelte 5 del componente Magic UI / React.
	 */
	interface Props {
		width?: number;
		height?: number;
		/** [horizontal, vertical] number of squares */
		squares?: [number, number];
		class?: string;
		squaresClass?: string;
	}

	let {
		width = 40,
		height = 40,
		squares = [24, 24] as [number, number],
		class: className = '',
		squaresClass = ''
	}: Props = $props();

	const horizontal = $derived(squares[0]);
	const vertical = $derived(squares[1]);
	const total = $derived(horizontal * vertical);
	const svgW = $derived(width * horizontal);
	const svgH = $derived(height * vertical);

	let hoveredSquare = $state<number | null>(null);
</script>

<svg
	width={svgW}
	height={svgH}
	viewBox="0 0 {svgW} {svgH}"
	class="igp {className}"
	aria-hidden="true"
>
	{#each Array.from({ length: total }, (_, i) => i) as index (index)}
		{@const x = (index % horizontal) * width}
		{@const y = Math.floor(index / horizontal) * height}
		{@const isHot = hoveredSquare === index}
		<rect
			{x}
			{y}
			{width}
			{height}
			class="igp-cell {squaresClass}"
			class:igp-cell--hot={isHot}
			onmouseenter={() => (hoveredSquare = index)}
			onmouseleave={() => (hoveredSquare = null)}
		/>
	{/each}
</svg>

<style>
	.igp {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		border: 1px solid color-mix(in srgb, #9ca3af 30%, transparent);
	}

	.igp-cell {
		fill: transparent;
		stroke: color-mix(in srgb, #9ca3af 30%, transparent);
		transition:
			fill 1s ease-in-out,
			stroke 1s ease-in-out;
	}

	.igp-cell--hot {
		fill: color-mix(in srgb, #d1d5db 30%, transparent);
		transition-duration: 100ms;
	}
</style>
