<script lang="ts">
	import { getContext } from 'svelte';
	import type { I18nState } from '../../../../../lib/i18n/i18n.svelte';
	import PageHeader from '../../../../../lib/components/PageHeader.svelte';
	import UiBanner from '../../../../../lib/components/UiBanner.svelte';
	import { pushToast } from '../../../../../lib/ui/toast.svelte';
	const i18n = getContext<I18nState>('i18n');
	import { createReceivingState } from '../state/receivingState.svelte';

	const state = createReceivingState();

	function onLookup(event: Event) {
		event.preventDefault();
		void state.lookup();
	}

	async function onReceive(event: Event) {
		event.preventDefault();
		await state.submitReceive();
		if (state.lastResult) pushToast(state.lastResult.message, 'success');
		else if (state.error) pushToast(state.error, 'error');
	}

	async function onCancel(event: Event) {
		event.preventDefault();
		await state.cancelReceipts();
		if (state.lastCancel) pushToast(state.lastCancel.message, 'success');
		else if (state.error) pushToast(state.error, 'error');
	}
</script>

<section class="page">
	<PageHeader
		title={i18n.t('Recepción')}
		subtitle={i18n.t('Registra entradas de mercancía y confirma recepciones pendientes.')}
	/>

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
		<UiBanner tone="error" message={state.error} />
	{/if}

	{#if state.lastResult}
		<UiBanner
			tone="success"
			message={`${state.lastResult.message}${state.lastResult.receiptIds.length ? ' · recepciones: ' + state.lastResult.receiptIds.join(', ') : ''} · estado: ${state.lastResult.poStatus}`}
		/>
	{/if}

	{#if state.lastCancel}
		<UiBanner
			tone="success"
			message={`${state.lastCancel.message} · recepciones anuladas: ${state.lastCancel.reversed}`}
		/>
	{/if}

	{#if state.detail}
		<section class="po">
			<h2>{i18n.t('Orden de compra')} {state.detail.purchaseOrder.poNumber}</h2>
			<p class="meta">
				{state.detail.purchaseOrder.vendorName}
				· {state.detail.purchaseOrder.status}
				· {i18n.t('Almacén')} {state.detail.purchaseOrder.warehouseId}
			</p>

			<form class="receive" onsubmit={onReceive}>
				<label>
					{i18n.t('Cantidad a recibir')}
					<input
						type="number"
						min="1"
						value={state.receiveQty}
						oninput={(e) => state.setReceiveQty(Number(e.currentTarget.value))}
						disabled={state.submitting}
					/>
				</label>
				<button type="submit" class="primary" disabled={state.submitting}>
					{state.submitting ? i18n.t('Registrando…') : i18n.t('Confirmar recepción')}
				</button>
			</form>

			<form class="cancel" onsubmit={onCancel}>
				<button type="submit" class="danger" disabled={state.cancelling}>
					{state.cancelling ? i18n.t('Anulando…') : i18n.t('Anular recepciones')}
				</button>
			</form>

			<div class="table-wrap">
				<table>
					<thead>
						<tr>
							<th>{i18n.t('SKU')}</th>
							<th>{i18n.t('Descripción')}</th>
							<th>{i18n.t('Pedida')}</th>
							<th>{i18n.t('Recibida')}</th>
							<th>{i18n.t('Pendiente')}</th>
						</tr>
					</thead>
					<tbody>
						{#each state.detail.lines as line (line.poLineId)}
							<tr>
								<td>{line.sku ?? line.itemId}</td>
								<td>{line.description ?? '—'}</td>
								<td>{line.qtyOrdered}</td>
								<td>{line.qtyReceived}</td>
								<td>{line.qtyOrdered - line.qtyReceived}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>
	{:else if !state.loading && !state.error}
		<p class="empty">{i18n.t('Busca una orden de compra para comenzar la recepción.')}</p>
	{/if}
</section>

<style>
	.lookup {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
		margin-bottom: 1rem;
	}
	.lookup input {
		flex: 1 1 16rem;
		min-height: 42px;
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--line);
		border-radius: var(--radius-field);
	}
	.po {
		padding: 1.1rem 1.15rem;
		border: 1px solid var(--line);
		border-radius: var(--radius-card);
		background: var(--surface);
		box-shadow: var(--shadow-1);
	}
	.po h2 {
		margin: 0 0 0.35rem;
	}
	.meta {
		margin: 0 0 1rem;
		color: var(--slate);
		font-size: var(--fs-sm, 0.8125rem);
	}
	.receive {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: 0.65rem;
		margin-bottom: 0.75rem;
	}
	.receive label {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}
	.cancel {
		margin-bottom: 1rem;
	}
	.empty {
		color: var(--slate);
	}
</style>
