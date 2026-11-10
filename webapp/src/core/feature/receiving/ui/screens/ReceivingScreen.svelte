<script lang="ts">
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
</script>

<section class="page">
	<header>
		<h1>Recepción</h1>
		<p class="subtitle">Lookup de PO y registro de recibos</p>
	</header>

	<form class="lookup" onsubmit={onLookup}>
		<input
			type="text"
			placeholder="PO number o barcode"
			value={state.barcode}
			oninput={(e) => state.setBarcode(e.currentTarget.value)}
			disabled={state.loading || state.submitting}
		/>
		<button type="submit" disabled={state.loading || state.submitting || !state.barcode.trim()}>
			{state.loading ? 'Buscando…' : 'Buscar'}
		</button>
	</form>

	{#if state.error}
		<p class="status error" role="alert">{state.error}</p>
	{/if}

	{#if state.lastResult}
		<p class="status ok" role="status">
			{state.lastResult.message}
			{#if state.lastResult.receiptIds.length}
				· receipts: {state.lastResult.receiptIds.join(', ')}
			{/if}
			· PO {state.lastResult.poStatus}
		</p>
		{#if state.lastResult.warnings.length}
			<ul class="warnings">
				{#each state.lastResult.warnings as w}
					<li>{w}</li>
				{/each}
			</ul>
		{/if}
	{/if}

	{#if state.detail}
		<section class="po">
			<h2>{state.detail.purchaseOrder.poNumber}</h2>
			<p class="meta">
				{state.detail.purchaseOrder.vendorName}
				· {state.detail.purchaseOrder.status}
				· WH #{state.detail.purchaseOrder.warehouseId}
			</p>

			{#if state.drafts.length === 0}
				<p class="status">No quedan líneas pendientes de recibir.</p>
			{:else}
				<form onsubmit={onReceive}>
					<div class="table-wrap">
						<table>
							<thead>
								<tr>
									<th>SKU</th>
									<th>Nombre</th>
									<th>Pendiente</th>
									<th>Cantidad</th>
									<th>Bin ID</th>
									<th>Lote</th>
								</tr>
							</thead>
							<tbody>
								{#each state.drafts as draft, index (draft.itemId)}
									<tr>
										<td>{draft.sku}</td>
										<td>{draft.itemName}</td>
										<td>{draft.remaining}</td>
										<td>
											<input
												type="number"
												min="0"
												max={draft.remaining}
												value={draft.quantity}
												oninput={(e) =>
													state.updateDraft(index, {
														quantity: Number(e.currentTarget.value)
													})}
												disabled={state.submitting}
											/>
										</td>
										<td>
											<input
												type="number"
												min="1"
												placeholder="bin_id"
												value={draft.binId}
												oninput={(e) =>
													state.updateDraft(index, { binId: e.currentTarget.value })}
												disabled={state.submitting}
												required
											/>
										</td>
										<td>
											<input
												type="text"
												placeholder="opcional"
												value={draft.lotNumber}
												oninput={(e) =>
													state.updateDraft(index, {
														lotNumber: e.currentTarget.value
													})}
												disabled={state.submitting}
											/>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
					<button type="submit" class="primary" disabled={state.submitting}>
						{state.submitting ? 'Registrando…' : 'Registrar recepción'}
					</button>
				</form>
			{/if}
		</section>
	{/if}
</section>

<style>
	.page {
		font-family: system-ui, -apple-system, sans-serif;
		max-width: 56rem;
		margin: 1.5rem auto;
		padding: 0 1.25rem;
	}
	header {
		margin-bottom: 1.25rem;
	}
	h1 {
		margin: 0 0 0.25rem;
		font-size: 1.75rem;
	}
	h2 {
		margin: 0 0 0.35rem;
		font-size: 1.25rem;
	}
	.subtitle,
	.meta {
		margin: 0;
		color: #64748b;
	}
	.lookup {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}
	.lookup input {
		flex: 1;
		padding: 0.5rem 0.7rem;
		border: 1px solid #cbd5e1;
		border-radius: 6px;
	}
	button {
		padding: 0.45rem 0.9rem;
		border-radius: 6px;
		border: 1px solid #cbd5e1;
		background: #fff;
		cursor: pointer;
	}
	button.primary {
		margin-top: 1rem;
		background: #0f172a;
		color: #fff;
		border-color: #0f172a;
	}
	button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
	.status {
		color: #475569;
	}
	.status.error {
		color: #b91c1c;
	}
	.status.ok {
		color: #166534;
	}
	.warnings {
		color: #a16207;
		font-size: 0.9rem;
	}
	.po {
		margin-top: 1.5rem;
	}
	.table-wrap {
		overflow-x: auto;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		background: #fff;
		margin-top: 1rem;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.9rem;
	}
	th,
	td {
		text-align: left;
		padding: 0.55rem 0.75rem;
		border-bottom: 1px solid #e2e8f0;
		vertical-align: middle;
	}
	th {
		background: #f8fafc;
		font-weight: 600;
	}
	td input {
		width: 5.5rem;
		padding: 0.35rem 0.45rem;
		border: 1px solid #cbd5e1;
		border-radius: 4px;
	}
</style>
