<script lang="ts">
	/**
	 * Terminal — ventana tipo terminal con secuencia de líneas (typing + fade).
	 * Port Svelte 5 del patrón shadcn/magic Terminal (sin motion/react).
	 */
	import { setContext, onMount } from 'svelte';
	import type { Snippet } from 'svelte';
	import { SEQUENCE_KEY, type SequenceContextValue } from './sequence';

	interface Props {
		class?: string;
		sequence?: boolean;
		startOnView?: boolean;
		children?: Snippet;
	}

	let {
		class: className = '',
		sequence = true,
		startOnView = true,
		children
	}: Props = $props();

	let containerEl = $state<HTMLDivElement | null>(null);

	const seqState = $state({
		activeIndex: 0,
		sequenceStarted: !sequence || !startOnView,
		enabled: sequence,
		nextReg: 0
	});

	function register() {
		const i = seqState.nextReg;
		seqState.nextReg += 1;
		return i;
	}

	function completeItem(index: number) {
		if (index === seqState.activeIndex) {
			seqState.activeIndex += 1;
		}
	}

	const ctx: SequenceContextValue = {
		register,
		completeItem,
		get activeIndex() {
			return seqState.activeIndex;
		},
		get sequenceStarted() {
			return seqState.sequenceStarted;
		},
		get enabled() {
			return seqState.enabled;
		}
	};

	setContext(SEQUENCE_KEY, ctx);

	onMount(() => {
		if (!startOnView || !containerEl) {
			seqState.sequenceStarted = true;
			return;
		}
		const io = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) {
					seqState.sequenceStarted = true;
					io.disconnect();
				}
			},
			{ threshold: 0.3 }
		);
		io.observe(containerEl);
		return () => io.disconnect();
	});
</script>

<div bind:this={containerEl} class="tm {className}">
	<div class="tm-chrome">
		<div class="tm-dots">
			<span class="tm-dot tm-dot--r"></span>
			<span class="tm-dot tm-dot--y"></span>
			<span class="tm-dot tm-dot--g"></span>
		</div>
	</div>
	<pre class="tm-body"><code class="tm-code">{#if children}{@render children()}{/if}</code></pre>
</div>

<style>
	.tm {
		z-index: 0;
		height: 100%;
		max-height: 25rem;
		width: 100%;
		max-width: 32rem;
		border-radius: 0.75rem;
		border: 1px solid color-mix(in srgb, var(--line, #d9e2ec) 90%, transparent);
		background: var(--card, #fff);
		overflow: hidden;
		box-shadow:
			0 1px 2px rgba(15, 23, 42, 0.04),
			0 12px 28px rgba(15, 23, 42, 0.06);
		color: var(--ink, #132234);
	}

	:global(.dark) .tm,
	:global(html.dark) .tm {
		background: #0f1419;
		border-color: color-mix(in srgb, #fff 10%, transparent);
		color: #e2e8f0;
	}

	.tm-chrome {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		border-bottom: 1px solid color-mix(in srgb, var(--line, #d9e2ec) 90%, transparent);
		padding: 1rem;
	}

	:global(.dark) .tm-chrome,
	:global(html.dark) .tm-chrome {
		border-bottom-color: color-mix(in srgb, #fff 10%, transparent);
	}

	.tm-dots {
		display: flex;
		flex-direction: row;
		gap: 0.5rem;
	}

	.tm-dot {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 999px;
	}

	.tm-dot--r { background: #ef4444; }
	.tm-dot--y { background: #eab308; }
	.tm-dot--g { background: #22c55e; }

	.tm-body {
		margin: 0;
		padding: 1rem;
		overflow: auto;
		max-height: calc(25rem - 3.25rem);
	}

	.tm-code {
		display: grid;
		gap: 0.25rem;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		font-size: 0.8125rem;
		line-height: 1.45;
	}
</style>
