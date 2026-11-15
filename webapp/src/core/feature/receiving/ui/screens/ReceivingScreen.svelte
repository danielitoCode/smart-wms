<script lang="ts">
	import { getContext } from 'svelte';
	import type { I18nState } from '../../../../../lib/i18n/i18n.svelte';
	import PageHeader from '../../../../../lib/components/PageHeader.svelte';
	import UiBanner from '../../../../../lib/components/UiBanner.svelte';
	import { pushToast } from '../../../../../lib/ui/toast.svelte';
	import { createReceivingState } from '../state/receivingState.svelte';

	const i18n = getContext<I18nState>('i18n');
	const vm = createReceivingState();

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
		}
	});

	function onLookup(event: Event) {
		event.preventDefault();
		void vm.lookup();
	}

	function onPrepareReceive(event: Event) {
		event.preventDefault();
		if (!vm.prepareReceive() && vm.error) pushToast(vm.error, 'error');
	}

	async function onConfirmReceive() {
		const ok = await vm.submitReceive();
		if (ok && vm.lastResult) {
			pushToast(vm.lastResult.message, 'success');
			for (const warning of vm.lastResult.warnings) pushToast(warning, 'warning');
		} else if (vm.error) pushToast(vm.error, 'error');
	}

	async function onCancelReceipts() {
		const ok = await vm.cancelReceipts();
		if (ok && vm.lastCancel) pushToast(vm.lastCancel.message, 'success');
		else if (vm.error) pushToast(vm.error, 'error');
	}

	async function onUnreceive() {
		const ok = await vm.confirmUnreceive();
		if (ok && vm.lastUnreceive) {
			pushToast(`Recepción ${vm.lastUnreceive.receiptId} revertida: ${vm.lastUnreceive.quantityReversed} unidades`, 'success');
		} else if (vm.error) pushToast(vm.error, 'error');
	}

	function formatDate(value: string | null): string {
		return value ? new Date(value).toLocaleString() : '—';
	}
</script>

