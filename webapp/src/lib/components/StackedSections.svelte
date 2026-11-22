<script lang="ts">
	/**
	 * StackedSections — sticky stacked panes with optional drama scale
	 * while the next card rises into pin (stacking-cards pattern).
	 * Port Svelte 5 from React (no Motion / Lenis required).
	 */
	import type { Snippet } from 'svelte';

	interface Props {
		withDramaEffect?: boolean;
		stackOffset?: number;
		paneGap?: string | null;
		scrollRunway?: string;
		class?: string;
		children?: Snippet;
	}

	let {
		withDramaEffect = true,
		stackOffset = 48,
		paneGap = '0.5rem',
		scrollRunway = '0px',
		class: className = '',
		children
	}: Props = $props();

	let deckEl = $state<HTMLDivElement | null>(null);
	let cardEls: Array<HTMLDivElement | null> = [];
	let contentEls: Array<HTMLDivElement | null> = [];
	let total = $state(0);

	function clamp(value: number, min: number, max: number) {
		return Math.min(max, Math.max(min, value));
	}

	function getScrollParent(node: HTMLElement | null): HTMLElement | null {
		let element = node?.parentElement ?? null;
		while (element && element !== document.body && element !== document.documentElement) {
			const overflowY = getComputedStyle(element).overflowY;
			if (overflowY === 'auto' || overflowY === 'scroll') return element;
			element = element.parentElement;
		}
		return null;
	}

	function scaleAtDepth(cardIndex: number, n: number) {
		const reverseIndex = n - (cardIndex - 1);
		return 1.1 - 0.1 * reverseIndex;
	}

	$effect(() => {
		const deck = deckEl;
		if (!deck) return;

		const cards = Array.from(deck.querySelectorAll<HTMLDivElement>('[data-stacked-card]'));
		const contents = Array.from(deck.querySelectorAll<HTMLDivElement>('[data-stacked-content]'));
		total = cards.length;
		cardEls = cards;
		contentEls = contents;
		const n = cards.length;
		if (!withDramaEffect || n === 0) return;
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

		const scroller = getScrollParent(deck);
		let frame = 0;

		const isNextCardPinned = (cardIndex: number, containerTop: number) => {
			const nextCard = cardEls[cardIndex + 1];
			if (!nextCard) return false;
			return nextCard.getBoundingClientRect().top - containerTop <= (cardIndex + 1) * stackOffset + 1;
		};

		const update = () => {
			frame = 0;
			const containerTop = scroller ? scroller.getBoundingClientRect().top : 0;

			for (let i = 0; i < n; i++) {
				const card = cardEls[i];
				const content = contentEls[i];
				if (!card || !content) continue;

				const endScale = scaleAtDepth(i + 1, n);
				const covered = isNextCardPinned(i, containerTop);

				if (covered) {
					content.dataset.stackedCovered = '';
					content.style.transform = `scale(${endScale})`;
					continue;
				}

				delete content.dataset.stackedCovered;

				const nextCard = cardEls[i + 1];
				if (!nextCard) {
					content.style.transform = '';
					continue;
				}

				const pinnedTop = (i + 1) * stackOffset;
				const offset = nextCard.getBoundingClientRect().top - containerTop - pinnedTop;
				const rowH = card.offsetHeight > 0 ? card.offsetHeight : 1;
				const distance = Math.max(rowH - pinnedTop, 1);
				const progress = clamp(1 - offset / distance, 0, 1);
				const scale = 1 + (endScale - 1) * progress;
				content.style.transform = progress <= 0.001 ? '' : `scale(${scale})`;
			}
		};

		const onScroll = () => {
			if (!frame) frame = requestAnimationFrame(update);
		};

		update();
		const target: Window | HTMLElement = scroller ?? window;
		target.addEventListener('scroll', onScroll, { passive: true });
		window.addEventListener('resize', onScroll);

		return () => {
			target.removeEventListener('scroll', onScroll);
			window.removeEventListener('resize', onScroll);
			if (frame) cancelAnimationFrame(frame);
			for (const content of contentEls) {
				if (content) {
					delete content.dataset.stackedCovered;
					content.style.transform = '';
				}
			}
		};
	});
</script>

<div
	bind:this={deckEl}
	data-stacked-deck=""
	class="ss-deck {className}"
	style="
		--numcards: {total};
		--stacked-top-offset: {stackOffset}px;
		padding-bottom: calc({total} * {stackOffset}px);
		{paneGap != null && paneGap !== '' ? `gap: ${paneGap};` : ''}
	"
>
	{@render children?.()}
	{#if scrollRunway !== '0px'}
		<div aria-hidden="true" class="ss-runway" style="height: {scrollRunway}" data-stacked-runway=""></div>
	{/if}
</div>

<style>
	.ss-deck {
		display: flex;
		width: 100%;
		flex-direction: column;
	}

	.ss-runway {
		width: 100%;
		flex-shrink: 0;
	}

	:global([data-stacked-card]) {
		position: sticky;
		top: 0;
		width: 100%;
	}

	:global([data-stacked-content]) {
		min-height: 0;
		transform-origin: 50% 0%;
		will-change: transform;
	}

	:global([data-stacked-content][data-stacked-covered]) {
		transform-origin: 50% 0%;
	}

	@media (prefers-reduced-motion: reduce) {
		:global([data-stacked-content]) {
			transform: none !important;
		}
	}
</style>
