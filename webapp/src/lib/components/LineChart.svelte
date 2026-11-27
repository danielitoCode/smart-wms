<script lang="ts" module>
	/**
	 * LineChart — multi-series line/area with crosshair tooltip (beUI-inspired).
	 * Svelte 5 + SVG. No motion/react. MIT-style port for Smart WMS lab.
	 */
	export type LineChartCurve = 'monotone' | 'linear' | 'step';
	export type LineChartVariant = 'line' | 'area';
	export type LineChartStatus = 'ready' | 'loading';

	export interface LineChartSeries {
		id: string;
		name: string;
		color: string;
		/** One value per category; null = gap */
		values: (number | null)[];
	}

	export interface LineChartProps {
		series: LineChartSeries[];
		categories: string[];
		variant?: LineChartVariant;
		curve?: LineChartCurve;
		domain?: [number, number];
		formatValue?: (v: number) => string;
		formatTick?: (v: number) => string;
		label?: string;
		status?: LineChartStatus;
		loadingLabel?: string;
		height?: number;
		strokeWidth?: number;
		showGrid?: boolean;
		class?: string;
	}

	const numberFmt = new Intl.NumberFormat('en', { maximumFractionDigits: 2 });
	const compactFmt = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });

	export function defaultFormatValue(v: number) {
		return numberFmt.format(v);
	}
	export function defaultFormatTick(v: number) {
		return compactFmt.format(v);
	}

	function niceDomain(values: number[], includeZero: boolean, fixed?: [number, number]) {
		if (fixed) return { min: fixed[0], max: fixed[1] };
		const nums = values.filter((n) => Number.isFinite(n));
		if (!nums.length) return { min: 0, max: 1 };
		let min = Math.min(...nums);
		let max = Math.max(...nums);
		if (includeZero) {
			min = Math.min(min, 0);
			max = Math.max(max, 0);
		}
		if (min === max) {
			const pad = Math.abs(min) || 1;
			return { min: min - pad * 0.1, max: max + pad * 0.1 };
		}
		const span = max - min;
		const step = Math.pow(10, Math.floor(Math.log10(span))) || 1;
		const niceMin = Math.floor(min / step) * step;
		const niceMax = Math.ceil(max / step) * step;
		return { min: niceMin, max: niceMax === niceMin ? niceMin + step : niceMax };
	}

	function ticks(min: number, max: number, count = 4): number[] {
		const span = max - min || 1;
		const step = span / count;
		const out: number[] = [];
		for (let i = 0; i <= count; i++) out.push(min + step * i);
		return out;
	}

	type Pt = { x: number; y: number };

	function lineLinear(pts: Pt[]): string {
		if (!pts.length) return '';
		return pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
	}

	function lineStep(pts: Pt[]): string {
		if (!pts.length) return '';
		let d = `M${pts[0].x.toFixed(2)},${pts[0].y.toFixed(2)}`;
		for (let i = 1; i < pts.length; i++) {
			d += ` H${pts[i].x.toFixed(2)} V${pts[i].y.toFixed(2)}`;
		}
		return d;
	}

	/** Monotone cubic Hermite (simplified). */
	function lineMonotone(pts: Pt[]): string {
		if (pts.length < 2) return lineLinear(pts);
		const n = pts.length;
		const dx: number[] = [];
		const dy: number[] = [];
		const m: number[] = [];
		for (let i = 0; i < n - 1; i++) {
			dx[i] = pts[i + 1].x - pts[i].x;
			dy[i] = pts[i + 1].y - pts[i].y;
			m[i] = dx[i] ? dy[i] / dx[i] : 0;
		}
		const slopes = new Array(n);
		slopes[0] = m[0];
		slopes[n - 1] = m[n - 2];
		for (let i = 1; i < n - 1; i++) {
			if (m[i - 1] * m[i] <= 0) slopes[i] = 0;
			else slopes[i] = (m[i - 1] + m[i]) / 2;
		}
		let d = `M${pts[0].x.toFixed(2)},${pts[0].y.toFixed(2)}`;
		for (let i = 0; i < n - 1; i++) {
			const h = dx[i];
			const x1 = pts[i].x + h / 3;
			const y1 = pts[i].y + (slopes[i] * h) / 3;
			const x2 = pts[i + 1].x - h / 3;
			const y2 = pts[i + 1].y - (slopes[i + 1] * h) / 3;
			d += ` C${x1.toFixed(2)},${y1.toFixed(2)} ${x2.toFixed(2)},${y2.toFixed(2)} ${pts[i + 1].x.toFixed(2)},${pts[i + 1].y.toFixed(2)}`;
		}
		return d;
	}

	export function buildPath(pts: Pt[], curve: LineChartCurve): string {
		if (curve === 'step') return lineStep(pts);
		if (curve === 'linear') return lineLinear(pts);
		return lineMonotone(pts);
	}

	export function areaPath(pts: Pt[], baselineY: number, curve: LineChartCurve): string {
		if (!pts.length) return '';
		const line = buildPath(pts, curve);
		const last = pts[pts.length - 1];
		const first = pts[0];
		return `${line} L${last.x.toFixed(2)},${baselineY.toFixed(2)} L${first.x.toFixed(2)},${baselineY.toFixed(2)} Z`;
	}
