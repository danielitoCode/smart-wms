<script lang="ts">
	import type { ToastType } from './toast.store';
	import { squircleClip } from './squircle';

	interface Props {
		type: Exclude<ToastType, 'default'>;
	}

	let { type }: Props = $props();

	const TILE = 36;
	const TILE_RADIUS = 11;
	const clip = squircleClip(TILE, TILE, TILE_RADIUS);
</script>

<span
	class="ti"
	data-type={type}
	aria-hidden="true"
	style="width: {TILE}px; height: {TILE}px; clip-path: {clip}"
>
	<span class="ti-glyph">
		{#if type === 'loading'}
			<svg viewBox="0 0 24 24" class="ti-spin" fill="none" stroke="currentColor" stroke-width="2.75" stroke-linecap="round">
				<circle cx="12" cy="12" r="8" stroke-opacity="0.25" />
				<path d="M12 4a8 8 0 0 1 8 8" />
			</svg>
		{:else}
			<svg viewBox="0 0 24 24" class="ti-svg" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
				{#if type === 'success'}
					<path class="ti-draw" d="M6 12.5l4 4 8-9" />
				{:else if type === 'error'}
					<path class="ti-draw" d="M7.5 7.5l9 9" />
					<path class="ti-draw ti-draw--2" d="M16.5 7.5l-9 9" />
				{:else if type === 'warning'}
					<path class="ti-draw" d="M12 6v7" />
					<circle cx="12" cy="18" r="1.6" fill="currentColor" stroke="none" />
				{:else if type === 'info'}
					<circle cx="12" cy="6.25" r="1.6" fill="currentColor" stroke="none" />
					<path class="ti-draw" d="M12 11v7" />
				{/if}
			</svg>
		{/if}
	</span>
</span>

<style>
	.ti {
		position: relative;
		display: grid;
		place-items: center;
		flex-shrink: 0;
		animation: ti-pop 0.42s cubic-bezier(0.34, 1.4, 0.64, 1) both;
		animation-delay: 0.28s;
		opacity: 0;
	}

	.ti[data-type='success'] { background: #34c759; color: #fff; }
	.ti[data-type='error'] { background: #ff3b30; color: #fff; }
	.ti[data-type='warning'] { background: #ff9500; color: #fff; }
	.ti[data-type='info'] { background: var(--navy, #007aff); color: #fff; }
	.ti[data-type='loading'] { background: #f4f4f9; color: #868593; }

	:global(.dark) .ti[data-type='loading'],
	:global(html.dark) .ti[data-type='loading'] {
		background: #2c2c2e;
		color: #9b9aa7;
	}

	.ti-glyph {
		display: grid;
		place-items: center;
		width: 100%;
		height: 100%;
		animation: ti-glyph-in 0.38s cubic-bezier(0.34, 1.4, 0.64, 1) both;
		animation-delay: 0.32s;
	}

	.ti-svg,
	.ti-spin {
		width: 18px;
		height: 18px;
	}

	.ti-draw {
		stroke-dasharray: 28;
		stroke-dashoffset: 28;
		animation: ti-draw 0.32s ease-out forwards;
		animation-delay: 0.42s;
	}

	.ti-draw--2 { animation-delay: 0.5s; }

	.ti-spin { animation: ti-spin 0.75s linear infinite; }

	@keyframes ti-pop {
		from { opacity: 0; transform: scale(0.85); }
		to { opacity: 1; transform: scale(1); }
	}

	@keyframes ti-glyph-in {
		from { opacity: 0; transform: scale(0.4); }
		to { opacity: 1; transform: scale(1); }
	}

	@keyframes ti-draw {
		to { stroke-dashoffset: 0; }
	}

	@keyframes ti-spin {
		to { transform: rotate(360deg); }
	}

	@media (prefers-reduced-motion: reduce) {
		.ti,
		.ti-glyph,
		.ti-draw,
		.ti-spin {
			animation: none !important;
			opacity: 1;
			transform: none;
			stroke-dashoffset: 0;
		}
	}
</style>
