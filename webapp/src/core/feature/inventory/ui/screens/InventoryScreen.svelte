<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import type { I18nState } from '#lib/i18n/i18n.svelte.ts';
	import PageHeader from '../../../../../lib/components/PageHeader.svelte';
	import UiBanner from '../../../../../lib/components/UiBanner.svelte';
	import { createInventoryOverviewState } from '../state/inventoryState.svelte';

	const i18n = getContext<I18nState>('i18n');
	const state = createInventoryOverviewState();

	onMount(() => {
		void state.load();
	});

	function onFilter(e: Event) {
		e.preventDefault();
		void state.load(state.warehouseId);
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
				value={state.warehouseId ?? ''}
				oninput={(e) => {
					const v = e.currentTarget.value;
					state.setWarehouseId(v === '' ? undefined : Number(v));
				}}
				disabled={state.loading}
			/>
		</label>
		<button type="submit" class="accent" disabled={state.loading}>
			{state.loading ? i18n.t('Cargando…') : i18n.t('Filtrar')}
		</button>
		<button type="button" class="secondary" onclick={() => state.load()} disabled={state.loading}>
			{i18n.t('Actualizar')}
		</button>
	</form>

	{#if state.error}
		<UiBanner tone="error" message={state.error}>
			{#snippet action()}
				<button type="button" onclick={() => state.load()}>{i18n.t('Reintentar')}</button>
			{/snippet}
		</UiBanner>
	{:else if state.loading && !state.loadedOnce}
		<div class="loading-block" role="status" aria-live="polite">
			<span class="ui-spinner" aria-hidden="true"></span>
			<p>{i18n.t('Cargando inventario…')}</p>
		</div>
	{:else if state.items.length === 0}
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
			<p class="status">{i18n.t('Actualizando…')}</p>
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
	.loading-block {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1.25rem 0;
		color: var(--slate);
	}
	.loading-block p {
		margin: 0;
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
