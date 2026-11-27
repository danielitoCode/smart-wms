<script lang="ts" module>
	/**
	 * HeatCalendar — single-hue activity / occupancy grid (beUI-inspired).
	 * Intensity 0..1 maps to color strength: fuller = more saturated.
	 * Svelte 5 + CSS. No motion/react. WMS stock occupancy demo.
	 */
	export type HeatCalendarCell = { w: number; d: number };

	export interface HeatCalendarSelection {
		start: HeatCalendarCell;
		end?: HeatCalendarCell;
	}

	export interface HeatCalendarProps {
		/** Noun after counts, e.g. "bins", "units". */
		unit?: string;
		/** Number of week columns. Default 16. */
		weeks?: number;
		/** Count represented by intensity 1. Default 100 (use as %). */
		maxCount?: number;
		/** values[week][day] intensities in 0..1. Missing → 0. */
		values?: number[][];
		/** Last UTC calendar day. Defaults to today after mount. */
		endDate?: Date;
		/** Single hue; magnitude maps to strength, never a second color. */
		color?: string;
		selection?: HeatCalendarSelection | null;
		defaultSelection?: HeatCalendarSelection | null;
		onSelectionChange?: (selection: HeatCalendarSelection | null) => void;
		class?: string;
		/** Accessible label. */
		label?: string;
	}

	/** Five buckets: 0 empty, 1–4 mix the hue harder. */
	export const STEPS = [0, 24, 46, 70, 94] as const;
	export const CELL = 14;
	export const GAP = 3;
	export const PITCH = CELL + GAP;
	export const MONTH_ROW = 14;
	export const LIFT = [1.28, 1.1, 1.04] as const;

	const EMPTY = 'color-mix(in srgb, var(--hc-ink, #18181b) 7%, transparent)';

	const startOfDay = (d: Date) => {
		const x = new Date(d);
		x.setUTCHours(0, 0, 0, 0);
		return x;
	};
	const addDays = (d: Date, n: number) => {
		const x = new Date(d);
		x.setUTCDate(x.getUTCDate() + n);
		return x;
	};
	/** Monday on or before d (UTC). */
	const mondayOf = (d: Date) => addDays(startOfDay(d), -((d.getUTCDay() + 6) % 7));

	const monthFmt = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'short' });
	const dayFmt = new Intl.DateTimeFormat('en-US', {
		timeZone: 'UTC',
		weekday: 'short',
		month: 'short',
		day: 'numeric'
	});
</script>

