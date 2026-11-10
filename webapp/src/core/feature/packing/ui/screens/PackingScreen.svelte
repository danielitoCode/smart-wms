<script lang="ts">
	import { createPackingState } from '../state/packingState.svelte';

	const state = createPackingState();

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
		<h1>Packing</h1>
		<p class="subtitle">Verificar y cerrar pedidos en estado PICKED</p>
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
	{#if state.info}<p class="ok" role="status">{state.info}</p>{/if}

	{#if state.detail}
		<p class="meta">
			{state.detail.salesOrder.soNumber} · {state.detail.salesOrder.status}
			· verificado {state.detail.itemsVerified}/{state.detail.totalItems}
			· peso {state.detail.calculatedWeightLbs} lb
		</p>

		<div class="table-wrap">
			<table>
				<thead>
					<tr>
						<th>SKU</th>
						<th>Picked</th>
						<th>Packed</th>
						<th>OK</th>
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
				placeholder="Barcode a verificar"
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
			<button type="submit" disabled={state.busy}>Verificar</button>
		</form>

		<button type="button" class="primary" onclick={() => state.complete()} disabled={state.busy}>
			Completar packing
		</button>
	{/if}
</section>

<style>
	.page { font-family: system-ui, sans-serif; max-width: 40rem; margin: 1.5rem auto; padding: 0 1.25rem; }
	h1 { margin: 0 0 0.25rem; font-size: 1.75rem; }
	.subtitle, .meta { color: #64748b; margin: 0 0 1rem; }
	.row { display: flex; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap; }
	input { padding: 0.45rem 0.6rem; border: 1px solid #cbd5e1; border-radius: 6px; }
	button { padding: 0.45rem 0.9rem; border-radius: 6px; border: 1px solid #0f172a; background: #0f172a; color: #fff; cursor: pointer; }
	button.primary { margin-top: 0.75rem; }
	button:disabled { opacity: 0.6; }
	.err { color: #b91c1c; }
	.ok { color: #166534; }
	.table-wrap { border: 1px solid #e2e8f0; border-radius: 8px; overflow-x: auto; background: #fff; margin-bottom: 1rem; }
	table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
	th, td { text-align: left; padding: 0.5rem 0.75rem; border-bottom: 1px solid #e2e8f0; }
	th { background: #f8fafc; }
</style>
