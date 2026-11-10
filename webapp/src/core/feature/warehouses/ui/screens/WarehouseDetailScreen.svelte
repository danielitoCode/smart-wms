<script lang="ts">
	import { onMount } from 'svelte';
	import { createWarehouseDetailState } from '../state/warehouseDetailState.svelte';

	let { warehouseId }: { warehouseId: number } = $props();

	// Route param is fixed for this page instance; state holds the id from mount.
	// svelte-ignore state_referenced_locally
	const state = createWarehouseDetailState(warehouseId);

	onMount(() => {
		void state.load();
	});
</script>

<section class="page">
	<header>
		<p class="back"><a href="/warehouses">← Almacenes</a></p>
		{#if state.warehouse}
			<h1>{state.warehouse.name}</h1>
			<p class="subtitle">
				{state.warehouse.code}
				{#if state.warehouse.active}
					· Activo
				{:else}
					· Inactivo
				{/if}
			</p>
		{:else}
			<h1>Almacén #{warehouseId}</h1>
		{/if}
	</header>

	{#if state.loading && !state.warehouse}
		<p class="status">Cargando…</p>
	{:else if state.error && !state.warehouse}
		<p class="status error" role="alert">{state.error}</p>
		<button type="button" onclick={() => state.load()}>Reintentar</button>
	{:else}
		{#if state.error}
			<p class="status error" role="alert">{state.error}</p>
		{/if}

		<section class="panel">
			<h2>Zonas</h2>
			{#if state.zones.length === 0}
				<p class="status">Sin zonas.</p>
			{:else}
				<div class="table-wrap">
					<table>
						<thead>
							<tr>
								<th>Código</th>
								<th>Nombre</th>
								<th>Tipo</th>
								<th></th>
							</tr>
						</thead>
						<tbody>
							{#each state.zones as zone (zone.id)}
								<tr class:selected={state.selectedZoneId === zone.id}>
									<td>{zone.code}</td>
									<td>{zone.name}</td>
									<td>{zone.zoneType}</td>
									<td>
										<button
											type="button"
											class="linkish"
											onclick={() => state.loadBinsForZone(zone.id)}
										>
											Ver bins
										</button>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				{#if state.selectedZoneId != null}
					<p class="filter-hint">
						Filtro zona #{state.selectedZoneId}
						<button type="button" class="linkish" onclick={() => state.loadBinsForZone(null)}>
							Quitar filtro
						</button>
					</p>
				{/if}
			{/if}
		</section>

		<section class="panel">
			<h2>Bins</h2>
			{#if state.loading}
				<p class="status">Actualizando bins…</p>
			{:else if state.bins.length === 0}
				<p class="status">Sin bins.</p>
			{:else}
				<div class="table-wrap">
					<table>
						<thead>
							<tr>
								<th>Código</th>
								<th>Barcode</th>
								<th>Tipo</th>
								<th>Zona</th>
							</tr>
						</thead>
						<tbody>
							{#each state.bins as bin (bin.id)}
								<tr>
									<td>{bin.code}</td>
									<td>{bin.barcode ?? '—'}</td>
									<td>{bin.binType}</td>
									<td>{bin.zoneId ?? '—'}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</section>
	{/if}
</section>

<style>
	.page {
		font-family: system-ui, -apple-system, sans-serif;
		max-width: 56rem;
		margin: 1.5rem auto;
		padding: 0 1.25rem;
	}
	.back {
		margin: 0 0 0.5rem;
	}
	.back a {
		color: #0369a1;
		text-decoration: none;
		font-size: 0.9rem;
	}
	h1 {
		margin: 0 0 0.25rem;
		font-size: 1.75rem;
	}
	h2 {
		margin: 0 0 0.75rem;
		font-size: 1.15rem;
	}
	.subtitle {
		margin: 0;
		color: #64748b;
	}
	.panel {
		margin-top: 1.75rem;
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
		text-align: left;
		padding: 0.6rem 0.85rem;
		border-bottom: 1px solid #e2e8f0;
	}
	th {
		background: #f1f5f9;
		font-weight: 600;
	}
	tr.selected {
		background: #e0f2fe;
	}
	.linkish {
		border: none;
		background: none;
		color: #0369a1;
		cursor: pointer;
		padding: 0;
		font: inherit;
	}
	.filter-hint {
		margin: 0.5rem 0 0;
		font-size: 0.85rem;
		color: #64748b;
	}
	button:not(.linkish) {
		margin-top: 0.75rem;
		padding: 0.4rem 0.9rem;
		border-radius: 6px;
		border: 1px solid #cbd5e1;
		background: #fff;
		cursor: pointer;
	}
</style>