<script lang="ts">
	import { onMount } from 'svelte';

	let {
		unit = 'occ.',
		weeks = 16,
		maxCount = 100,
		values = [],
		endDate,
		color = '#f59e0b',
		selection: controlledSelection,
		defaultSelection = null,
		onSelectionChange,
		class: className = '',
		label = 'Stock occupancy calendar'
	}: HeatCalendarProps = $props();

	let today = $state<Date | null>(null);
	let still = $state(false);
	let canHover = $state(true);
	let settled = $state(false);
	let hover = $state<HeatCalendarCell | null>(null);
	let internalSel = $state<HeatCalendarSelection | null>(defaultSelection);
	let filterStep = $state<number | null>(null);
	let gridEl: HTMLDivElement | null = $state(null);

	const controlled = $derived(controlledSelection !== undefined);
	const end = $derived(endDate ? startOfDay(endDate) : today);
	const start = $derived(end ? addDays(mondayOf(end), -(weeks - 1) * 7) : null);

	const selection = $derived.by(() => {
		const raw = controlled ? (controlledSelection ?? null) : internalSel;
		if (!raw) return null;
		const ok = (c: HeatCalendarCell) =>
			Number.isInteger(c.w) &&
			Number.isInteger(c.d) &&
			c.w >= 0 &&
			c.w < weeks &&
			c.d >= 0 &&
			c.d < 7 &&
			!isFuture(c.w, c.d);
		if (!ok(raw.start)) return null;
		if (raw.end && !ok(raw.end)) return null;
		return raw;
	});

	const pinned = $derived(selection?.start ?? null);
	const spanEnd = $derived(selection?.end ?? null);

	function level(w: number, d: number) {
		return Math.max(0, Math.min(1, values?.[w]?.[d] ?? 0));
	}
	function bucket(v: number) {
		return Math.min(4, Math.floor(v * 5));
	}
	function fill(b: number) {
		return b === 0 ? EMPTY : `color-mix(in srgb, ${color} ${STEPS[b]}%, transparent)`;
	}
	function count(v: number) {
		return Math.round(v * maxCount);
	}
	function dateOf(w: number, d: number) {
		return start ? addDays(start, w * 7 + d) : null;
	}
	function isFuture(w: number, d: number) {
		const date = dateOf(w, d);
		return end !== null && date !== null && date > end;
	}

	const cols = $derived.by(() => {
		const list = Array.from({ length: weeks }, (_, w) => {
			const date = start ? addDays(start, w * 7) : null;
			const m = date ? date.getUTCMonth() : -1;
			const fresh =
				start !== null &&
				date !== null &&
				(w === 0 || addDays(start, (w - 1) * 7).getUTCMonth() !== m);
			return {
				w,
				m,
				label: fresh && date ? monthFmt.format(date) : null as string | null
			};
		});
		if (list[1]?.label || list[2]?.label) list[0].label = null;
		return list;
	});

	function idx(c: HeatCalendarCell) {
		return c.w * 7 + c.d;
	}

	const span = $derived.by(() => {
		const to = spanEnd ?? (pinned ? (hover ?? pinned) : null);
		if (!pinned || !to) return null;
		return { lo: Math.min(idx(pinned), idx(to)), hi: Math.max(idx(pinned), idx(to)) };
	});

	const spanTotal = $derived.by(() => {
		if (!span) return 0;
		let t = 0;
		for (let i = span.lo; i <= span.hi; i++) {
			const w = Math.floor(i / 7);
			const d = i % 7;
			if (isFuture(w, d)) break;
			t += count(level(w, d));
		}
		return t;
	});

	const hot = $derived(hover ?? spanEnd ?? pinned);
	const tip = $derived(spanEnd ?? hover ?? pinned);
	const tipDate = $derived(tip ? dateOf(tip.w, tip.d) : null);
	const hotMonth = $derived(hot ? (dateOf(hot.w, hot.d)?.getUTCMonth() ?? null) : null);

	function setSelection(next: HeatCalendarSelection | null) {
		if (!controlled) internalSel = next;
		onSelectionChange?.(next);
	}

	function select(cell: HeatCalendarCell) {
		if (spanEnd) {
			setSelection(null);
		} else if (pinned && idx(pinned) === idx(cell)) {
			setSelection(null);
		} else if (pinned) {
			setSelection({ start: pinned, end: cell });
		} else {
			setSelection({ start: cell });
		}
	}

	function liftScale(w: number, d: number) {
		if (still || !canHover || !hot) return 1;
		const dist = Math.max(Math.abs(hot.w - w), Math.abs(hot.d - d));
		if (dist === 0) return LIFT[0];
		if (dist === 1) return LIFT[1];
		if (dist === 2) return LIFT[2];
		return 1;
	}

	onMount(() => {
		today = startOfDay(new Date());
		still = matchMedia('(prefers-reduced-motion: reduce)').matches;
		canHover = matchMedia('(hover: hover) and (pointer: fine)').matches;
		const delay = still ? 0 : (weeks + 7) * 18 + 400;
		const t = window.setTimeout(() => (settled = true), delay);
		if (still) settled = true;
		else window.setTimeout(() => (settled = true), 1200);
		return () => clearTimeout(t);
	});
</script>

<section
	class={['hc', className].filter(Boolean).join(' ')}
	aria-label={label}
	data-slot="heat-calendar"
