<script lang="ts">
	/**
	 * Esquina cóncava que “encaja” un inset/pin en la card (mismo truco visual que cutout-card).
	 */
	interface Props {
		size?: number;
		class?: string;
	}

	let { size = 32, class: className = '' }: Props = $props();
</script>

<svg
	class="cc-corner {className}"
	width={size}
	height={size}
	viewBox="0 0 32 32"
	fill="currentColor"
	aria-hidden="true"
>
	<path d="M0 0v32C0 14.327 14.327 0 32 0H0Z" />
</svg>

<style>
	.cc-corner {
		display: block;
		pointer-events: none;
		flex-shrink: 0;
	}
</style>
