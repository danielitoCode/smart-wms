<script lang="ts">
	import { getContext } from 'svelte';
	import type { I18nState } from '../../../../../lib/i18n/i18n.svelte';
	import PageHeader from '../../../../../lib/components/PageHeader.svelte';
	import UiBanner from '../../../../../lib/components/UiBanner.svelte';
	import { pushToast } from '../../../../../lib/ui/toast.svelte';
	const i18n = getContext<I18nState>('i18n');
	import { createReceivingState } from '../state/receivingState.svelte';

	const state = createReceivingState();

	let lastGeneration = $state(-1);
	$effect(() => {
		const gen = state.generation;
		if (lastGeneration < 0) {
			lastGeneration = gen;
			return;
		}
		if (gen !== lastGeneration) {
			lastGeneration = gen;
			state.invalidate();
		}
	});

	function onLookup(event: Event) {
		event.preventDefault();
		void state.lookup();
	}

	async function onReceive(event: Event) {
		event.preventDefault();
		const ok = await state.submitReceive();
		if (ok && state.lastResult) pushToast(state.lastResult.message, 'success');
		else if (state.error) pushToast(state.error, 'error');
	}

	async function onCancel(event: Event) {
		event.preventDefault();
		const ok = await state.cancelReceipts();
		if (ok && state.lastCancel) pushToast(state.lastCancel.message, 'success');
		else if (state.error) pushToast(state.error, 'error');
	}
</script>

<section class="page">
	<PageHeader
		title={i18n.t('Recepción')}
		subtitle={i18n.t('Consulta órdenes de compra, registra las cantidades recibidas y gestiona anulaciones.')}
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

	{#if state.detail}
		<section class="po">
			<h2>{state.detail.purchaseOrder.poNumber}</h2>
			<p class="meta">
				{state.detail.purchaseOrder.status} · WH {state.detail.purchaseOrder.warehouseId}
			</p>
			{#if state.drafts.length}
				<form onsubmit={onReceive}>
					<div class="table-wrap">
						<table>
							<thead>
								<tr>
									<th>{i18n.t('SKU')}</th>
									<th>{i18n.t('Nombre')}</th>
									<th>{i18n.t('Restante')}</th>
									<th>{i18n.t('Cantidad')}</th>
									<th>{i18n.t('Bin')}</th>
									<th>{i18n.t('Lote')}</th>
								</tr>
							</thead>
							<tbody>
								{#each state.drafts as draft, index}
									<tr>
										<td>{draft.sku}</td>
										<td>{draft.itemName}</td>
										<td>{draft.remaining}</td>
										<td>
											<input
												type="number"
												min="0"
												value={draft.quantity}
												oninput={(e) =>
													state.updateDraft(index, { quantity: Number(e.currentTarget.value) })
												}
												disabled={state.submitting}
											/>
										</td>
										<td>
											<input
												type="text"
												value={draft.binId}
												oninput={(e) => state.updateDraft(index, { binId: e.currentTarget.value })}
												disabled={state.submitting}
											/>
										</td>
										<td>
											<input
												type="text"
												value={draft.lotNumber}
												oninput={(e) => state.updateDraft(index, { lotNumber: e.currentTarget.value })}
												disabled={state.submitting}
											/>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
					<button type="submit" class="primary" disabled={state.submitting}>
						{state.submitting ? i18n.t('Registrando…') : i18n.t('Confirmar recepción')}
					</button>
				</form>
			{/if}

			<form class="cancel" onsubmit={onCancel}>
				<label>
					{i18n.t('IDs de recepción a anular')}
					<input
						type="text"
						placeholder="1,2,3"
						value={state.receiptIdsInput}
						oninput={(e) => state.setReceiptIdsInput(e.currentTarget.value)}
						disabled={state.cancelling}
					/>
				</label>
				<button type="submit" class="danger" disabled={state.cancelling}>
					{state.cancelling ? i18n.t('Anulando…') : i18n.t('Anular recepciones')}
				</button>
			</form>
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
	.cancel {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: 0.65rem;
		margin-top: 1rem;
	}
	.cancel label {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		flex: 1 1 12rem;
	}
	.status {
		color: var(--slate);
	}
	.empty {
		color: var(--slate);
	}
	.table-wrap {
		margin-bottom: 0.85rem;
		overflow: auto;
	}
	table input {
		width: 100%;
		min-width: 4.5rem;
		padding: 0.35rem 0.45rem;
		border: 1px solid var(--line);
		border-radius: 8px;
	}
</style>