>
	<div
		class="hc__grid"
		bind:this={gridEl}
		style:--weeks={weeks}
		style:width="{weeks * PITCH - GAP}px"
		style:grid-template-columns="repeat({weeks}, minmax(0, 1fr))"
		style:grid-template-rows="{MONTH_ROW}px repeat(7, auto)"
		style:gap="{GAP}px"
		onpointerleave={() => (hover = null)}
	>
		{#each cols as c}
			{#if c.label}
				<span
					class="hc__month"
					class:is-hot={hotMonth === c.m}
					style:grid-column={c.w + 1}
					style:grid-row="1"
				>
					{c.label}
				</span>
			{/if}
		{/each}

		{#each cols as c}
			{#each [0, 1, 2, 3, 4, 5, 6] as d}
				{@const date = dateOf(c.w, d)}
				{#if !isFuture(c.w, d)}
					{@const v = level(c.w, d)}
					{@const b = bucket(v)}
					{@const i = c.w * 7 + d}
					{@const on = hot?.w === c.w && hot?.d === d}
					{@const isEnd = span ? i === span.lo || i === span.hi : pinned?.w === c.w && pinned?.d === d}
					{@const dim =
						(filterStep !== null && filterStep !== b) ||
						(span !== null && (i < span.lo || i > span.hi))}
					{@const scale = liftScale(c.w, d)}
					<span
						class="hc__cell-wrap"
						class:is-dim={dim}
						style:grid-column={c.w + 1}
						style:grid-row={d + 2}
						style:--delay="{(c.w + d) * 0.018}s"
					>
						<button
							type="button"
							class="hc__cell"
							class:is-on={on}
							class:is-end={isEnd}
							class:is-settled={settled}
							style:--fill={fill(b)}
							style:--lift={scale}
							aria-label={date
								? `${count(v)} ${unit} on ${dayFmt.format(date)} (${Math.round(v * 100)}%)`
								: `${count(v)} ${unit}`}
							aria-pressed={isEnd ? true : undefined}
							onpointerenter={canHover ? () => (hover = { w: c.w, d }) : undefined}
							onclick={() => select({ w: c.w, d })}
							onkeydown={(e) => {
								if (e.key === 'Escape') {
									e.preventDefault();
									setSelection(null);
									filterStep = null;
								}
							}}
						>
							<span class="hc__swatch" aria-hidden="true"></span>
						</button>
					</span>
				{/if}
			{/each}
		{/each}

		{#if tip && tipDate}
			<div
				class="hc__tip"
				role="tooltip"
				style:left="{tip.w * PITCH + CELL / 2}px"
				style:top="{MONTH_ROW + GAP + tip.d * PITCH}px"
			>
				{#if span}
					<p class="hc__tip-main">
						{spanTotal} {unit}
						<span class="hc__tip-sub">
							· {span.hi - span.lo + 1} days
						</span>
					</p>
					<p class="hc__tip-date">
						{dayFmt.format(addDays(start!, span.lo))} – {dayFmt.format(addDays(start!, span.hi))}
					</p>
				{:else}
					<p class="hc__tip-main">
						{count(level(tip.w, tip.d))} {unit}
						<span class="hc__tip-sub">· {Math.round(level(tip.w, tip.d) * 100)}%</span>
					</p>
					<p class="hc__tip-date">{dayFmt.format(tipDate)}</p>
				{/if}
			</div>
		{/if}
	</div>

	<div class="hc__legend" aria-label="Occupancy levels">
		<span class="hc__leg-label">Less</span>
		{#each [0, 1, 2, 3, 4] as step}
			<button
				type="button"
				class="hc__leg-swatch"
				class:is-active={filterStep === step}
				style:background={fill(step)}
				aria-label="Show occupancy level {step}"
				aria-pressed={filterStep === step}
				onclick={() => (filterStep = filterStep === step ? null : step)}
			></button>
		{/each}
		<span class="hc__leg-label">More</span>
	</div>
</section>

<style>
	.hc {
		width: fit-content;
		max-width: 100%;
		color: var(--hc-ink, #18181b);
		font-family: ui-sans-serif, system-ui, sans-serif;
	}
	.hc__grid {
		position: relative;
		display: grid;
		max-width: 100%;
	}
	.hc__month {
		white-space: nowrap;
		font-size: 11px;
		line-height: 1;
		color: #71717a;
		transition: color 0.2s ease;
		align-self: end;
		padding-bottom: 2px;
	}
	.hc__month.is-hot {
		color: var(--hc-ink, #18181b);
		font-weight: 600;
	}
	.hc__cell-wrap {
		display: block;
		width: 100%;
		aspect-ratio: 1;
		opacity: 1;
		transition: opacity 0.2s ease;
	}
	.hc__cell-wrap.is-dim {
		opacity: 0.22;
	}
	.hc__cell {
		position: relative;
		display: block;
		width: 100%;
		height: 100%;
		padding: 0;
		border: 0;
		background: transparent;
		cursor: pointer;
		border-radius: 3px;
		outline: none;
	}
	.hc__cell:focus-visible .hc__swatch {
		box-shadow:
			0 0 0 2px #fff,
			0 0 0 3.5px var(--hc-ink, #18181b);
	}
	.hc__swatch {
		position: absolute;
		inset: 1px;
		display: block;
		border-radius: 3px;
		background: var(--fill);
		transform: scale(0.4);
		opacity: 0;
		transition:
			transform 0.35s cubic-bezier(0.22, 1, 0.36, 1),
			opacity 0.35s cubic-bezier(0.22, 1, 0.36, 1),
			box-shadow 0.15s ease;
		transition-delay: var(--delay, 0s);
	}
	.hc__cell.is-settled .hc__swatch {
		opacity: 1;
		transform: scale(var(--lift, 1));
		transition-delay: 0s;
	}
	.hc__cell.is-end .hc__swatch {
		box-shadow:
			0 0 0 2px #fff,
			0 0 0 3.5px var(--hc-ink, #18181b);
	}
	.hc__tip {
		position: absolute;
		z-index: 5;
		transform: translate(-50%, calc(-100% - 10px));
		pointer-events: none;
		min-width: 9rem;
		padding: 0.45rem 0.6rem;
		border-radius: 0.5rem;
		background: #18181b;
		color: #fafafa;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
		font-size: 0.72rem;
		line-height: 1.35;
	}
	.hc__tip-main {
		margin: 0;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}
	.hc__tip-sub {
		font-weight: 500;
		opacity: 0.7;
	}
	.hc__tip-date {
		margin: 0.15rem 0 0;
		opacity: 0.65;
		font-size: 0.68rem;
	}
	.hc__legend {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		margin-top: 0.75rem;
		justify-content: flex-end;
	}
	.hc__leg-label {
		font-size: 0.68rem;
		color: #71717a;
		font-weight: 500;
	}
	.hc__leg-swatch {
		width: 12px;
		height: 12px;
		border-radius: 2px;
		border: 1px solid transparent;
		padding: 0;
		cursor: pointer;
	}
	.hc__leg-swatch.is-active {
		outline: 2px solid var(--hc-ink, #18181b);
		outline-offset: 1px;
	}
	@media (prefers-reduced-motion: reduce) {
		.hc__swatch {
			transition: none !important;
			opacity: 1 !important;
			transform: none !important;
		}
	}
</style>
