<script lang="ts">
	import UiStatePanel from '#lib/components/UiStatePanel.svelte';
	import { getContext } from 'svelte';
	import type { I18nState } from '../../../../../lib/i18n/i18n.svelte';
	import PageHeader from '../../../../../lib/components/PageHeader.svelte';
	import UiBanner from '../../../../../lib/components/UiBanner.svelte';
	import { pushToast } from '../../../../../lib/ui/toast.svelte';
	const i18n = getContext<I18nState>('i18n');
	import { createReceivingState } from '../state/receivingState.svelte';
	import { createPurchaseOrdersState } from '../../../purchase-orders/ui/state/purchaseOrdersState.svelte';

	const vm = createReceivingState();
	const poList = createPurchaseOrdersState();
	const warehouseSelection = getContext<{ warehouseId: number | null } | undefined>('warehouseSelection');
	let poSearch = $state('');
	let poStatus = $state<'' | 'OPEN' | 'PARTIAL' | 'RECEIVED' | 'CLOSED'>('');
	function setPoStatus(value: string) {
		if (value === '' || value === 'OPEN' || value === 'PARTIAL' || value === 'RECEIVED' || value === 'CLOSED') poStatus = value;
	}

	let lastListedWarehouse: number | null | undefined = undefined;
	$effect(() => {
		const warehouseId = warehouseSelection?.warehouseId ?? null;
		if (lastListedWarehouse !== warehouseId) {
			lastListedWarehouse = warehouseId;
			void poList.load(warehouseId);
		}
	});

	async function refreshPoList() {
		poList.setFilter('search', poSearch);
		poList.setFilter('status', poStatus);
		await poList.load(warehouseSelection?.warehouseId ?? null);
	}

	async function openListedPo(poNumber: string) {
		vm.setBarcode(poNumber);
		await vm.lookup();
	}
	let receiptReasons = $state<Record<number, string>>({});

	async function onUnreceive(receiptId: number) {
		if (!window.confirm(i18n.t('¿Revertir esta recepción? Se actualizará el inventario y la orden de compra.'))) return;
		const ok = await vm.unreceiveReceipt(receiptId, receiptReasons[receiptId] ?? '');
		if (ok && vm.lastUnreceive) pushToast(vm.lastUnreceive.message, 'success');
		else if (vm.error) pushToast(vm.error, 'error');
	}

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

	<section class="po-list" aria-labelledby="po-list-title">
		<div class="history-heading">
			<h3 id="po-list-title">{i18n.t('Órdenes de compra')}</h3>
			<button type="button" class="secondary" onclick={refreshPoList} disabled={poList.loading}>{poList.loading ? i18n.t('Actualizando…') : i18n.t('Actualizar lista')}</button>
		</div>
		<div class="po-filters">
			<input type="search" placeholder={i18n.t('Buscar número o proveedor')} value={poSearch} oninput={(e) => poSearch = e.currentTarget.value} />
			<select value={poStatus} onchange={(e) => setPoStatus(e.currentTarget.value)}>
				<option value="">{i18n.t('Todos los estados')}</option>
				<option value="OPEN">OPEN</option><option value="PARTIAL">PARTIAL</option>
				<option value="RECEIVED">RECEIVED</option><option value="CLOSED">CLOSED</option>
			</select>
			<button type="button" onclick={refreshPoList} disabled={poList.loading}>{i18n.t('Filtrar')}</button>
		</div>
		{#if poList.error}
			<UiBanner tone="error" message={poList.error} />
		{:else if poList.loading}
			<UiStatePanel kind="loading" title={i18n.t('Cargando órdenes')} message={i18n.t('Consultando órdenes del almacén seleccionado.')} />
		{:else if poList.rows.length === 0}
			<UiStatePanel kind="empty" title={i18n.t('No hay órdenes de compra')} message={i18n.t('No se encontraron órdenes con los filtros actuales.')} />
		{:else}
			<div class="table-wrap">
				<table>
					<thead><tr><th>{i18n.t('Orden')}</th><th>{i18n.t('Proveedor')}</th><th>{i18n.t('Estado')}</th><th>{i18n.t('Almacén')}</th><th>{i18n.t('Entrega esperada')}</th><th>{i18n.t('Acción')}</th></tr></thead>
					<tbody>
						{#each poList.rows as po (po.poId)}
							<tr>
							<td>{po.poNumber}</td><td>{po.vendorName ?? '—'}</td><td>{po.status}</td><td>{po.warehouseId}</td><td>{po.expectedDate ?? '—'}</td>
							<td><button type="button" class="secondary" onclick={() => openListedPo(po.poNumber)} disabled={vm.loading || vm.submitting || vm.cancelling}>{i18n.t('Abrir')}</button></td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			<div class="pagination">
				<span>{poList.pagination.page} / {poList.pagination.pages} · {poList.pagination.total}</span>
				<button type="button" class="secondary" onclick={() => { poList.setPage(Math.max(1, poList.pagination.page - 1)); void poList.load(warehouseSelection?.warehouseId ?? null); }} disabled={poList.pagination.page <= 1 || poList.loading}>{i18n.t('Anterior')}</button>
				<button type="button" class="secondary" onclick={() => { poList.setPage(Math.min(poList.pagination.pages, poList.pagination.page + 1)); void poList.load(warehouseSelection?.warehouseId ?? null); }} disabled={poList.pagination.page >= poList.pagination.pages || poList.loading}>{i18n.t('Siguiente')}</button>
			</div>
		{/if}
	</section>

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

	{#if vm.loading}
		<UiStatePanel kind="loading" title={i18n.t('Buscando orden de compra')} message={i18n.t('Estamos consultando la orden y sus líneas de recepción.')} />
	{:else if vm.detail}
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
									<th>{i18n.t('Serie')}</th>
									<th>{i18n.t('Notas')}</th>
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
										<td>
											<input type="text" maxlength="100" value={draft.serialNumber} oninput={(e) => vm.updateDraft(index, { serialNumber: e.currentTarget.value })} disabled={vm.submitting} />
										</td>
										<td>
											<input type="text" maxlength="1000" value={draft.notes} oninput={(e) => vm.updateDraft(index, { notes: e.currentTarget.value })} disabled={vm.submitting} />
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

			<section class="receipt-history" aria-labelledby="receipt-history-title">
				<div class="history-heading">
					<h3 id="receipt-history-title">{i18n.t('Historial de recepciones')}</h3>
					<button type="button" class="secondary" onclick={() => vm.loadReceiptHistory(vm.detail!.purchaseOrder.poId)} disabled={vm.receiptsLoading || vm.submitting || vm.cancelling || vm.unreceivingId !== null}>
						{vm.receiptsLoading ? i18n.t('Actualizando…') : i18n.t('Actualizar historial')}
					</button>
				</div>
				{#if vm.receiptsError}
					<UiBanner tone="error" message={vm.receiptsError} />
				{:else if vm.receiptsLoading}
					<UiStatePanel kind="loading" title={i18n.t('Cargando historial')} message={i18n.t('Consultando las recepciones registradas.')} />
				{:else if vm.receipts.length === 0}
					<UiStatePanel kind="empty" title={i18n.t('Sin recepciones registradas')} message={i18n.t('Esta orden todavía no tiene recepciones que puedan revertirse.')} />
				{:else}
					<div class="table-wrap">
						<table>
							<thead><tr>
								<th>{i18n.t('Receipt')}</th><th>{i18n.t('Línea / SKU')}</th><th>{i18n.t('Cantidad')}</th>
								<th>{i18n.t('Bin')}</th><th>{i18n.t('Recibido por')}</th><th>{i18n.t('Fecha')}</th><th>{i18n.t('Motivo de reversión')}</th><th>{i18n.t('Acción')}</th>
							</tr></thead>
							<tbody>
								{#each vm.receipts as receipt (receipt.receiptId)}
									<tr>
									<td>#{receipt.receiptId}</td>
									<td>{receipt.sku} · {receipt.itemName}</td>
									<td>{receipt.quantityReceived}</td>
									<td>{receipt.binCode}</td>
									<td>{receipt.receivedBy}</td>
									<td>{receipt.receivedAt ? new Date(receipt.receivedAt).toLocaleString() : '—'}</td>
									<td><input aria-label={i18n.t('Motivo para receipt') + ' ' + receipt.receiptId} maxlength="500" value={receiptReasons[receipt.receiptId] ?? ''} oninput={(e) => receiptReasons[receipt.receiptId] = e.currentTarget.value} disabled={vm.unreceivingId !== null} /></td>
									<td><button type="button" class="danger" onclick={() => onUnreceive(receipt.receiptId)} disabled={vm.unreceivingId !== null || vm.submitting || vm.cancelling}>{vm.unreceivingId === receipt.receiptId ? i18n.t('Revirtiendo…') : i18n.t('Revertir')}</button></td>
								</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</section>

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
		<UiStatePanel kind="empty" title={i18n.t('Orden de compra requerida')} message={i18n.t('Busca una orden de compra para comenzar la recepción.')} />
	{/if}
</section>

<style>
	.po-list {
		margin-bottom: 1rem;
		padding: 1rem;
		border: 1px solid var(--line);
		border-radius: var(--radius-card);
		background: var(--surface);
	}
	.po-filters, .pagination {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.6rem;
		margin-bottom: 0.75rem;
	}
	.po-filters input { flex: 1 1 14rem; }
	.po-filters input, .po-filters select {
		min-height: 40px;
		padding: 0.4rem 0.65rem;
		border: 1px solid var(--line);
		border-radius: var(--radius-field);
	}
	.pagination { justify-content: flex-end; margin: 0.75rem 0 0; }
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
	.receipt-history {
		margin-top: 1.25rem;
		padding-top: 1rem;
		border-top: 1px solid var(--line);
	}
	.history-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		margin-bottom: 0.75rem;
	}
	.history-heading h3 { margin: 0; }
	.receipt-history input {
		min-width: 9rem;
		max-width: 15rem;
		padding: 0.35rem 0.45rem;
		border: 1px solid var(--line);
		border-radius: 8px;
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
