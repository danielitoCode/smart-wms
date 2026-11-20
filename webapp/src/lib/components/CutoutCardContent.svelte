<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		class?: string;
		stagger?: boolean;
		children?: Snippet;
	}

	let { class: className = '', stagger = true, children }: Props = $props();
</script>

<div class="ccc {className}" class:ccc--stagger={stagger}>
	{#if children}{@render children()}{/if}
</div>

<style>
	.ccc {
		position: relative;
		padding: 1.25rem 1.25rem 1.5rem;
		display: flex;
		flex-direction: column;
	}

	.ccc--stagger :global([data-cc-item]) {
		opacity: 0;
		transform: translateY(10px);
		animation: cc-item-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards;
	}

	.ccc--stagger :global([data-cc-item]:nth-child(1)) { animation-delay: 0.06s; }
	.ccc--stagger :global([data-cc-item]:nth-child(2)) { animation-delay: 0.14s; }
	.ccc--stagger :global([data-cc-item]:nth-child(3)) { animation-delay: 0.22s; }
	.ccc--stagger :global([data-cc-item]:nth-child(4)) { animation-delay: 0.3s; }

	@keyframes cc-item-in {
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.ccc--stagger :global([data-cc-item]) {
			opacity: 1;
			transform: none;
			animation: none;
		}
	}
</style>
