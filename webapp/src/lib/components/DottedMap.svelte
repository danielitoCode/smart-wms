<script lang="ts">
	/**
	 * DottedMap — mapa SVG de puntos con marcadores (svg-dotted-map).
	 * Port Svelte 5 del componente Magic UI / React.
	 * Dependencia: `svg-dotted-map`
	 */
	import { createMap } from 'svg-dotted-map';
	import type { Snippet } from 'svelte';

	export type Marker = {
		lat: number;
		lng: number;
		size?: number;
		pulse?: boolean;
	};

	type MapMarker = Omit<Marker, 'lat' | 'lng'> & { x: number; y: number };

	interface Props {
		width?: number;
		height?: number;
		mapSamples?: number;
		markers?: Marker[];
		dotColor?: string;
		markerColor?: string;
		dotRadius?: number;
		stagger?: boolean;
		pulse?: boolean;
		class?: string;
		style?: string;
		markerOverlay?: Snippet<
			[{ marker: MapMarker; index: number; x: number; y: number; r: number }]
		>;
	}

	let {
		width = 150,
		height = 75,
		mapSamples = 5000,
		markers = [],
		dotColor = 'currentColor',
		markerColor = '#004c8b',
		dotRadius = 0.2,
		stagger = true,
		pulse = false,
		class: className = '',
		style = '',
		markerOverlay
	}: Props = $props();

	const { points, addMarkers } = $derived.by(() => createMap({ width, height, mapSamples }));

	const processedMarkers = $derived(addMarkers(markers));

	const { xStep, yToRowIndex } = $derived.by(() => {
		const sorted = [...points].sort((a, b) => a.y - b.y || a.x - b.x);
		const rowMap = new Map<number, number>();
		let step = 0;
		let prevY = Number.NaN;
		let prevXInRow = Number.NaN;

		for (const p of sorted) {
			if (p.y !== prevY) {
				prevY = p.y;
				prevXInRow = Number.NaN;
				if (!rowMap.has(p.y)) rowMap.set(p.y, rowMap.size);
			}
			if (!Number.isNaN(prevXInRow)) {
				const delta = p.x - prevXInRow;
				if (delta > 0) step = step === 0 ? delta : Math.min(step, delta);
			}
			prevXInRow = p.x;
		}

		return { xStep: step || 1, yToRowIndex: rowMap };
	});

	function offsetX(y: number) {
		const rowIndex = yToRowIndex.get(y) ?? 0;
		return stagger && rowIndex % 2 === 1 ? xStep / 2 : 0;
	}
</script>

<svg
	viewBox="0 0 {width} {height}"
	class="dm {className}"
	style="width: 100%; height: 100%; {style}"
	aria-hidden="true"
>
	{#each points as point, index (`${point.x}-${point.y}-${index}`)}
		<circle cx={point.x + offsetX(point.y)} cy={point.y} r={dotRadius} fill={dotColor} />
	{/each}

	{#each processedMarkers as marker, index (`${marker.x}-${marker.y}-${index}`)}
		{@const ox = offsetX(marker.y)}
		{@const x = marker.x + ox}
		{@const y = marker.y}
		{@const r = marker.size ?? dotRadius}
		{@const shouldPulse = pulse ? marker.pulse !== false : marker.pulse === true}
		{@const pulseTo = r * 2.8}
		<g>
			<circle cx={x} cy={y} {r} fill={markerColor} />
			{#if shouldPulse}
				<g pointer-events="none">
					<circle cx={x} cy={y} {r} fill="none" stroke={markerColor} stroke-opacity="1" stroke-width="0.35">
						<animate attributeName="r" values="{r};{pulseTo}" dur="1.4s" repeatCount="indefinite" />
						<animate attributeName="opacity" values="1;0" dur="1.4s" repeatCount="indefinite" />
					</circle>
					<circle cx={x} cy={y} {r} fill="none" stroke={markerColor} stroke-opacity="0.9" stroke-width="0.3">
						<animate
							attributeName="r"
							values="{r};{pulseTo}"
							dur="1.4s"
							begin="0.7s"
							repeatCount="indefinite"
						/>
						<animate
							attributeName="opacity"
							values="0.9;0"
							dur="1.4s"
							begin="0.7s"
							repeatCount="indefinite"
						/>
					</circle>
				</g>
			{/if}
			{#if markerOverlay}
				{@render markerOverlay({ marker: { ...marker, x, y }, index, x, y, r })}
			{/if}
		</g>
	{/each}
</svg>

<style>
	.dm {
		color: #6b7280;
		display: block;
	}

	:global(.dark) .dm,
	:global(html.dark) .dm {
		color: #6b7280;
	}

	@media (prefers-reduced-motion: reduce) {
		.dm :global(animate) {
			display: none;
		}
	}
</style>
