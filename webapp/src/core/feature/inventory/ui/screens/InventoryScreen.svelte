<script lang="ts">
	import UiLoader from '../../../../../lib/components/UiLoader.svelte';
	import { getContext, onMount } from 'svelte';
	import type { I18nState } from '#lib/i18n/i18n.svelte.ts';
	import PageHeader from '../../../../../lib/components/PageHeader.svelte';
	import UiBanner from '../../../../../lib/components/UiBanner.svelte';
	import { createInventoryOverviewState } from '../state/inventoryState.svelte';

	const i18n = getContext<I18nState>('i18n');
	const vm = createInventoryOverviewState();

	onMount(() => {
		void vm.load();
	});

	let lastGeneration = $state(-1);
	$effect(() => {
		const gen = vm.generation;
		if (lastGeneration < 0) {
			lastGeneration = gen;
			return;
		}
		if (gen !== lastGeneration) {
			lastGeneration = gen;
			vm.invalidate();
			void vm.load();
		}
	});

	function onFilter(e: Event) {
		e.preventDefault();
		void vm.load(vm.warehouseId);
	}
</script>

<section class="inventory page">
	<PageHeader
		title={i18n.t('Inventario')}
		subtitle={i18n.t('Consulta las existencias por producto, ubicación y lote.')}
	/>

	<form class="filters" onsubmit={onFilter}>
		<label>
			{i18n.t('ID de almacén')}
			<input
				type="number"
				min="1"
				placeholder={i18n.t('Todos')}
				value={vm.warehouseId ?? ''}
				oninput={(e) => {
					const v = e.currentTarget.value;
					vm.setWarehouseId(v === '' ? undefined : Number(v));
				}}
				disabled={vm.loading}
			/>
		</label>
		<button type="submit" class="accent" disabled={vm.loading}>
			{vm.loading ? i18n.t('Cargando…') : i18n.t('Filtrar')}
		</button>
		<button type="button" class="secondary" onclick={() => vm.load()} disabled={vm.loading}>
			{i18n.t('Actualizar')}
		</button>
	</form>

	{#if vm.error}
		<UiBanner tone="error" message={vm.error}>
			{#snippet action()}
				<button type="button" onclick={() => vm.load()}>{i18n.t('Reintentar')}</button>
			{/snippet}
		</UiBanner>
	{:else if vm.loading && !vm.loadedOnce}
		<UiLoader label={i18n.t('Cargando inventario…')} size="lg" />
	{:else if vm.items.length === 0}
		<p class="empty">{i18n.t('Todavía no hay existencias registradas.')}</p>
	{:else}
		<div class="table-wrap">
			<table>
				<thead>
					<tr>
						<th>{i18n.t('SKU')}</th>
						<th>{i18n.t('Nombre')}</th>
						<th>{i18n.t('Ubicación')}</th>
						<th>{i18n.t('Cantidad')}</th>
						<th>{i18n.t('Lote')}</th>
					</tr>
				</thead>
				<tbody>
					{#each vm.items as row (row.inventoryId + '-' + row.itemId + '-' + row.binId)}
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
		{#if vm.loading}
			<UiLoader label={i18n.t('Actualizando…')} />
		{/if}
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
	.qty {
		font-variant-numeric: tabular-nums;
		font-weight: 600;
	}
	.status {
		color: var(--slate);
		font-size: var(--fs-sm, 0.8125rem);
	}
</style>
