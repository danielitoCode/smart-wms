<script lang="ts">
	import { getContext } from 'svelte';
	import { createAuthGuardState } from '../../../auth/ui/state/authGuardState.svelte';
	import type { WarehouseSelectionState } from '../../../warehouses/ui/state/warehouseSelectionState.svelte';
	import type { I18nState } from '$lib/i18n/i18n.svelte';
	import { createCustomersState } from '../state/customersState.svelte';

	const i18n = getContext<I18nState>('i18n');
	const state = createCustomersState();
	const authGuard = getContext<ReturnType<typeof createAuthGuardState>>('authGuard');
	const warehouseSelection = getContext<WarehouseSelectionState>('warehouseSelection');
	let searchScopeError = $state<string | null>(null);
	let lastWarehouseId: number | null | undefined = undefined;
	$effect(() => {
		if (!warehouseSelection.initialized) return;
		const activeWarehouseId = warehouseSelection.warehouseId;
		if (lastWarehouseId === activeWarehouseId) return;
		lastWarehouseId = activeWarehouseId;
		state.setWarehouseId(activeWarehouseId);
		void state.load(1);
	});
	function onSearch(event: Event) {
		event.preventDefault();
		// Flask global search is only warehouse-filtered when warehouse_id is supplied.
		// Do not issue an unscoped search for a USER without an active authorized warehouse.
		if (authGuard.user?.role !== 'ADMIN' && warehouseSelection.warehouseId == null) {
			searchScopeError = i18n.t('No hay un almacén autorizado activo para buscar clientes.');
			return;
		}
		searchScopeError = null;
		void state.load(1);
	}
</script>

