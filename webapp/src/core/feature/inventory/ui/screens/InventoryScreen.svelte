<script lang="ts">
	import { onMount } from 'svelte';
	import { createInventoryOverviewState } from '../state/inventoryState.svelte';

	const state = createInventoryOverviewState();

	onMount(() => {
		void state.load();
	});

	function onFilter(e: Event) {
		e.preventDefault();
		void state.load(state.warehouseId);
	}
</script>

<section class="inventory">
	<header>
		<h1>Inventario</h1>
		<p class="subtitle">Vista general de stock (GET /api/admin/inventory)</p>
	</header>

	<form class="filters" onsubmit={onFilter}>
		<label>
			Warehouse ID
			<input
				type="number"
				min="1"
				placeholder="todos"
				value={state.warehouseId ?? ''}
				oninput={(e) => {
					const v = e.currentTarget.value;
					state.setWarehouseId(v === '' ? undefined : Number(v));
				}}
				disabled={state.loading}
			/>
		</label>
		<button type="submit" disabled={state.loading}>
			{state.loading ? 'Cargando…' : 'Filtrar'}
		</button>
		<button type="button" class="secondary" onclick={() => state.load()} disabled={state.loading}>
			Actualizar
		</button>
	</form>

	{#if state.error}
		<p class="status error" role="alert">{state.error}</p>
		<button type="button" onclick={() => state.load()}>Reintentar</button>
	{:else if state.loading && !state.loadedOnce}
		<p class="status">Cargando inventario…</p>
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
		{#if state.loading}
			<p class="status">Actualizando…</p>
		{/if}
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
		margin-bottom: 1rem;
	}
	h1 {
		margin: 0 0 0.25rem;
		font-size: 1.75rem;
	}
	.subtitle {
		margin: 0;
		color: #64748b;
	}
	.filters {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		align-items: end;
		margin-bottom: 1rem;
	}
	.filters label {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		font-size: 0.85rem;
	}
	input {
		padding: 0.45rem 0.6rem;
		border: 1px solid #cbd5e1;
		border-radius: 6px;
		width: 8rem;
	}
	button {
		padding: 0.45rem 0.9rem;
		border-radius: 6px;
		border: 1px solid #0f172a;
		background: #0f172a;
		color: #fff;
		cursor: pointer;
	}
	button.secondary {
		background: #fff;
		color: #0f172a;
	}
	button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
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
		background: #fff;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.9rem;
	}
	th,
	td {
		padding: 0.55rem 0.75rem;
		border-bottom: 1px solid #e2e8f0;
		text-align: left;
	}
	th {
		background: #f1f5f9;
		font-weight: 600;
	}
	.qty {
		font-variant-numeric: tabular-nums;
	}
</style>
