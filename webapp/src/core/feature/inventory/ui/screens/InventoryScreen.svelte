<script lang="ts">
	import UiLoader from '../../../../../lib/components/UiLoader.svelte';
	import { getContext, onMount } from 'svelte';
	import type { I18nState } from '#lib/i18n/i18n.svelte.ts';
	import PageHeader from '../../../../../lib/components/PageHeader.svelte';
	import UiBanner from '../../../../../lib/components/UiBanner.svelte';
	import { createInventoryOverviewState } from '../state/inventoryState.svelte';

	const i18n = getContext<I18nState>('i18n');
	const vm = createInventoryOverviewState();
	let warehouseInput = $state('');
	let binInput = $state('');
	let itemInput = $state('');
	let searchInput = $state('');
	let sortKey = $state<'sku' | 'itemName' | 'binCode' | 'quantityOnHand' | 'quantityAvailable' | null>(null);
	let sortDirection = $state<'asc' | 'desc'>('asc');

	const sortedItems = $derived.by(() => {
		const rows = [...vm.items];
		if (!sortKey) return rows;
		return rows.sort((left, right) => {
			const a = left[sortKey];
			const b = right[sortKey];
			const comparison = typeof a === 'number' && typeof b === 'number'
				? a - b
				: String(a ?? '').localeCompare(String(b ?? ''), undefined, { numeric: true });
			return sortDirection === 'asc' ? comparison : -comparison;
		});
	});

	onMount(async () => {
		await vm.initialize();
		warehouseInput = vm.warehouseId == null ? '' : String(vm.warehouseId);
	});

	let lastGeneration = $state(-1);
	$effect(() => {
		const generation = vm.generation;
		if (lastGeneration < 0) {
			lastGeneration = generation;
			return;
		}
		if (generation !== lastGeneration) {
			lastGeneration = generation;
			vm.invalidate();
			warehouseInput = vm.warehouseId == null ? '' : String(vm.warehouseId);
			binInput = '';
			void vm.load();
		}
	});

	function toggleSort(key: NonNullable<typeof sortKey>) {
		if (sortKey === key) {
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			sortKey = key;
			sortDirection = 'asc';
		}
	}

	function applyFilters(event: SubmitEvent) {
		event.preventDefault();
		const nextWarehouseId = warehouseInput.trim() ? Number(warehouseInput) : undefined;
		if (nextWarehouseId !== vm.warehouseId) binInput = '';
		vm.setWarehouseId(nextWarehouseId);
		vm.setBinId(binInput.trim() ? Number(binInput) : undefined);
		vm.setItemId(itemInput.trim() ? Number(itemInput) : undefined);
		vm.setQuery(searchInput);
		void vm.applyFilters();
	}

	function clearFilters() {
		warehouseInput = '';
		binInput = '';
		itemInput = '';
		searchInput = '';
		vm.setWarehouseId(undefined);
		vm.setBinId(undefined);
		vm.setItemId(undefined);
		vm.setQuery('');
		void vm.applyFilters();
	}
</script>

