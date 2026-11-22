<script module lang="ts">
	type IconSvgElement = readonly (readonly [string, Record<string, string | number>])[];
	type CSSProperties = Record<string, string | number | undefined | null>;
	import type { Snippet } from 'svelte';

	const IconDownload: IconSvgElement = [
		['path', { d: 'M12 3v12m0 0 4-4m-4 4-4-4M5 21h14', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', key: '0' }]
	];
	const IconLayers: IconSvgElement = [
		['path', { d: 'M12 2 3 7l9 5 9-5-9-5Zm0 10 9-5M3 12l9 5 9-5M3 17l9 5 9-5', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', key: '0' }]
	];
	const IconSettings: IconSvgElement = [
		['circle', { cx: '12', cy: '12', r: '3', stroke: 'currentColor', 'stroke-width': '1.5', key: '0' }],
		['path', { d: 'M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32 1.41-1.41', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round', key: '1' }]
	];
	const IconCursor: IconSvgElement = [
		['path', { d: 'M4 4l7 17 2.5-7.5L21 11 4 4Z', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', key: '0' }]
	];
	const IconPaint: IconSvgElement = [
		['path', { d: 'M12 3a9 9 0 0 0-9 9c0 4 3 7 7 7h1a2 2 0 0 0 2-2v-1a2 2 0 0 1 2-2h3a5 5 0 0 0 0-10H12Z', stroke: 'currentColor', 'stroke-width': '1.5', key: '0' }],
		['circle', { cx: '7.5', cy: '10.5', r: '1', fill: 'currentColor', key: '1' }],
		['circle', { cx: '12', cy: '8', r: '1', fill: 'currentColor', key: '2' }]
	];
	const IconRocket: IconSvgElement = [
		['path', { d: 'M5 15c1.5-4 5-8 10-9 1-.2 2 .8 1.8 1.8-1 5-5 8.5-9 10l-3-3Zm0 0-2 5 5-2', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', key: '0' }],
		['circle', { cx: '14', cy: '8', r: '1.5', stroke: 'currentColor', 'stroke-width': '1.5', key: '1' }]
	];
	const IconBell: IconSvgElement = [
		['path', { d: 'M6 9a6 6 0 1 1 12 0c0 3 1 4.5 2 6H4c1-1.5 2-3 2-6Zm4 9a2 2 0 0 0 4 0', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', key: '0' }]
	];
	const IconType: IconSvgElement = [
		['path', { d: 'M4 7V5h16v2M9 19h6M12 5v14', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', key: '0' }]
	];

	export interface BranchedMenuChild {
		value: string;
		label: string;
		icon?: Snippet | string | number | null | IconSvgElement;
	}
	export interface BranchedMenuItem {
		label: string;
		value?: string;
		children?: BranchedMenuChild[];
	}
	export interface BranchedMenuProps {
		items?: BranchedMenuItem[];
		defaultOpen?: number | number[];
		defaultActive?: string;
		onSelect?: (value: string, item: BranchedMenuChild | BranchedMenuItem) => void;
		onToggle?: (index: number, open: boolean) => void;
		color?: string;
		accentColor?: string;
		lineColor?: string;
		width?: number;
		rowHeight?: number;
		indent?: number;
		trunk?: number;
		radius?: number;
		lineWidth?: number;
		fontSize?: number;
		drawDuration?: number;
		foldDuration?: number;
		class?: string;
	}

	const DEFAULT_ITEMS: BranchedMenuItem[] = [
		{
			label: 'Inbound',
			children: [
				{ value: 'receiving', label: 'Receiving', icon: IconDownload },
				{ value: 'putaway', label: 'Putaway', icon: IconLayers },
				{ value: 'cycle-count', label: 'Cycle count', icon: IconSettings }
			]
		},
		{
			label: 'Outbound',
			children: [
				{ value: 'picking', label: 'Picking', icon: IconCursor },
				{ value: 'packing', label: 'Packing', icon: IconPaint },
				{ value: 'shipping', label: 'Shipping', icon: IconRocket },
				{ value: 'wave', label: 'Wave release', icon: IconBell }
			]
		},
		{
			label: 'Masters',
			children: [
				{ value: 'items', label: 'Items', icon: IconType },
				{ value: 'warehouses', label: 'Warehouses', icon: IconLayers },
				{ value: 'bins', label: 'Bins & zones', icon: IconSettings }
			]
		}
	];

	const PAD = 6;
	const MARK = 16;
	const toSet = (open: number | number[]) =>
		new Set(Array.isArray(open) ? open : open >= 0 ? [open] : []);

	function css(value: CSSProperties | undefined): string {
		const unitless =
			/^(opacity|zIndex|fontWeight|lineHeight|flex|flexGrow|flexShrink|order|scale|aspectRatio|strokeWidth|strokeDashoffset|strokeDasharray|fillOpacity|strokeOpacity|stopOpacity|pathLength)$/;
		return Object.entries(value ?? {})
			.filter(([, v]) => v !== undefined && v !== null)
			.map(([key, val]) => {
				const name = key.startsWith('--')
					? key
					: key.replace(/[A-Z]/g, (letter) => '-' + letter.toLowerCase());
				return (
					name +
					':' +
					(typeof val === 'number' && val !== 0 && !key.startsWith('--') && !unitless.test(key)
						? val + 'px'
						: val)
				);
			})
			.join(';');
	}
</script>

<script lang="ts">
	import { untrack } from 'svelte';

	let {
		items = DEFAULT_ITEMS,
		defaultOpen = 0,
		defaultActive = '',
		onSelect,
		onToggle,
		color = '#F5EFE9',
		accentColor = '#F5EFE9',
		lineColor = '#4D4036',
		width = 240,
		rowHeight = 36,
		indent = 40,
		trunk = 14,
		radius = 10,
		lineWidth = 1.5,
		fontSize = 14,
		drawDuration = 400,
		foldDuration = 300,
		class: className = ''
	}: BranchedMenuProps = $props();

	let open = $state<Set<number>>(untrack(() => toSet(defaultOpen)));
	function setOpen(nextState: Set<number> | ((previous: Set<number>) => Set<number>)) {
		open = typeof nextState === 'function' ? nextState(open) : nextState;
	}

	let active = $state(
		untrack(() => {
			if (defaultActive) return defaultActive;
			const first = items.find((it, i) => it.children && toSet(defaultOpen).has(i));
			return first?.children?.[0]?.value ?? '';
		})
	);
	function setActive(nextState: string | ((previous: string) => string)) {
		active = typeof nextState === 'function' ? nextState(active) : nextState;
	}

	let navEl = $state<HTMLElement | null>(null);
	let heads = $state<(HTMLButtonElement | null)[]>([]);
	let markerEl = $state<HTMLSpanElement | null>(null);

	const latest = {
		current: untrack(() => ({})) as {
			onSelect?: BranchedMenuProps['onSelect'];
			onToggle?: BranchedMenuProps['onToggle'];
		}
	};
	$effect.pre(() => {
		latest.current = { onSelect, onToggle };
	});

	const activeSection = $derived(
		items.findIndex((it) => it.children?.some((kid) => kid.value === active))
	);
	const markerShown = $derived(activeSection >= 0 && open.has(activeSection));

	$effect(() => {
		void activeSection;
		void markerShown;
		void items;
		void fontSize;
		void rowHeight;
		return untrack(() => {
			const place = (glide: boolean) => {
				const m = markerEl;
				const el = heads[activeSection];
				if (!m) return;
				const on = markerShown && el;
				if (!glide) m.style.transition = 'none';
				if (on && el) m.style.top = `${el.offsetTop + (el.offsetHeight - MARK) / 2}px`;
				m.toggleAttribute('data-on', Boolean(on));
				if (!glide) {
					void m.offsetHeight;
					m.style.transition = '';
				}
			};
			place(true);
			let first = true;
			const ro = new ResizeObserver(() => {
				if (first) {
					first = false;
					return;
				}
				place(false);
			});
			if (navEl) ro.observe(navEl);
			return () => ro.disconnect();
		});
	});

	const select = (value: string, item: BranchedMenuChild | BranchedMenuItem) => {
		setActive(value);
		latest.current.onSelect?.(value, item);
	};
	const toggle = (i: number) => {
		setOpen((prev) => {
			const next = new Set(prev);
			const isOpen = !next.has(i);
			if (isOpen) next.add(i);
			else next.delete(i);
			latest.current.onToggle?.(i, isOpen);
			return next;
		});
	};

	const r = $derived(Math.min(radius, rowHeight / 2 - 2));
	const endX = $derived(indent - 8);
	const rowY = (k: number) => PAD + k * rowHeight + rowHeight / 2;
	const branch = (k: number) =>
		`M ${trunk} ${rowY(k) - r} A ${r} ${r} 0 0 0 ${trunk + r} ${rowY(k)} H ${endX}`;
	const reach = (k: number) =>
		`M ${trunk} 0 V ${rowY(k) - r} A ${r} ${r} 0 0 0 ${trunk + r} ${rowY(k)} H ${endX}`;
	const length = (k: number) => rowY(k) - r + (Math.PI * r) / 2 + (endX - trunk - r);
</script>

{#snippet renderIcon(icon: BranchedMenuChild['icon'])}
	{#if Array.isArray(icon)}
		{@render iconSvg(icon as IconSvgElement, 16, 1.8)}
	{:else if typeof icon === 'function'}
		{@render icon()}
	{:else}
		{icon}
	{/if}
{/snippet}

{#snippet iconSvg(shapes: IconSvgElement, size: number | string, strokeWidth: number, fill: string = 'none')}
	<svg width={size} height={size} viewBox="0 0 24 24" {fill} stroke="currentColor" stroke-width={strokeWidth} stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
		{#each shapes as [tag, attributes]}
			<svelte:element this={tag} {...attributes} />
		{/each}
	</svg>
{/snippet}

<nav
	bind:this={navEl}
	class="bm relative flex w-fit max-w-[min(var(--bm-w),100%)] flex-col pl-3.5 leading-[1.2] [color:var(--bm-ink)] [font-family:inherit] [font-size:var(--bm-font)] before:absolute before:top-2 before:bottom-0 before:left-0 before:w-0.5 before:rounded-[1px] before:[background:linear-gradient(to_bottom,var(--bm-line)_0%,var(--bm-line)_55%,transparent_100%)] before:content-[''] {className}"
	style={css({
		'--bm-w': `${width}px`,
		'--bm-ink': color,
		'--bm-accent': accentColor,
		'--bm-line': lineColor,
		'--bm-font': `${fontSize}px`,
		'--bm-row': `${rowHeight}px`,
		'--bm-indent': `${indent}px`,
		'--bm-line-w': lineWidth,
		'--bm-draw': `${drawDuration}ms`,
		'--bm-muted': `color-mix(in srgb, ${color} 55%, transparent)`,
		'--bm-fold': `${foldDuration}ms`
	} as CSSProperties)}
>
	<span
		bind:this={markerEl}
		class="absolute -top-px left-0 z-[1] h-4 w-0.5 rounded-[1px] opacity-0 [background:var(--bm-accent)] [transition:top_220ms_cubic-bezier(0.23,1,0.32,1),opacity_150ms_ease] data-[on]:opacity-100 motion-reduce:[transition:opacity_150ms_ease]"
		aria-hidden="true"
	></span>

	{#each items as item, i}
		{@const kids = item.children}
		{@const isOpen = kids ? open.has(i) : false}
		{@const leafValue = item.value ?? item.label}
		{@const leafActive = !kids && leafValue === active}
		{@const bodyH = kids ? PAD * 2 + kids.length * rowHeight : 0}

		<div class="group/section flex flex-col" data-open={isOpen ? '' : undefined}>
			<button
				bind:this={heads[i]}
				type="button"
				class="m-0 block cursor-pointer border-0 bg-transparent py-[9px] text-left font-medium outline-none [color:var(--bm-muted)] [font-family:inherit] [font-size:calc(var(--bm-font)+1px)] [-webkit-tap-highlight-color:transparent] [transition:color_200ms_ease] group-data-[open]/section:[color:var(--bm-ink)] data-[active]:[color:var(--bm-ink)] hover:[color:var(--bm-ink)]"
				aria-expanded={kids ? isOpen : undefined}
				aria-current={leafActive ? 'true' : undefined}
				data-active={leafActive ? '' : undefined}
				onclick={() => (kids ? toggle(i) : select(leafValue, item))}
			>
				{item.label}
			</button>

			{#if kids}
				<div class="grid [grid-template-rows:0fr] [transition:grid-template-rows_var(--bm-fold)_cubic-bezier(0.23,1,0.32,1)] group-data-[open]/section:[grid-template-rows:1fr] motion-reduce:transition-none">
					<div class="min-h-0 overflow-hidden">
						<div class="relative box-border py-1.5" style={css({ height: bodyH })}>
							<svg
								class="pointer-events-none absolute top-0 left-0 overflow-visible opacity-0 [transition:opacity_200ms_ease] group-data-[open]/section:opacity-100 group-data-[open]/section:[transition:opacity_250ms_ease_100ms]"
								width={indent}
								height={bodyH}
								aria-hidden="true"
							>
								<path class="fill-none [stroke:var(--bm-line)] [stroke-width:var(--bm-line-w)] [stroke-linecap:round] [stroke-linejoin:round]" d={`M ${trunk} 0 V ${rowY(kids.length - 1) - r}`}></path>
								{#each kids as _kid, k}
									<path class="fill-none [stroke:var(--bm-line)] [stroke-width:var(--bm-line-w)] [stroke-linecap:round] [stroke-linejoin:round]" d={branch(k)}></path>
								{/each}
								{#each kids as kid, k}
									<path
										class="fill-none [stroke:var(--bm-accent)] [stroke-width:var(--bm-line-w)] [stroke-linecap:round] [stroke-linejoin:round] [transition:stroke-dashoffset_var(--bm-draw)_cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none"
										d={reach(k)}
										style={css({ strokeDasharray: length(k), strokeDashoffset: kid.value === active ? 0 : length(k) })}
									></path>
								{/each}
							</svg>

							{#each kids as kid}
								<button
									type="button"
									class="m-0 box-border flex w-full cursor-pointer items-center gap-2 border-0 bg-transparent py-0 pr-0 text-left outline-none [height:var(--bm-row)] [padding-left:var(--bm-indent)] [color:var(--bm-muted)] [font-family:inherit] [-webkit-tap-highlight-color:transparent] [transition:color_200ms_ease] hover:[color:var(--bm-ink)] data-[active]:font-medium data-[active]:[color:var(--bm-accent)]"
									aria-current={kid.value === active ? 'true' : undefined}
									data-active={kid.value === active ? '' : undefined}
									tabindex={isOpen ? 0 : -1}
									onclick={() => select(kid.value, kid)}
								>
									{#if kid.icon}
										<span class="inline-flex flex-none" aria-hidden="true">{@render renderIcon(kid.icon)}</span>
									{/if}
									<span class="whitespace-nowrap">{kid.label}</span>
								</button>
							{/each}
						</div>
					</div>
				</div>
			{/if}
		</div>
	{/each}
</nav>
