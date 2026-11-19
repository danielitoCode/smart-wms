<script lang="ts">
	import type { Snippet } from 'svelte';

	type UiStateKind = 'forbidden' | 'not-supported' | 'empty' | 'loading' | 'error' | 'conflict';

	type Props = {
		kind: UiStateKind;
		title: string;
		message: string;
		retry?: () => void;
		retryLabel?: string;
		action?: Snippet;
	};

	let { kind, title, message, retry, retryLabel = 'Reintentar', action }: Props = $props();
	const busy = $derived(kind === 'loading');
	const role = $derived(
		kind === 'loading' || kind === 'empty' ? 'status' : 'alert'
	);
</script>

<section class="ui-state" data-kind={kind} role={role} aria-busy={busy} aria-live={busy || kind === 'empty' ? 'polite' : 'assertive'}>
	<div class="marker" aria-hidden="true">
		{#if kind === 'loading'}
			<span class="spinner"></span>
		{:else if kind === 'forbidden'}
			<span>!</span>
		{:else if kind === 'not-supported'}
			<span>—</span>
		{:else if kind === 'empty'}
			<span>○</span>
		{:else if kind === 'conflict'}
			<span>↔</span>
		{:else}
			<span>×</span>
		{/if}
	</div>
	<div class="body">
		<h2>{title}</h2>
		<p>{message}</p>
		{#if busy}
			<div class="skeleton" aria-hidden="true"><span></span></div>
		{/if}
		{#if retry || action}
			<div class="actions">
				{#if retry}
					<button type="button" onclick={retry}>{retryLabel}</button>
				{/if}
				{#if action}{@render action()}{/if}
			</div>
		{/if}
	</div>
</section>

<style>
	.ui-state {
		width: min(42rem, calc(100% - 2rem));
		margin: 1.5rem auto;
		padding: 1.1rem 1.2rem;
		display: grid;
		grid-template-columns: 2.25rem minmax(0, 1fr);
		align-items: start;
		gap: 0.9rem;
		border: 1px solid var(--line, #d9e2ec);
		border-radius: var(--radius-card, 14px);
		background: var(--surface, #fff);
		color: var(--ink, #172b42);
	}
	.marker {
		width: 2.15rem;
		height: 2.15rem;
		display: grid;
		place-items: center;
		border-radius: 50%;
		background: var(--surface-2, #eef2f6);
		color: var(--slate, #536579);
		font-size: 1.15rem;
		font-weight: 700;
	}
	.body { min-width: 0; }
	h2 {
		margin: 0 0 0.3rem;
		font: 650 1rem/1.35 var(--disp, system-ui);
		color: inherit;
	}
	p {
		margin: 0;
		color: var(--slate, #536579);
		font: 400 0.9rem/1.5 var(--body, system-ui);
		white-space: pre-wrap;
	}
	.actions {
		margin-top: 0.85rem;
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
	button {
		min-height: 2.35rem;
		padding: 0.45rem 0.85rem;
		border: 1px solid var(--line, #d9e2ec);
		border-radius: var(--radius-field, 8px);
		background: var(--surface-2, #eef2f6);
		color: var(--ink, #172b42);
		font: 600 0.85rem var(--body, system-ui);
		cursor: pointer;
	}
	.ui-state[data-kind='forbidden'],
	.ui-state[data-kind='error'],
	.ui-state[data-kind='conflict'] { border-color: color-mix(in srgb, var(--danger, #b3322b) 30%, var(--line, #d9e2ec)); }
	.ui-state[data-kind='forbidden'] .marker,
	.ui-state[data-kind='error'] .marker,
	.ui-state[data-kind='conflict'] .marker {
		background: var(--danger-bg, #fdf0ef);
		color: var(--danger, #b3322b);
	}
	.ui-state[data-kind='not-supported'] .marker,
	.ui-state[data-kind='empty'] .marker {
		background: var(--surface-selected, #eaf2fa);
		color: var(--navy, #004c8b);
	}
	.skeleton {
		margin-top: 0.85rem;
		width: min(22rem, 100%);
		height: 0.45rem;
		overflow: hidden;
		border-radius: 999px;
		background: var(--surface-2, #eef2f6);
	}
	.skeleton span {
		display: block;
		width: 45%;
		height: 100%;
		border-radius: inherit;
		background: var(--lightblue, #8fb4da);
		animation: state-loading 1.25s ease-in-out infinite alternate;
	}
	.spinner {
		width: 1rem;
		height: 1rem;
		border: 2px solid var(--line, #d9e2ec);
		border-top-color: var(--navy, #004c8b);
		border-radius: 50%;
		animation: state-spin 0.8s linear infinite;
	}
	@keyframes state-loading { from { transform: translateX(0); } to { transform: translateX(115%); } }
	@keyframes state-spin { to { transform: rotate(360deg); } }
	@media (prefers-reduced-motion: reduce) {
		.skeleton span, .spinner { animation: none; }
	}
</style>
