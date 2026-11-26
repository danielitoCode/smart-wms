<script lang="ts" module>
	export interface SeriesItem {
		title: string;
		color: string;
		image: string;
		year: string;
		character: string;
	}

	export interface ScrollSnapListProps {
		items?: SeriesItem[];
		class?: string;
	}

	export const DEFAULT_SERIES: SeriesItem[] = [
		{ title: 'Breaking Bad', color: '#22c55e', image: '', year: '2008–2013', character: 'Walter White' },
		{ title: 'Game of Thrones', color: '#f59e0b', image: '', year: '2011–2019', character: 'Jon Snow' },
		{ title: 'Dexter', color: '#ef4444', image: '', year: '2006–2013', character: 'Dexter Morgan' },
		{ title: 'Dark', color: '#8b5cf6', image: '', year: '2017–2020', character: 'Jonas Kahnwald' },
		{ title: 'Fargo', color: '#38bdf8', image: '', year: '2014–present', character: 'Lorne Malvo' },
		{ title: 'Banshee', color: '#f97316', image: '', year: '2013–2016', character: 'Lucas Hood' }
	];

	const ITEM_H = 90;
</script>

<script lang="ts">
	import { onMount } from 'svelte';

	let { items = DEFAULT_SERIES, class: className = '' }: ScrollSnapListProps = $props();

	let activeIndex = $state(0);
	let imgVisible = $state(true);
	let listEl: HTMLDivElement | null = $state(null);
	let dotEl: HTMLDivElement | null = $state(null);
	let lineEl: HTMLDivElement | null = $state(null);
	let activeRef = 0;

	const active = $derived(items[activeIndex] ?? items[0]);
	const fillPct = $derived(
		items.length <= 1 ? 0 : (activeIndex / (items.length - 1)) * 100
	);

	function scrollToItem(idx: number) {
		listEl?.scrollTo({ top: idx * ITEM_H, behavior: 'smooth' });
	}

	function updateDot(idx: number) {
		const line = lineEl;
		const dot = dotEl;
		if (!line || !dot || items.length <= 1) return;
		const lineH = line.offsetHeight;
		const fraction = idx / (items.length - 1);
		dot.style.top = `${fraction * lineH}px`;
	}

	onMount(() => {
		const list = listEl;
		if (!list) return;

		let ticking = false;
		let snapTimer: ReturnType<typeof setTimeout>;

		const onScroll = () => {
			if (!ticking) {
				requestAnimationFrame(() => {
					const scrollTop = list.scrollTop;
					const idx = Math.round(scrollTop / ITEM_H);
					const clamped = Math.max(0, Math.min(idx, items.length - 1));
					if (clamped !== activeRef) {
						activeRef = clamped;
						activeIndex = clamped;
						imgVisible = false;
						setTimeout(() => {
							imgVisible = true;
						}, 200);
						updateDot(clamped);
					}
					ticking = false;
				});
				ticking = true;
			}
			clearTimeout(snapTimer);
			snapTimer = setTimeout(() => {
				const idx = Math.round(list.scrollTop / ITEM_H);
				list.scrollTo({ top: idx * ITEM_H, behavior: 'smooth' });
			}, 120);
		};

		list.addEventListener('scroll', onScroll, { passive: true });
		const boot = setTimeout(() => updateDot(0), 100);

		return () => {
			list.removeEventListener('scroll', onScroll);
			clearTimeout(snapTimer);
			clearTimeout(boot);
		};
	});
</script>

