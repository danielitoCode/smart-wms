<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		class?: string;
		children?: Snippet;
	}

	let { class: className = '', children }: Props = $props();
</script>

<div class="ccp {className}">
	{#if children}{@render children()}{/if}
</div>

<style>
	.ccp {
		position: absolute;
		z-index: 2;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-weight: 650;
		line-height: 1;
	}
</style>
