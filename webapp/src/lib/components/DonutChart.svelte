<script lang="ts" module>
	/**
	 * DonutChart — rounded share segments with center readout + legend (beUI-inspired).
	 * Svelte 5 + SVG. No motion/react. MIT-style port for Smart WMS lab.
	 */
	export interface DonutSegment {
		id: string;
		name: string;
		color: string;
		/** Nonnegative. Zero / invalid values are left out of the ring. */
		value: number;
	}

	export type PlacedSegment = DonutSegment & {
		share: number;
		path: string;
	};

	export interface DonutChartProps {
		segments: DonutSegment[];
		/** Ring thickness in viewBox units (chart is 200 wide). Default 22. */
		thickness?: number;
		/** Degrees of empty space between neighbouring segments. Default 3. */
		gap?: number;
		activeId?: string | null;
		defaultActiveId?: string | null;
		onActiveChange?: (id: string | null) => void;
		onSelect?: (id: string) => void;
		selectedId?: string | null;
		formatValue?: (value: number) => string;
		label?: string;
		totalLabel?: string;
		class?: string;
	}

	export const DONUT_SIZE = 200;
	const CENTER = DONUT_SIZE / 2;

	const defaultFormat = (value: number) =>
		value.toLocaleString('en-US', { maximumFractionDigits: 0 });

	function point(radius: number, degrees: number): [number, number] {
		const radians = (degrees * Math.PI) / 180;
		return [CENTER + radius * Math.sin(radians), CENTER - radius * Math.cos(radians)];
	}

	/**
	 * Lays segments clockwise from 12 o'clock as round-capped arcs.
	 * Each arc is shortened by the gap plus its own cap so neighbouring
	 * pills keep an even gap. A single segment becomes a full ring.
	 */
	export function buildDonut(
		segments: readonly DonutSegment[],
		{ radius, thickness, gap }: { radius: number; thickness: number; gap: number }
	) {
		const valid = segments.filter((s) => Number.isFinite(s.value) && s.value > 0);
		const total = valid.reduce((sum, s) => sum + s.value, 0);
		const capDegrees = (thickness / 2 / radius) * (180 / Math.PI);
		const single = valid.length === 1;
		let cursor = 0;
		const placed: PlacedSegment[] = valid.map((segment) => {
			const share = total ? segment.value / total : 0;
			const sweep = share * 360;
			const inset = single ? 0 : gap / 2 + capDegrees;
			const start = cursor + inset;
			const end = Math.max(start + 0.01, cursor + sweep - inset);
			cursor += sweep;
			let path: string;
			if (single) {
				const [x1, y1] = point(radius, 0);
				const [x2, y2] = point(radius, 180);
				path = `M ${x1} ${y1} A ${radius} ${radius} 0 1 1 ${x2} ${y2} A ${radius} ${radius} 0 1 1 ${x1} ${y1}`;
			} else {
				const [x1, y1] = point(radius, start);
				const [x2, y2] = point(radius, end);
				path = `M ${x1} ${y1} A ${radius} ${radius} 0 ${end - start > 180 ? 1 : 0} 1 ${x2} ${y2}`;
			}
			return { ...segment, share, path };
		});
		return { placed, total };
	}
</script>

<script lang="ts">
	import { onMount } from 'svelte';

	let {
		segments,
		thickness = 22,
		gap = 3,
		activeId,
		defaultActiveId = null,
		onActiveChange,
		onSelect,
		selectedId = null,
		formatValue = defaultFormat,
		label = 'Donut chart',
		totalLabel = 'Total',
		class: className = ''
	}: DonutChartProps = $props();

	const radius = $derived(100 - thickness / 2 - 8);
	const built = $derived(buildDonut(segments, { radius, thickness, gap }));
	const placed = $derived(built.placed);
	const total = $derived(built.total);

	let internalActive = $state<string | null>(defaultActiveId);
	let still = $state(false);
	let canHover = $state(true);
	let shown = $state(false);
	let entered = $state(false);
	let plotEl: HTMLDivElement | null = $state(null);

	const controlled = $derived(activeId !== undefined);
	const rawActive = $derived(controlled ? (activeId ?? null) : internalActive);
	const active = $derived(
		rawActive !== null && placed.some((s) => s.id === rawActive) ? rawActive : null
	);

	const activeSeg = $derived(placed.find((s) => s.id === active) ?? null);
	const centerValue = $derived(activeSeg?.value ?? total);
	const centerCaption = $derived(activeSeg?.name ?? totalLabel);

	function setActive(id: string | null) {
		if (!controlled) internalActive = id;
		onActiveChange?.(id);
	}

	function onLegendKey(e: KeyboardEvent, index: number) {
		const step = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
		if (!step) return;
		e.preventDefault();
		const rows = (e.currentTarget as HTMLElement)
			.closest('ul')
			?.querySelectorAll<HTMLButtonElement>('[data-donut-legend]');
		if (!rows?.length) return;
		const next = (index + step + placed.length) % placed.length;
		rows[next]?.focus();
	}

	onMount(() => {
		still = matchMedia('(prefers-reduced-motion: reduce)').matches;
		canHover = matchMedia('(hover: hover) and (pointer: fine)').matches;
		if (still) {
			shown = true;
			entered = true;
			return;
		}
		const el = plotEl;
		if (!el) {
			shown = true;
			return;
		}
		const io = new IntersectionObserver(
			([en]) => {
				if (en?.isIntersecting) {
					shown = true;
					io.disconnect();
					window.setTimeout(() => (entered = true), 900);
				}
			},
			{ threshold: 0.25, rootMargin: '20px' }
		);
		io.observe(el);
		requestAnimationFrame(() => {
			const r = el.getBoundingClientRect();
			if (r.bottom > 0 && r.top < window.innerHeight) {
				shown = true;
				window.setTimeout(() => (entered = true), 900);
			}
		});
		const t = window.setTimeout(() => {
			shown = true;
			entered = true;
		}, 800);
		return () => {
			io.disconnect();
			clearTimeout(t);
		};
	});
