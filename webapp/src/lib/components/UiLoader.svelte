<!-- Chip circuit loader — Abellis tokens (navy / gold / lightblue) -->
<script lang="ts">
	import { getContext } from 'svelte';
	import type { I18nState } from '../i18n/i18n.svelte';

	let {
		label = null,
		size = 'md',
		compact = false
	}: {
		/** Visible caption under the chip (i18n string). */
		label?: string | null;
		size?: 'sm' | 'md' | 'lg';
		/** Inline spinner for buttons / tight toolbars. */
		compact?: boolean;
	} = $props();

	const i18n = getContext<I18nState | undefined>('i18n');
	// Unique gradient ids per instance (multiple loaders on one page)
	const uid = `chip-${Math.random().toString(36).slice(2, 9)}`;
	const caption = $derived(label ?? (i18n ? i18n.t('Cargando…') : 'Cargando…'));
</script>

<div
	class="ui-loader"
	class:compact
	class:sm={size === 'sm'}
	class:lg={size === 'lg'}
	role="status"
	aria-live="polite"
	aria-busy="true"
>
	<div class="ui-loader__frame" aria-hidden="true">
		<svg viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg" class="ui-loader__svg">
			<defs>
				<linearGradient id="{uid}-chip" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stop-color="var(--navy)" />
					<stop offset="100%" stop-color="var(--navy-deep, #012a50)" />
				</linearGradient>
				<linearGradient id="{uid}-text" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stop-color="#f4f7fb" />
					<stop offset="100%" stop-color="var(--lightblue, #8fb4da)" />
				</linearGradient>
				<linearGradient id="{uid}-pin" x1="1" y1="0" x2="0" y2="0">
					<stop offset="0%" stop-color="var(--gold)" />
					<stop offset="55%" stop-color="color-mix(in srgb, var(--gold) 55%, var(--navy))" />
					<stop offset="100%" stop-color="var(--navy)" />
				</linearGradient>
			</defs>

			<g class="traces">
				<path d="M100 100 H200 V210 H326" class="trace-bg" />
				<path d="M100 100 H200 V210 H326" class="trace-flow flow-a" />
				<path d="M80 180 H180 V230 H326" class="trace-bg" />
				<path d="M80 180 H180 V230 H326" class="trace-flow flow-b" />
				<path d="M60 260 H150 V250 H326" class="trace-bg" />
				<path d="M60 260 H150 V250 H326" class="trace-flow flow-a" />
				<path d="M100 350 H200 V270 H326" class="trace-bg" />
				<path d="M100 350 H200 V270 H326" class="trace-flow flow-b" />
				<path d="M700 90 H560 V210 H474" class="trace-bg" />
				<path d="M700 90 H560 V210 H474" class="trace-flow flow-b" />
				<path d="M740 160 H580 V230 H474" class="trace-bg" />
				<path d="M740 160 H580 V230 H474" class="trace-flow flow-a" />
				<path d="M720 250 H590 V250 H474" class="trace-bg" />
				<path d="M720 250 H590 V250 H474" class="trace-flow flow-b" />
				<path d="M680 340 H570 V270 H474" class="trace-bg" />
				<path d="M680 340 H570 V270 H474" class="trace-flow flow-a" />
			</g>

			<rect
				x="330"
				y="190"
				width="140"
				height="100"
				rx="20"
				ry="20"
				fill="url(#{uid}-chip)"
				stroke="color-mix(in srgb, var(--navy-deep, #012a50) 80%, #000)"
				stroke-width="3"
				filter="drop-shadow(0 0 6px color-mix(in srgb, var(--navy) 45%, transparent))"
			/>

			<g>
				<rect x="322" y="205" width="8" height="10" fill="url(#{uid}-pin)" rx="2" />
				<rect x="322" y="225" width="8" height="10" fill="url(#{uid}-pin)" rx="2" />
				<rect x="322" y="245" width="8" height="10" fill="url(#{uid}-pin)" rx="2" />
				<rect x="322" y="265" width="8" height="10" fill="url(#{uid}-pin)" rx="2" />
				<rect x="470" y="205" width="8" height="10" fill="url(#{uid}-pin)" rx="2" />
				<rect x="470" y="225" width="8" height="10" fill="url(#{uid}-pin)" rx="2" />
				<rect x="470" y="245" width="8" height="10" fill="url(#{uid}-pin)" rx="2" />
				<rect x="470" y="265" width="8" height="10" fill="url(#{uid}-pin)" rx="2" />
			</g>

			<text
				x="400"
				y="247"
				font-family="var(--disp, system-ui), sans-serif"
				font-size="20"
				font-weight="600"
				fill="url(#{uid}-text)"
				text-anchor="middle"
				dominant-baseline="middle"
				letter-spacing="0.06em"
			>WMS</text>

			<circle cx="100" cy="100" r="5" class="node" />
			<circle cx="80" cy="180" r="5" class="node" />
			<circle cx="60" cy="260" r="5" class="node" />
			<circle cx="100" cy="350" r="5" class="node" />
			<circle cx="700" cy="90" r="5" class="node" />
			<circle cx="740" cy="160" r="5" class="node" />
			<circle cx="720" cy="250" r="5" class="node" />
			<circle cx="680" cy="340" r="5" class="node" />
		</svg>
	</div>
	{#if !compact}
		<p class="ui-loader__label">{caption}</p>
	{/if}
	<span class="sr-only">{caption}</span>
</div>

<style>
	.ui-loader {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.65rem;
		width: 100%;
		padding: 1.25rem 0.75rem;
		text-align: center;
	}

	.ui-loader.compact {
		display: inline-flex;
		padding: 0;
		width: auto;
		gap: 0;
	}

	.ui-loader__frame {
		width: min(18rem, 88vw);
	}

	.ui-loader.sm .ui-loader__frame {
		width: min(11rem, 70vw);
	}

	.ui-loader.lg .ui-loader__frame {
		width: min(24rem, 92vw);
	}

	.ui-loader.compact .ui-loader__frame {
		width: 2.75rem;
	}

	.ui-loader__svg {
		display: block;
		width: 100%;
		height: auto;
	}

	.trace-bg {
		stroke: color-mix(in srgb, var(--line) 70%, var(--navy));
		stroke-width: 1.8;
		fill: none;
		opacity: 0.55;
	}

	.trace-flow {
		stroke-width: 1.8;
		fill: none;
		stroke-dasharray: 40 400;
		stroke-dashoffset: 438;
		filter: drop-shadow(0 0 5px currentColor);
		animation: chip-flow 2.8s cubic-bezier(0.5, 0, 0.9, 1) infinite;
	}

	.flow-a {
		stroke: var(--lightblue, #8fb4da);
		color: var(--lightblue, #8fb4da);
		animation-delay: 0s;
	}

	.flow-b {
		stroke: var(--gold);
		color: var(--gold);
		animation-delay: 0.35s;
	}

	.node {
		fill: var(--navy-deep, #012a50);
		stroke: var(--gold);
		stroke-width: 1.2;
	}

	:global(:root[data-theme='dark']) .node,
	:global(:root:not([data-theme='light'])) .node {
		fill: color-mix(in srgb, var(--navy) 40%, #000);
	}

	.ui-loader__label {
		margin: 0;
		font: 500 var(--fs-sm, 0.8125rem) / 1.4 var(--body, system-ui);
		color: var(--slate);
		letter-spacing: 0.02em;
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		border: 0;
	}

	@keyframes chip-flow {
		to {
			stroke-dashoffset: 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.trace-flow {
			animation: none;
			stroke-dasharray: none;
			stroke-dashoffset: 0;
			opacity: 0.85;
		}
	}
</style>
