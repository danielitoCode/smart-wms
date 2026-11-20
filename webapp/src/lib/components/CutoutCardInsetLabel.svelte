<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		class?: string;
		children?: Snippet;
	}

	let { class: className = '', children }: Props = $props();
</script>

<div class="ccil {className}">
	{#if children}{@render children()}{/if}
</div>

<style>
	.ccil {
		position: absolute;
		z-index: 2;
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		background: var(--card, #fff);
		color: var(--slate, #5c6b7d);
	}
</style>
