<script lang="ts">
	import { onMount } from 'svelte';
	import { createWarehouseDetailState } from '../state/warehouseDetailState.svelte';

	let { warehouseId }: { warehouseId: number } = $props();
	// svelte-ignore state_referenced_locally
	const state = createWarehouseDetailState(warehouseId);

	onMount(() => { void state.load(); });
</script>

<section class="page">
	<header>
		<p class="back"><a href="/warehouses">← Almacenes</a></p>
		{#if state.warehouse}
			<h1>{state.warehouse.name}</h1>
			<p class="subtitle">{state.warehouse.code} · {state.warehouse.active ? 'Activo' : 'Inactivo'}</p>
			{#if state.warehouse.address}<p class="subtitle">{state.warehouse.address}</p>{/if}
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
		{#if state.error}<p class="status error" role="alert">{state.error}</p>{/if}
		<section class="panel">
			<h2>Zonas</h2>
			{#if state.zones.length === 0}
				<p class="status">Sin zonas.</p>
			{:else}
				<div class="table-wrap"><table>
					<thead><tr><th>Código</th><th>Nombre</th><th>Tipo</th><th>Estado</th><th></th></tr></thead>
					<tbody>
						{#each state.zones as zone (zone.id)}
							<tr class:selected={state.selectedZoneId === zone.id}>
								<td>{zone.code}</td><td>{zone.name}</td><td>{zone.zoneType}</td>
								<td>{zone.active ? 'Activo' : 'Inactivo'}</td>
								<td><button type="button" class="linkish" onclick={() => state.loadBinsForZone(zone.id, 1)}>Ver bins</button></td>
							</tr>
						{/each}
					</tbody>
				</table></div>
				{#if state.selectedZoneId != null}
					<p class="filter-hint">Filtro zona #{state.selectedZoneId}
						<button type="button" class="linkish" onclick={() => state.loadBinsForZone(null, 1)}>Quitar filtro</button>
					</p>
				{/if}
			{/if}
		</section>
		<section class="panel">
			<div class="bin-header"><h2>Bins</h2><input aria-label="Buscar bins" placeholder="Buscar por código o barcode" value={state.binSearch} oninput={(e) => state.searchBins(e.currentTarget.value)} /></div>
			{#if state.binsLoading}<p class="status">Actualizando bins…</p>
			{:else if state.bins.length === 0}<p class="status">Sin bins para este filtro.</p>
			{:else}
				<div class="table-wrap"><table>
					<thead><tr><th>Código</th><th>Barcode</th><th>Tipo</th><th>Zona</th><th>Pasillo</th><th>Sec. picking</th><th>Estado</th></tr></thead>
					<tbody>
						{#each state.bins as bin (bin.id)}
							<tr><td>{bin.code}</td><td>{bin.barcode ?? '—'}</td><td>{bin.binType}</td><td>{bin.zoneName ?? bin.zoneId ?? '—'}</td><td>{bin.aisle ?? '—'}</td><td>{bin.pickSequence}</td><td>{bin.active ? 'Activo' : 'Inactivo'}</td></tr>
						{/each}
					</tbody>
				</table></div>
				<div class="pagination">
					<span>{state.binTotal} bins · página {state.binPage} de {state.binPages}</span>
					<div><button type="button" disabled={state.binPage <= 1 || state.binsLoading} onclick={() => state.loadBinsForZone(state.selectedZoneId, state.binPage - 1)}>Anterior</button>
					<button type="button" disabled={state.binPage >= state.binPages || state.binsLoading} onclick={() => state.loadBinsForZone(state.selectedZoneId, state.binPage + 1)}>Siguiente</button></div>
				</div>
			{/if}
		</section>
	{/if}
</section>

<style>
	.page { max-width: 62rem; margin: 1.5rem auto; padding: 0 1.25rem; font-family: var(--body); }
	.back { margin: 0 0 0.5rem; } .back a { color: var(--navy); text-decoration: none; font-size: 0.9rem; }
	h1 { margin: 0 0 0.25rem; font-family: var(--disp); font-size: 1.75rem; } h2 { margin: 0; font-family: var(--disp); font-size: 1.1rem; }
	.subtitle { margin: 0.15rem 0 0; color: var(--slate); font-size: 0.9rem; }
	.panel { margin-top: 1.5rem; padding: 1rem; border: 1px solid var(--line); border-radius: var(--radius-card); background: var(--card); }
	.status { color: var(--slate); } .status.error { color: var(--danger); }
	.table-wrap { overflow-x: auto; margin-top: 0.75rem; border: 1px solid var(--line); border-radius: 8px; background: #fff; }
	table { width: 100%; border-collapse: collapse; font-size: 0.86rem; } th, td { text-align: left; padding: 0.6rem 0.75rem; border-bottom: 1px solid var(--line); white-space: nowrap; } th { background: var(--surface-subtle, #f7fafc); font-weight: 600; }
	tr.selected { background: var(--surface-selected, #e0f2fe); }
	.linkish { border: 0; background: none; color: var(--navy); cursor: pointer; padding: 0; font: inherit; }
	.filter-hint { margin: 0.6rem 0 0; color: var(--slate); font-size: 0.84rem; }
	.bin-header, .pagination { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; }
	.bin-header input { min-width: 14rem; padding: 0.45rem 0.6rem; border: 1px solid var(--line); border-radius: var(--radius-field); font: inherit; }
	.pagination { margin-top: 0.75rem; color: var(--slate); font-size: 0.84rem; }
	.pagination div { display: flex; gap: 0.4rem; }
	button:not(.linkish) { padding: 0.4rem 0.75rem; border-radius: 7px; border: 1px solid var(--line); background: #fff; cursor: pointer; }
	button:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