<section class="page">
	<header><div><h1>Clientes</h1><p class="subtitle">Vista de solo lectura proyectada desde pedidos de venta. Flask no ofrece API administrativa de clientes.</p></div></header>
	<form class="filters" onsubmit={onSearch}>
		<label class="field grow"><span>Buscar cliente (mínimo 2 caracteres)</span>
			<input type="search" placeholder="Nombre del cliente" value={state.query} oninput={(e) => state.setQuery(e.currentTarget.value)} />
		</label>
		<span class="warehouse-context">Almacén activo: {warehouseSelection.warehouseId ?? i18n.t('Todos los autorizados')}</span>
		<button type="submit" disabled={state.loading}>Buscar</button>
	</form>
	{#if searchScopeError}<p class="status error" role="alert">{searchScopeError}</p>{/if}

	{#if state.loading}<p class="status">Cargando clientes…</p>
	{:else if state.error}<p class="status error" role="alert">{state.error}</p><button type="button" onclick={() => state.load(1)}>Reintentar</button>
	{:else if state.customers.length === 0}<p class="status">No hay clientes para estos criterios.</p>
	{:else}
		<div class="table-wrap"><table>
			<thead><tr><th>Cliente</th><th>Teléfono</th><th>Pedidos en página</th><th>Almacenes</th><th></th></tr></thead>
			<tbody>{#each state.customers as customer (customer.id)}
				<tr><td><strong>{customer.name}</strong></td><td>{customer.phone ?? '—'}</td><td>{customer.orderCount ?? '—'}</td><td>{customer.warehouseIds.join(', ') || '—'}</td>
					<td><button type="button" class="link" onclick={() => state.selectCustomer(customer)}>Ver detalle</button></td></tr>
			{/each}</tbody>
		</table></div>
		{#if state.customerPage}
			<div class="pagination"><span>Página {state.customerPage.page} de {state.customerPage.totalPages} · {state.customerPage.totalOrders} pedidos de origen</span>
				<div><button type="button" disabled={state.customerPage.page <= 1} onclick={() => state.load(state.customerPage!.page - 1)}>Anterior</button>
				<button type="button" disabled={state.customerPage.page >= state.customerPage.totalPages} onclick={() => state.load(state.customerPage!.page + 1)}>Siguiente</button></div>
			</div>
		{:else}<p class="hint">La búsqueda global devuelve como máximo 10 coincidencias de clientes por consulta.</p>{/if}
	{/if}

	{#if state.selectedCustomer}
		<section class="detail" aria-labelledby="customer-detail-title">
			<div class="detail-heading"><div><h2 id="customer-detail-title">{state.selectedCustomer.name}</h2><p class="subtitle">Detalle derivado de pedidos; no es un registro maestro editable.</p></div><button type="button" onclick={state.closeDetail}>Cerrar</button></div>
			{#if state.detailLoading}<p class="status">Cargando detalle e historial…</p>{/if}
			{#if state.detailError}<p class="status error" role="alert">{state.detailError}</p>{/if}
			<div class="facts"><div><span>Email</span><strong>{state.selectedCustomer.email ?? i18n.t('No disponible')}</strong></div><div><span>Teléfono</span><strong>{state.selectedCustomer.phone ?? '—'}</strong></div><div><span>Pedidos</span><strong>{state.selectedCustomer.orderCount ?? i18n.t('No calculado')}</strong></div></div>
			<h3>Direcciones observadas en pedidos</h3>
			{#if state.selectedCustomer.addresses.length === 0}<p class="hint">No hay direcciones disponibles en los pedidos consultados.</p>
			{:else}<div class="addresses">{#each state.selectedCustomer.addresses as address, i (address.kind + '-' + i)}
				<article><strong>{address.kind === 'billing' ? i18n.t('Facturación') : address.kind === 'shipping' ? i18n.t('Envío') : i18n.t('Dirección de cliente')}</strong>
				<p>{[...address.lines, address.city, address.state, address.postalCode, address.country].filter(Boolean).join(', ')}</p>
				<small>Almacén {address.warehouseId ?? '—'} · Tel. {address.phone ?? '—'}</small></article>
			{/each}</div>{/if}
			<h3>Historial de pedidos</h3>
			{#if state.customerOrders}
				{#if state.customerOrders.orders.length}
					<div class="table-wrap"><table><thead><tr><th>Pedido</th><th>Fecha</th><th>Estado</th><th>Total</th><th>Almacén</th></tr></thead>
					<tbody>{#each state.customerOrders.orders as order (order.id)}<tr><td><a href={'/sales-orders/' + order.id}>{order.number}</a></td><td>{order.orderDate ?? '—'}</td><td>{order.status ?? '—'}</td><td>{order.orderTotal ?? '—'}</td><td>{order.warehouseId ?? '—'}</td></tr>{/each}</tbody></table></div>
				{:else}
					<p class="hint">Esta página de resultados no contiene pedidos con nombre exacto; puede haber coincidencias por número de pedido.</p>
				{/if}
				{#if state.customerOrders.totalPages > 1}
					<div class="pagination"><span>Página {state.customerOrders.page} de {state.customerOrders.totalPages} · {state.customerOrders.matchingSalesOrders} coincidencias backend</span>
					<div><button type="button" disabled={state.ordersPage <= 1} onclick={() => state.loadOrders(state.ordersPage - 1)}>Anterior</button><button type="button" disabled={state.ordersPage >= state.customerOrders.totalPages} onclick={() => state.loadOrders(state.ordersPage + 1)}>Siguiente</button></div></div>
				{/if}
			{:else if !state.detailLoading}<p class="hint">No se encontraron pedidos para este cliente.</p>{/if}
			<p class="hint">El endpoint q busca por número o nombre de pedido. El historial filtra por nombre exacto; el total de páginas puede incluir coincidencias por número de pedido.</p>
		</section>
	{/if}
</section>

<style>
	.page{font-family:var(--body);max-width:72rem;margin:2rem auto;padding:0 1.25rem 2.5rem;color:var(--ink,#132234)}
	header,.detail-heading{display:flex;justify-content:space-between;align-items:flex-start;gap:1rem}
	h1{margin:0 0 .35rem;font-family:var(--display,var(--body));font-size:1.75rem}h2{margin:0 0 .25rem;font-size:1.25rem}h3{margin:1.25rem 0 .6rem;font-size:1rem}
	.subtitle,.hint{margin:0;color:var(--slate,#5c6b7d);line-height:1.45;font-size:.92rem}
	.filters{display:flex;flex-wrap:wrap;gap:.75rem 1rem;align-items:flex-end;margin:1.5rem 0}.field{display:flex;flex-direction:column;gap:.3rem;min-width:10rem}.field.grow{flex:1 1 16rem}
	.warehouse-context{align-self:center;color:var(--slate,#5c6b7d);font-size:.85rem}
	.field span,.facts span{font-size:.75rem;font-weight:600;color:var(--slate,#5c6b7d);text-transform:uppercase}
	input,button{padding:.55rem .75rem;border:1px solid var(--line,#e4eaf1);border-radius:6px;background:var(--card,#fff);font:inherit}button{cursor:pointer}button:disabled{opacity:.5;cursor:not-allowed}.link{border:0;color:var(--accent,#1769aa);text-decoration:underline;padding:.2rem}
	.table-wrap{overflow-x:auto;border:1px solid var(--line,#e4eaf1);border-radius:8px;background:var(--card,#fff);margin-top:.75rem}table{width:100%;border-collapse:collapse;font-size:.9rem}th,td{text-align:left;padding:.7rem .9rem;border-bottom:1px solid var(--line,#e4eaf1)}th{background:var(--surface-muted,#f7fafc);font-weight:600}tr:last-child td{border-bottom:0}
	.pagination{display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap;margin:.85rem 0;color:var(--slate,#5c6b7d);font-size:.85rem}.pagination div{display:flex;gap:.5rem}
	.status{margin:1rem 0;color:var(--slate,#5c6b7d)}.error{color:var(--danger,#b42318)}.detail{margin-top:1.75rem;padding:1.25rem;border:1px solid var(--line,#e4eaf1);border-radius:10px;background:var(--card,#fff)}
	.facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(12rem,1fr));gap:.75rem;margin:1rem 0}.facts div,.addresses article{display:flex;flex-direction:column;gap:.3rem;padding:.8rem;border:1px solid var(--line,#e4eaf1);border-radius:7px}.facts strong{font-size:.9rem;font-weight:500}
	.addresses{display:grid;grid-template-columns:repeat(auto-fit,minmax(14rem,1fr));gap:.6rem}.addresses p{margin:0;line-height:1.4}.addresses small{color:var(--slate,#5c6b7d)}
	@media(max-width:600px){.page{margin:1rem auto}.detail{padding:.85rem}.pagination{align-items:flex-start}}
</style>
