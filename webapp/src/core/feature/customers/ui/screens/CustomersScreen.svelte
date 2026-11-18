<script lang="ts">
	import { onMount } from 'svelte';
	import { createCustomersState } from '../state/customersState.svelte';

	const state = createCustomersState();

	onMount(() => {
		void state.load();
	});

	function onSearch(event: Event) {
		event.preventDefault();
		void state.load();
	}
</script>

<section class="page">
	<header>
		<h1>Clientes</h1>
		<p class="subtitle">
			Proyección desde pedidos de venta y búsqueda global admin. No hay CRUD admin dedicado en el
			backend actual.
		</p>
	</header>

	<form class="filters" onsubmit={onSearch}>
		<label class="field grow">
			<span>Buscar (≥ 2 caracteres usa search admin)</span>
			<input
				type="search"
				placeholder="Nombre de cliente"
				value={state.query}
				oninput={(e) => state.setQuery(e.currentTarget.value)}
			/>
		</label>
		<label class="field">
			<span>Warehouse ID</span>
			<input
				type="number"
				min="1"
				placeholder="Opcional"
				value={state.warehouseId ?? ''}
				oninput={(e) => {
					const v = e.currentTarget.value.trim();
					state.setWarehouseId(v ? Number(v) : null);
				}}
			/>
		</label>
		<button type="submit" disabled={state.loading}>Buscar</button>
	</form>

	{#if state.loading}
		<p class="status">Cargando…</p>
	{:else if state.error}
		<p class="status error" role="alert">{state.error}</p>
		<button type="button" onclick={() => state.load()}>Reintentar</button>
	{:else if state.customers.length === 0}
		<p class="status">No hay clientes con estos criterios.</p>
	{:else}
		<div class="table-wrap">
			<table>
				<thead>
					<tr>
						<th>Nombre</th>
						<th>Email</th>
						<th>Teléfono</th>
						<th>Pedidos</th>
						<th>WH</th>
					</tr>
				</thead>
				<tbody>
					{#each state.customers as c (c.id)}
						<tr>
							<td>{c.name}</td>
							<td>{c.email ?? '—'}</td>
							<td>{c.phone ?? '—'}</td>
							<td>{c.orderCount ?? '—'}</td>
							<td>{c.warehouseId ?? '—'}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
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
		max-width: 56rem;
		margin: 2rem auto;
		padding: 0 1.25rem 2.5rem;
		animation: page-in 180ms ease-out;
	}
	header {
		margin-bottom: 1.5rem;
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
		max-width: 40rem;
		line-height: 1.45;
		font-size: 0.95rem;
	}
	.filters {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem 1rem;
		align-items: flex-end;
		margin-bottom: 1.5rem;
	}
	.field {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		min-width: 8rem;
	}
	.field.grow {
		flex: 1 1 14rem;
	}
	.field span {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--slate, #5c6b7d);
		text-transform: uppercase;
		letter-spacing: 0.02em;
	}
	.field input,
	button {
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--line, #e4eaf1);
		border-radius: 6px;
		background: #fff;
		font: inherit;
	}
	button {
		cursor: pointer;
		align-self: flex-end;
	}
	button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
	.status {
		color: var(--slate, #5c6b7d);
	}
	.status.error {
		color: var(--danger, #b42318);
	}
	.table-wrap {
		ocursor: auto;
		overflow-x: auto;
		border: 1px solid var(--line, #e4eaf1);
		border-radius: 8px;
		background: var(--card, #fff);
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.9rem;
	}
	th,
	td {
		text-align: left;
		padding: 0.7rem 0.9rem;
		border-bottom: 1px solid var(--line, #e4eaf1);
	}
	th {
		background: #f7fafc;
		font-weight: 600;
	}
	tr:last-child td {
		border-bottom: none;
	}
</style>
