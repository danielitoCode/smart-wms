<script lang="ts">
	import { getContext } from 'svelte';
	import type { I18nState } from '../../../../../lib/i18n/i18n.svelte';
	const i18n = getContext<I18nState>('i18n');
	import { createReceivingState } from '../state/receivingState.svelte';

	const state = createReceivingState();

	function onLookup(event: Event) {
		event.preventDefault();
		void state.lookup();
	}

	function onReceive(event: Event) {
		event.preventDefault();
		void state.submitReceive();
	}

	function onCancel(event: Event) {
		event.preventDefault();
		void state.cancelReceipts();
	}
</script>

<section class="page">
	<header>
		<h1>{i18n.t('Recepción')}</h1>
		<p class="subtitle">{i18n.t('Consulta órdenes de compra, registra las cantidades recibidas y gestiona anulaciones.')}</p>
	</header>

	<form class="lookup" onsubmit={onLookup}>
		<input
			type="text"
			placeholder={i18n.t('Número de orden de compra o código de barras')}
			value={state.barcode}
			oninput={(e) => state.setBarcode(e.currentTarget.value)}
			disabled={state.loading || state.submitting || state.cancelling}
		/>
		<button type="submit" disabled={state.loading || state.submitting || !state.barcode.trim()}>
			{state.loading ? i18n.t('Buscando…') : i18n.t('Buscar')}
		</button>
	</form>

	{#if state.error}
		<p class="status error" role="alert">{state.error}</p>
	{/if}

	{#if state.lastResult}
		<p class="status ok" role="status">
			{state.lastResult.message}
			{#if state.lastResult.receiptIds.length}
				· recepciones: {state.lastResult.receiptIds.join(', ')}
			{/if}
			· estado de la orden: {state.lastResult.poStatus}
		</p>
	{/if}

	{#if state.lastCancel}
		<p class="status ok" role="status">
			{state.lastCancel.message} · recepciones anuladas: {state.lastCancel.reversed}
		</p>
	{/if}

	{#if state.detail}
		<section class="po">
			<h2>Orden de compra {state.detail.purchaseOrder.poNumber}</h2>
			<p class="meta">
				{state.detail.purchaseOrder.vendorName}
				· {state.detail.purchaseOrder.status}
				· Almacén #{state.detail.purchaseOrder.warehouseId}
			</p>

			{#if state.drafts.length === 0}
				<p class="status">{i18n.t('No quedan líneas pendientes de recibir.')}</p>
			{:else}
				<form onsubmit={onReceive}>
					<div class="table-wrap">
						<table>
							<thead>
								<tr>
									<th>{i18n.t('SKU')}</th>
									<th>{i18n.t('Nombre')}</th>
									<th>{i18n.t('Pendiente')}</th>
									<th>{i18n.t('Cantidad')}</th>
									<th>{i18n.t('ID de ubicación')}</th>
									<th>{i18n.t('Lote')}</th>
								</tr>
							</thead>
							<tbody>
								{#each state.drafts as draft, index (draft.itemId)}
									<tr>
										<td>{draft.sku}</td>
										<td>{draft.itemName}</td>
										<td>{draft.remaining}</td>
										<td>
											<input type="number" min="0" max={draft.remaining} value={draft.quantity}
												oninput={(e) => state.updateDraft(index, { quantity: Number(e.currentTarget.value) })}
												disabled={state.submitting} />
										</td>
										<td>
											<input type="number" min="1" placeholder={i18n.t('ID de ubicación')} value={draft.binId}
												oninput={(e) => state.updateDraft(index, { binId: e.currentTarget.value })}
												disabled={state.submitting} required />
										</td>
										<td>
											<input type="text" placeholder={i18n.t('opcional')} value={draft.lotNumber}
												oninput={(e) => state.updateDraft(index, { lotNumber: e.currentTarget.value })}
												disabled={state.submitting} />
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
					<button type="submit" class="accent" disabled={state.submitting}>
						{state.submitting ? 'Registrando…' : i18n.t('Registrar recepción')}
					</button>
				</form>
			{/if}

			<section class="cancel-panel">
				<h3>{i18n.t('Anular recepciones')}</h3>
				<p class="meta">{i18n.t('Introduce los identificadores de las recepciones separados por comas.')}</p>
				<form class="cancel-form" onsubmit={onCancel}>
					<input
						type="text"
						placeholder="ej. 1, 2, 3"
						value={state.receiptIdsInput}
						oninput={(e) => state.setReceiptIdsInput(e.currentTarget.value)}
						disabled={state.cancelling}
					/>
					<button type="submit" class="danger" disabled={state.cancelling || !state.receiptIdsInput.trim()}>
						{state.cancelling ? i18n.t('Anulando…') : i18n.t('Anular recepciones')}
					</button>
				</form>
			</section>
		</section>
	{/if}
</section>

<style>
	.page { font-family: system-ui, -apple-system, sans-serif; max-width: 56rem; margin: 1.5rem auto; padding: 0 1.25rem; }
	header { margin-bottom: 1.25rem; }
	h1 { margin: 0 0 0.25rem; font-size: 1.75rem; }
	h2 { margin: 0 0 0.35rem; font-size: 1.25rem; }
	h3 { margin: 0 0 0.35rem; font-size: 1.05rem; }
	.subtitle, .meta { margin: 0; color: #64748b; }
	.lookup, .cancel-form { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
	.lookup input, .cancel-form input { flex: 1; padding: 0.5rem 0.7rem; border: 1px solid #cbd5e1; border-radius: 6px; }
	button { padding: 0.45rem 0.9rem; border-radius: 6px; border: 1px solid #cbd5e1; background: #fff; cursor: pointer; }
	button.primary { margin-top: 1rem; background: #0f172a; color: #fff; border-color: #0f172a; }
	button.danger { background: #b91c1c; color: #fff; border-color: #b91c1c; }
	button:disabled { opacity: 0.6; cursor: not-allowed; }
	.status { color: #475569; }
	.status.error { color: #b91c1c; }
	.status.ok { color: #166534; }
	.po { margin-top: 1.5rem; }
	.cancel-panel { margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #e2e8f0; }
	.table-wrap { overflow-x: auto; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff; margin-top: 1rem; }
	table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
	th, td { text-align: left; padding: 0.55rem 0.75rem; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
	th { background: #f8fafc; font-weight: 600; }
	td input { width: 5.5rem; padding: 0.35rem 0.45rem; border: 1px solid #cbd5e1; border-radius: 4px; }
</style>
