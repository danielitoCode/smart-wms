<script lang="ts">
	import { createShippingState } from '../state/shippingState.svelte';

	const state = createShippingState();

	function onLoad(e: Event) {
		e.preventDefault();
		void state.load();
	}

	function onFulfill(e: Event) {
		e.preventDefault();
		void state.fulfill();
	}
</script>

<section class="page">
	<header>
		<h1>Shipping</h1>
		<p class="subtitle">Cargar SO y registrar fulfillment</p>
	</header>

	<form class="row" onsubmit={onLoad}>
		<input
			type="text"
			placeholder="SO number o barcode"
			value={state.barcode}
			oninput={(e) => state.setBarcode(e.currentTarget.value)}
			disabled={state.loading || state.busy}
		/>
		<button type="submit" disabled={state.loading || !state.barcode.trim()}>
			{state.loading ? 'Cargando…' : 'Cargar'}
		</button>
	</form>

	{#if state.error}<p class="err" role="alert">{state.error}</p>{/if}
	{#if state.lastResult}
		<p class="ok" role="status">
			{state.lastResult.message} · {state.lastResult.carrier}
			{state.lastResult.trackingNumber} · fulfillment #{state.lastResult.fulfillmentId}
		</p>
	{/if}

	{#if state.detail}
		<p class="meta">
			{state.detail.salesOrder.soNumber} · {state.detail.salesOrder.status}
			· lines {state.detail.totalLines} · items {state.detail.totalItems}
		</p>

		{#if state.detail.lines.length}
			<div class="table-wrap">
				<table>
					<thead>
						<tr><th>SKU</th><th>Qty</th><th>Nombre</th></tr>
					</thead>
					<tbody>
						{#each state.detail.lines as line, i (line.sku + '-' + i)}
							<tr>
								<td>{line.sku}</td>
								<td>{line.quantity}</td>
								<td>{line.itemName ?? '—'}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}

		<form class="fulfill" onsubmit={onFulfill}>
			<label>
				Tracking
				<input type="text" maxlength="255" value={state.trackingNumber}
					oninput={(e) => state.setTrackingNumber(e.currentTarget.value)}
					disabled={state.busy} required />
			</label>
			<label>
				Carrier
				<input type="text" maxlength="100" value={state.carrier}
					oninput={(e) => state.setCarrier(e.currentTarget.value)}
					disabled={state.busy} required />
			</label>
			<label>
				Ship method (opcional)
				<input type="text" value={state.shipMethod}
					oninput={(e) => state.setShipMethod(e.currentTarget.value)}
					disabled={state.busy} />
			</label>
			<button type="submit" disabled={state.busy}>Fulfill</button>
		</form>
	{/if}
</section>

<style>
	.page { font-family: system-ui, sans-serif; max-width: 40rem; margin: 1.5rem auto; padding: 0 1.25rem; }
	h1 { margin: 0 0 0.25rem; font-size: 1.75rem; }
	.subtitle, .meta { color: #64748b; margin: 0 0 1rem; }
	.row { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
	.fulfill { display: flex; flex-direction: column; gap: 0.75rem; }
	label { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.9rem; }
	input { padding: 0.45rem 0.6rem; border: 1px solid #cbd5e1; border-radius: 6px; }
	button { padding: 0.45rem 0.9rem; border-radius: 6px; border: 1px solid #0f172a; background: #0f172a; color: #fff; cursor: pointer; }
	button:disabled { opacity: 0.6; }
	.err { color: #b91c1c; }
	.ok { color: #166534; }
	.table-wrap { border: 1px solid #e2e8f0; border-radius: 8px; overflow-x: auto; background: #fff; margin-bottom: 1rem; }
	table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
	th, td { text-align: left; padding: 0.5rem 0.75rem; border-bottom: 1px solid #e2e8f0; }
	th { background: #f8fafc; }
</style>
