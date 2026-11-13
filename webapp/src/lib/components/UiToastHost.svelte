<script lang="ts">
	import { toastStore } from '../ui/toast.svelte';
</script>

{#if toastStore.items.length > 0}
	<div class="ui-toast-host" aria-live="polite" aria-relevant="additions">
		{#each toastStore.items as toast (toast.id)}
			<div class="ui-toast motion-toast" data-tone={toast.tone} role="status">
				<p>{toast.message}</p>
				<button
					type="button"
					class="dismiss"
					aria-label="Cerrar"
					onclick={() => toastStore.dismiss(toast.id)}
					>×</button
				>
			</div>
		{/each}
	</div>
{/if}

<style>
	.ui-toast-host {
		position: fixed;
		right: 1rem;
		bottom: 1rem;
		z-index: 90;
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
		width: min(22rem, calc(100vw - 2rem));
		pointer-events: none;
	}

	.ui-toast {
		pointer-events: auto;
		display: flex;
		align-items: flex-start;
		gap: 0.65rem;
		padding: 0.85rem 0.9rem;
		border-radius: 12px;
		border: 1px solid var(--line, #d9e2ec);
		background: var(--surface, #fff);
		box-shadow: var(--shadow-2);
		color: var(--ink, #132234);
		font-size: var(--fs-md, 0.9375rem);
		line-height: var(--lh-snug, 1.35);
	}

	.ui-toast p {
		margin: 0;
		flex: 1;
	}

	.dismiss {
		flex: none;
		width: 1.75rem;
		height: 1.75rem;
		padding: 0;
		border: 0;
		border-radius: 8px;
		background: transparent;
		color: var(--slate, #5c6b7d);
		font-size: 1.15rem;
		line-height: 1;
		cursor: pointer;
	}

	.dismiss:hover {
		background: var(--surface-2, #f5f8fc);
	}

	.ui-toast[data-tone='error'] {
		border-color: color-mix(in srgb, var(--danger, #b3322b) 40%, var(--line, #d9e2ec));
		background: var(--danger-bg, #fdf0ef);
		color: var(--danger, #b3322b);
	}

	.ui-toast[data-tone='success'] {
		border-color: color-mix(in srgb, var(--success, #1e7a46) 40%, var(--line, #d9e2ec));
		background: var(--success-bg, #eaf5ee);
		color: var(--success, #1e7a46);
	}

	.ui-toast[data-tone='warning'] {
		border-color: color-mix(in srgb, var(--warning, #9a6a00) 40%, var(--line, #d9e2ec));
		background: var(--warning-bg, #fff6df);
		color: var(--warning, #9a6a00);
	}

	.ui-toast[data-tone='info'] {
		border-color: color-mix(in srgb, var(--navy, #004c8b) 30%, var(--line, #d9e2ec));
		background: var(--surface-selected, #eaf2fa);
	}

	@media (max-width: 520px) {
		.ui-toast-host {
			right: 0.75rem;
			left: 0.75rem;
			bottom: 0.75rem;
			width: auto;
		}
	}
</style>
