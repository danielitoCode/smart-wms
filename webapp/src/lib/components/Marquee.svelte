<script lang="ts">
	/**
	 * Marquee — cinta infinita CSS (equivalente kibo-ui Marquee).
	 * Duplica el track para loop seamless; fades laterales opcionales.
	 */
	import type { Snippet } from 'svelte';

	interface Props {
		duration?: number;
		pauseOnHover?: boolean;
		fade?: boolean;
		reverse?: boolean;
		children?: Snippet;
		class?: string;
	}

	let {
		duration = 40,
		pauseOnHover = true,
		fade = true,
		reverse = false,
		children,
		class: className = ''
	}: Props = $props();
</script>

<div
	class="mq {className}"
	class:mq--pause={pauseOnHover}
	class:mq--reverse={reverse}
	style="--mq-duration: {duration}s"
>
	{#if fade}
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

	.mq-viewport {
		overflow: hidden;
	}

	.mq-track {
		display: flex;
		width: max-content;
		animation: mq-scroll var(--mq-duration, 40s) linear infinite;
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
	}

	@keyframes mq-scroll {
		from {
			transform: translateX(0);
		}
		to {
			transform: translateX(-50%);
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
		background: linear-gradient(to right, var(--bg, #edf2f8), transparent);
	}

	.mq-fade--r {
		right: 0;
		background: linear-gradient(to left, var(--bg, #edf2f8), transparent);
	}

	@media (prefers-reduced-motion: reduce) {
		.mq-track {
			animation: none;
		}
	}
</style>
