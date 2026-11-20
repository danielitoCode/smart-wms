<script lang="ts">
	/**
	 * StackedBars — gráfica de volumen operativo (scrub ring + tooltip).
	 * Port Svelte 5 del patrón React/Framer Motion. Categorías WMS.
	 */
	type Mode = 'Day' | 'Week';
	type ColourMode = 'Mono' | 'Colour';
	type Bar = { vals: number[]; esc: number; label: string; short: string };
	type SegLayout = { bottom: number; h: number };
	type ColLayout = { segs: SegLayout[]; top: number; esc: number };

	interface Props {
		colour?: ColourMode;
		bars?: number;
		gap?: number;
		title?: string;
		unit?: string;
	}

	let {
		colour = 'Colour',
		bars = 20,
		gap = 6,
		title = 'Operaciones',
		unit = 'movimientos'
	}: Props = $props();

	const W = 300;
	const PAD = 16;
	const CW = W - PAD * 2;
	const CH = 104;
	const BH = 22;
	const SEG_GAP = 2;
	const LIFT = 2;
	const TIP_W = 132;

	const CATS = ['Receiving', 'Picking', 'Packing', 'Shipping'] as const;
	const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
	const LAST = Date.UTC(2026, 9, 11);
	const DAY_MS = 86400000;

	const n = $derived(Math.max(2, Math.round(bars)));

	let mode = $state<Mode>('Week');
	let at = $state<number | null>(null);
	let seen = $state(false);
	let gen = $state(0);
	let lastTotal = $state(0);

	let plotEl = $state<HTMLDivElement | null>(null);
	let ringX = $state(0);
	let ringY = $state(0);
	let ringH = $state(0);
	let tipX = $state(0);
	let tipVisible = $state(false);

	function mulberry(seed: number) {
		let a = seed >>> 0;
		return () => {
			a = (a + 0x6d2b79f5) >>> 0;
			let t = a;
			t = Math.imul(t ^ (t >>> 15), t | 1);
			t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
	}

	const fmtDay = (ms: number) => {
		const d = new Date(ms);
		return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
	};

	function makeBars(m: Mode, count: number): Bar[] {
		const rnd = mulberry(m === 'Day' ? 4396 : 9117);
		const base = [520, 360, 210, 260];
		const out: Bar[] = [];
		for (let i = 0; i < 30; i++) {
			const back = 29 - i;
			if (m === 'Day') {
				const ms = LAST - back * DAY_MS;
				const wd = new Date(ms).getUTCDay();
				const quiet = wd === 0 || wd === 6 ? 0.55 : 1;
				const surge = rnd() < 0.12 ? 1.5 : 1;
				const vals = base.map((b, k) =>
					Math.round(b * quiet * (0.6 + rnd() * 0.8) * (k === 3 ? surge * surge : surge))
				);
				const esc = Math.round(3 + rnd() * 9 * quiet * surge);
				out.push({ vals, esc, label: fmtDay(ms), short: fmtDay(ms) });
			} else {
				const end = LAST - back * 7 * DAY_MS;
				const start = end - 6 * DAY_MS;
				const vals = base.map((b) => Math.round(b * 5.6 * (0.75 + rnd() * 0.5)));
				const esc = Math.round(30 + rnd() * 44);
				const s = new Date(start);
				const e = new Date(end);
				out.push({
					vals,
					esc,
					label: `${MONTHS[s.getUTCMonth()]} ${s.getUTCDate()} – ${MONTHS[e.getUTCMonth()]} ${e.getUTCDate()}`,
					short: `${MONTHS[s.getUTCMonth()]} ${s.getUTCDate()}`
				});
			}
		}
		return out.slice(-count);
	}

	const data = $derived(makeBars(mode, n));
	const totals = $derived(data.map((d) => d.vals.reduce((a, b) => a + b, 0)));
	const maxStack = $derived(Math.max(...totals, 1));
	const maxEsc = $derived(Math.max(...data.map((d) => d.esc), 1));
	const bw = $derived((CW - gap * (n - 1)) / n);

	const layout = $derived.by((): ColLayout[] => {
		return data.map((d) => {
			const segs: SegLayout[] = [];
			let bottom = 0;
			const scale = CH / maxStack;
			for (let k = 0; k < 4; k++) {
				const h = Math.max(0, d.vals[k] * scale - (k > 0 ? SEG_GAP : 0));
				segs.push({ bottom, h });
				bottom += h + (k < 3 ? SEG_GAP : 0);
			}
			return {
				segs,
				top: bottom,
				esc: (d.esc / maxEsc) * (BH - 4)
			};
		});
	});

	const cur = $derived(at != null ? data[at] : null);
	const top2 = $derived.by(() => {
		if (!cur) return [] as { v: number; k: number }[];
		return cur.vals
			.map((v, k) => ({ v, k }))
			.sort((a, b) => b.v - a.v)
			.slice(0, 2);
	});

	function fmt(v: number) {
		if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
		return String(v);
	}

	function setMode(m: Mode) {
		if (m === mode) return;
		mode = m;
		at = null;
		tipVisible = false;
		gen += 1;
		seen = false;
		requestAnimationFrame(() => {
			seen = true;
		});
	}

	function onMove(e: PointerEvent) {
		if (!plotEl) return;
		const r = plotEl.getBoundingClientRect();
		const x = e.clientX - r.left - PAD;
		const i = Math.max(0, Math.min(n - 1, Math.floor(x / (bw + gap))));
		at = i;
		tipVisible = true;
		const colLeft = PAD + i * (bw + gap);
		ringX = colLeft - 3;
		ringY = CH + 1 + LIFT - layout[i].top - 3;
		ringH = layout[i].top + layout[i].esc + 6;
		const ideal = colLeft + bw / 2 - TIP_W / 2;
		tipX = Math.max(4, Math.min(W - TIP_W - 4, ideal));
		lastTotal = totals[i];
	}

	function onLeave() {
		at = null;
		tipVisible = false;
	}

	$effect(() => {
		const id = requestAnimationFrame(() => {
			seen = true;
		});
		return () => cancelAnimationFrame(id);
	});
</script>

<div class="stb" data-colour={colour} data-gen={gen}>
	<div class="stb-head">
		<div>
			<p class="stb-kicker">{title}</p>
			<p class="stb-unit">{unit}</p>
		</div>
		<div class="stb-modes" role="group" aria-label="Periodo">
			<button type="button" class="stb-mode" data-on={mode === 'Day' || undefined} onclick={() => setMode('Day')}>Día</button>
			<button type="button" class="stb-mode" data-on={mode === 'Week' || undefined} onclick={() => setMode('Week')}>Semana</button>
		</div>
	</div>

	<div
		class="stb-plot"
		bind:this={plotEl}
		role="img"
		aria-label="Volumen operativo apilado"
		onpointermove={onMove}
		onpointerleave={onLeave}
		style="width: {W}px; height: {CH + BH + 12}px"
	>
		{#each layout as col, i (mode + '-' + i + '-' + gen)}
			<div
				class="stb-col"
				class:stb-col--dim={at != null && at !== i}
				style="left: {PAD + i * (bw + gap)}px; width: {bw}px"
			>
				{#each col.segs as s, k}
					<span
						class="stb-seg"
						style="
							--seg-c: var(--stb-c{k + 1});
							bottom: {BH + 1 + LIFT + (seen ? s.bottom : 0)}px;
							height: {seen ? s.h : 0}px;
							transition-delay: {i * 18 + k * 12}ms;
						"
					></span>
				{/each}
				<span
					class="stb-esc"
					style="top: {CH + 1 + LIFT}px; height: {seen ? col.esc : 0}px; transition-delay: {i * 18}ms"
				></span>
			</div>
		{/each}

		<span
			class="stb-ring"
			aria-hidden="true"
			style="transform: translate({ringX}px, {ringY}px); height: {ringH}px; width: {bw + 6}px; opacity: {tipVisible ? 1 : 0}"
		></span>

		<div
			class="stb-tip"
			aria-hidden={!cur}
			style="transform: translateX({tipX}px); width: {TIP_W}px; opacity: {tipVisible && cur ? 1 : 0}"
		>
			{#if cur}
				<div class="stb-tip-head">
					<span>{cur.label}</span>
					<b>{fmt(totals[at!])}</b>
				</div>
				{#each top2 as { v, k } (CATS[k])}
					<div class="stb-tip-row">
						<i style="--c: var(--stb-c{k + 1})"></i>
						<span>{CATS[k]}</span>
						<b>{fmt(v)}</b>
					</div>
				{/each}
				<div class="stb-tip-row" data-esc="">
					<i></i>
					<span>Excepciones</span>
					<b>{cur.esc}</b>
				</div>
			{/if}
		</div>
	</div>

	<div class="stb-axis">
		<span>{data[0]?.short ?? ''}</span>
		<span>{data[n - 1]?.short ?? ''}</span>
	</div>
</div>

<style>
	.stb {
		--stb-c1: #004c8b;
		--stb-c2: #0d7ab5;
		--stb-c3: #c9a227;
		--stb-c4: #5c6b7d;
		--stb-slab: color-mix(in srgb, var(--card, #fff) 92%, #d9e2ec);
		width: 300px;
		font-family: var(--body, Inter, system-ui, sans-serif);
		color: var(--ink, #132234);
	}
	.stb[data-colour='Mono'] {
		--stb-c1: #012a50;
		--stb-c2: #004c8b;
		--stb-c3: #3d6f99;
		--stb-c4: #7a93a8;
	}
	.stb-head {
		display: flex; align-items: flex-start; justify-content: space-between;
		margin-bottom: 0.75rem; gap: 0.5rem;
	}
	.stb-kicker {
		margin: 0; font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-weight: 700; font-size: 0.95rem; letter-spacing: -0.02em; color: var(--head-ink, #012a50);
	}
	.stb-unit { margin: 0.15rem 0 0; font-size: 0.7rem; color: var(--slate, #5c6b7d); }
	.stb-modes {
		display: inline-flex; padding: 0.15rem; border-radius: 999px;
		background: color-mix(in srgb, var(--surface-2, #f5f8fc) 90%, transparent);
		border: 1px solid color-mix(in srgb, var(--line, #d9e2ec) 80%, transparent);
	}
	.stb-mode {
		border: 0; background: transparent; padding: 0.3rem 0.65rem; border-radius: 999px;
		font: inherit; font-size: 0.72rem; font-weight: 650; color: var(--slate, #5c6b7d); cursor: pointer;
	}
	.stb-mode[data-on] { background: var(--navy, #004c8b); color: #fff; }
	.stb-plot {
		position: relative; border-radius: 12px;
		background: var(--stb-slab);
		border: 1px solid color-mix(in srgb, var(--line, #d9e2ec) 75%, transparent);
		cursor: crosshair; touch-action: none;
	}
	.stb-col { position: absolute; top: 0; bottom: 0; }
	.stb-col--dim .stb-seg {
		filter: none;
		background: color-mix(in srgb, var(--seg-c) 55%, var(--stb-slab));
	}
	.stb-seg {
		position: absolute; left: 0; right: 0; border-radius: 3px 3px 2px 2px;
		background: var(--seg-c);
		transition: height 0.45s cubic-bezier(0.22, 1, 0.36, 1), bottom 0.45s cubic-bezier(0.22, 1, 0.36, 1), background 0.2s ease;
	}
	.stb-esc {
		position: absolute; left: 0; right: 0; border-radius: 2px;
		background: color-mix(in srgb, #b91c1c 55%, transparent);
		transition: height 0.45s cubic-bezier(0.22, 1, 0.36, 1);
	}
	.stb-ring {
		position: absolute; top: 0; left: 0; border-radius: 6px;
		border: 1.5px solid color-mix(in srgb, var(--navy, #004c8b) 55%, transparent);
		box-shadow: 0 0 0 1px color-mix(in srgb, #fff 40%, transparent);
		pointer-events: none;
		transition: transform 0.28s cubic-bezier(0.34, 1.4, 0.64, 1), height 0.28s ease, opacity 0.2s ease;
	}
	.stb-tip {
		position: absolute; top: 8px; left: 0; z-index: 3;
		padding: 0.45rem 0.55rem; border-radius: 10px;
		background: var(--card, #fff);
		border: 1px solid color-mix(in srgb, var(--line, #d9e2ec) 85%, transparent);
		box-shadow: 0 10px 24px rgba(15, 23, 42, 0.12);
		pointer-events: none;
		transition: transform 0.28s cubic-bezier(0.34, 1.4, 0.64, 1), opacity 0.2s ease;
	}
	.stb-tip-head {
		display: flex; justify-content: space-between; gap: 0.5rem;
		font-size: 0.68rem; font-weight: 650; margin-bottom: 0.35rem; color: var(--head-ink, #012a50);
	}
	.stb-tip-row {
		display: flex; align-items: center; gap: 0.35rem; font-size: 0.65rem; color: var(--slate, #5c6b7d);
	}
	.stb-tip-row i {
		width: 0.45rem; height: 0.45rem; border-radius: 2px; background: var(--c, #94a3b8); flex-shrink: 0;
	}
	.stb-tip-row b { margin-left: auto; color: var(--ink, #132234); font-variant-numeric: tabular-nums; }
	.stb-tip-row[data-esc] i { background: color-mix(in srgb, #b91c1c 70%, transparent); }
	.stb-axis {
		display: flex; justify-content: space-between; margin-top: 0.35rem;
		font-size: 0.65rem; color: var(--slate, #5c6b7d); padding: 0 0.25rem;
	}
	@media (prefers-reduced-motion: reduce) {
		.stb-seg, .stb-esc, .stb-ring, .stb-tip { transition: none !important; }
	}
</style>
