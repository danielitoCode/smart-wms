<script lang="ts">
	import { onMount } from 'svelte';
	import { createInventoryOverviewState } from '../state/inventoryState.svelte';

	const state = createInventoryOverviewState();

	onMount(() => {
		void state.load();
	});
</script>

<section class="inventory">
	<header>
		<h1>Inventario</h1>
		<p class="subtitle">Vista general de stock (feature piloto)</p>
	</header>

	{#if state.loading}
		<p class="status">Cargando inventario…</p>
	{:else if state.error}
		<p class="status error" role="alert">{state.error}</p>
		<button type="button" onclick={() => state.load()}>Reintentar</button>
	{:else if state.items.length === 0}
		<p class="status">No hay registros de inventario.</p>
	{:else}
		<div class="table-wrap">
			<table>
				<thead>
					<tr>
						<th>SKU</th>
						<th>Nombre</th>
						<th>Bin</th>
						<th>Cantidad</th>
						<th>Lote</th>
					</tr>
				</thead>
				<tbody>
					{#each state.items as row (row.inventoryId + '-' + row.itemId + '-' + row.binId)}
						<tr>
							<td>{row.sku ?? row.itemId}</td>
							<td>{row.itemName ?? '—'}</td>
							<td>{row.binCode ?? row.binId}</td>
							<td class="qty">{row.quantityOnHand}</td>
							<td>{row.lotNumber ?? '—'}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</section>

<style>
	.inventory {
		font-family: system-ui, -apple-system, sans-serif;
		max-width: 56rem;
		margin: 2rem auto;
		padding: 0 1.25rem;
	}
	header {
		margin-bottom: 1.5rem;
	}
	h1 {
		margin: 0 0 0.25rem;
		font-size: 1.75rem;
	}
	.subtitle {
		margin: 0;
		color: #64748b;
	}
	.status {
		color: #475569;
	}
	.status.error {
		color: #b91c1c;
	}
	.table-wrap {
		overflow-x: auto;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.9rem;
	}
	th,
	td {
		text-align: left;
		padding: 0.65rem 0.85rem;
		border-bottom: 1px solid #e2e8f0;
	}
	th {
		background: #f8fafc;
		font-weight: 600;
		color: #334155;
	}
	.qty {
		font-variant-numeric: tabular-nums;
		font-weight: 600;
	}
	button {
		margin-top: 0.75rem;
		padding: 0.4rem 0.9rem;
		border-radius: 6px;
		border: 1px solid #cbd5e1;
		background: #fff;
		cursor: pointer;
	}
</style>
