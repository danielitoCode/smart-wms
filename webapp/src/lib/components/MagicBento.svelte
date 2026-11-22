<script module lang="ts">
	import type { Snippet } from 'svelte';

	export type MagicBentoVisual =
		| 'analytics'
		| 'dashboard'
		| 'collaboration'
		| 'automation'
		| 'integration'
		| 'security';

	export interface MagicBentoItem {
		id?: string | number;
		label?: string;
		title?: string;
		description?: string;
		icon?: Snippet;
		image?: string;
		visual?: MagicBentoVisual | Snippet;
		content?: Snippet;
		href?: string;
		target?: string;
		rel?: string;
		onClick?: (event: MouseEvent) => void;
		colSpan?: number;
		rowSpan?: number;
	}

	export interface MagicBentoProps {
		items?: MagicBentoItem[];
		columns?: number;
		rowHeight?: number;
		gap?: number;
		radius?: number;
		theme?: 'dark' | 'light';
		glowColor?: string;
		textAutoHide?: boolean;
		enableBorderGlow?: boolean;
		enableSpotlight?: boolean;
		spotlightRadius?: number;
		intro?: boolean;
		disableAnimations?: boolean;
		onItemClick?: (item: MagicBentoItem, index: number) => void;
		class?: string;
		style?: string;
	}

	const THEMES: Record<'dark' | 'light', Record<string, string | number>> = {
		dark: {
			'--mb-surface': 'linear-gradient(180deg, #1d1814 0%, #15120f 100%)',
			'--mb-edge': 'rgba(255, 255, 255, 0.07)',
			'--mb-highlight': 'rgba(255, 255, 255, 0.06)',
			'--mb-shadow': '0 24px 48px -28px rgba(0, 0, 0, 0.85), 0 8px 18px -12px rgba(0, 0, 0, 0.6)',
			'--mb-tile': 'linear-gradient(180deg, #3d352e 0%, #2a241f 100%)',
			'--mb-tile-edge': 'rgba(255, 255, 255, 0.07)',
			'--mb-tile-highlight': 'rgba(255, 255, 255, 0.12)',
			'--mb-tile-shadow': '0 4px 10px -4px rgba(0, 0, 0, 0.7)',
			'--mb-well': 'rgba(255, 255, 255, 0.03)',
			'--mb-well-edge': 'rgba(255, 255, 255, 0.06)',
			'--mb-ink': '#f4f4f5',
			'--mb-muted': 'rgba(244, 244, 245, 0.6)',
			'--mb-faint': 'rgba(244, 244, 245, 0.3)',
			'--mb-line': 'rgba(244, 244, 245, 0.1)',
			'--mb-secondary': '#a8a29e',
			'--mb-secondary-ink': '#14110e',
			'--mb-focus': 'rgba(244, 244, 245, 0.5)',
			'--mb-glow-alpha': 0.85,
			'--mb-spot-alpha': 0.07
		},
		light: {
			'--mb-surface': 'linear-gradient(180deg, #ffffff 0%, #f8f7f5 100%)',
			'--mb-edge': 'rgba(24, 24, 27, 0.08)',
			'--mb-highlight': 'rgba(255, 255, 255, 1)',
			'--mb-shadow': '0 24px 48px -30px rgba(24, 24, 27, 0.28), 0 8px 18px -14px rgba(24, 24, 27, 0.16)',
			'--mb-tile': 'linear-gradient(180deg, #ffffff 0%, #f7f6f4 100%)',
			'--mb-tile-edge': 'rgba(24, 24, 27, 0.08)',
			'--mb-tile-highlight': 'rgba(255, 255, 255, 1)',
			'--mb-tile-shadow': '0 4px 10px -5px rgba(24, 24, 27, 0.22)',
			'--mb-well': 'rgba(24, 24, 27, 0.025)',
			'--mb-well-edge': 'rgba(24, 24, 27, 0.06)',
			'--mb-ink': '#18181b',
			'--mb-muted': 'rgba(24, 24, 27, 0.6)',
			'--mb-faint': 'rgba(24, 24, 27, 0.3)',
			'--mb-line': 'rgba(24, 24, 27, 0.08)',
			'--mb-secondary': '#78716c',
			'--mb-secondary-ink': '#ffffff',
			'--mb-focus': 'rgba(24, 24, 27, 0.4)',
			'--mb-glow-alpha': 0.5,
			'--mb-spot-alpha': 0.035
		}
	};

	const DEFAULT_ITEMS: MagicBentoItem[] = [
		{ title: 'Throughput', description: 'Units shipped / day', visual: 'analytics', label: 'Outbound' },
		{ title: 'Occupancy', description: 'Bin utilization by zone', visual: 'dashboard', label: 'Inventory' },
		{
			title: 'Cycle count',
			description: 'Operators reconcile bins in parallel',
			visual: 'collaboration',
			label: 'Accuracy',
			colSpan: 2,
			rowSpan: 2
		},
		{
			title: 'Wave pipeline',
			description: 'Receive → putaway → pick → ship',
			visual: 'automation',
			label: 'Floor ops',
			colSpan: 2,
			rowSpan: 2
		},
		{ title: 'Connectors', description: 'ERP, carriers and scanners', visual: 'integration', label: 'Integrations' },
		{ title: 'Access control', description: 'Warehouse roles and zones', visual: 'security', label: 'Security' }
	];

	const CHART = [4.2, 4.8, 4.5, 5.6, 5.1, 6.4, 6.0, 7.2, 6.9, 8.5, 9.8, 11.3];
	const BARS = [54, 61, 58, 72, 69, 81, 76];
	const STEPS = [
		{ label: 'Receive', time: '12m' },
		{ label: 'Putaway', time: '18m' },
		{ label: 'Pick wave', time: '34m' },
		{ label: 'Ship', time: '9m' }
	];
	const APPS = [
		{ key: 'erp', x: '17%', y: '24%' },
		{ key: 'carrier', x: '83%', y: '24%' },
		{ key: 'scanner', x: '17%', y: '78%' },
		{ key: 'edi', x: '83%', y: '78%' }
	] as const;
	const SETTINGS = [
		{ key: 'roles', label: 'Roles' },
		{ key: 'zones', label: 'Zones' }
	] as const;

	const VISUAL_NAMES = new Set(['analytics', 'dashboard', 'collaboration', 'automation', 'integration', 'security']);

	const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
	const vars = (o: Record<string, string | number>) =>
		Object.entries(o).map(([k, v]) => `${k}: ${v}`).join('; ');

	const parseRgb = (value?: string | null): number[] | null => {
		if (!value) return null;
		const text = String(value).trim();
		const hex = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(text);
		if (hex) {
			const full = hex[1].length === 3 ? hex[1].replace(/./g, (d) => d + d) : hex[1];
			return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
		}
		const numbers = text.match(/[\d.]+/g);
		if (numbers && numbers.length >= 3) {
			return numbers.slice(0, 3).map((c) => clamp(Math.round(parseFloat(c)), 0, 255));
		}
		return null;
	};

	const inkFor = (rgb: number[]) => {
		const [r, g, b] = rgb.map((c) => c / 255);
		return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.55 ? '#14110e' : '#ffffff';
	};

	const curve = (values: number[], width: number, height: number) => {
		const top = 6;
		const bottom = 2;
		const low = Math.min(...values) * 0.7;
		const high = Math.max(...values);
		const points = values.map((value, index) => [
			(index / (values.length - 1)) * width,
			top + (1 - (value - low) / (high - low)) * (height - top - bottom)
		]);
		let line = `M${points[0][0].toFixed(1)},${points[0][1].toFixed(1)}`;
		for (let i = 1; i < points.length; i++) {
			const [x0, y0] = points[i - 1];
			const [x1, y1] = points[i];
			const cx = (x0 + x1) / 2;
			line += ` C${cx.toFixed(1)},${y0.toFixed(1)} ${cx.toFixed(1)},${y1.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`;
		}
		const last = points[points.length - 1];
		const first = points[0];
		const area = `${line} L${last[0].toFixed(1)},${height} L${first[0].toFixed(1)},${height} Z`;
		return { line, area };
	};