</script>

<script lang="ts">
	import { onMount } from 'svelte';

	let {
		series,
		categories,
		variant = 'line',
		curve = 'monotone',
		domain: fixedDomain,
		formatValue = defaultFormatValue,
		formatTick = defaultFormatTick,
		label = 'Line chart',
		status = 'ready',
		loadingLabel = 'Loading data',
		height = 288,
		strokeWidth = 2.5,
		showGrid = true,
		class: className = ''
	}: LineChartProps = $props();

	const AXIS = 44;
	const PAD = { top: 12, right: 16, bottom: 28 };

	let wrapEl: HTMLDivElement | null = $state(null);
	let width = $state(480);
	let activeIndex = $state<number | null>(null);
	let hidden = $state<string[]>([]);
	let still = $state(false);
	let drawn = $state(false);

	const loading = $derived(status === 'loading');
	const visible = $derived(series.filter((s) => !hidden.includes(s.id)));
	const domain = $derived(
		niceDomain(
			visible.flatMap((s) => s.values.filter((v): v is number => v != null && Number.isFinite(v))),
			variant === 'area',
			fixedDomain
		)
	);
	const yTicks = $derived(ticks(domain.min, domain.max, 4));

	const plotW = $derived(Math.max(0, width - AXIS - PAD.right));
	const plotH = $derived(height - PAD.top - PAD.bottom);
	const n = $derived(categories.length);

	function xAt(i: number) {
		if (n <= 1) return AXIS + plotW / 2;
		return AXIS + (i / (n - 1)) * plotW;
	}
	function yAt(v: number) {
		const span = domain.max - domain.min || 1;
		return PAD.top + ((domain.max - v) / span) * plotH;
	}
	const baselineY = $derived(yAt(Math.min(domain.max, Math.max(domain.min, 0))));

	type SeriesGeom = {
		id: string;
		name: string;
		color: string;
		pts: { x: number; y: number; value: number; i: number }[];
		line: string;
		area: string;
	};

	const geoms = $derived.by((): SeriesGeom[] => {
		if (width <= 0 || loading) return [];
		return visible.map((s) => {
			const pts: SeriesGeom['pts'] = [];
			s.values.forEach((v, i) => {
				if (v != null && Number.isFinite(v)) pts.push({ x: xAt(i), y: yAt(v), value: v, i });
			});
			const line = buildPath(pts, curve);
			const area = variant === 'area' ? areaPath(pts, baselineY, curve) : '';
			return { id: s.id, name: s.name, color: s.color, pts, line, area };
		});
	});

	function toggle(id: string) {
		hidden = hidden.includes(id) ? hidden.filter((h) => h !== id) : [...hidden, id];
	}

	function onPointer(e: PointerEvent) {
		if (loading || !n) return;
		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		const px = e.clientX - rect.left;
		let best = 0;
		let bestD = Infinity;
		for (let i = 0; i < n; i++) {
			const d = Math.abs(xAt(i) - px);
			if (d < bestD) {
				bestD = d;
				best = i;
			}
		}
		activeIndex = best;
	}

	function onKey(e: KeyboardEvent) {
		if (loading || !n) return;
		if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
			e.preventDefault();
			const cur = activeIndex ?? 0;
			const next = e.key === 'ArrowRight' ? Math.min(n - 1, cur + 1) : Math.max(0, cur - 1);
			activeIndex = next;
		}
		if (e.key === 'Escape') activeIndex = null;
	}

	const tipRows = $derived.by(() => {
		if (activeIndex == null) return [];
		return visible.map((s) => {
			const v = s.values[activeIndex!];
			return { id: s.id, name: s.name, color: s.color, value: v };
		});
	});

	onMount(() => {
		still = matchMedia('(prefers-reduced-motion: reduce)').matches;
		const el = wrapEl;
		if (!el) return;
		const ro = new ResizeObserver(() => {
			width = Math.max(el.clientWidth || 0, 1);
		});
		ro.observe(el);
		width = Math.max(el.clientWidth || 0, 1);
		// Reveal series on first paint; IO only for optional entrance when not still
		if (still) {
			drawn = true;
		} else {
			const io = new IntersectionObserver(
				([en]) => {
					if (en?.isIntersecting) {
						drawn = true;
						io.disconnect();
					}
				},
				{ threshold: 0.05, rootMargin: '40px' }
			);
			io.observe(el);
			// Fallback: if already on screen, IO can race — force reveal next frame
			requestAnimationFrame(() => {
				const r = el.getBoundingClientRect();
				if (r.bottom > 0 && r.top < window.innerHeight) drawn = true;
			});
			const t = window.setTimeout(() => {
				drawn = true;
			}, 600);
			return () => {
				ro.disconnect();
				io.disconnect();
				clearTimeout(t);
			};
		}
		return () => {
			ro.disconnect();
		};
	});
