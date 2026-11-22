<script module lang="ts">
	export interface FlowingMenuItem {
		text: string;
		link?: string;
		image?: string;
		marquee?: string;
		meta?: string;
	}

	export interface FlowingMenuProps {
		items?: FlowingMenuItem[];
		speed?: number;
		direction?: 'left' | 'right' | 'alternate';
		followCursor?: number;
		duration?: number;
		stretch?: number;
		magnet?: number;
		bandInset?: number;
		bandRadius?: number;
		carryContent?: boolean;
		textColor?: string;
		bgColor?: string;
		marqueeBgColor?: string;
		marqueeTextColor?: string;
		borderColor?: string;
		dividers?: boolean;
		dimInactive?: boolean;
		align?: 'center' | 'left';
		showIndex?: boolean;
		showArrow?: boolean;
		imageShape?: 'pill' | 'rounded' | 'circle';
		intro?: boolean;
		activeIndex?: number;
		onItemClick?: (item: FlowingMenuItem, index: number, event: MouseEvent) => void;
		ariaLabel?: string;
		class?: string;
		style?: string;
	}

	interface Row {
		item?: HTMLLIElement | null;
		band?: HTMLDivElement | null;
		track?: HTMLDivElement | null;
	}

	interface Marquee {
		x: number;
		part: number;
		spin: number;
		covered: boolean;
	}

	interface Metric {
		top: number;
		height: number;
	}

	type Edge = 'top' | 'bottom' | 'center';

	const ROOT = 'group/fm relative box-border h-full w-full overflow-hidden';
	const LIST = 'relative m-0 flex h-full list-none flex-col p-0';
	const ITEM = 'group/item relative min-h-14 flex-[1_1_0] overflow-hidden [container-type:size]';
	const DIVIDER =
		'pointer-events-none absolute top-0 right-0 left-0 h-px origin-left bg-[var(--flowing-menu-border,rgba(255,255,255,0.14))]';
	const LINK =
		'relative box-border grid h-full w-full cursor-pointer grid-cols-[1fr_auto_1fr] items-center gap-4 border-0 bg-transparent px-[clamp(16px,4cqw,40px)] py-0 text-left text-inherit no-underline outline-none transition-opacity duration-[450ms] ease-[ease] [-webkit-tap-highlight-color:transparent] [font:inherit] group-data-[align=left]/fm:grid-cols-[auto_1fr_auto] group-data-[dimmed]/item:opacity-32 focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-current';
	const INDEX = 'min-w-[1.6em] justify-self-start text-[clamp(11px,12cqh,15px)] tabular-nums opacity-50';
	const LABEL =
		'flex items-center gap-[0.28em] justify-self-center overflow-hidden py-[0.06em] text-[clamp(16px,40cqh,140px)] leading-[1.1] font-medium tracking-[-0.035em] whitespace-nowrap group-data-[align=left]/fm:justify-self-start';
	const LABEL_TEXT = 'block';
	const DOT = 'block h-[0.2em] w-[0.2em] shrink-0 rounded-full bg-current';
	const END = 'flex items-center gap-3.5 justify-self-end';
	const META = 'text-[clamp(11px,12cqh,15px)] tabular-nums opacity-50';
	const ARROW = 'grid place-items-center opacity-55';
	const BAND = 'pointer-events-none invisible absolute inset-0 z-[1] overflow-hidden [clip-path:inset(50%_0_50%_0)]';
	const TRACK = 'flex h-full w-max items-center will-change-transform';
	const PART = 'flex h-full shrink-0 items-center';
	const PART_TEXT =
		'px-[0.4em] text-[clamp(14px,calc(38cqh*var(--flowing-menu-band,1)),130px)] leading-[1.1] font-normal tracking-[-0.025em] whitespace-nowrap';
	const IMAGE =
		'mx-[calc(3.5cqh*var(--flowing-menu-band,1))] block aspect-[2.2/1] h-[calc(56cqh*var(--flowing-menu-band,1))] shrink-0 rounded-full bg-cover bg-center group-data-[shape=circle]/fm:aspect-square group-data-[shape=rounded]/fm:aspect-[3/2] group-data-[shape=rounded]/fm:rounded-[calc(10cqh*var(--flowing-menu-band,1))]';
	const FLOAT = 'pointer-events-none invisible absolute inset-0 z-[1] overflow-hidden [clip-path:inset(50%_0_50%_0)]';
	const FLOAT_LAYER = 'absolute top-0 left-0 h-1/4 w-full [container-type:size] will-change-[transform,opacity]';
	const DIRECTIONS = ['left', 'right', 'alternate'];
	const SHAPES = ['pill', 'rounded', 'circle'];
	const EASE = 'cubic-bezier(0.2, 0.9, 0.2, 1)';
	const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
	const prefersReduced = () =>
		typeof window !== 'undefined' && (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
</script>


<script lang="ts">
	let {
		items = [],
		speed = 72,
		direction = 'alternate',
		followCursor = 0.45,
		duration = 450,
		stretch = 0.55,
		magnet = 0.28,
		bandInset = 4,
		bandRadius = 10,
		carryContent = false,
		textColor = 'currentColor',
		bgColor = 'transparent',
		marqueeBgColor = '#c9a227',
		marqueeTextColor = '#14110e',
		borderColor = 'rgba(255,255,255,0.14)',
		dividers = true,
		dimInactive = true,
		align = 'center',
		showIndex = false,
		showArrow = true,
		imageShape = 'pill',
		intro = false,
		activeIndex = -1,
		onItemClick,
		ariaLabel = 'Menu',
		class: className = '',
		style: styleProp = ''
	}: FlowingMenuProps = $props();

	let hoveredIndex = $state(-1);
	const animationDuration = $derived(Math.max(6, 1000 / Math.max(1, speed) * 12));
	const rootStyle = $derived([
		styleProp,
		`--fm-text:${textColor}`,
		`--fm-bg:${bgColor}`,
		`--fm-band-bg:${marqueeBgColor}`,
		`--fm-band-text:${marqueeTextColor}`,
		`--fm-border:${borderColor}`,
		`--fm-duration:${duration}ms`,
		`--fm-speed:${animationDuration}s`,
		`--fm-inset:${bandInset}px`,
		`--fm-radius:${bandRadius}px`,
		`--fm-magnet:${magnet * 8}px`,
		`--fm-stretch:${1 + stretch * 0.08}`,
		`--fm-follow:${followCursor}`
	].filter(Boolean).join(';'));
	function handleClick(item: FlowingMenuItem, index: number, event: MouseEvent) {
		if (!item.link) event.preventDefault();
		onItemClick?.(item, index, event);
	}
</script>

<nav class="flowing-menu ${className}" style={rootStyle} aria-label={ariaLabel} data-align={align} data-carry={carryContent}>
	<ul class="flowing-menu__list">
		{#each items as item, index (item.text + '-' + index)}
			{@const isActive = hoveredIndex === index || activeIndex === index}
			{@const itemDirection = direction === 'alternate' ? (index % 2 === 0 ? 'left' : 'right') : direction}
			<li
				class="flowing-menu__item"
				class:active={isActive}
				data-dimmed={dimInactive && hoveredIndex !== -1 && !isActive}
				onmouseenter={() => (hoveredIndex = index)}
				onmouseleave={() => (hoveredIndex = -1)}
				style:animation-delay={intro ? `${index * 65}ms` : '0ms'}
			>
				<a
					class="flowing-menu__link"
					href={item.link ?? '#'}
					onclick={(event) => handleClick(item, index, event)}
					aria-current={activeIndex === index ? 'true' : undefined}
				>
					{#if showIndex}<span class="flowing-menu__index">{item.meta ?? String(index + 1).padStart(2, '0')}</span>{/if}
					<span class="flowing-menu__label">{item.text}</span>
					{#if item.meta && !showIndex}<span class="flowing-menu__meta">{item.meta}</span>{/if}
					{#if showArrow}<span class="flowing-menu__arrow" aria-hidden="true">↗</span>{/if}
					{#if item.image && carryContent}
						<span class="flowing-menu__image" style:background-image={`url("${item.image}")`}></span>
					{/if}
				</a>
				<div class="flowing-menu__band" aria-hidden="true" data-direction={itemDirection}>
					<div class="flowing-menu__track">
						{#each [0, 1] as copy}
							<span class="flowing-menu__band-content">
								{#if item.image}<span class="flowing-menu__band-image" style:background-image={`url("${item.image}")`}></span>{/if}
								{item.marquee ?? item.text}
								<span class="flowing-menu__dot">·</span>
							</span>
						{/each}
					</div>
				</div>
				{#if dividers && index < items.length - 1}<span class="flowing-menu__divider" aria-hidden="true"></span>{/if}
			</li>
		{/each}
	</ul>
</nav>

<style>
	.flowing-menu{position:relative;width:100%;height:100%;min-height:18rem;overflow:hidden;background:var(--fm-bg);color:var(--fm-text);font:inherit}
	.flowing-menu__list{display:flex;flex-direction:column;width:100%;height:100%;min-height:inherit;margin:0;padding:0;list-style:none}
	.flowing-menu__item{position:relative;display:flex;flex:1 1 0;min-height:3.5rem;overflow:hidden;isolation:isolate;animation:fm-enter 500ms both}
	.flowing-menu__link{position:relative;z-index:1;display:grid;grid-template-columns:auto 1fr auto auto;align-items:center;gap:1rem;width:100%;padding:0 clamp(1rem,4vw,2.5rem);color:inherit;text-decoration:none;background:transparent;border:0;font:inherit;text-align:left;cursor:pointer;transition:transform var(--fm-duration) cubic-bezier(.2,.9,.2,1),opacity var(--fm-duration) ease}
	.flowing-menu[data-align="center"] .flowing-menu__label{text-align:center}
	.flowing-menu[data-align="left"] .flowing-menu__label{text-align:left}
	.flowing-menu__label{font-size:clamp(1.2rem,4vw,3rem);font-weight:600;letter-spacing:-.04em;white-space:nowrap;transition:transform var(--fm-duration) cubic-bezier(.2,.9,.2,1)}
	.flowing-menu__index,.flowing-menu__meta{font-size:.75rem;opacity:.58;font-variant-numeric:tabular-nums}
	.flowing-menu__arrow{font-size:1.35rem;opacity:.65;transition:transform var(--fm-duration) ease}
	.flowing-menu__image{width:3.5rem;aspect-ratio:1.5;border-radius:var(--fm-radius);background-position:center;background-size:cover}
	.flowing-menu[data-carry="false"] .flowing-menu__image{display:none}
	.flowing-menu__band{position:absolute;z-index:2;inset:0;display:flex;align-items:center;overflow:hidden;pointer-events:none;clip-path:inset(50% 0 50% 0);background:var(--fm-band-bg);color:var(--fm-band-text);border-radius:var(--fm-radius);transition:clip-path var(--fm-duration) cubic-bezier(.2,.9,.2,1);padding-inline:var(--fm-inset)}
	.flowing-menu__track{display:flex;width:max-content;min-width:100%;transform:translateX(0);will-change:transform}
	.flowing-menu__band-content{display:flex;align-items:center;gap:.35em;flex-shrink:0;padding-inline:.4em;font-size:clamp(1.2rem,4vw,3rem);font-weight:500;white-space:nowrap}
	.flowing-menu__band-image{display:inline-block;width:4.5em;height:.68em;margin-inline:.3em;border-radius:999px;background-position:center;background-size:cover}
	.flowing-menu__dot{opacity:.65}
	.flowing-menu__divider{position:absolute;z-index:3;left:0;right:0;bottom:0;height:1px;background:var(--fm-border);pointer-events:none}
	.flowing-menu__item[data-dimmed="true"] .flowing-menu__link{opacity:.35}
	.flowing-menu__item.active .flowing-menu__band{clip-path:inset(0 0 0 0)}
	.flowing-menu__item.active .flowing-menu__track{animation:fm-marquee var(--fm-speed) linear infinite}
	.flowing-menu__item.active .flowing-menu__arrow{transform:translate(3px,-3px)}
	.flowing-menu__link:focus-visible{outline:2px solid currentColor;outline-offset:-5px}
	.flowing-menu__item[data-direction="right"] .flowing-menu__track{animation-direction:reverse}
	@keyframes fm-marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
	@keyframes fm-enter{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
	@media(prefers-reduced-motion:reduce){.flowing-menu__item{animation:none}.flowing-menu__band,.flowing-menu__link,.flowing-menu__label,.flowing-menu__arrow{transition:none}.flowing-menu__item.active .flowing-menu__track{animation:none}}
</style>

