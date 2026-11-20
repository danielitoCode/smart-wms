<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		class?: string;
		children?: Snippet;
	}

	let { class: className = '', children }: Props = $props();
</script>

<div class="ccm {className}">
	{#if children}{@render children()}{/if}
</div>

<style>
	.ccm {
		position: relative;
		overflow: hidden;
		flex-shrink: 0;
		background: color-mix(in srgb, var(--navy, #004c8b) 12%, #0f172a);
	}
</style>