<section class="inventory page">
	<PageHeader
		title={i18n.t('Inventario')}
		subtitle={i18n.t('Consulta las existencias por producto, almacén, ubicación y lote.')}
	/>

	<form class="filters" onsubmit={applyFilters}>
		<label>
			{i18n.t('Almacén')}
			<select bind:value={warehouseInput} disabled={vm.loadingOptions || vm.loading}>
				<option value="">{i18n.t('Todos los almacenes')}</option>
				{#each vm.warehouses as warehouse (warehouse.id)}
					<option value={String(warehouse.id)}>{warehouse.code} · {warehouse.name}</option>
				{/each}
			</select>
		</label>
		<label>
			{i18n.t('Ubicación')}
			<select bind:value={binInput} disabled={!warehouseInput || vm.bins.length === 0 || vm.loading}>
				<option value="">{i18n.t('Todas las ubicaciones')}</option>
				{#each vm.bins as bin (bin.id)}
					<option value={String(bin.id)}>{bin.code}{bin.zoneName ? ` · ${bin.zoneName}` : ''}</option>
				{/each}
			</select>
		</label>
		<label>
			{i18n.t('ID de producto')}
			<input type="number" min="1" step="1" placeholder={i18n.t('Todos')} bind:value={itemInput} />
		</label>
		<label class="search">
			{i18n.t('Buscar')}
			<input
				type="search"
				maxlength="200"
				placeholder={i18n.t('SKU, nombre, UPC, MPN o código de ubicación')}
				bind:value={searchInput}
			/>
		</label>
		<div class="filter-actions">
			<button type="submit" class="accent" disabled={vm.loading}>
				{vm.loading ? i18n.t('Cargando…') : i18n.t('Aplicar filtros')}
			</button>
			<button type="button" class="secondary" onclick={clearFilters} disabled={vm.loading}>
				{i18n.t('Limpiar')}
			</button>
		</div>
	</form>

	{#if vm.error}
		<UiBanner tone="error" message={vm.error}>
			{#snippet action()}
				<button type="button" onclick={() => void vm.load()}>{i18n.t('Reintentar')}</button>
			{/snippet}
		</UiBanner>
	{:else if vm.loading && !vm.loadedOnce}
		<UiLoader label={i18n.t('Cargando inventario…')} size="lg" />
	{:else if sortedItems.length === 0}
		<p class="empty">{i18n.t('No se encontraron existencias para estos filtros.')}</p>
	{:else}
		<div class="table-meta">
			<span>{i18n.t('Registros')}: {vm.total.toLocaleString()}</span>
			<span>{i18n.t('Página')} {vm.page} / {vm.pages}</span>
		</div>
		<div class="table-wrap" aria-busy={vm.loading}>
			<table>
				<thead>
					<tr>
						<th><button class="sort" type="button" onclick={() => toggleSort('sku')}>{i18n.t('SKU')}{sortKey === 'sku' ? (sortDirection === 'asc' ? ' ↑' : ' ↓') : ''}</button></th>
						<th>{i18n.t('Producto')}</th>
						<th><button class="sort" type="button" onclick={() => toggleSort('binCode')}>{i18n.t('Ubicación')}{sortKey === 'binCode' ? (sortDirection === 'asc' ? ' ↑' : ' ↓') : ''}</button></th>
						<th>{i18n.t('Zona')}</th>
						<th>{i18n.t('Lote')}</th>
						<th><button class="sort" type="button" onclick={() => toggleSort('quantityOnHand')}>{i18n.t('En mano')}{sortKey === 'quantityOnHand' ? (sortDirection === 'asc' ? ' ↑' : ' ↓') : ''}</button></th>
						<th>{i18n.t('Asignado')}</th>
						<th><button class="sort" type="button" onclick={() => toggleSort('quantityAvailable')}>{i18n.t('Disponible')}{sortKey === 'quantityAvailable' ? (sortDirection === 'asc' ? ' ↑' : ' ↓') : ''}</button></th>
						<th>{i18n.t('Comprometido')}</th>
						<th>{i18n.t('Último conteo')}</th>
						<th>{i18n.t('Estado')}</th>
					</tr>
				</thead>
				<tbody>
					{#each sortedItems as row (row.inventoryId)}
						<tr>
							<td class="mono">{row.sku}</td>
							<td>{row.itemName}</td>
							<td class="mono">{row.binCode}</td>
							<td>{row.zoneName ?? '—'}</td>
							<td>{row.lotNumber ?? '—'}</td>
							<td class="qty">{row.quantityOnHand}</td>
							<td class="qty">{row.quantityAllocated}</td>
							<td class="qty">{row.quantityAvailable}</td>
							<td class="qty">{row.committedToOrders}</td>
							<td>{row.lastCountedAt ? new Date(row.lastCountedAt).toLocaleDateString() : '—'}</td>
							<td>
								{#if row.quantityOnHand === 0}
									<span class="status out">{i18n.t('Agotado')}</span>
								{:else if row.quantityAvailable <= 0}
									<span class="status allocated">{i18n.t('Sin disponibilidad')}</span>
								{:else}
									<span class="status ok">{i18n.t('Disponible')}</span>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		{#if vm.loading}
			<UiLoader label={i18n.t('Actualizando…')} />
		{/if}
		<nav class="pagination" aria-label={i18n.t('Paginación del inventario')}>
			<button type="button" class="secondary" onclick={() => vm.setPage(vm.page - 1)} disabled={vm.page <= 1 || vm.loading}>
				{i18n.t('Anterior')}
			</button>
			<span>{vm.page} / {vm.pages}</span>
			<button type="button" class="secondary" onclick={() => vm.setPage(vm.page + 1)} disabled={vm.page >= vm.pages || vm.loading}>
				{i18n.t('Siguiente')}
			</button>
		</nav>
	{/if}
</section>

<style>
	.filters {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: 0.75rem;
		margin-bottom: 1.15rem;
	}
	.filters label {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		min-width: 10rem;
	}
	.filters .search { flex: 1 1 18rem; }
	.filter-actions { display: flex; gap: 0.5rem; }
	.table-meta, .pagination {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		color: var(--slate);
		font-size: var(--fs-sm, 0.8125rem);
		margin: 0.65rem 0;
	}
	.table-wrap { overflow: auto; border: 1px solid var(--line); border-radius: 10px; }
	table { width: 100%; border-collapse: collapse; white-space: nowrap; font-size: 0.82rem; }
	th, td { padding: 0.65rem 0.75rem; text-align: left; border-bottom: 1px solid var(--line); }
	th { color: var(--slate); font-size: 0.7rem; font-weight: 650; text-transform: uppercase; letter-spacing: 0.04em; }
	.sort { border: 0; padding: 0; background: transparent; color: inherit; font: inherit; cursor: pointer; }
	.qty { text-align: right; font-variant-numeric: tabular-nums; }
	.mono { font-family: var(--font-mono, monospace); }
	.status { display: inline-flex; border-radius: 999px; padding: 0.2rem 0.5rem; font-size: 0.7rem; font-weight: 650; }
	.status.out { color: var(--danger); background: color-mix(in srgb, var(--danger) 12%, transparent); }
	.status.allocated { color: var(--warning, #a66b12); background: color-mix(in srgb, var(--warning, #a66b12) 12%, transparent); }
	.status.ok { color: var(--success, #24734b); background: color-mix(in srgb, var(--success, #24734b) 12%, transparent); }
	.pagination { justify-content: center; }
	@media (max-width: 640px) {
		.filters label { flex: 1 1 100%; }
		.filter-actions { width: 100%; }
	}
</style>
