<script lang="ts">
	/**
	 * Línea que aparece con fade cuando la secuencia llega a su índice.
	 */
	import { getContext, onMount } from 'svelte';
	import type { Snippet } from 'svelte';
	import { SEQUENCE_KEY, type SequenceContextValue } from './sequence';

	interface Props {
		delay?: number;
		class?: string;
		startOnView?: boolean;
		children?: Snippet;
	}

	let {
		delay = 0,
		class: className = '',
		startOnView = false,
		children
	}: Props = $props();

	const sequence = getContext<SequenceContextValue | null>(SEQUENCE_KEY) ?? null;

	let el = $state<HTMLDivElement | null>(null);
	let itemIndex = $state<number | null>(null);
	let hasStarted = $state(false);
	let inView = $state(!startOnView);
	let completed = $state(false);

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
		if (!sequence?.enabled || itemIndex === null) return;
		void sequence.activeIndex;
		void sequence.sequenceStarted;
		if (!sequence.sequenceStarted) return;
		if (hasStarted) return;
		if (sequence.activeIndex === itemIndex) {
			hasStarted = true;
		}
	});

	const shouldAnimate = $derived(
		sequence?.enabled ? hasStarted : startOnView ? inView : true
	);

	$effect(() => {
		if (!shouldAnimate || completed) return;
		if (!sequence?.enabled || itemIndex === null) return;
		const t = setTimeout(() => {
			completed = true;
			sequence.completeItem(itemIndex!);
		}, 320);
		return () => clearTimeout(t);
	});
</script>

<div
	bind:this={el}
	class="as {className}"
	class:as--on={shouldAnimate}
	style={!sequence?.enabled && delay ? `transition-delay: ${delay}ms` : undefined}
>
	{#if children}{@render children()}{/if}
</div>

<style>
	.as {
		display: grid;
		font-size: 0.8125rem;
		font-weight: 400;
		letter-spacing: -0.01em;
		opacity: 0;
		transform: translateY(-5px);
		transition: opacity 0.3s ease, transform 0.3s ease;
	}

	.as--on {
		opacity: 1;
		transform: translateY(0);
	}

	@media (prefers-reduced-motion: reduce) {
		.as {
			transition: none;
			opacity: 1;
			transform: none;
		}
	}
</style>
