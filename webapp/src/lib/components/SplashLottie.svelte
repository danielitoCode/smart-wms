<script lang="ts">
	/**
	 * Logo DotLottie del splash (una reproducción, sin bucle).
	 * Archivos: static/lottie/abellis-splash.lottie
	 * Still opcional: static/lottie/abellis-splash-still.png
	 * Fallback: /brand/abellis_mark_principal.svg
	 */
	import { onMount } from 'svelte';
	import { DotLottieSvelte } from '@lottiefiles/dotlottie-svelte';

	interface Props {
		maxWidth?: string;
		aspectRatio?: string;
		src?: string;
		stillSrc?: string;
		label?: string;
		/** Por defecto una sola vez (no loop). */
		loop?: boolean;
	}

	let {
		maxWidth = '11rem',
		aspectRatio = '1 / 1',
		src = '/lottie/abellis-splash.lottie',
		stillSrc = '/brand/abellis_mark_principal.svg',
		label = 'ABELLIS Smart WMS',
		loop = false
	}: Props = $props();

	let reduceMotion = $state(true);
	let ready = $state(false);

	onMount(() => {
		const query = window.matchMedia('(prefers-reduced-motion: reduce)');
		const update = () => {
			reduceMotion = query.matches;
		};
		update();
		query.addEventListener('change', update);
		const t = window.setTimeout(() => {
			ready = true;
		}, 40);
		return () => {
			query.removeEventListener('change', update);
			window.clearTimeout(t);
		};
	});
</script>

<div
	class="splash-lottie-wrap"
	style:max-width={maxWidth}
	style:width="100%"
	style:aspect-ratio={aspectRatio}
>
	{#if reduceMotion || !ready}
		<img class="still" src={stillSrc} alt={label} width="320" height="320" />
	{:else}
		<div class="anim" role="img" aria-label={label}>
			<DotLottieSvelte {src} {loop} autoplay />
		</div>
	{/if}
</div>

<style>
	.splash-lottie-wrap {
		position: relative;
		display: grid;
		place-items: center;
		margin-inline: auto;
	}

	.still,
	.anim {
		width: 100%;
		height: 100%;
		display: grid;
		place-items: center;
		animation: logo-in 520ms cubic-bezier(0.22, 1, 0.36, 1) both;
	}

	.still {
		object-fit: contain;
	}

	.anim :global(canvas),
	.anim :global(svg) {
		width: 100% !important;
		height: 100% !important;
	}

	@keyframes logo-in {
		from {
			opacity: 0;
			transform: scale(0.94);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.still,
		.anim {
			animation: none;
		}
	}
</style>
