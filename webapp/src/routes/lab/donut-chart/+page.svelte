<script lang="ts">
	import DonutChart, { type DonutSegment } from '../../../lib/components/DonutChart.svelte';

	const inventoryByZone: DonutSegment[] = [
		{ id: 'bulk', name: 'Bulk', color: '#0ea5e9', value: 12480 },
		{ id: 'pick-face', name: 'Pick face', color: '#10b981', value: 8320 },
		{ id: 'staging', name: 'Staging', color: '#f59e0b', value: 2940 },
		{ id: 'returns', name: 'Returns', color: '#a855f7', value: 1180 },
		{ id: 'quarantine', name: 'Quarantine', color: '#ef4444', value: 420 }
	];

	const orderStatus: DonutSegment[] = [
		{ id: 'open', name: 'Open', color: '#3b82f6', value: 186 },
		{ id: 'picking', name: 'Picking', color: '#14b8a6', value: 94 },
		{ id: 'packing', name: 'Packing', color: '#f59e0b', value: 61 },
		{ id: 'shipped', name: 'Shipped', color: '#22c55e', value: 312 },
		{ id: 'on-hold', name: 'On hold', color: '#64748b', value: 28 }
	];

	let dataset: 'inventory' | 'orders' = $state('inventory');
	let selectedId = $state<string | null>(null);

	const segments = $derived(dataset === 'inventory' ? inventoryByZone : orderStatus);
	const totalLabel = $derived(dataset === 'inventory' ? 'Units on hand' : 'Orders today');
	const chartLabel = $derived(
		dataset === 'inventory' ? 'Inventory by zone' : 'Order status mix'
	);
</script>

<svelte:head>
	<title>DonutChart · Component Lab</title>
</svelte:head>

<div class="lab">
	<header class="lab-head">
		<a class="back" href="/lab">← Lab</a>
	</header>
	<main class="lab-main">
		<p class="lab-kicker">Charts · SVG</p>
		<h1 class="lab-title">DonutChart</h1>
		<p class="lab-lead">
			Anillo de segmentos con extremos redondeados, lectura central vinculada y leyenda con teclado.
			Datos mock WMS (inventario por zona / estado de pedidos). Estilo beUI, sin motion/react.
		</p>

		<div class="lab-tools">
			<button type="button" class:is-on={dataset === 'inventory'} onclick={() => { dataset = 'inventory'; selectedId = null; }}>
				Inventario
			</button>
			<button type="button" class:is-on={dataset === 'orders'} onclick={() => { dataset = 'orders'; selectedId = null; }}>
				Pedidos
			</button>
		</div>

		<div class="lab-card">
			<DonutChart
				{segments}
				label={chartLabel}
				{totalLabel}
				{selectedId}
				onSelect={(id) => (selectedId = selectedId === id ? null : id)}
				formatValue={(v) => v.toLocaleString('en-US')}
			/>
			{#if selectedId}
				<p class="lab-note">
					Seleccionado: <strong>{segments.find((s) => s.id === selectedId)?.name ?? selectedId}</strong>
				</p>
			{/if}
		</div>
	</main>
</div>

<style>
	.lab {
		min-height: 100svh;
		margin: 0;
		padding: 1.25rem 1.25rem 3rem;
		background: #f4f4f5;
		color: #18181b;
		font-family: ui-sans-serif, system-ui, sans-serif;
	}
	.lab-head {
		max-width: 52rem;
		margin: 0 auto 1.25rem;
	}
	.back {
		display: inline-block;
		padding: 0.35rem 0.75rem;
		border-radius: 999px;
		border: 1px solid rgba(24, 24, 27, 0.12);
		background: rgba(24, 24, 27, 0.04);
		font-size: 0.75rem;
		font-weight: 600;
		color: inherit;
		text-decoration: none;
	}
	.lab-main {
		max-width: 52rem;
		margin: 0 auto;
	}
	.lab-kicker {
		margin: 0 0 0.35rem;
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		opacity: 0.55;
	}
	.lab-title {
		margin: 0 0 0.5rem;
		font-size: clamp(1.4rem, 3vw, 1.85rem);
		font-weight: 700;
		letter-spacing: -0.03em;
	}
	.lab-lead {
		margin: 0 0 1.25rem;
		max-width: 40rem;
		font-size: 0.95rem;
		line-height: 1.55;
		opacity: 0.72;
	}
	.lab-tools {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin-bottom: 1rem;
	}
	.lab-tools button {
		border: 1px solid rgba(24, 24, 27, 0.12);
		background: #fff;
		color: inherit;
		border-radius: 999px;
		padding: 0.35rem 0.85rem;
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
	}
	.lab-tools button.is-on {
		background: #18181b;
		color: #fafafa;
		border-color: #18181b;
	}
	.lab-card {
		padding: 1.25rem;
		border-radius: 1rem;
		background: #fff;
		border: 1px solid rgba(24, 24, 27, 0.06);
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
	}
	.lab-note {
		margin: 1rem 0 0;
		font-size: 0.85rem;
		opacity: 0.75;
	}
</style>