</script>

<script lang="ts">
	let {
		items = DEFAULT_ITEMS,
		columns = 4,
		rowHeight = 180,
		gap = 12,
		radius = 18,
		theme = 'dark',
		glowColor,
		textAutoHide = true,
		enableBorderGlow = true,
		enableSpotlight = true,
		spotlightRadius = 280,
		intro = true,
		disableAnimations = false,
		onItemClick,
		class: className = '',
		style = ''
	}: MagicBentoProps = $props();

	const palette = $derived<'dark' | 'light'>(theme === 'light' ? 'light' : 'dark');
	const glow = $derived(parseRgb(glowColor) ?? (palette === 'dark' ? [201, 162, 39] : [0, 76, 139]));
	const span = $derived(Math.max(1, Math.round(columns)));

	let rootEl = $state<HTMLDivElement | null>(null);
	let pointer = $state({ x: -999, y: -999 });

	const rootStyle = $derived(
		[
			vars({
				...THEMES[palette],
				'--mb-glow-rgb': glow.join(', '),
				'--mb-accent-rgb': glow.join(', '),
				'--mb-accent-ink': inkFor(glow),
				'--mb-radius': `${Math.max(0, radius)}px`,
				'--mb-inner-radius': `${Math.round(clamp(radius * 0.5, 6, 12))}px`,
				'--mb-pad': `${Math.round(clamp(radius * 0.85, 14, 20))}px`,
				'--mb-spot-size': `${Math.max(40, spotlightRadius)}px`,
				'--mb-x': `${pointer.x}px`,
				'--mb-y': `${pointer.y}px`
			}),
			`grid-template-columns: repeat(${span}, minmax(0, 1fr))`,
			`grid-auto-rows: ${span === 1 ? `minmax(${rowHeight}px, auto)` : `${rowHeight}px`}`,
			`gap: ${Math.max(0, gap)}px`,
			style
		]
			.filter(Boolean)
			.join('; ')
	);

	const chartShape = $derived(curve(CHART, 240, 72));

	function onMove(e: PointerEvent) {
		if (!rootEl || !enableSpotlight) return;
		const r = rootEl.getBoundingClientRect();
		pointer = { x: e.clientX - r.left, y: e.clientY - r.top };
	}

	function onLeave() {
		pointer = { x: -999, y: -999 };
	}

	const isClickable = (entry: MagicBentoItem) => Boolean(entry.href || entry.onClick || onItemClick);

	function handleClick(event: MouseEvent, entry: MagicBentoItem, index: number) {
		entry.onClick?.(event);
		onItemClick?.(entry, index);
	}
