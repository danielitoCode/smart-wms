<script lang="ts">
	import { getContext } from 'svelte';
	import type { I18nState } from '../../../../../lib/i18n/i18n.svelte';
	import PageHeader from '../../../../../lib/components/PageHeader.svelte';
	import UiBanner from '../../../../../lib/components/UiBanner.svelte';
	import { pushToast } from '../../../../../lib/ui/toast.svelte';
	const i18n = getContext<I18nState>('i18n');
	import { createReceivingState } from '../state/receivingState.svelte';

	const vm = createReceivingState();

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
		}
	});

	function onLookup(event: Event) {
		event.preventDefault();
		void vm.lookup();
	}

	async function onReceive(event: Event) {
		event.preventDefault();
		const ok = await vm.submitReceive();
		if (ok && vm.lastResult) pushToast(vm.lastResult.message, 'success');
		else if (vm.error) pushToast(vm.error, 'error');
	}

	async function onCancel(event: Event) {
		event.preventDefault();
		const ok = await vm.cancelReceipts();
		if (ok && vm.lastCancel) pushToast(vm.lastCancel.message, 'success');
		else if (vm.error) pushToast(vm.error, 'error');
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
			value={vm.barcode}
			oninput={(e) => vm.setBarcode(e.currentTarget.value)}
			disabled={vm.loading || vm.submitting || vm.cancelling}
		/>
		<button type="submit" disabled={vm.loading || vm.submitting || !vm.barcode.trim()}>
			{vm.loading ? i18n.t('Buscando…') : i18n.t('Buscar')}
		</button>
	</form>

	{#if vm.error}
		<UiBanner tone="error" message={vm.error} />
	{/if}

	{#if vm.detail}
		<section class="po">
			<h2>{vm.detail.purchaseOrder.poNumber}</h2>
			<p class="meta">
				{vm.detail.purchaseOrder.status} · WH {vm.detail.purchaseOrder.warehouseId}
			</p>
			{#if vm.drafts.length}
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
								{#each vm.drafts as draft, index}
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
													vm.updateDraft(index, { quantity: Number(e.currentTarget.value) })
												}
												disabled={vm.submitting}
											/>
										</td>
										<td>
											<input
												type="text"
												value={draft.binId}
												oninput={(e) => vm.updateDraft(index, { binId: e.currentTarget.value })}
												disabled={vm.submitting}
											/>
										</td>
										<td>
											<input
												type="text"
												value={draft.lotNumber}
												oninput={(e) => vm.updateDraft(index, { lotNumber: e.currentTarget.value })}
												disabled={vm.submitting}
											/>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
					<button type="submit" class="primary" disabled={vm.submitting}>
						{vm.submitting ? i18n.t('Registrando…') : i18n.t('Confirmar recepción')}
					</button>
				</form>
			{/if}

			<form class="cancel" onsubmit={onCancel}>
				<label>
					{i18n.t('IDs de recepción a anular')}
					<input
						type="text"
						placeholder="1,2,3"
						value={vm.receiptIdsInput}
						oninput={(e) => vm.setReceiptIdsInput(e.currentTarget.value)}
						disabled={vm.cancelling}
					/>
				</label>
				<button type="submit" class="danger" disabled={vm.cancelling}>
					{vm.cancelling ? i18n.t('Anulando…') : i18n.t('Anular recepciones')}
				</button>
			</form>
		</section>
	{:else if !vm.loading && !vm.error}
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
