<script lang="ts">
	/**
	 * Backlight — glow/blur saturado detrás del contenido vía SVG filter.
	 * Port Svelte 5 del componente Magic UI / React.
	 */
	import type { Snippet } from 'svelte';

	interface Props {
		children?: Snippet;
		class?: string;
		blur?: number;
	}

	let { children, class: className = '', blur = 20 }: Props = $props();

	const uid = `bl-${Math.random().toString(36).slice(2, 9)}`;
	const filterId = `backlight-${uid}`;
</script>

<div class="backlight {className}">
	<svg width="0" height="0" aria-hidden="true" class="backlight-defs">
		<filter id={filterId} y="-50%" x="-50%" width="200%" height="200%">
			<feGaussianBlur in="SourceGraphic" stdDeviation={blur} result="blurred" />
			<feColorMatrix type="saturate" in="blurred" values="4" />
			<feComposite in="SourceGraphic" operator="over" />
		</filter>
	</svg>

	<div class="backlight-content" style="filter: url(#{filterId})">
		{#if children}
			{@render children()}
		{/if}
	</div>
</div>

<style>
	.backlight {
		display: inline-block;
		max-width: 100%;
	}

	.backlight-defs {
		position: absolute;
		width: 0;
		height: 0;
		overflow: hidden;
		pointer-events: none;
	}

	.backlight-content {
		display: block;
	}
</style>
