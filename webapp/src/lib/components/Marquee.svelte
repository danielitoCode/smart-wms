<script lang="ts">
	/**
	 * Marquee — cinta infinita CSS (horizontal o vertical).
	 * Duplica el track para loop seamless; fades opcionales.
	 */
	import type { Snippet } from 'svelte';

	interface Props {
		duration?: number;
		pauseOnHover?: boolean;
		fade?: boolean;
		reverse?: boolean;
		vertical?: boolean;
		children?: Snippet;
		class?: string;
	}

	let {
		duration = 40,
		pauseOnHover = true,
		fade = true,
		reverse = false,
		vertical = false,
		children,
		class: className = ''
	}: Props = $props();
</script>

<div
	class="mq {className}"
	class:mq--pause={pauseOnHover}
	class:mq--reverse={reverse}
	class:mq--vertical={vertical}
	style="--mq-duration: {duration}s"
>
	{#if fade && !vertical}
		<span class="mq-fade mq-fade--l" aria-hidden="true"></span>
		<span class="mq-fade mq-fade--r" aria-hidden="true"></span>
	{/if}
	<div class="mq-viewport">
		<div class="mq-track">
			<div class="mq-group">
				{#if children}{@render children()}{/if}
			</div>
			<div class="mq-group" aria-hidden="true">
				{#if children}{@render children()}{/if}
			</div>
		</div>
	</div>
</div>

<style>
	.mq {
		position: relative;
		width: 100%;
		overflow: hidden;
	}

	.mq--vertical {
		height: 100%;
		width: auto;
	}

	.mq-viewport {
		overflow: hidden;
		height: 100%;
	}

	.mq-track {
		display: flex;
		width: max-content;
		animation: mq-scroll-x var(--mq-duration, 40s) linear infinite;
	}

	.mq--vertical .mq-track {
		flex-direction: column;
		width: auto;
		height: max-content;
		animation-name: mq-scroll-y;
	}

	.mq--reverse .mq-track {
		animation-direction: reverse;
	}

	.mq--pause:hover .mq-track {
		animation-play-state: paused;
	}

	.mq-group {
		display: flex;
		align-items: center;
		flex-shrink: 0;
		gap: var(--gap, 1rem);
	}

	.mq--vertical .mq-group {
		flex-direction: column;
		align-items: stretch;
	}

	@keyframes mq-scroll-x {
		from {
			transform: translateX(0);
		}
		to {
			transform: translateX(-50%);
		}
	}

	@keyframes mq-scroll-y {
		from {
			transform: translateY(0);
		}
		to {
			transform: translateY(-50%);
		}
	}

	.mq-fade {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 4rem;
		z-index: 2;
		pointer-events: none;
	}

	.mq-fade--l {
		left: 0;
		background: linear-gradient(to right, var(--bg, #000), transparent);
	}

	.mq-fade--r {
		right: 0;
		background: linear-gradient(to left, var(--bg, #000), transparent);
	}

	@media (prefers-reduced-motion: reduce) {
		.mq-track {
			animation: none !important;
		}
	}
</style>