</script>

<section
	class={['lc', className].filter(Boolean).join(' ')}
	aria-label={label}
	aria-busy={loading || undefined}
	data-slot="line-chart"
>
	<div
		bind:this={wrapEl}
		class="lc__plot"
		style:height="{height}px"
		role="img"
		aria-label={label}
		tabindex="0"
		onpointermove={onPointer}
		onpointerleave={() => (activeIndex = null)}
		onkeydown={onKey}
	>
		{#if loading}
			<div class="lc__loading" aria-live="polite">
				<div class="lc__placeholder"></div>
				{#if loadingLabel}
					<span class="lc__loading-label">{loadingLabel}</span>
				{/if}
			</div>
		{:else}
			<svg class="lc__svg" width={width} height={height} aria-hidden="true">
				<defs>
					{#each geoms as g}
						<linearGradient id="lc-fill-{g.id}" x1="0" y1="0" x2="0" y2="1">
							<stop offset="0%" stop-color={g.color} stop-opacity="0.35" />
							<stop offset="100%" stop-color={g.color} stop-opacity="0.02" />
						</linearGradient>
					{/each}
					<!-- luminance mask: white = visible, black = hidden -->
					<linearGradient id="lc-edge" x1="0" y1="0" x2="1" y2="0">
						<stop offset="0%" stop-color="#fff" stop-opacity="0" />
						<stop offset="6%" stop-color="#fff" stop-opacity="1" />
						<stop offset="94%" stop-color="#fff" stop-opacity="1" />
						<stop offset="100%" stop-color="#fff" stop-opacity="0" />
					</linearGradient>
					<mask id="lc-edge-mask">
						<rect x={AXIS} y={PAD.top} width={plotW} height={plotH} fill="url(#lc-edge)" />
					</mask>
				</defs>

				{#if showGrid}
					{#each yTicks as t}
						<line class="lc__grid" x1={AXIS} x2={AXIS + plotW} y1={yAt(t)} y2={yAt(t)} />
					{/each}
				{/if}

				{#each yTicks as t}
					<text class="lc__ytick" x={AXIS - 8} y={yAt(t) + 4} text-anchor="end">{formatTick(t)}</text>
				{/each}

				{#each categories as cat, i}
					{@const hide =
						activeIndex != null && Math.abs(xAt(i) - xAt(activeIndex)) < 36 && i !== activeIndex}
					<text class="lc__xtick" class:is-dim={hide} x={xAt(i)} y={height - 8} text-anchor="middle">{cat}</text>
				{/each}

				<g class="lc__series" class:is-drawn={drawn || still} mask="url(#lc-edge-mask)">
					{#each geoms as g}
						{#if variant === 'area' && g.area}
							<path
								class="lc__area"
								d={g.area}
								fill="url(#lc-fill-{g.id})"
								opacity={activeIndex == null ? 1 : 0.55}
							/>
						{/if}
						<path
							class="lc__line"
							d={g.line}
							stroke={g.color}
							stroke-width={strokeWidth}
							fill="none"
							stroke-linecap="round"
							stroke-linejoin="round"
							opacity={activeIndex == null ? 1 : 0.45}
						/>
						{#if activeIndex != null}
							{@const pt = g.pts.find((p) => p.i === activeIndex)}
							{#if pt}
								<circle
									class="lc__dot"
									cx={pt.x}
									cy={pt.y}
									r="4.5"
									fill={g.color}
									stroke="var(--lc-surface, #fff)"
									stroke-width="2"
								/>
							{/if}
						{/if}
					{/each}
				</g>

				{#if activeIndex != null}
					{@const cx = xAt(activeIndex)}
					<line class="lc__cross" x1={cx} x2={cx} y1={PAD.top} y2={PAD.top + plotH} />
					{@const pillW = Math.min(72, Math.max(40, categories[activeIndex].length * 7 + 16))}
					<rect class="lc__pill" x={cx - pillW / 2} y={height - 26} width={pillW} height={18} rx="9" />
					<text class="lc__pill-text" x={cx} y={height - 13} text-anchor="middle">{categories[activeIndex]}</text>
				{/if}
			</svg>

			{#if activeIndex != null && tipRows.length}
				{@const cx = xAt(activeIndex)}
				{@const flip = cx > width * 0.62}
				<div class="lc__tip" class:is-left={flip} style:left="{cx}px" style:top="{PAD.top + 8}px">
					<p class="lc__tip-cat">{categories[activeIndex]}</p>
					{#each tipRows as row}
						<div class="lc__tip-row">
							<span class="lc__tip-swatch" style:background={row.color}></span>
							<span class="lc__tip-name">{row.name}</span>
							<span class="lc__tip-val">{row.value == null ? '—' : formatValue(row.value)}</span>
						</div>
					{/each}
				</div>
			{/if}
		{/if}
	</div>

	{#if series.length > 1}
		<ul class="lc__legend" aria-label="Series">
			{#each series as s}
				<li>
					<button
						type="button"
						class="lc__leg-btn"
						class:is-off={hidden.includes(s.id)}
						aria-pressed={!hidden.includes(s.id)}
						onclick={() => toggle(s.id)}
					>
						<span class="lc__leg-swatch" style:background={s.color}></span>
						{s.name}
					</button>
				</li>
			{/each}
		</ul>
	{/if}

	{#if !loading}
		<table class="lc__table sr-only">
			<caption>{label}</caption>
			<thead>
				<tr>
					<th scope="col">Category</th>
					{#each series as s}<th scope="col">{s.name}</th>{/each}
				</tr>
			</thead>
			<tbody>
				{#each categories as cat, i}
					<tr>
						<th scope="row">{cat}</th>
						{#each series as s}
							<td>{s.values[i] == null ? '—' : formatValue(s.values[i]!)}</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</section>

<style>
	.lc {
		width: 100%;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		color: var(--lc-ink, #18181b);
		--lc-surface: #ffffff;
		--lc-muted: #71717a;
		--lc-line: #e4e4e7;
		--lc-cross: #a1a1aa;
		font-family: ui-sans-serif, system-ui, sans-serif;
	}
	.lc__plot {
		position: relative;
		width: 100%;
		outline: none;
		touch-action: none;
		border-radius: 12px;
		background: var(--lc-surface);
	}
	.lc__plot:focus-visible {
		box-shadow: 0 0 0 2px color-mix(in srgb, #004c8b 40%, transparent);
	}
	.lc__svg {
		display: block;
		width: 100%;
		height: 100%;
	}
	.lc__grid {
		stroke: var(--lc-line);
		stroke-width: 1;
		stroke-dasharray: 3 4;
	}
	.lc__ytick,
	.lc__xtick {
		fill: var(--lc-muted);
		font-size: 11px;
	}
	.lc__xtick.is-dim {
		opacity: 0.15;
	}
	.lc__series {
		opacity: 0;
		transition: opacity 0.45s ease;
	}
	.lc__series.is-drawn {
		opacity: 1;
	}
	/* Ensure strokes paint above fills */
	.lc__line {
		vector-effect: non-scaling-stroke;
	}
	.lc__line,
	.lc__area {
		transition: opacity 0.2s ease;
	}
	.lc__cross {
		stroke: var(--lc-cross);
		stroke-width: 1.25;
		stroke-dasharray: 4 3;
		pointer-events: none;
	}
	.lc__dot {
		filter: drop-shadow(0 1px 2px rgb(0 0 0 / 0.2));
	}
	.lc__pill {
		fill: #18181b;
	}
	.lc__pill-text {
		fill: #fafafa;
		font-size: 11px;
		font-weight: 600;
	}
	.lc__tip {
		position: absolute;
		z-index: 4;
		transform: translateX(12px);
		min-width: 9rem;
		padding: 0.55rem 0.7rem;
		border-radius: 10px;
		background: #18181b;
		color: #fafafa;
		box-shadow: 0 12px 28px -10px rgb(0 0 0 / 0.35);
		pointer-events: none;
		font-size: 12px;
	}
	.lc__tip.is-left {
		transform: translateX(calc(-100% - 12px));
	}
	.lc__tip-cat {
		margin: 0 0 0.35rem;
		font-weight: 600;
		opacity: 0.7;
		font-size: 11px;
	}
	.lc__tip-row {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		margin-top: 0.2rem;
	}
	.lc__tip-swatch {
		width: 8px;
		height: 8px;
		border-radius: 999px;
		flex: none;
	}
	.lc__tip-name {
		flex: 1;
		opacity: 0.85;
	}
	.lc__tip-val {
		font-variant-numeric: tabular-nums;
		font-weight: 600;
	}
	.lc__legend {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.lc__leg-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.3rem 0.65rem;
		border-radius: 999px;
		border: 1px solid var(--lc-line);
		background: var(--lc-surface);
		font-size: 12px;
		font-weight: 500;
		color: inherit;
		cursor: pointer;
	}
	.lc__leg-btn.is-off {
		opacity: 0.4;
		text-decoration: line-through;
	}
	.lc__leg-swatch {
		width: 8px;
		height: 8px;
		border-radius: 999px;
	}
	.lc__loading {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		gap: 0.75rem;
	}
	.lc__placeholder {
		width: 70%;
		height: 48%;
		border-radius: 8px;
		background: linear-gradient(90deg, #e4e4e7 25%, #f4f4f5 50%, #e4e4e7 75%);
		background-size: 200% 100%;
		animation: lc-shimmer 1.4s ease infinite;
	}
	.lc__loading-label {
		font-size: 0.8rem;
		color: var(--lc-muted);
	}
	@keyframes lc-shimmer {
		0% {
			background-position: 100% 0;
		}
		100% {
			background-position: -100% 0;
		}
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
		.lc__placeholder {
			animation: none;
		}
		.lc__series {
			transition: none;
			opacity: 1;
		}
	}
</style>
