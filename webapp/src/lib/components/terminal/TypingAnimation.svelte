<script lang="ts">
	/**
	 * Texto que se escribe carácter a carácter; avanza la secuencia al terminar.
	 */
	import { getContext, onMount } from 'svelte';
	import { SEQUENCE_KEY, type SequenceContextValue } from './sequence';

	interface Props {
		text: string;
		class?: string;
		duration?: number;
		delay?: number;
		as?: 'span' | 'p' | 'div' | 'h1' | 'h2' | 'h3' | 'code';
		startOnView?: boolean;
	}

	let {
		text,
		class: className = '',
		duration = 60,
		delay = 0,
		as = 'span',
		startOnView = true
	}: Props = $props();

	const sequence = getContext<SequenceContextValue | null>(SEQUENCE_KEY) ?? null;

	let el = $state<HTMLElement | null>(null);
	let itemIndex = $state<number | null>(null);
	let displayed = $state('');
	let started = $state(false);
	let inView = $state(!startOnView);

	onMount(() => {
		if (sequence?.enabled) {
			itemIndex = sequence.register();
		}

		if (!startOnView || !el) {
			inView = true;
			return;
		}
		const io = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) {
					inView = true;
					io.disconnect();
				}
			},
			{ threshold: 0.3 }
		);
		io.observe(el);
		return () => io.disconnect();
	});

	$effect(() => {
		if (sequence?.enabled && itemIndex !== null) {
			void sequence.activeIndex;
			void sequence.sequenceStarted;
			if (sequence.sequenceStarted && !started && sequence.activeIndex === itemIndex) {
				started = true;
			}
			return;
		}
		if (!startOnView || inView) {
			const t = setTimeout(() => {
				started = true;
			}, delay);
			return () => clearTimeout(t);
		}
	});

	$effect(() => {
		if (!started) return;
		let i = 0;
		displayed = '';
		const id = setInterval(() => {
			if (i < text.length) {
				displayed = text.substring(0, i + 1);
				i += 1;
			} else {
				clearInterval(id);
				if (sequence?.enabled && itemIndex !== null) {
					sequence.completeItem(itemIndex);
				}
			}
		}, duration);
		return () => clearInterval(id);
	});
</script>

<svelte:element this={as} bind:this={el} class="ta {className}">
	{displayed}<span
		class="ta-caret"
		class:ta-caret--on={started && displayed.length < text.length}
		aria-hidden="true"
	></span>
</svelte:element>

<style>
	.ta {
		font-size: 0.8125rem;
		font-weight: 400;
		letter-spacing: -0.01em;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
	}

	.ta-caret {
		display: inline-block;
		width: 0.45em;
		height: 1em;
		margin-left: 1px;
		background: currentColor;
		vertical-align: text-bottom;
		opacity: 0;
	}

	.ta-caret--on {
		animation: ta-blink 1s steps(1) infinite;
		opacity: 1;
	}

	@keyframes ta-blink {
		50% {
			opacity: 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.ta-caret--on {
			animation: none;
			opacity: 1;
		}
	}
</style>
