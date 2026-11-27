<script lang="ts" module>
	/**
	 * BlurText — words/letters rise out of blur (motion-brew, MIT).
	 * Ported to Svelte 5 with IntersectionObserver + CSS transitions (no motion/react).
	 */
	export interface BlurTextProps {
		/** The text to reveal. */
		text?: string;
		/** Element to render. Default `"p"`. */
		as?: 'h1' | 'h2' | 'h3' | 'p' | 'span';
		/** Animate each `"word"` or each `"letter"`. Default `"word"`. */
		by?: 'word' | 'letter';
		/** Seconds between pieces. Default `0.08`. */
		stagger?: number;
		/** Seconds each piece takes. Default `0.7`. */
		duration?: number;
		/** Starting blur, px. Default `12`. */
		blur?: number;
		/** Pieces rise `"up"` or drop `"down"` into place. Default `"up"`. */
		direction?: 'up' | 'down';
		/** Seconds to wait before starting. Default `0`. */
		delay?: number;
		/** Start when it scrolls into view or right away. Default `"inView"`. */
		trigger?: 'inView' | 'mount';
		class?: string;
	}

	const DEFAULT_TEXT = 'Every word drifts out of the blur and settles into sharp focus';
</script>

<script lang="ts">
	import { onMount } from 'svelte';

	let {
		text = DEFAULT_TEXT,
		as: Tag = 'p',
		by = 'word',
		stagger = 0.08,
		duration = 0.7,
		blur = 12,
		direction = 'up',
		delay = 0,
		trigger = 'inView',
		class: className = ''
	}: BlurTextProps = $props();

	let rootEl: HTMLElement | null = $state(null);
	let active = $state(false);
	let still = $state(false);

	const pieces = $derived(by === 'word' ? text.split(' ') : Array.from(text));
	const offset = $derived(direction === 'up' ? '0.35em' : '-0.35em');

	onMount(() => {
		still = matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (still || trigger === 'mount') {
			active = true;
			return;
		}
		const el = rootEl;
		if (!el) return;
		const io = new IntersectionObserver(
			([entry]) => {
				if (entry?.isIntersecting) {
					active = true;
					io.disconnect();
				}
			},
			{ threshold: 0.4 }
		);
		io.observe(el);
		return () => io.disconnect();
	});
</script>

<svelte:element
	this={Tag}
	bind:this={rootEl}
	aria-label={text}
	class={['blur-text', className].filter(Boolean).join(' ')}
>
	{#each pieces as piece, i}
		<span
			aria-hidden="true"
			class="blur-text__piece"
			class:is-on={active || still}
			style:--bt-delay="{still ? 0 : delay + i * stagger}s"
			style:--bt-duration="{still ? 0 : duration}s"
			style:--bt-blur="{blur}px"
			style:--bt-y={offset}
		>{piece}</span
		>{#if by === 'word' && i < pieces.length - 1}{' '}{/if}
	{/each}
</svelte:element>

<style>
	.blur-text {
		text-wrap: balance;
	}
	.blur-text__piece {
		display: inline-block;
		white-space: pre;
		will-change: transform, filter, opacity;
		opacity: 0;
		transform: translateY(var(--bt-y, 0.35em));
		filter: blur(var(--bt-blur, 12px));
		transition:
			opacity var(--bt-duration, 0.7s) cubic-bezier(0.22, 1, 0.36, 1) var(--bt-delay, 0s),
			transform var(--bt-duration, 0.7s) cubic-bezier(0.22, 1, 0.36, 1) var(--bt-delay, 0s),
			filter var(--bt-duration, 0.7s) cubic-bezier(0.22, 1, 0.36, 1) var(--bt-delay, 0s);
	}
	.blur-text__piece.is-on {
		opacity: 1;
		transform: translateY(0);
		filter: blur(0px);
	}
	@media (prefers-reduced-motion: reduce) {
		.blur-text__piece {
			transition: none;
			opacity: 1;
			transform: none;
			filter: none;
		}
	}
</style>
