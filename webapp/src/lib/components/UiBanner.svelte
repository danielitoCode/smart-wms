<script lang="ts">
	import type { Snippet } from 'svelte';

	export type BannerTone = 'info' | 'success' | 'warning' | 'error';

	interface Props {
		tone?: BannerTone;
		message: string;
		/** role: alert for errors, status otherwise */
		live?: 'polite' | 'assertive';
		action?: Snippet;
	}

	let { tone = 'info', message, live, action }: Props = $props();

	const resolvedLive = $derived(live ?? (tone === 'error' ? 'assertive' : 'polite'));
	const role = $derived(tone === 'error' ? 'alert' : 'status');
</script>

<div
	class="ui-banner motion-rise-in"
	data-tone={tone}
	role={role}
	aria-live={resolvedLive}
>
	<p class="msg">{message}</p>
	{#if action}
		<div class="action">{@render action()}</div>
	{/if}
</div>

<style>
	.ui-banner {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.65rem 1rem;
		margin: 0 0 1rem;
		padding: 0.85rem 1rem;
		border-radius: var(--radius-card, 16px);
		border: 1px solid var(--line, #d9e2ec);
		background: var(--surface, #fff);
		font-size: var(--fs-md, 0.9375rem);
		line-height: var(--lh-snug, 1.35);
	}

	.msg {
		margin: 0;
		flex: 1 1 12rem;
	}

	.action {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}

	.ui-banner[data-tone='error'] {
		border-color: color-mix(in srgb, var(--danger, #b3322b) 35%, var(--line, #d9e2ec));
		background: var(--danger-bg, #fdf0ef);
		color: var(--danger, #b3322b);
	}

	.ui-banner[data-tone='success'] {
		border-color: color-mix(in srgb, var(--success, #1e7a46) 35%, var(--line, #d9e2ec));
		background: var(--success-bg, #eaf5ee);
		color: var(--success, #1e7a46);
	}

	.ui-banner[data-tone='warning'] {
		border-color: color-mix(in srgb, var(--warning, #9a6a00) 35%, var(--line, #d9e2ec));
		background: var(--warning-bg, #fff6df);
		color: var(--warning, #9a6a00);
	}

	.ui-banner[data-tone='info'] {
		border-color: color-mix(in srgb, var(--navy, #004c8b) 25%, var(--line, #d9e2ec));
		background: var(--surface-selected, #eaf2fa);
		color: var(--navy-deep, #012a50);
	}
</style>
