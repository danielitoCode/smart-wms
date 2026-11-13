<script lang="ts">
	import { onMount } from 'svelte';
	import { createSalesOrderDetailState } from '../state/salesOrdersState.svelte';

	interface Props {
		soId: number;
	}

	let { soId }: Props = $props();
	const state = createSalesOrderDetailState(soId);

	onMount(() => {
		void state.load();
	});

	async function onCancel() {
		const so = state.order;
		if (!so) return;
		if (!confirm(`¿Cancelar el pedido ${so.soNumber}? Se liberará inventario asignado.`)) return;
		await state.cancel();
	}
</script>

<section class="page">
	<header>
		<p class="back"><a href="/sales-orders">← Pedidos de venta</a></p>
		<h1>
			{#if state.order}
				{state.order.soNumber}
			{:else}
				Pedido #{soId}
			{/if}
		</h1>
		{#if state.order}
			<p class="subtitle">
				<span class="badge">{state.order.status}</span>
				{#if state.order.orderType}
					· {state.order.orderType}
				{/if}
			</p>
		{/if}
	</header>

	{#if state.loading}
		<p class="status">Cargando…</p>
	{:else if state.error}
		<p class="status error" role="alert">{state.error}</p>
		<button type="button" onclick={() => state.load()}>Reintentar</button>
	{:else if !state.order}
		<p class="status">Pedido no encontrado.</p>
	{:else}
		{@const so = state.order}

		<div class="grid">
			<section class="card">
				<h2>Cliente</h2>
				<dl>
					<div><dt>Nombre</dt><dd>{so.customerName || '—'}</dd></div>
					<div><dt>Email</dt><dd>{so.customerEmail || '—'}</dd></div>
					<div><dt>Teléfono</dt><dd>{so.customerPhone || '—'}</dd></div>
					<div><dt>Customer ID</dt><dd>{so.customerId || '—'}</dd></div>
					<div><dt>Dirección</dt><dd>{so.customerAddress || '—'}</dd></div>
					<div><dt>Envío a</dt><dd>{so.shipAddress || '—'}</dd></div>
				</dl>
			</section>

			<section class="card">
				<h2>Pedido</h2>
				<dl>
					<div><dt>Warehouse</dt><dd>{so.warehouseId ?? '—'}</dd></div>
					<div><dt>Método envío</dt><dd>{so.shipMethod || '—'}</dd></div>
					<div><dt>Origen</dt><dd>{so.orderOrigin || '—'}</dd></div>
					<div><dt>Barcode</dt><dd>{so.barcode || '—'}</dd></div>
					<div><dt>Parent SO</dt><dd>{so.parentSoNumber || so.parentSoId || '—'}</dd></div>
					<div><dt>Memo</dt><dd>{so.memo || '—'}</dd></div>
					<div><dt>Total</dt><dd>{so.orderTotal ?? '—'}</dd></div>
					<div><dt>Shipping paid</dt><dd>{so.customerShippingPaid ?? '—'}</dd></div>
				</dl>
			</section>
		</div>

		<section class="card lines">
			<div class="card-head">
				<h2>Líneas</h2>
				{#if so.status !== 'CANCELLED' && so.status !== 'SHIPPED'}
					<button type="button" class="danger" disabled={state.cancelling} onclick={onCancel}>
						{state.cancelling ? 'Cancelando…' : 'Cancelar pedido'}
					</button>
				{/if}
			</div>
			{#if so.lines.length === 0}
				<p class="status">Sin líneas.</p>
			{:else}
				<div class="table-wrap">
					<table>
						<thead>
							<tr>
								<th>#</th>
								<th>SKU</th>
								<th>Nombre</th>
								<th>Pedida</th>
								<th>Asignada</th>
								<th>Picked</th>
								<th>Packed</th>
								<th>Shipped</th>
							</tr>
						</thead>
						<tbody>
							{#each so.lines as line, i (line.lineId ?? i)}
								<tr>
									<td>{line.lineNumber ?? i + 1}</td>
									<td>{line.sku || '—'}</td>
									<td>{line.itemName || '—'}</td>
									<td>{line.quantityOrdered}</td>
									<td>{line.quantityAllocated}</td>
									<td>{line.quantityPicked}</td>
									<td>{line.quantityPacked}</td>
									<td>{line.quantityShipped}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</section>
	{/if}
</section>

<style>
	@keyframes page-in {
		from {
			opacity: 0;
			transform: translateY(6px);
		}
		to {
			opacity: 1;
			transform: none;
		}
	}

	.page {
		font-family: var(--body);
		max-width: 64rem;
		margin: 2rem auto;
		padding: 0 1.25rem 2.5rem;
		animation: page-in 180ms ease-out;
	}
	header {
		margin-bottom: 1.5rem;
	}
	.back {
		margin: 0 0 0.5rem;
		font-size: 0.9rem;
	}
	.back a {
		color: var(--navy, #004c8b);
		text-decoration: none;
	}
	h1 {
		margin: 0 0 0.35rem;
		font-family: var(--display, var(--body));
		font-size: 1.75rem;
		color: var(--ink, #132234);
	}
	.subtitle {
		margin: 0;
		color: var(--slate, #5c6b7d);
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}
	.badge {
		display: inline-block;
		padding: 0.15rem 0.45rem;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 600;
		background: #eef2f6;
		color: var(--ink, #132234);
	}
	.status {
		color: var(--slate, #5c6b7d);
	}
	.status.error {
		color: var(--danger, #b42318);
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
		gap: 1rem;
		margin-bottom: 1.25rem;
	}
	.card {
		background: var(--card, #fff);
		border: 1px solid var(--line, #e4eaf1);
		border-radius: 8px;
		padding: 1.1rem 1.25rem;
	}
	.card h2 {
		margin: 0 0 0.85rem;
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--navy-deep, #012a50);
	}
	.card-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		margin-bottom: 0.85rem;
	}
	.card-head h2 {
		margin: 0;
	}
	dl {
		margin: 0;
		display: grid;
		gap: 0.55rem;
	}
	dl > div {
		display: grid;
		grid-template-columns: 7.5rem 1fr;
		gap: 0.5rem;
		font-size: 0.9rem;
	}
	dt {
		color: var(--slate, #5c6b7d);
		font-weight: 500;
	}
	dd {
		margin: 0;
		color: var(--ink, #132234);
	}
	.table-wrap {
		overflow-x: auto;
		border: 1px solid var(--line, #e4eaf1);
		border-radius: 6px;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.9rem;
	}
	th,
	td {
		text-align: left;
		padding: 0.6rem 0.8rem;
		border-bottom: 1px solid var(--line, #e4eaf1);
	}
	th {
		background: #f7fafc;
		font-weight: 600;
	}
	tr:last-child td {
		border-bottom: none;
	}
	button {
		padding: 0.45rem 0.9rem;
		border-radius: 6px;
		border: 1px solid var(--line, #e4eaf1);
		background: #fff;
		cursor: pointer;
		font: inherit;
	}
	button.danger {
		border-color: #f5c2c0;
		color: var(--danger, #b42318);
	}
	button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
</style>
