<script lang="ts">
	/**
	 * Logo animado DotLottie para splash.
	 * Archivos esperados en static/lottie/:
	 *   - abellis-splash.lottie
	 *   - abellis-splash-still.png  (opcional; si no existe usa /brand/abellis_mark_principal.svg)
	 */
	import { onMount } from 'svelte';
	import { DotLottieSvelte } from '@lottiefiles/dotlottie-svelte';

	interface Props {
		/** Ancho máximo del logo (CSS). */
		maxWidth?: string;
		/** Aspect ratio del contenedor (ancho / alto). */
		aspectRatio?: string;
		/** Ruta pública del .lottie (bajo static/). */
		src?: string;
		/** Ruta pública del frame estático. */
		stillSrc?: string;
		/** Texto accesible. */
		label?: string;
		/** Reproducir en bucle. */
		loop?: boolean;
	}

	let {
		maxWidth = '11rem',
		aspectRatio = '1 / 1',
		src = '/lottie/abellis-splash.lottie',
		stillSrc = '/brand/abellis_mark_principal.svg',
		label = 'ABELLIS Smart WMS',
		loop = true
	}: Props = $props();

	/** true = frame estático (reduced-motion o antes de montar en cliente). */
	let still = $state(true);
	let mounted = $state(false);

	onMount(() => {
		mounted = true;
		const query = window.matchMedia('(prefers-reduced-motion: reduce)');
		const update = () => {
			still = query.matches;
		};
		update();
		query.addEventListener('change', update);
		return () => query.removeEventListener('change', update);
	});
</script>

{#if still || !mounted}
	<img
		class="splash-lottie-still"
		src={stillSrc}
		alt={label}
		width="320"
		height="320"
		style:max-width={maxWidth}
		style:width="100%"
		style:height="auto"
	/>
{:else}
	<div
		class="splash-lottie"
		role="img"
		aria-label={label}
		style:max-width={maxWidth}
		style:width="100%"
		style:aspect-ratio={aspectRatio}
	>
		<DotLottieSvelte {src} {loop} autoplay />
	</div>
{/if}

<style>
	.splash-lottie,
	.splash-lottie-still {
		display: block;
		margin-inline: auto;
	}

	.splash-lottie {
		overflow: hidden;
	}

	.splash-lottie :global(canvas),
	.splash-lottie :global(svg) {
		width: 100% !important;
		height: 100% !important;
	}
</style>
