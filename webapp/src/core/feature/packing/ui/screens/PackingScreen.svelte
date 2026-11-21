<script lang="ts">
	import UiStatePanel from '#lib/components/UiStatePanel.svelte';
	import { getContext } from 'svelte';
	import type { I18nState } from '#lib/i18n/i18n.svelte.ts';
	const i18n = getContext<I18nState>('i18n');
	import type { WarehouseSelectionState } from '../../../warehouses/ui/state/warehouseSelectionState.svelte';
	import { createPackingState } from '../state/packingState.svelte';

	const warehouseSelection = getContext<WarehouseSelectionState>('warehouseSelection');
	const state = createPackingState(warehouseSelection);
	let lastWarehouseGeneration = -1;
	$effect(() => {
		const generation = warehouseSelection.generation;
		if (generation === lastWarehouseGeneration) return;
		lastWarehouseGeneration = generation;
		state.onWarehouseChanged();
	});

	function onLoad(e: Event) {
		e.preventDefault();
		void state.load();
	}

	function onVerify(e: Event) {
		e.preventDefault();
		void state.verify();
	}
</script>

<section class="page">
	<header>
		<h1>{i18n.t('Empaque de pedidos')}</h1>
		<p class="meta">Almacén activo: #{warehouseSelection.warehouseId ?? '—'}</p>
		<p class="subtitle">{i18n.t('Comprueba los productos recogidos y completa el empaque del pedido.')}</p>
	</header>

	<form class="row" onsubmit={onLoad}>
		<input
			type="text"
			placeholder={i18n.t('Número o código de barras del pedido')}
			value={state.barcode}
			oninput={(e) => state.setBarcode(e.currentTarget.value)}
			disabled={state.loading || state.busy}
		/>
		<button type="submit" disabled={state.loading || state.busy || warehouseSelection.warehouseId == null || !state.barcode.trim()}>
			{state.loading ? i18n.t('Cargando…') : i18n.t('Cargar')}
		</button>
	</form>

	{#if state.error}<UiStatePanel kind="error" title={i18n.t('No se pudo cargar el pedido')} message={state.error} />{/if}
	{#if state.loading && !state.detail}<UiStatePanel kind="loading" title={i18n.t('Cargando pedido para empaque')} message={i18n.t('Estamos validando el código escaneado.')} />
	{:else if !state.detail}<UiStatePanel kind="empty" title={i18n.t('Escanea un pedido')} message={i18n.t('Introduce o escanea el código de barras para cargar el pedido que vas a empacar.')} />{/if}
	{#if state.info}<p class="ok" role="status">{state.info}</p>{/if}

	{#if state.detail}
		<p class="meta">
			{state.detail.salesOrder.soNumber} · {state.detail.salesOrder.status}
			· unidades verificadas: {state.detail.itemsVerified}/{state.detail.totalItems}
			· peso {state.detail.calculatedWeightLbs} lb
		</p>

		<div class="table-wrap">
			<table>
				<thead>
					<tr>
						<th>{i18n.t('SKU')}</th>
						<th>{i18n.t('Recogido')}</th>
						<th>{i18n.t('Empacado')}</th>
						<th>{i18n.t('Verificado')}</th>
					</tr>
				</thead>
				<tbody>
					{#each state.detail.lines as line (line.sku)}
						<tr>
							<td>{line.sku}</td>
							<td>{line.quantityPicked}</td>
							<td>{line.quantityPacked}</td>
							<td>{line.packVerified ? 'sí' : 'no'}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<form class="row" onsubmit={onVerify}>
			<input
				type="text"
				placeholder={i18n.t('Código de barras a verificar')}
				value={state.scannedBarcode}
				oninput={(e) => state.setScannedBarcode(e.currentTarget.value)}
				disabled={state.busy}
				required
			/>
			<input
				type="number"
				min="1"
				value={state.quantity}
				oninput={(e) => state.setQuantity(Number(e.currentTarget.value))}
				disabled={state.busy}
			/>
			<button type="submit" disabled={state.busy || state.reconciliationRequired}>{i18n.t('Verificar')}</button>
		</form>

		<button type="button" class="accent" onclick={() => state.complete()} disabled={state.busy || !state.allVerified}>
			{i18n.t("Completar empaque")}
		</button>
	{/if}
</section>

<style>
	.page { font-family: system-ui, sans-serif; max-width: 40rem; margin: 1.5rem auto; padding: 0 1.25rem; }
	h1 { margin: 0 0 0.25rem; font-size: 1.75rem; }
	.subtitle, .meta { color: var(--slate); margin: 0 0 1rem; }
	.row { display: flex; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap; }
	input { padding: 0.45rem 0.6rem; border: 1px solid var(--line); border-radius: 6px; }
	button { padding: 0.45rem 0.9rem; border-radius: 6px; border: 1px solid var(--navy); background: var(--navy); color: #fff; cursor: pointer; }

	button:disabled { opacity: 0.6; }
	.err { color: var(--danger); }
	.ok { color: var(--success, #166534); }
	.table-wrap { border: 1px solid var(--line); border-radius: 8px; overflow-x: auto; background: var(--card); margin-bottom: 1rem; }
	table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
	th, td { text-align: left; padding: 0.5rem 0.75rem; border-bottom: 1px solid var(--line); }
	th { background: var(--surface); }
</style>
