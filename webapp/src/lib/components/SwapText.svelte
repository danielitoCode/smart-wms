<script lang="ts">
	/**
	 * SwapText — texto inicial que se desvanece y revela el final al hover/active.
	 * Port Svelte 5 del patrón Animata (CSS, sin Motion).
	 */
	interface Props {
		initialText: string;
		finalText: string;
		disableClick?: boolean;
		active?: boolean;
		class?: string;
		initialTextClass?: string;
		finalTextClass?: string;
	}

	let {
		initialText,
		finalText,
		disableClick = false,
		active = false,
		class: className = '',
		initialTextClass = '',
		finalTextClass = ''
	}: Props = $props();

	let clicked = $state(false);
	const isActive = $derived(active || clicked);

	function onClick() {
		if (disableClick) return;
		clicked = !clicked;
	}
</script>

<button
	type="button"
	class="swap {className}"
	class:swap--active={isActive}
	class:swap--static={disableClick}
	onclick={onClick}
	aria-pressed={isActive}
>
	<span class="swap-initial {initialTextClass}">{initialText}</span>
	<span class="swap-final {finalTextClass}">{finalText}</span>
</button>

<style>
	.swap {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		border: 0;
		padding: 0;
		margin: 0;
		background: transparent;
		text-align: left;
		cursor: pointer;
		outline: none;
	}

	.swap--static {
		cursor: default;
	}

	.swap:focus-visible {
		box-shadow: 0 0 0 2px var(--navy, #004c8b);
		border-radius: 4px;
	}

	.swap-initial,
	.swap-final {
		display: block;
		transition:
			opacity 200ms ease,
			transform 200ms ease;
	}

	.swap-final {
		position: absolute;
		left: 0;
		top: 0;
		opacity: 0;
		transform: translateY(0.35rem);
		pointer-events: none;
	}

	.swap:hover .swap-initial,
	.swap--active .swap-initial {
		opacity: 0;
		transform: translateY(-0.35rem);
	}

	.swap:hover .swap-final,
	.swap--active .swap-final {
		opacity: 1;
		transform: translateY(0);
	}

	@media (prefers-reduced-motion: reduce) {
		.swap-initial,
		.swap-final {
			transition: none;
		}
	}
</style>
