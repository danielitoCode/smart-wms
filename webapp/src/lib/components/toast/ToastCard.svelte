<script lang="ts">
	import { onMount } from 'svelte';
	import type { ToastAction, ToastType } from './toast.store';
	import { toast } from './toast.store';
	import { squirclePath } from './squircle';
	import ToastIcon from './ToastIcon.svelte';

	interface Props {
		toastId: string | number;
		type: ToastType;
		title: string;
		description?: string;
		action?: ToastAction;
		dismissible?: boolean;
		class?: string;
	}

	let {
		toastId,
		type,
		title,
		description,
		action,
		dismissible = true,
		class: className = ''
	}: Props = $props();

	const PADDING = 10;
	const TILE_RADIUS = 11;
	const CARD_RADIUS = TILE_RADIUS + PADDING;

	let cardEl = $state<HTMLDivElement | null>(null);
	let width = $state(0);
	let height = $state(0);

	const outline = $derived(
		width > 0 && height > 0 ? squirclePath(width, height, CARD_RADIUS) : null
	);

	onMount(() => {
		if (!cardEl) return;
		const measure = () => {
			width = cardEl!.offsetWidth;
			height = cardEl!.offsetHeight;
		};
		measure();
		const ro = new ResizeObserver(measure);
		ro.observe(cardEl);
		return () => ro.disconnect();
	});

	function onAction() {
		action?.onClick();
		toast.dismiss(toastId);
	}
</script>

<div
	class="tc {className}"
	data-slot="toast"
	data-type={type}
	role="status"
	aria-live="polite"
>
	<div
		bind:this={cardEl}
		class="tc-card"
		style="padding: {PADDING}px; border-radius: {CARD_RADIUS}px; {outline
			? `clip-path: path('${outline}');`
			: ''}"
	>
		{#if outline}
			<svg
				class="tc-stroke"
				aria-hidden="true"
				width={width}
				height={height}
				viewBox="0 0 {width} {height}"
			>
				<path d={outline} fill="none" stroke-width="2" class="tc-stroke__path" />
			</svg>
		{/if}

		<div class="tc-row">
			{#if type !== 'default'}
				<ToastIcon {type} />
			{/if}
			<div class="tc-body" class:tc-body--default={type === 'default'}>
				<p class="tc-title" data-slot="toast-title">{title}</p>
				{#if description}
					<p class="tc-desc" data-slot="toast-description">{description}</p>
				{/if}
			</div>
			{#if action}
				<button
					type="button"
					class="tc-action"
					data-slot="toast-action"
					style="border-radius: {TILE_RADIUS}px"
					onclick={onAction}
				>
					{action.label}
				</button>
			{/if}
		</div>
	</div>

	{#if dismissible}
		<button
			type="button"
			class="tc-close"
			aria-label="Cerrar"
			data-slot="toast-close"
			onclick={() => toast.dismiss(toastId)}
		>
			<svg viewBox="0 0 24 24" class="tc-close__icon" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true">
				<path d="M7 7l10 10M17 7L7 17" />
			</svg>
		</button>
	{/if}
</div>

<style>
	.tc {
		position: relative;
		width: 100%;
		height: 100%;
		filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.05)) drop-shadow(0 2px 5px rgba(0, 0, 0, 0.06));
		animation: tc-in 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
	}

	@keyframes tc-in {
		from { opacity: 0; transform: translateY(12px) scale(0.96); }
		to { opacity: 1; transform: translateY(0) scale(1); }
	}

	.tc-card {
		position: relative;
		display: flex;
		align-items: center;
		height: 100%;
		background: #fff;
		color: #0a0a0a;
	}

	:global(.dark) .tc-card,
	:global(html.dark) .tc-card {
		background: #1c1c1e;
		color: #fff;
	}

	.tc-stroke {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	.tc-stroke__path { stroke: rgba(0, 0, 0, 0.07); }

	:global(.dark) .tc-stroke__path,
	:global(html.dark) .tc-stroke__path {
		stroke: rgba(255, 255, 255, 0.1);
	}

	.tc-row {
		display: flex;
		min-width: 0;
		flex: 1;
		align-items: center;
		gap: 0.75rem;
	}

	.tc-body {
		display: flex;
		min-height: 2.25rem;
		min-width: 0;
		flex: 1;
		flex-direction: column;
		justify-content: center;
	}

	.tc-body--default { padding-left: 0.35rem; }

	.tc-title {
		margin: 0;
		font-size: 0.875rem;
		font-weight: 650;
		line-height: 1.25rem;
		letter-spacing: -0.01em;
		color: #0a0a0a;
	}

	:global(.dark) .tc-title,
	:global(html.dark) .tc-title { color: #fff; }

	.tc-desc {
		margin: 0.1rem 0 0;
		font-size: 13px;
		font-weight: 500;
		line-height: 18px;
		color: #868593;
	}

	.tc-action {
		height: 2.25rem;
		flex-shrink: 0;
		padding: 0 0.9rem;
		border: 0;
		background: #f4f4f9;
		color: #0a0a0a;
		font: inherit;
		font-size: 13px;
		font-weight: 650;
		cursor: pointer;
		outline: none;
		transition: background-color 0.15s ease, transform 0.12s ease;
	}

	.tc-action:hover { background: #ededf3; }
	.tc-action:active { transform: scale(0.95); }
	.tc-action:focus-visible {
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--navy, #004c8b) 55%, transparent);
	}

	:global(.dark) .tc-action,
	:global(html.dark) .tc-action {
		background: #2c2c2e;
		color: #fff;
	}

	:global(.dark) .tc-action:hover,
	:global(html.dark) .tc-action:hover { background: #3a3a3c; }

	.tc-close {
		position: absolute;
		left: -0.35rem;
		top: -0.35rem;
		display: grid;
		place-items: center;
		width: 1.25rem;
		height: 1.25rem;
		border: 0;
		border-radius: 999px;
		background: #fff;
		color: #868593;
		opacity: 0;
		cursor: pointer;
		box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.08);
		outline: none;
		transition: opacity 0.15s ease, color 0.15s ease;
	}

	.tc:hover .tc-close,
	.tc-close:focus-visible { opacity: 1; }

	.tc-close:hover { color: #0a0a0a; }

	.tc-close__icon { width: 0.625rem; height: 0.625rem; }

	:global(.dark) .tc-close,
	:global(html.dark) .tc-close {
		background: #2c2c2e;
		color: #9b9aa7;
		box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.1);
	}

	:global(.dark) .tc-close:hover,
	:global(html.dark) .tc-close:hover { color: #fff; }

	@media (hover: none) {
		.tc-close { display: none; }
	}

	@media (prefers-reduced-motion: reduce) {
		.tc { animation: none; }
	}
</style>
