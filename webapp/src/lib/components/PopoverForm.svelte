<script lang="ts">
	/**
	 * PopoverForm — panel flotante con estados idle → loading → success.
	 * Port Svelte 5 del patrón React PopoverForm (cutouts, separator, spring open).
	 * Tokens Abellis (navy / gold / ink).
	 */
	import type { Snippet } from 'svelte';

	type FormState = 'idle' | 'loading' | 'success';

	interface Props {
		title?: string;
		open?: boolean;
		width?: string;
		height?: string;
		showCloseButton?: boolean;
		showSuccess?: boolean;
		triggerLabel?: string;
		openChild?: Snippet;
		successChild?: Snippet;
		onOpenChange?: (open: boolean) => void;
		class?: string;
	}

	let {
		title = 'Form',
		open = $bindable(false),
		width = '320px',
		height = undefined,
		showCloseButton = true,
		showSuccess = false,
		triggerLabel,
		openChild,
		successChild,
		onOpenChange,
		class: className = ''
	}: Props = $props();

	let rootEl = $state<HTMLDivElement | null>(null);

	function setOpen(next: boolean) {
		open = next;
		onOpenChange?.(next);
	}

	function toggle() {
		setOpen(!open);
	}

	function close() {
		setOpen(false);
	}

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape' && open) {
			e.preventDefault();
			close();
		}
	}

	$effect(() => {
		if (typeof window === 'undefined') return;
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});

	$effect(() => {
		if (!open || typeof document === 'undefined') return;
		function onDoc(e: MouseEvent) {
			if (rootEl && !rootEl.contains(e.target as Node)) close();
		}
		const t = setTimeout(() => document.addEventListener('mousedown', onDoc), 0);
		return () => {
			clearTimeout(t);
			document.removeEventListener('mousedown', onDoc);
		};
	});
</script>

<div class="pf {className}" bind:this={rootEl} data-open={open || undefined} data-success={showSuccess || undefined}>
	<button type="button" class="pf-trigger" aria-expanded={open} onclick={toggle}>
		<span class="pf-trigger__label">{triggerLabel ?? title}</span>
		<svg class="pf-trigger__chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
			{#if open}
				<path d="M18 6 6 18M6 6l12 12" stroke-linecap="round" />
			{:else}
				<path d="M6 9l6 6 6-6" stroke-linecap="round" stroke-linejoin="round" />
			{/if}
		</svg>
	</button>

	{#if open}
		<div
			class="pf-panel"
			role="dialog"
			aria-label={title}
			style="width: {width}; {height ? `min-height: ${height};` : ''}"
		>
			<div class="pf-panel__chrome">
				<span class="pf-panel__title">{title}</span>
				{#if showCloseButton && !showSuccess}
					<button type="button" class="pf-panel__close" aria-label="Cerrar" onclick={close}>
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M18 6 6 18M6 6l12 12" stroke-linecap="round" />
						</svg>
					</button>
				{/if}
			</div>

			<div class="pf-panel__body">
				{#if showSuccess}
					{#if successChild}
						{@render successChild()}
					{:else}
						<div class="pf-success">
							<div class="pf-success__icon" aria-hidden="true">
								<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M20 6 9 17l-5-5" stroke-linecap="round" stroke-linejoin="round" />
								</svg>
							</div>
							<p class="pf-success__title">Listo</p>
						</div>
					{/if}
				{:else if openChild}
					{@render openChild()}
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.pf {
		--pf-ease: cubic-bezier(0.22, 1, 0.36, 1);
		--pf-spring: cubic-bezier(0.34, 1.4, 0.64, 1);
		position: relative;
		display: inline-flex;
		flex-direction: column;
		align-items: center;
		font-family: var(--body, Inter, system-ui, sans-serif);
	}

	.pf-trigger {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.55rem 0.95rem;
		border-radius: 999px;
		border: 1px solid color-mix(in srgb, var(--line, #d9e2ec) 88%, transparent);
		background: color-mix(in srgb, var(--card, #fff) 92%, transparent);
		color: var(--head-ink, #012a50);
		font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-weight: 650;
		font-size: 0.8125rem;
		letter-spacing: -0.01em;
		cursor: pointer;
		box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
		transition:
			transform 0.28s var(--pf-spring),
			box-shadow 0.28s var(--pf-ease),
			border-color 0.2s ease,
			background 0.2s ease;
	}

	.pf-trigger:hover {
		transform: translateY(-1px);
		border-color: color-mix(in srgb, var(--navy, #004c8b) 28%, transparent);
		box-shadow: 0 6px 18px rgba(15, 23, 42, 0.08);
	}

	.pf[data-open] .pf-trigger {
		border-color: color-mix(in srgb, var(--navy, #004c8b) 35%, transparent);
		background: var(--navy, #004c8b);
		color: #fff;
	}

	.pf-trigger__chev {
		opacity: 0.75;
		flex-shrink: 0;
	}

	.pf-panel {
		position: absolute;
		top: calc(100% + 10px);
		left: 50%;
		transform: translateX(-50%);
		z-index: 40;
		border-radius: 14px;
		background: var(--card, #fff);
		border: 1px solid color-mix(in srgb, var(--line, #d9e2ec) 90%, transparent);
		box-shadow:
			0 18px 40px rgba(15, 23, 42, 0.12),
			0 0 0 1px color-mix(in srgb, #fff 40%, transparent) inset;
		overflow: hidden;
		animation: pf-in 0.34s var(--pf-spring) both;
		color: var(--ink, #132234);
	}

	@keyframes pf-in {
		from {
			opacity: 0;
			transform: translateX(-50%) translateY(8px) scale(0.96);
		}
		to {
			opacity: 1;
			transform: translateX(-50%) translateY(0) scale(1);
		}
	}

	.pf-panel__chrome {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		padding: 0.65rem 0.85rem 0.45rem;
		border-bottom: 1px solid color-mix(in srgb, var(--line, #d9e2ec) 70%, transparent);
	}

	.pf-panel__title {
		font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-weight: 700;
		font-size: 0.78rem;
		letter-spacing: -0.01em;
		color: var(--head-ink, #012a50);
	}

	.pf-panel__close {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.65rem;
		height: 1.65rem;
		border-radius: 8px;
		border: 1px solid transparent;
		background: transparent;
		color: var(--slate, #5c6b7d);
		cursor: pointer;
	}

	.pf-panel__close:hover {
		background: color-mix(in srgb, var(--navy, #004c8b) 8%, transparent);
		color: var(--navy, #004c8b);
	}

	.pf-panel__body {
		position: relative;
	}

	.pf-success {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.55rem;
		padding: 1.75rem 1.25rem;
		text-align: center;
		animation: pf-success-in 0.4s var(--pf-spring) both;
	}

	@keyframes pf-success-in {
		from {
			opacity: 0;
			transform: scale(0.92);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	.pf-success__icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.75rem;
		height: 2.75rem;
		border-radius: 999px;
		background: color-mix(in srgb, #16a34a 14%, transparent);
		color: #15803d;
	}

	.pf-success__title {
		margin: 0;
		font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-weight: 700;
		font-size: 0.95rem;
		color: var(--head-ink, #012a50);
	}

	@media (prefers-reduced-motion: reduce) {
		.pf-panel,
		.pf-success,
		.pf-trigger {
			animation: none !important;
			transition: none !important;
		}
	}
</style>
