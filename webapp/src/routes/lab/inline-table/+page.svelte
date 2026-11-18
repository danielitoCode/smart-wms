<script lang="ts">
	/**
	 * Lab detail — InlineTableControl
	 */
	import InlineTableControl from '../../../lib/components/InlineTableControl.svelte';
	import type { TableItem } from '../../../lib/components/inlineTableControl.types';

	let data = $state<TableItem[]>([
		{ id: '1', expense: 'Rent', method: 'Bank Transfer', amount: '1200' },
		{ id: '2', expense: 'Insurance', method: 'Credit Card', amount: '149' },
		{ id: '3', expense: 'Groceries', method: 'Wallet', amount: '205' },
		{ id: '4', expense: 'Utilities', method: 'Credit Card', amount: '180' },
		{ id: '5', expense: 'Bill', method: 'Cash', amount: '79' }
	]);

	let lastUpdate = $state<string | null>(null);

	function onUpdate(item: TableItem) {
		data = data.map((d) => (d.id === item.id ? item : d));
		lastUpdate = `${item.expense} · ${item.method} · $${item.amount}`;
	}
</script>

<svelte:head>
	<title>InlineTableControl · Component Lab</title>
</svelte:head>

<section class="detail-intro">
	<a class="detail-back" href="/lab">← Lab</a>
	<h1 class="detail-title">InlineTableControl</h1>
	<p class="detail-lead">
		Tabla de gastos con edición inline por fila. Migrado de React + Motion layout a Svelte 5 + CSS
		(tokens Abellis).
	</p>
	{#if lastUpdate}
		<p class="detail-note">Última actualización: <strong>{lastUpdate}</strong></p>
	{/if}
</section>

<section class="detail-stage">
	<InlineTableControl {data} {onUpdate} />
</section>

<style>
	.detail-intro {
		margin-bottom: 1rem;
	}

	.detail-back {
		display: inline-block;
		margin-bottom: 0.6rem;
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--link, #004c8b);
		text-decoration: none;
	}

	.detail-back:hover {
		text-decoration: underline;
	}

	.detail-title {
		margin: 0 0 0.4rem;
		font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-size: clamp(1.4rem, 2.6vw, 1.75rem);
		font-weight: 700;
		letter-spacing: -0.025em;
		color: var(--head-ink, #012a50);
	}

	.detail-lead {
		margin: 0;
		max-width: 42rem;
		font-size: 0.9rem;
		line-height: 1.55;
		color: var(--slate, #5c6b7d);
	}

	.detail-note {
		margin: 0.75rem 0 0;
		font-size: 0.8125rem;
		color: var(--slate, #5c6b7d);
	}

	.detail-stage {
		border-radius: 16px;
		border: 1.5px solid var(--line, #d9e2ec);
		background: var(--card, #fff);
		overflow: hidden;
	}
</style>