</script>

<section
	class={['dc', className].filter(Boolean).join(' ')}
	aria-label={label}
	data-slot="donut-chart"
>
	<div class="dc__layout">
		<div class="dc__plot" bind:this={plotEl}>
			<svg
				class="dc__svg"
				class:is-shown={shown}
				viewBox="0 0 {DONUT_SIZE} {DONUT_SIZE}"
				role="img"
				aria-label={label}
			>
				<!-- muted track -->
				<circle
					cx={CENTER}
					cy={CENTER}
					r={radius}
					fill="none"
					stroke-width={thickness}
					class="dc__track"
					opacity="0.55"
				/>
				<g class="dc__ring" class:is-shown={shown} style:transform-origin="{CENTER}px {CENTER}px">
					{#each placed as segment, index}
						{@const focused = active === segment.id}
						{@const dimmed = active !== null && !focused}
						<path
							class="dc__seg"
							class:is-focused={focused}
							class:is-dimmed={dimmed}
							class:is-entered={entered || still}
							d={segment.path}
							fill="none"
							stroke={segment.color}
							stroke-width={thickness}
							stroke-linecap="round"
							style:--i={index}
							style:transform-origin="{CENTER}px {CENTER}px"
							pointer-events="none"
							aria-hidden="true"
						/>
					{/each}
				</g>
				<!-- wider static hit arcs: never scale, so pointer stays stable while visual pops -->
				<g>
					{#each placed as segment}
						<path
							d={segment.path}
							fill="none"
							stroke="transparent"
							stroke-width={thickness + 8}
							stroke-linecap="round"
							pointer-events={shown ? 'stroke' : 'none'}
							class="dc__hit"
							onpointerenter={canHover ? () => setActive(segment.id) : undefined}
							onpointerleave={canHover ? () => setActive(null) : undefined}
						/>
					{/each}
				</g>
			</svg>

			<div class="dc__center" aria-live="polite">
				<p class="dc__value">{formatValue(centerValue)}</p>
				<p class="dc__caption">{centerCaption}</p>
			</div>
		</div>

		{#if placed.length}
			<ul class="dc__legend" aria-label="Segments">
				{#each placed as segment, index}
					{@const focused = active === segment.id}
					<li>
						<button
							type="button"
							data-donut-legend
							class="dc__leg-btn"
							class:is-focused={focused}
							class:is-selected={selectedId === segment.id}
							aria-pressed={onSelect ? selectedId === segment.id : undefined}
							onclick={() => onSelect?.(segment.id)}
							onpointerenter={canHover ? () => setActive(segment.id) : undefined}
							onpointerleave={canHover ? () => setActive(null) : undefined}
							onfocus={() => setActive(segment.id)}
							onblur={() => setActive(null)}
							onkeydown={(e) => onLegendKey(e, index)}
						>
							<span class="dc__leg-row">
								<span class="dc__leg-dot" style:background={segment.color} aria-hidden="true"></span>
								<span class="dc__leg-name">{segment.name}</span>
								<span class="dc__leg-val">
									<span class="dc__leg-pct">{(segment.share * 100).toFixed(1)}%</span>
									<span class="dc__leg-num">{formatValue(segment.value)}</span>
								</span>
							</span>
							<span class="dc__leg-bar" aria-hidden="true">
								<span
									class="dc__leg-fill"
									class:is-shown={shown}
									style:background={segment.color}
									style:--share={segment.share}
									style:--i={index}
								></span>
							</span>
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</div>

	{#if placed.length}
		<table class="dc__table sr-only">
			<caption>{label}</caption>
			<thead>
				<tr>
					<th scope="col">Segment</th>
					<th scope="col">Value</th>
					<th scope="col">Share</th>
				</tr>
			</thead>
			<tbody>
				{#each placed as s}
					<tr>
						<th scope="row">{s.name}</th>
						<td>{formatValue(s.value)}</td>
						<td>{(s.share * 100).toFixed(1)}%</td>
					</tr>
				{/each}
				<tr>
					<th scope="row">{totalLabel}</th>
					<td>{formatValue(total)}</td>
					<td>100%</td>
				</tr>
			</tbody>
		</table>
	{/if}
</section>

<style>
	.dc {
		width: 100%;
		min-width: 0;
		color: var(--dc-ink, #18181b);
		--dc-surface: #ffffff;
		--dc-muted: #71717a;
		--dc-line: #e4e4e7;
		--dc-track: #e4e4e7;
		--dc-ring: #a1a1aa;
		font-family: ui-sans-serif, system-ui, sans-serif;
	}
	.dc__layout {
		display: grid;
		align-items: center;
		gap: 1.5rem;
	}
	@media (min-width: 640px) {
		.dc__layout {
			grid-template-columns: minmax(0, 16rem) 1fr;
		}
	}
	.dc__plot {
		position: relative;
		width: 100%;
		max-width: 16rem;
		margin-inline: auto;
		aspect-ratio: 1;
	}
	.dc__svg {
		display: block;
		width: 100%;
		height: 100%;
		overflow: visible;
	}
	.dc__track {
		stroke: var(--dc-track);
	}
	.dc__ring {
		transform: rotate(-90deg) scale(0.88);
		opacity: 0;
		transition:
			transform 0.9s cubic-bezier(0.22, 1, 0.36, 1),
			opacity 0.9s cubic-bezier(0.22, 1, 0.36, 1);
		transform-box: view-box;
	}
	.dc__ring.is-shown {
		transform: rotate(0deg) scale(1);
		opacity: 1;
	}
	.dc__seg {
		opacity: 0;
		transform: scale(1);
		transition:
			opacity 0.4s cubic-bezier(0.22, 1, 0.36, 1),
			transform 0.45s cubic-bezier(0.22, 1, 0.36, 1);
		transform-box: view-box;
	}
	.dc__seg.is-entered {
		opacity: 1;
		transition-delay: calc(0.12s + var(--i, 0) * 0.06s);
	}
	.dc__seg.is-dimmed {
		opacity: 0.3;
		transition-delay: 0s;
	}
	.dc__seg.is-focused {
		opacity: 1;
		transform: scale(1.05);
		transition-delay: 0s;
	}
	.dc__hit {
		cursor: pointer;
	}
	.dc__center {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		pointer-events: none;
		padding: 0 12%;
	}
	.dc__value {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 600;
		letter-spacing: -0.02em;
		font-variant-numeric: tabular-nums;
		line-height: 1.15;
	}
	.dc__caption {
		margin: 0.25rem 0 0;
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--dc-muted);
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.dc__legend {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		min-width: 0;
	}
	.dc__leg-btn {
		width: 100%;
		border: 0;
		border-radius: 0.75rem;
		padding: 0.5rem 0.75rem;
		background: transparent;
		color: inherit;
		text-align: left;
		cursor: pointer;
		outline: none;
		transition: background-color 0.15s ease;
	}
	.dc__leg-btn:hover {
		background: color-mix(in srgb, var(--dc-ink) 5%, transparent);
	}
	.dc__leg-btn.is-focused {
		background: color-mix(in srgb, var(--dc-ink) 7%, transparent);
	}
	.dc__leg-btn.is-selected {
		box-shadow: inset 0 0 0 1px var(--dc-line);
	}
	.dc__leg-btn:focus-visible {
		box-shadow: 0 0 0 2px color-mix(in srgb, #004c8b 45%, transparent);
	}
	.dc__leg-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	.dc__leg-dot {
		width: 0.625rem;
		height: 0.625rem;
		border-radius: 999px;
		flex: none;
	}
	.dc__leg-name {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 0.875rem;
		font-weight: 500;
	}
	.dc__leg-val {
		flex: none;
		font-size: 0.875rem;
		font-variant-numeric: tabular-nums;
		text-align: right;
	}
	.dc__leg-pct {
		font-weight: 600;
	}
	.dc__leg-num {
		margin-left: 0.5rem;
		color: var(--dc-muted);
	}
	.dc__leg-bar {
		display: block;
		margin: 0.5rem 0 0 1.375rem;
		height: 0.25rem;
		border-radius: 999px;
		background: var(--dc-line);
		overflow: hidden;
	}
	.dc__leg-fill {
		display: block;
		height: 100%;
		width: 100%;
		border-radius: 999px;
		transform-origin: left center;
		transform: scaleX(0);
		transition: transform 0.55s cubic-bezier(0.22, 1, 0.36, 1);
		transition-delay: calc(0.2s + var(--i, 0) * 0.06s);
	}
	.dc__leg-fill.is-shown {
		transform: scaleX(var(--share, 0));
	}
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}
	@media (prefers-reduced-motion: reduce) {
		.dc__ring,
		.dc__seg,
		.dc__leg-fill {
			transition: none !important;
		}
		.dc__ring {
			transform: none;
			opacity: 1;
		}
		.dc__seg {
			opacity: 1;
		}
		.dc__leg-fill {
			transform: scaleX(var(--share, 0));
		}
	}
</style>