</script>

{#snippet hubIcon(key: string)}
	{#if key === 'erp'}
		<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
			<rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
		</svg>
	{:else if key === 'carrier'}
		<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
			<path d="M1 17h15V6H1v11Z" /><path d="M16 10h4l3 4v3h-7v-7Z" /><circle cx="5.5" cy="17.5" r="2.5" /><circle cx="18.5" cy="17.5" r="2.5" />
		</svg>
	{:else if key === 'scanner'}
		<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
			<path d="M4 7V5a1 1 0 0 1 1-1h2M4 17v2a1 1 0 0 0 1 1h2M20 7V5a1 1 0 0 0-1-1h-2M20 17v2a1 1 0 0 1-1 1h-2" /><path d="M7 12h10" />
		</svg>
	{:else}
		<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
			<path d="M4 7h16M4 12h10M4 17h7" /><path d="M16 14l4 3-4 3v-6Z" />
		</svg>
	{/if}
{/snippet}

{#snippet settingIcon(key: string)}
	{#if key === 'roles'}
		<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
			<path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" /><path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6" />
		</svg>
	{:else}
		<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
			<path d="M3 7h18M3 12h18M3 17h18" /><path d="M8 5v4M14 10v4M10 15v4" />
		</svg>
	{/if}
{/snippet}

{#snippet analyticsVisual()}
	<div class="mb-chart">
		<div class="mb-figure">
			<span class="mb-figure__value">{CHART[CHART.length - 1].toFixed(1)}k</span>
			<span class="mb-figure__note">+12% vs LW</span>
		</div>
		<svg class="mb-plot" viewBox="0 0 240 72" preserveAspectRatio="none" aria-hidden="true">
			<path class="mb-area" d={chartShape.area} />
			<path class="mb-line" d={chartShape.line} />
		</svg>
	</div>
{/snippet}

{#snippet dashboardVisual()}
	<div class="mb-bars">
		<div class="mb-figure">
			<span class="mb-figure__value">76%</span>
			<span class="mb-figure__note">Avg occupancy</span>
		</div>
		<div class="mb-bars__plot">
			{#each BARS as height, index (index)}
				<span
					class="mb-bar"
					class:peak={height === Math.max(...BARS)}
					style="--h: {height / 100}; --i: {index}"
				></span>
			{/each}
		</div>
	</div>
{/snippet}

{#snippet collaborationVisual()}
	<div class="mb-collab">
		<span class="mb-doc-title">Cycle count · Zone B</span>
		<div class="mb-lines">
			<span style="--w: 92%"></span>
			<span style="--w: 78%"></span>
			<span style="--w: 86%"></span>
			<span style="--w: 44%"></span>
			<span class="gap" style="--w: 88%"></span>
			<span style="--w: 70%" class="selected">
				<span class="sel"><span class="caret"></span></span>
			</span>
			<span style="--w: 82%"></span>
		</div>
		<span class="mb-cursor primary" style="--x: 58%; --y: 52%">
			<svg width="16" height="18" viewBox="0 0 16 18" aria-hidden="true"><path d="M2.2 1.6 13.4 9.9c.5.4.3 1.2-.4 1.3l-4.6.6-2.2 4.2c-.3.6-1.2.5-1.4-.1L1.2 2.4c-.2-.6.5-1.1 1-.8Z" fill="currentColor" stroke="#14110e" stroke-width="1.2" /></svg>
			<span class="name">Ana</span>
		</span>
		<span class="mb-cursor secondary" style="--x: 30%; --y: 24%">
			<svg width="16" height="18" viewBox="0 0 16 18" aria-hidden="true"><path d="M2.2 1.6 13.4 9.9c.5.4.3 1.2-.4 1.3l-4.6.6-2.2 4.2c-.3.6-1.2.5-1.4-.1L1.2 2.4c-.2-.6.5-1.1 1-.8Z" fill="currentColor" stroke="#14110e" stroke-width="1.2" /></svg>
			<span class="name">Luis</span>
		</span>
	</div>
{/snippet}

{#snippet automationVisual()}
	<div class="mb-flow" style="--n: {STEPS.length}">
		<div class="mb-trigger">
			<span class="glyph">
				<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
					<path d="M6 3v12" /><circle cx="6" cy="18" r="2.5" /><circle cx="18" cy="6" r="2.5" /><path d="M18 8.5V13a4 4 0 0 1-4 4H8.5" />
				</svg>
			</span>
			<span class="copy">
				<span class="name">Wave #4821</span>
				<span class="hash">WH-NORTE</span>
			</span>
		</div>
		<ol class="mb-steps">
			<span class="rail" aria-hidden="true"><span class="fill"></span></span>
			{#each STEPS as step, index (step.label)}
				<li style="--i: {index}">
					<span class="status">
						<span class="done">
							<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12.5 9.5 18 20 7" /></svg>
						</span>
					</span>
					{step.label}
					<span class="time">{step.time}</span>
				</li>
			{/each}
		</ol>
	</div>
{/snippet}

{#snippet integrationVisual()}
	<div class="mb-hub">
		<svg class="links" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
			{#each APPS as app (app.x + app.y)}
				<line x1={parseFloat(app.x)} y1={parseFloat(app.y)} x2="50" y2="51" />
			{/each}
		</svg>
		{#each APPS as app, index (app.x + app.y)}
			<span class="node" style="--x: {app.x}; --y: {app.y}; --s: 26px; --i: {index + 1}">
				{@render hubIcon(app.key)}
			</span>
		{/each}
		<span class="node core" style="--x: 50%; --y: 51%; --s: 34px; --i: 0">
			<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
				<path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
			</svg>
		</span>
	</div>
{/snippet}

{#snippet securityVisual()}
	<div class="mb-shield">
		{#each SETTINGS as setting, index (setting.label)}
			<div class="setting">
				{@render settingIcon(setting.key)}
				<span class="label">{setting.label}</span>
				<span class="switch" style="--i: {index}"></span>
			</div>
		{/each}
	</div>
{/snippet}

{#snippet builtin(name: string)}
	{#if name === 'analytics'}
		{@render analyticsVisual()}
	{:else if name === 'dashboard'}
		{@render dashboardVisual()}
	{:else if name === 'collaboration'}
		{@render collaborationVisual()}
	{:else if name === 'automation'}
		{@render automationVisual()}
	{:else if name === 'integration'}
		{@render integrationVisual()}
	{:else if name === 'security'}
		{@render securityVisual()}
	{/if}
{/snippet}

{#snippet body(entry: MagicBentoItem)}
	{@const hasVisual =
		typeof entry.visual === 'string' ? VISUAL_NAMES.has(entry.visual) : typeof entry.visual === 'function'}
	{#if enableSpotlight}
		<span class="mb-light"></span>
	{/if}
	<div class="mb-content">
		{#if entry.content}
			{@render entry.content()}
		{:else}
			{#if entry.icon || entry.label}
				<div class="mb-header">
					{#if entry.icon}
						<span class="mb-icon">{@render entry.icon()}</span>
					{/if}
					{#if entry.label}
						<span class="mb-label">{entry.label}</span>
					{/if}
				</div>
			{/if}
			{#if hasVisual}
				<div class="mb-visual" aria-hidden="true">
					{#if typeof entry.visual === 'string'}
						{@render builtin(entry.visual)}
					{:else if typeof entry.visual === 'function'}
						{@render entry.visual()}
					{/if}
				</div>
			{/if}
			{#if entry.title || entry.description}
				<div class="mb-text">
					{#if entry.title}
						<h3 class="mb-title">{entry.title}</h3>
					{/if}
					{#if entry.description}
						<p class="mb-desc">{entry.description}</p>
					{/if}
				</div>
			{/if}
		{/if}
	</div>
	<span class="mb-rim"></span>
	{#if enableBorderGlow}
		<span class="mb-border"></span>
	{/if}
{/snippet}

<div
	bind:this={rootEl}
	class="magic-bento {className}"
	data-autohide={textAutoHide ? '' : undefined}
	data-motion={disableAnimations ? undefined : ''}
	data-intro={intro && !disableAnimations ? '' : undefined}
	style={rootStyle}
	onpointermove={onMove}
	onpointerleave={onLeave}
>
	{#each items as item, index (item?.id ?? index)}
		{@const entry = item ?? {}}
		{@const clickable = isClickable(entry)}
		<div
			class="magic-bento__cell"
			style="--mb-delay: {index * 80}ms; grid-column: span {Math.min(span, Math.max(1, Math.round(entry.colSpan ?? 1)))}; grid-row: span {Math.max(1, Math.round(entry.rowSpan ?? 1))};"
			data-state="in"
		>
			{#if entry.href}
				<a
					class="magic-bento__card"
					data-clickable={clickable ? '' : undefined}
					href={entry.href}
					target={entry.target}
					rel={entry.rel}
					onclick={clickable ? (event) => handleClick(event, entry, index) : undefined}
				>
					{@render body(entry)}
				</a>
			{:else if clickable}
				<div
					class="magic-bento__card"
					data-clickable=""
					role="button"
					tabindex="0"
					aria-label={entry.title}
					onclick={(event) => handleClick(event, entry, index)}
					onkeydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							handleClick(e as unknown as MouseEvent, entry, index);
						}
					}}
				>
					{@render body(entry)}
				</div>
			{:else}
				<div class="magic-bento__card">
					{@render body(entry)}
				</div>
			{/if}
		</div>
	{/each}
</div>

<style>
	.magic-bento {
		position: relative;
		box-sizing: border-box;
		display: grid;
		width: 100%;
		grid-auto-flow: row dense;
		color: var(--mb-ink);
		-webkit-tap-highlight-color: transparent;
	}
	.magic-bento[data-intro] .magic-bento__cell {
		opacity: 0;
		transform: translate3d(0, 16px, 0) scale(0.97);
	}
	.magic-bento[data-intro] .magic-bento__cell[data-state='in'] {
		opacity: 1;
		transform: none;
		transition:
			opacity 420ms cubic-bezier(0.22, 1, 0.36, 1) var(--mb-delay),
			transform 760ms cubic-bezier(0.34, 1.4, 0.64, 1) var(--mb-delay);
	}
	.magic-bento__cell {
		position: relative;
		min-height: 0;
		min-width: 0;
	}
	.magic-bento__card {
		position: relative;
		box-sizing: border-box;
		isolation: isolate;
		display: flex;
		height: 100%;
		width: 100%;
		flex-direction: column;
		overflow: hidden;
		border-radius: var(--mb-radius);
		color: var(--mb-ink);
		text-decoration: none;
		outline: none;
		background: var(--mb-surface);
		box-shadow: var(--mb-shadow);
		user-select: none;
	}
	.magic-bento__card[data-clickable] {
		cursor: pointer;
	}
	.magic-bento__card:focus-visible {
		box-shadow: var(--mb-shadow), 0 0 0 2px var(--mb-focus);
	}

	.mb-light {
		pointer-events: none;
		position: absolute;
		inset: 0;
		z-index: 1;
		border-radius: inherit;
		background: radial-gradient(
			var(--mb-spot-size) circle at var(--mb-x, -999px) var(--mb-y, -999px),
			rgba(var(--mb-glow-rgb), calc(var(--mb-spot-alpha))) 0%,
			transparent 70%
		);
	}
	.mb-rim {
		pointer-events: none;
		position: absolute;
		inset: 0;
		z-index: 3;
		border-radius: inherit;
		box-shadow: inset 0 0 0 1px var(--mb-edge), inset 0 1px 0 var(--mb-highlight);
	}
	.mb-border {
		pointer-events: none;
		position: absolute;
		inset: 0;
		z-index: 4;
		box-sizing: border-box;
		border-radius: inherit;
		padding: 1px;
		background: radial-gradient(
			280px circle at var(--mb-x, -999px) var(--mb-y, -999px),
			rgba(var(--mb-glow-rgb), calc(var(--mb-glow-alpha) * 0.9)) 0%,
			transparent 70%
		);
		-webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
		-webkit-mask-composite: xor;
		mask: linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0);
	}

	.mb-content {
		position: relative;
		z-index: 2;
		box-sizing: border-box;
		display: flex;
		min-height: 0;
		flex: 1;
		flex-direction: column;
		gap: 0.75rem;
		padding: var(--mb-pad);
	}
	.mb-header {
		display: flex;
		min-width: 0;
		align-items: center;
		gap: 0.5rem;
		font-size: 12px;
		line-height: 16px;
		font-weight: 500;
		color: var(--mb-muted);
	}
	.mb-label {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.mb-visual {
		position: relative;
		display: flex;
		min-height: 0;
		flex: 1;
		flex-direction: column;
		justify-content: center;
	}
	.mb-text {
		margin-top: auto;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}
	.mb-title {
		margin: 0;
		font-size: 15px;
		line-height: 20px;
		font-weight: 600;
		letter-spacing: -0.01em;
		color: var(--mb-ink);
	}
	.mb-desc {
		margin: 0;
		font-size: 13px;
		line-height: 1.45;
		color: var(--mb-muted);
	}
	.magic-bento[data-autohide] .mb-title {
		display: -webkit-box;
		-webkit-line-clamp: 1;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	.magic-bento[data-autohide] .mb-desc {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.mb-figure {
		display: flex;
		min-width: 0;
		align-items: baseline;
		gap: 0.35rem;
		white-space: nowrap;
	}
	.mb-figure__value {
		font-size: 15px;
		line-height: 18px;
		font-weight: 600;
		letter-spacing: -0.02em;
		font-variant-numeric: tabular-nums;
		color: var(--mb-ink);
	}
	.mb-figure__note {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		font-size: 11.5px;
		line-height: 14px;
		color: var(--mb-muted);
		font-variant-numeric: tabular-nums;
	}
	.mb-chart {
		display: flex;
		min-height: 0;
		flex: 1;
		flex-direction: column;
	}
	.mb-plot {
		margin-top: 0.35rem;
		width: 100%;
		height: 100%;
		min-height: 48px;
		flex: 1;
		overflow: visible;
	}
	.mb-area {
		fill: rgba(var(--mb-accent-rgb), 0.14);
	}
	.mb-line {
		fill: none;
		stroke: rgb(var(--mb-accent-rgb));
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 1.6;
	}
	.magic-bento[data-motion] .mb-line {
		stroke-dasharray: 1;
		stroke-dashoffset: 1;
		animation: mb-draw 1.1s cubic-bezier(0.65, 0, 0.35, 1) calc(var(--mb-delay) + 220ms) both;
	}
	.magic-bento[data-motion] .mb-area {
		opacity: 0;
		animation: mb-fade 0.7s ease calc(var(--mb-delay) + 700ms) both;
	}

	.mb-bars {
		display: flex;
		min-height: 0;
		flex: 1;
		flex-direction: column;
	}
	.mb-bars__plot {
		margin-top: 0.5rem;
		display: flex;
		min-height: 0;
		flex: 1;
		align-items: flex-end;
		gap: 5px;
	}
	.mb-bar {
		position: relative;
		height: calc(var(--h) * 100%);
		min-height: 3px;
		flex: 1;
		transform-origin: bottom;
		border-radius: 3px 3px 2px 2px;
		background: rgba(var(--mb-accent-rgb), 0.18);
		transition: background-color 0.2s;
	}
	.mb-bar.peak {
		background: rgb(var(--mb-accent-rgb));
	}
	.magic-bento[data-motion] .mb-bar {
		animation: mb-grow 0.76s cubic-bezier(0.34, 1.4, 0.64, 1) calc(var(--mb-delay) + 200ms + var(--i) * 55ms) both;
	}

	.mb-collab {
		position: relative;
		display: flex;
		min-height: 0;
		flex-direction: column;
		overflow: hidden;
		padding: 1rem 1rem 1.35rem;
		border-radius: var(--mb-inner-radius);
		background: var(--mb-well);
		box-shadow: inset 0 0 0 1px var(--mb-well-edge);
	}
	.mb-doc-title {
		font-size: 13px;
		line-height: 18px;
		font-weight: 600;
		color: var(--mb-ink);
	}
	.mb-lines {
		margin-top: 1.1rem;
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
	}
	.mb-lines > span {
		position: relative;
		height: 6px;
		width: var(--w);
		border-radius: 3px;
		background: var(--mb-line);
	}
	.mb-lines > span.gap {
		margin-top: 0.5rem;
	}
	.mb-lines .sel {
		position: absolute;
		top: -4px;
		bottom: -4px;
		left: 18%;
		width: 58%;
		border-radius: 3px;
		background: rgba(var(--mb-accent-rgb), 0.16);
	}
	.mb-lines .caret {
		position: absolute;
		top: -5px;
		right: -1px;
		bottom: -5px;
		width: 1.5px;
		border-radius: 1px;
		background: rgb(var(--mb-accent-rgb));
		animation: mb-blink 1.1s steps(1) infinite;
	}
	.mb-cursor {
		pointer-events: none;
		position: absolute;
		top: var(--y);
		left: var(--x);
		z-index: 2;
		display: flex;
		align-items: flex-start;
		color: rgb(var(--mb-accent-rgb));
	}
	.mb-cursor.secondary {
		color: var(--mb-secondary);
	}
	.mb-cursor .name {
		margin-top: 13px;
		margin-left: -2px;
		border-radius: 7px;
		padding: 2px 7px;
		font-size: 10.5px;
		line-height: 14px;
		font-weight: 600;
		white-space: nowrap;
		color: var(--mb-accent-ink);
		background: rgb(var(--mb-accent-rgb));
	}
	.mb-cursor.secondary .name {
		color: var(--mb-secondary-ink);
		background: var(--mb-secondary);
	}

	.mb-flow {
		position: relative;
		display: flex;
		min-height: 0;
		flex-direction: column;
		gap: 0.5rem;
	}
	.mb-trigger {
		position: relative;
		box-sizing: border-box;
		display: flex;
		align-items: center;
		gap: 0.6rem;
		border-radius: var(--mb-inner-radius);
		padding: 0.5rem 0.75rem 0.5rem 0.5rem;
		background: var(--mb-tile);
		box-shadow: var(--mb-tile-shadow);
	}
	.mb-trigger .glyph {
		display: grid;
		height: 1.75rem;
		width: 1.75rem;
		flex: none;
		place-items: center;
		border-radius: calc(var(--mb-inner-radius) - 2px);
		color: var(--mb-ink);
		background: var(--mb-well);
	}
	.mb-trigger .copy {
		display: flex;
		min-width: 0;
		flex-direction: column;
	}
	.mb-trigger .name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 13px;
		line-height: 17px;
		font-weight: 600;
		color: var(--mb-ink);
	}
	.mb-trigger .hash {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-family: ui-monospace, monospace;
		font-size: 11px;
		line-height: 15px;
		color: var(--mb-muted);
	}
	.mb-steps {
		position: relative;
		margin: 0;
		display: flex;
		list-style: none;
		flex-direction: column;
		gap: 2px;
		padding: 2px 0 0;
		border-radius: var(--mb-inner-radius);
		background: var(--mb-well);
		box-shadow: inset 0 0 0 1px var(--mb-well-edge);
	}
	.mb-steps .rail {
		position: absolute;
		top: 1rem;
		bottom: 1rem;
		left: 21px;
		width: 1px;
		background: var(--mb-line);
	}
	.mb-steps .rail .fill {
		position: absolute;
		inset: 0;
		transform-origin: top;
		background: rgba(var(--mb-accent-rgb), 0.55);
		animation: mb-rail calc(var(--n) * 0.4s) linear both;
	}
	.mb-steps li {
		position: relative;
		display: flex;
		height: 33px;
		align-items: center;
		gap: 0.6rem;
		padding: 0 0.75rem 0 0.85rem;
		font-size: 13px;
		line-height: 16px;
		color: var(--mb-ink);
	}
	.mb-steps .status {
		position: relative;
		display: grid;
		height: 1rem;
		width: 1rem;
		flex: none;
		place-items: center;
	}
	.mb-steps .done {
		display: grid;
		height: 1rem;
		width: 1rem;
		place-items: center;
		border-radius: 999px;
		color: var(--mb-accent-ink);
		background: rgb(var(--mb-accent-rgb));
	}
	.mb-steps .time {
		margin-left: auto;
		font-size: 12px;
		color: var(--mb-muted);
		font-variant-numeric: tabular-nums;
	}

	.mb-hub {
		position: relative;
		margin-inline: auto;
		min-height: 0;
		width: 100%;
		max-width: 240px;
		flex: 1;
		aspect-ratio: 1;
	}
	.mb-hub .links {
		position: absolute;
		inset: 0;
		height: 100%;
		width: 100%;
		overflow: visible;
	}
	.mb-hub .links line {
		stroke: var(--mb-line);
		stroke-width: 1;
		vector-effect: non-scaling-stroke;
	}
	.mb-hub .node {
		position: absolute;
		top: var(--y);
		left: var(--x);
		margin-top: calc(var(--s) * -0.5);
		margin-left: calc(var(--s) * -0.5);
		box-sizing: border-box;
		display: grid;
		height: var(--s);
		width: var(--s);
		place-items: center;
		border-radius: calc(var(--s) * 0.3);
		color: var(--mb-ink);
		background: var(--mb-tile);
		box-shadow: var(--mb-tile-shadow);
	}
	.magic-bento[data-motion] .mb-hub .node {
		animation: mb-pop 0.52s cubic-bezier(0.34, 1.4, 0.64, 1) calc(var(--mb-delay) + 200ms + var(--i) * 70ms) both;
	}

	.mb-shield {
		display: flex;
		min-height: 0;
		width: 100%;
		max-width: 320px;
		flex: 1;
		flex-direction: column;
		justify-content: center;
		gap: 0.5rem;
	}
	.mb-shield .setting {
		position: relative;
		box-sizing: border-box;
		display: flex;
		height: 2rem;
		flex: none;
		align-items: center;
		gap: 0.5rem;
		border-radius: var(--mb-inner-radius);
		padding: 0 0.5rem 0 0.6rem;
		font-size: 12.5px;
		line-height: 16px;
		font-weight: 500;
		color: var(--mb-ink);
		background: var(--mb-tile);
		box-shadow: var(--mb-tile-shadow);
	}
	.mb-shield .label {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.mb-shield .switch {
		position: relative;
		margin-left: auto;
		height: 16px;
		width: 26px;
		flex: none;
		border-radius: 8px;
		background: rgb(var(--mb-accent-rgb));
	}
	.mb-shield .switch::after {
		content: '';
		position: absolute;
		top: 2px;
		left: 2px;
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: var(--mb-accent-ink);
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
		transform: translateX(10px);
	}

	@keyframes mb-draw {
		from {
			stroke-dashoffset: 1;
		}
		to {
			stroke-dashoffset: 0;
		}
	}
	@keyframes mb-fade {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
	@keyframes mb-grow {
		from {
			transform: scaleY(0);
		}
		to {
			transform: scaleY(1);
		}
	}
	@keyframes mb-pop {
		from {
			opacity: 0;
			scale: 0.6;
		}
		to {
			opacity: 1;
			scale: 1;
		}
	}
	@keyframes mb-blink {
		0%,
		49% {
			opacity: 1;
		}
		50%,
		100% {
			opacity: 0;
		}
	}
	@keyframes mb-rail {
		from {
			transform: scaleY(0);
		}
		to {
			transform: scaleY(1);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.magic-bento[data-intro] .magic-bento__cell,
		.magic-bento[data-motion] .mb-line,
		.magic-bento[data-motion] .mb-area,
		.magic-bento[data-motion] .mb-bar,
		.magic-bento[data-motion] .mb-hub .node {
			animation: none !important;
			transition: none !important;
			opacity: 1 !important;
			transform: none !important;
		}
	}
</style>
