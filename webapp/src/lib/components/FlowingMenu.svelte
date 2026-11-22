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

<!-- FULL FILE CONTINUES IN ARTIFACTS — use local FlowingMenu.svelte -->
