<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		class?: string;
		children?: Snippet;
	}

	let { class: className = '', children }: Props = $props();
</script>

<div class="cca {className}">
	{#if children}{@render children()}{/if}
</div>

<style>
	.cca {
		position: absolute;
		z-index: 3;
	}
</style>