<div class={['ssl', className].filter(Boolean).join(' ')}>
	<!-- LEFT: snap-scroll list -->
	<div class="ssl__left" bind:this={listEl}>
		{#each items as item, i (item.title)}
			<button type="button" class="ssl__row" onclick={() => scrollToItem(i)}>
				<span
					class="ssl__title"
					style:color={activeIndex === i ? item.color : 'rgba(255,255,255,0.18)'}
				>
					{item.title}
				</span>
				<span
					class="ssl__year"
					style:color={activeIndex === i ? `${item.color}70` : 'rgba(255,255,255,0.07)'}
				>
					{item.year}
				</span>
			</button>
		{/each}
	</div>

	<!-- CENTER: line + dot -->
	<div class="ssl__rail">
		<div class="ssl__line" bind:this={lineEl}>
			<div
				class="ssl__fill"
				style:height="{fillPct}%"
				style:background={active.color}
			></div>
		</div>
		<div
			class="ssl__dot"
			bind:this={dotEl}
			style:background={active.color}
			style:box-shadow="0 0 10px 2px {active.color}70"
		></div>
	</div>

	<!-- RIGHT: 9:16 card -->
	<div class="ssl__right">
		<div class="ssl__glow" style:background="{active.color}0d"></div>
		<div
			class="ssl__card"
			style:border-color="{active.color}35"
		>
			{#if active.image}
				<img
					src={active.image}
					alt={active.title}
					class="ssl__img"
					style:opacity={imgVisible ? 1 : 0}
				/>
			{:else}
				<div
					class="ssl__placeholder"
					style:opacity={imgVisible ? 1 : 0}
					style:background="linear-gradient(180deg, #0f0f0f 0%, {active.color}18 100%)"
				>
					<span class="ssl__letter" style:color="{active.color}15">{active.title.charAt(0)}</span>
					<div class="ssl__char-block">
						<span class="ssl__char-label" style:color="{active.color}60">Character</span>
						<span class="ssl__char-name" style:color={active.color}>{active.character}</span>
					</div>
				</div>
			{/if}
		</div>

		<div class="ssl__pips" aria-hidden="true">
			{#each items as item, i (item.title)}
				<button
					type="button"
					class="ssl__pip"
					class:is-on={activeIndex === i}
					style:background={activeIndex === i ? item.color : 'rgba(255,255,255,0.15)'}
					style:height={activeIndex === i ? '20px' : '4px'}
					onclick={() => scrollToItem(i)}
					aria-label={item.title}
				></button>
			{/each}
		</div>
	</div>
</div>

<style>
	.ssl {
		display: flex;
		width: 100%;
		height: 540px;
		overflow: hidden;
		background: #0a0a0a;
		border-radius: 16px;
		color: #fff;
		font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
	}

	.ssl__left {
		flex: 0 0 44%;
		overflow-y: scroll;
		scrollbar-width: none;
		padding: 220px 20px 220px 36px;
	}
	.ssl__left::-webkit-scrollbar {
		display: none;
	}

	.ssl__row {
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 3px;
		height: 90px;
		width: 100%;
		margin: 0;
		padding: 0;
		border: 0;
		background: transparent;
		cursor: pointer;
		text-align: left;
		user-select: none;
		-webkit-tap-highlight-color: transparent;
	}

	.ssl__title {
		font-size: clamp(14px, 2.5vw, 24px);
		font-weight: 700;
		letter-spacing: -0.02em;
		text-transform: uppercase;
		line-height: 1.1;
		transition: color 0.35s ease;
	}

	.ssl__year {
		font-size: 11px;
		letter-spacing: 2px;
		transition: color 0.35s ease;
	}

	.ssl__rail {
		position: relative;
		flex: 0 0 20px;
		align-self: stretch;
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 40px 0;
	}

	.ssl__line {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 2px;
		border-radius: 2px;
		background: rgba(255, 255, 255, 0.08);
	}

	.ssl__fill {
		position: absolute;
		top: 0;
		width: 100%;
		border-radius: 2px;
		transition:
			height 0.4s cubic-bezier(0.4, 0, 0.2, 1),
			background 0.4s ease;
	}

	.ssl__dot {
		position: absolute;
		left: 50%;
		top: 0;
		transform: translate(-50%, -50%);
		width: 10px;
		height: 10px;
		border-radius: 50%;
		border: 2px solid #0a0a0a;
		transition:
			top 0.4s cubic-bezier(0.4, 0, 0.2, 1),
			background 0.4s ease,
			box-shadow 0.4s ease;
		z-index: 2;
	}

	.ssl__right {
		position: relative;
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 28px 28px 28px 8px;
	}

	.ssl__glow {
		position: absolute;
		inset: 0;
		transition: background 0.5s ease;
		pointer-events: none;
	}

	.ssl__card {
		position: relative;
		z-index: 1;
		height: 100%;
		aspect-ratio: 9 / 16;
		max-height: 484px;
		border-radius: 14px;
	overflow: hidden;
		border: 1.5px solid;
		background: #111;
		transition: border-color 0.5s ease;
		display: flex;
		flex-direction: column;
	}

	.ssl__img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
		transition: opacity 0.25s ease;
	}

	.ssl__placeholder {
		position: relative;
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-end;
		padding: 0 0 28px;
		transition: opacity 0.25s ease;
	}

	.ssl__letter {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		font-size: 96px;
		font-weight: 900;
		letter-spacing: -4px;
		user-select: none;
		transition: color 0.4s ease;
		line-height: 1;
	}

	.ssl__char-block {
		position: relative;
		z-index: 1;
		text-align: center;
	}

	.ssl__char-label {
		display: block;
		font-size: 10px;
		letter-spacing: 3px;
		text-transform: uppercase;
		margin-bottom: 4px;
		transition: color 0.4s ease;
	}

	.ssl__char-name {
		display: block;
		font-size: 14px;
		font-weight: 600;
		letter-spacing: 0.5px;
		transition: color 0.4s ease;
	}

	.ssl__pips {
		position: absolute;
		bottom: 20px;
		right: 16px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 5px;
		z-index: 2;
	}

	.ssl__pip {
		width: 4px;
		padding: 0;
		border: 0;
		border-radius: 2px;
		cursor: pointer;
		transition:
			height 0.3s ease,
			background 0.3s ease;
	}

	@media (max-width: 640px) {
		.ssl {
			flex-direction: column;
			height: auto;
			min-height: 520px;
		}
		.ssl__left {
			flex: none;
			height: 220px;
			padding: 64px 20px;
		}
		.ssl__rail {
			display: none;
		}
		.ssl__right {
			min-height: 320px;
			padding: 16px;
		}
		.ssl__card {
			max-height: 280px;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.ssl__title,
		.ssl__year,
		.ssl__fill,
		.ssl__dot,
		.ssl__img,
		.ssl__placeholder,
		.ssl__pip,
		.ssl__glow,
		.ssl__card {
			transition: none;
		}
	}
</style>
