<script lang="ts" module>
	/** Clase de superficie por defecto (borde + sombra Abellis). */
	export const cutoutCardSurfaceClassName = 'cc-surface';
</script>

<script lang="ts">
	/**
	 * CutoutCard — card con media, insets recortados, pin y acción flotante.
	 * Port Svelte 5 del patrón cutout-card (sin motion/react: stagger CSS).
	 */
	import type { Snippet } from 'svelte';

	interface Props {
		class?: string;
		children?: Snippet;
	}

	let { class: className = '', children }: Props = $props();
</script>

<article class="cc {className}">
	{#if children}{@render children()}{/if}
</article>

<style>
	.cc {
		position: relative;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		border-radius: 20px;
		background: var(--card, #fff);
		color: var(--ink, #132234);
		font-family: var(--body, Inter, system-ui, sans-serif);
		isolation: isolate;
	}

	:global(.cc-surface) {
		border: 1px solid color-mix(in srgb, var(--line, #d9e2ec) 88%, transparent);
		box-shadow:
			0 1px 2px rgba(15, 23, 42, 0.04),
			0 18px 40px rgba(15, 23, 42, 0.08);
	}
</style>
