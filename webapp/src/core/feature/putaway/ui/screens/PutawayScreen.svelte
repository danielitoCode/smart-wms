<script lang="ts">
	import { getContext } from 'svelte';
	import type { I18nState } from '../../../../lib/i18n/i18n.svelte';
	const i18n = getContext<I18nState>('i18n');
	import { onMount } from 'svelte';
	import { createPutawayState } from '../state/putawayState.svelte';

	const state = createPutawayState();

	onMount(() => {
		void state.load();
	});
</script>

<section class="page">
	<header>
		<h1>{i18n.t(i18n.t('Ubicación de productos'))}</h1>
		<p class="subtitle">{i18n.t(i18n.t('Traslada los productos recibidos a su ubicación definitiva.'))}</p>
	</header>

	<div class="toolbar">
		<label>
			ID de almacén
			<input
				type="number"
				min="1"
				value={state.warehouseId}
				oninput={(e) => state.setWarehouseId(Number(e.currentTarget.value))}
			/>
		</label>
		<button type="button" onclick={() => state.load()} disabled={state.loading}>
			{state.loading ? i18n.t('Cargando…') : i18n.t('Actualizar')}
		</button>
	</div>

	{#if state.error}
		<p class="status error" role="alert">{state.error}</p>
	{/if}
	{#if state.lastResult}
		<p class="status ok" role="status">
			{state.lastResult.message}: {state.lastResult.item}
			{state.lastResult.fromBin} → {state.lastResult.toBin} · cantidad: {state.lastResult.quantity}
		</p>
	{/if}

	{#if state.loading && state.items.length === 0}
		<p class="status">{i18n.t(i18n.t('Cargando…'))}</p>
	{:else if state.items.length === 0}
		<p class="status">{i18n.t(i18n.t('No hay productos pendientes de ubicación.'))}</p>
	{:else}
		<div class="table-wrap">
			<table>
				<thead>
					<tr>
						<th>{i18n.t(i18n.t(i18n.t('SKU')))}</th>
						<th>{i18n.t(i18n.t('Nombre'))}</th>
						<th>{i18n.t(i18n.t(i18n.t('Cantidad')))}</th>
						<th>{i18n.t(i18n.t('Desde'))}</th>
						<th>{i18n.t(i18n.t('Lote'))}</th>
						<th>{i18n.t(i18n.t('ID de ubicación destino'))}</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#each state.items as item (state.keyOf(item))}
						{@const k = state.keyOf(item)}
						<tr>
							<td>{item.sku}</td>
							<td>{item.itemName}</td>
							<td>{item.quantity}</td>
							<td>{item.binCode}</td>
							<td>{item.lotNumber ?? '—'}</td>
							<td>
								<input
									type="number"
									min="1"
									placeholder={i18n.t(i18n.t('ID de ubicación'))}
									value={state.toBinByKey[k] ?? ''}
									oninput={(e) => state.setToBin(item, e.currentTarget.value)}
									disabled={state.submittingKey === k}
								/>
							</td>
							<td>
								<button
									type="button"
									onclick={() => state.confirm(item)}
									disabled={state.submittingKey === k}
								>
									{state.submittingKey === k ? '…' : i18n.t('Confirmar')}
								</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</section>

<style>
	.page {
		font-family: system-ui, -apple-system, sans-serif;
		max-width: 56rem;
		margin: 1.5rem auto;
		padding: 0 1.25rem;
	}
	header { margin-bottom: 1rem; }
	h1 { margin: 0 0 0.25rem; font-size: 1.75rem; }
	.subtitle { margin: 0; color: #64748b; }
	.toolbar { display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: end; margin-bottom: 1rem; }
	label { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.85rem; color: #475569; }
	input { padding: 0.4rem 0.55rem; border: 1px solid #cbd5e1; border-radius: 6px; width: 7rem; }
	button { padding: 0.45rem 0.85rem; border-radius: 6px; border: 1px solid #cbd5e1; background: #0f172a; color: #fff; cursor: pointer; }
	button:disabled { opacity: 0.6; cursor: not-allowed; }
	.status { color: #475569; }
	.status.error { color: #b91c1c; }
	.status.ok { color: #166534; }
	.table-wrap { overflow-x: auto; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff; }
	table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
	th, td { text-align: left; padding: 0.55rem 0.75rem; border-bottom: 1px solid #e2e8f0; }
	th { background: #f8fafc; font-weight: 600; }
</style>
