<script lang="ts">
	/**
	 * One sticky pane inside StackedSections.
	 */
	import type { Snippet } from 'svelte';

	interface Props {
		/** 1-based index in the deck */
		index: number;
		class?: string;
		children?: Snippet;
	}

	let { index, class: className = '', children }: Props = $props();
</script>

<div
	data-stacked-card=""
	class="ss-pane {className}"
	style="--index: {index}; z-index: {index}; padding-top: calc({index} * var(--stacked-top-offset, 48px));"
>
	<div data-stacked-content="" class="ss-pane-content">
		{@render children?.()}
	</div>
</div>

<style>
	.ss-pane {
		position: sticky;
		top: 0;
		width: 100%;
	}

	.ss-pane-content {
		min-height: 0;
		transform-origin: 50% 0%;
	}
</style>
