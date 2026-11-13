<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		subtitle?: string;
		eyebrow?: string;
		actions?: Snippet;
	}

	let {
		title,
		subtitle,
		eyebrow = 'ABELLIS · SMART WMS',
		actions
	}: Props = $props();
</script>

<header class="page-header">
	<div class="copy">
		{#if eyebrow}
			<p class="eyebrow">{eyebrow}</p>
		{/if}
		<h1>{title}</h1>
		{#if subtitle}
			<p class="subtitle">{subtitle}</p>
		{/if}
	</div>
	{#if actions}
		<div class="actions">{@render actions()}</div>
	{/if}
</header>

<style>
	.page-header {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem 1.25rem;
		margin: 0 0 1.35rem;
	}

	.copy {
		min-width: min(100%, 18rem);
		flex: 1 1 16rem;
	}

	.eyebrow {
		margin: 0 0 0.25rem;
		font: 600 var(--fs-xs, 0.72rem) var(--disp, system-ui);
		letter-spacing: var(--tracking-label, 0.12em);
		text-transform: uppercase;
		color: var(--navy, #004c8b);
	}

	h1 {
		margin: 0 0 0.35rem;
		font: 600 var(--fs-3xl, clamp(1.75rem, 2.6vw, 2.15rem)) / var(--lh-tight, 1.2)
			var(--disp, system-ui);
		letter-spacing: var(--tracking-display, -0.025em);
		color: var(--head-ink, var(--navy-deep, #012a50));
	}

	.subtitle {
		margin: 0;
		max-width: 42rem;
		color: var(--slate, #5c6b7d);
		font-size: var(--fs-md, 0.9375rem);
		line-height: var(--lh-body, 1.55);
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
	}

	@media (max-width: 640px) {
		.page-header {
			flex-direction: column;
			align-items: stretch;
		}

		.actions {
			width: 100%;
		}

		.actions :global(button),
		.actions :global(a) {
			flex: 1 1 auto;
		}
	}
</style>