<section class="page">
	<PageHeader
		title={i18n.t('Recepción')}
		subtitle={i18n.t('Busca una orden por número o código de barras, registra entradas por línea y consulta su historial.')}
	/>

	<form class="lookup" onsubmit={onLookup}>
		<input
			type="text"
			autocomplete="off"
			placeholder={i18n.t('Número de orden de compra o código de barras')}
			value={vm.barcode}
			oninput={(event) => vm.setBarcode(event.currentTarget.value)}
			disabled={vm.loading || vm.submitting || vm.cancelling || vm.unreceiving}
		/>
		<button type="submit" disabled={vm.loading || !vm.barcode.trim()}>
			{vm.loading ? i18n.t('Buscando…') : i18n.t('Buscar orden')}
		</button>
	</form>

	{#if vm.error}
		<UiBanner tone="error" message={vm.error} />
	{/if}
	{#if vm.binsError}
		<p class="notice warning">{vm.binsError}. {i18n.t('La recepción requiere un bin activo del almacén.')}</p>
	{/if}

	{#if vm.detail}
		<section class="panel">
			<div class="po-heading">
				<div>
					<p class="eyebrow">{i18n.t('Orden de compra')}</p>
					<h2>{vm.detail.purchaseOrder.poNumber}</h2>
					<p class="muted">{vm.detail.purchaseOrder.vendorName || '—'} · WH {vm.detail.purchaseOrder.warehouseId}</p>
				</div>
				<span class:status-open={vm.detail.purchaseOrder.status === 'OPEN'} class:status-partial={vm.detail.purchaseOrder.status === 'PARTIAL'} class="status">
					{vm.detail.purchaseOrder.status}
				</span>
			</div>

			<div class="table-wrap">
				<table>
					<thead>
						<tr>
							<th>{i18n.t('Artículo')}</th>
							<th class="number">{i18n.t('Ordenado')}</th>
							<th class="number">{i18n.t('Recibido')}</th>
							<th class="number">{i18n.t('Pendiente')}</th>
							{#if ['OPEN', 'PARTIAL'].includes(vm.detail.purchaseOrder.status)}
								<th>{i18n.t('Entrada')}</th>
							{/if}
						</tr>
					</thead>
					<tbody>
						{#each vm.drafts as draft (draft.poLineId)}
							<tr>
								<td>
									<strong>{draft.sku}</strong>
									<span class="item-name">{draft.itemName}</span>
									{#if draft.remaining < 0}
										<span class="variance">{i18n.t('Exceso registrado')}: {Math.abs(draft.remaining)}</span>
									{/if}
								</td>
								<td class="number">{draft.ordered}</td>
								<td class="number">{draft.received}</td>
								<td class="number">{Math.max(0, draft.remaining)}</td>
								{#if ['OPEN', 'PARTIAL'].includes(vm.detail.purchaseOrder.status)}
									<td class="entry-cell">
										<div class="entry-grid">
											<label>
												<span>{i18n.t('Cantidad')}</span>
												<input
													type="number"
													min="0"
													step="1"
													value={draft.quantity}
													oninput={(event) => vm.updateDraft(draft.poLineId, { quantity: Number(event.currentTarget.value) })}
													disabled={vm.submitting || vm.cancelling || vm.unreceiving}
												/>
											</label>
											<label>
												<span>{i18n.t('Bin de destino')}</span>
												<select
													value={draft.binId || (vm.bins.find((bin) => bin.binType === 'Staging')?.binId ?? vm.bins[0]?.binId ?? '')}
													onchange={(event) => vm.updateDraft(draft.poLineId, { binId: event.currentTarget.value })}
													disabled={vm.submitting || vm.bins.length === 0}
												>
													<option value="">{i18n.t('Seleccionar bin')}</option>
													{#each vm.bins as bin (bin.binId)}
														<option value={bin.binId}>{bin.binCode}{bin.binType ? ` (${bin.binType})` : ''}</option>
													{/each}
												</select>
											</label>
											<label>
												<span>{i18n.t('Lote')}</span>
												<input
													type="text"
													maxlength="100"
													value={draft.lotNumber}
													oninput={(event) => vm.updateDraft(draft.poLineId, { lotNumber: event.currentTarget.value })}
													disabled={vm.submitting}
												/>
											</label>
											<label>
												<span>{i18n.t('Serie')}</span>
												<input
													type="text"
													maxlength="100"
													value={draft.serialNumber}
													oninput={(event) => vm.updateDraft(draft.poLineId, { serialNumber: event.currentTarget.value })}
													disabled={vm.submitting}
												/>
											</label>
										</div>
										{#if draft.quantity > Math.max(0, draft.remaining)}
											<p class="variance">{i18n.t('Exceso solicitado')}: {draft.quantity - Math.max(0, draft.remaining)}. {i18n.t('El servidor validará la política de sobre-recepción.')}</p>
										{/if}
									</td>
								{/if}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			{#if ['OPEN', 'PARTIAL'].includes(vm.detail.purchaseOrder.status)}
				<div class="actions">
					<button class="primary" onclick={onPrepareReceive} disabled={vm.submitting || vm.bins.length === 0}>
						{i18n.t('Revisar recepción')}
					</button>
				</div>
			{:else}
				<p class="notice">{i18n.t('Esta orden no admite nuevas entradas. Puedes consultar y revertir recibos desde el historial.')}</p>
			{/if}

			{#if vm.pendingItems.length > 0}
				<div class="confirmation">
					<strong>{i18n.t('Confirmar entrada')}</strong>
					<p>{vm.pendingItems.length} {i18n.t('línea(s) seleccionada(s)')} · {vm.pendingItems.reduce((total, item) => total + item.quantity, 0)} {i18n.t('unidades')}</p>
					<p class="muted">{i18n.t('Al confirmar se actualizarán los recibos, las cantidades de la orden y el inventario del almacén.')}</p>
					<div class="actions">
						<button type="button" class="secondary" onclick={vm.clearReceiveConfirmation} disabled={vm.submitting}>{i18n.t('Volver')}</button>
						<button type="button" class="primary" onclick={onConfirmReceive} disabled={vm.submitting}>
							{vm.submitting ? i18n.t('Registrando…') : i18n.t('Confirmar y registrar')}
						</button>
					</div>
				</div>
			{/if}

			<section class="history">
				<div class="section-heading">
					<div>
						<h3>{i18n.t('Historial de recepciones')}</h3>
						<p class="muted">{vm.receipts.length} {i18n.t('registro(s)')}</p>
					</div>
				</div>
				{#if vm.receipts.length > 0}
					<div class="table-wrap">
						<table>
							<thead>
								<tr>
									<th>{i18n.t('Fecha')}</th>
									<th>{i18n.t('Artículo')}</th>
									<th class="number">{i18n.t('Cantidad')}</th>
									<th>{i18n.t('Bin')}</th>
									<th>{i18n.t('Recibido por')}</th>
									<th>{i18n.t('Trazabilidad')}</th>
									<th></th>
								</tr>
							</thead>
							<tbody>
								{#each vm.receipts as receipt (receipt.receiptId)}
									<tr>
										<td>{formatDate(receipt.receivedAt)}</td>
										<td><strong>{receipt.sku}</strong><span class="item-name">{receipt.itemName}</span></td>
										<td class="number">{receipt.quantityReceived}</td>
										<td>{receipt.binCode}</td>
										<td>{receipt.receivedBy || '—'}</td>
										<td>{receipt.lotNumber ? `Lote: ${receipt.lotNumber}` : ''}{receipt.serialNumber ? ` · Serie: ${receipt.serialNumber}` : ''}</td>
										<td>
											<button class="danger small" type="button" onclick={() => vm.requestUnreceive(receipt)} disabled={vm.unreceiving || vm.cancelling}>
												{i18n.t('Revertir')}
											</button>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{:else}
					<p class="empty">{i18n.t('Todavía no hay recepciones registradas para esta orden.')}</p>
				{/if}
			</section>

			<section class="cancel-panel">
				<h3>{i18n.t('Cancelar lote de recepción')}</h3>
				<p class="muted">{i18n.t('Usa esta acción solo para revertir los receipt_id de la sesión actual. Para un recibo histórico utiliza Revertir en su fila.')}</p>
				<div class="cancel-row">
					<input
						type="text"
						placeholder="receipt_id, receipt_id..."
						value={vm.receiptIdsInput}
						oninput={(event) => vm.setReceiptIdsInput(event.currentTarget.value)}
						disabled={vm.cancelling}
					/>
					<button class="danger" type="button" onclick={() => vm.requestCancel()} disabled={vm.cancelling || !vm.receiptIdsInput.trim()}>
						{i18n.t('Revisar cancelación')}
					</button>
				</div>
				{#if vm.cancelConfirmationPending}
					<div class="confirmation compact">
						<strong>{i18n.t('¿Cancelar los recibos indicados?')}</strong>
						<p class="muted">{i18n.t('Se eliminarán los registros de recibo y se revertirán las cantidades de inventario y de las líneas de la orden.')}</p>
						<div class="actions">
							<button class="secondary" type="button" onclick={vm.clearCancelConfirmation}>{i18n.t('Volver')}</button>
							<button class="danger" type="button" onclick={onCancelReceipts} disabled={vm.cancelling}>
								{vm.cancelling ? i18n.t('Cancelando…') : i18n.t('Confirmar cancelación')}
							</button>
						</div>
					</div>
				{/if}
			</section>
		</section>
	{/if}

	{#if vm.selectedReceipt}
		<section class="confirmation reversal">
			<strong>{i18n.t('Confirmar reversión de recibo')} #{vm.selectedReceipt.receiptId}</strong>
			<p>
				{i18n.t('Se revertirán')} <strong>{vm.selectedReceipt.quantityReceived}</strong>
				{i18n.t('unidades de')} <strong>{vm.selectedReceipt.sku}</strong>
				{i18n.t('en el almacén')} {vm.selectedReceipt.warehouseId}.
			</p>
			<p class="muted">{i18n.t('El sistema descontará primero del bin original y después de otros bins del mismo almacén. Si no existe inventario disponible suficiente, la operación será rechazada sin cambios.')}</p>
			<label class="reason">
				<span>{i18n.t('Motivo (opcional, máximo 500 caracteres)')}</span>
				<textarea maxlength="500" rows="2" value={vm.unreceiveReason} oninput={(event) => vm.setUnreceiveReason(event.currentTarget.value)} disabled={vm.unreceiving}></textarea>
			</label>
			<div class="actions">
				<button class="secondary" type="button" onclick={vm.clearUnreceive} disabled={vm.unreceiving}>{i18n.t('Volver')}</button>
				<button class="danger" type="button" onclick={onUnreceive} disabled={vm.unreceiving}>
					{vm.unreceiving ? i18n.t('Revirtiendo…') : i18n.t('Confirmar reversión')}
				</button>
			</div>
		</section>
	{/if}
</section>

<style>
	.lookup { display:flex; flex-wrap:wrap; gap:.65rem; margin-bottom:1rem; }
	.lookup input { flex:1 1 20rem; min-height:42px; padding:.55rem .75rem; border:1px solid var(--line); border-radius:var(--radius-field); }
	.panel { padding:1.15rem; border:1px solid var(--line); border-radius:var(--radius-card); background:var(--surface); box-shadow:var(--shadow-1); }
	.po-heading,.section-heading { display:flex; align-items:flex-start; justify-content:space-between; gap:1rem; }
	.po-heading h2 { margin:0 0 .25rem; }
	.eyebrow { margin:0 0 .25rem; color:var(--slate); font-size:var(--fs-xs,.75rem); text-transform:uppercase; letter-spacing:.06em; }
	.muted,.item-name { display:block; color:var(--slate); font-size:var(--fs-sm,.8125rem); }
	.status { padding:.25rem .55rem; border-radius:999px; background:var(--surface-2); font-size:.75rem; font-weight:650; }
	.status-open { color:var(--success); }
	.status-partial { color:var(--warning); }
	.table-wrap { overflow:auto; margin-top:1rem; }
	table { width:100%; border-collapse:collapse; min-width:760px; }
	th,td { padding:.65rem .55rem; border-bottom:1px solid var(--line); text-align:left; vertical-align:middle; }
	th { color:var(--slate); font-size:.75rem; font-weight:650; white-space:nowrap; }
	td { font-size:.84rem; }
	.number { text-align:right; font-variant-numeric:tabular-nums; }
	.entry-cell { min-width:380px; }
	.entry-grid { display:grid; grid-template-columns:70px minmax(125px,1fr) 90px 90px; gap:.4rem; }
	.entry-grid label,.reason { display:flex; flex-direction:column; gap:.25rem; color:var(--slate); font-size:.72rem; }
	.entry-grid input,.entry-grid select,.cancel-row input,.reason textarea { width:100%; min-width:0; padding:.4rem .45rem; border:1px solid var(--line); border-radius:8px; background:var(--surface); color:var(--text); }
	.variance { display:block; margin-top:.2rem; color:var(--warning); font-size:.72rem; }
	.actions { display:flex; justify-content:flex-end; flex-wrap:wrap; gap:.55rem; margin-top:.85rem; }
	button { min-height:36px; padding:.45rem .8rem; border:0; border-radius:8px; cursor:pointer; font-weight:600; }
	button:disabled { opacity:.55; cursor:not-allowed; }
	.primary { background:var(--accent); color:white; }
	.secondary { background:var(--surface-2); color:var(--text); border:1px solid var(--line); }
	.danger { background:var(--danger); color:white; }
	.small { min-height:30px; padding:.3rem .55rem; font-size:.75rem; }
	.confirmation { margin-top:1rem; padding:1rem; border:1px solid var(--line); border-left:3px solid var(--accent); border-radius:10px; background:var(--surface-2); }
	.confirmation p { margin:.45rem 0; }
	.history,.cancel-panel { margin-top:1.4rem; padding-top:1rem; border-top:1px solid var(--line); }
	.history h3,.cancel-panel h3 { margin:0; font-size:1rem; }
	.cancel-row { display:flex; flex-wrap:wrap; gap:.55rem; margin-top:.6rem; }
	.cancel-row input { flex:1 1 18rem; }
	.reason { margin-top:.8rem; }
	.notice { margin:.8rem 0 0; color:var(--slate); font-size:.82rem; }
	.warning { color:var(--warning); }
	.empty { color:var(--slate); font-size:.85rem; }
	@media (max-width:760px) {
		.panel { padding:.8rem; }
		.po-heading { flex-direction:column; }
		.entry-cell { min-width:340px; }
	}
</style>
