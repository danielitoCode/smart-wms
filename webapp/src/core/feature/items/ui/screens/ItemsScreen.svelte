<script lang="ts">
	import { onMount } from 'svelte';
	import { createItemsState } from '../state/itemsState.svelte';

	const state = createItemsState();

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
		<h1>Ítems</h1>
		<p class="subtitle">Catálogo de SKU</p>
	</header>

	<form class="search" onsubmit={onSearch}>
		<input
			type="search"
			placeholder="Buscar por SKU, nombre o UPC"
			value={state.query}
			oninput={(e) => state.setQuery(e.currentTarget.value)}
		/>
		<button type="submit" disabled={state.loading}>Buscar</button>
	</form>

	{#if state.loading}
		<p class="status">Cargando…</p>
	{:else if state.error}
		<p class="status error" role="alert">{state.error}</p>
		<button type="button" onclick={() => state.load()}>Reintentar</button>
	{:else if state.items.length === 0}
		<p class="status">No hay ítems.</p>
	{:else}
		<div class="table-wrap">
			<table>
				<thead>
					<tr>
						<th>SKU</th>
						<th>Nombre</th>
						<th>UPC</th>
						<th>Categoría</th>
						<th>Estado</th>
					</tr>
				</thead>
				<tbody>
					{#each state.items as item (item.id)}
						<tr>
							<td>{item.sku}</td>
							<td>{item.name}</td>
							<td>{item.upc ?? '—'}</td>
							<td>{item.category ?? '—'}</td>
							<td>{item.active ? 'Activo' : 'Inactivo'}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</section>

<style>
	@keyframes page-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }

	.page {
		font-family: var(--body);
		max-width: 56rem;
		margin: 2rem auto;
		padding: 0 1.25rem;
		animation: page-in 180ms ease-out;
	}
	header {
		margin-bottom: 1.25rem;
	}
	h1 {
		margin: 0 0 0.25rem;
		font-size: 1.75rem;
	}
	.subtitle {
		margin: 0;
		color: var(--slate);
	}
	.search {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 1.25rem;
	}
	.search input {
		flex: 1;
		padding: 0.5rem 0.7rem;
		border: 1px solid var(--line);
		border-radius: 6px;
	}
	.search button,
	button {
		padding: 0.45rem 0.9rem;
		border-radius: 6px;
		border: 1px solid var(--line);
		background: #fff;
		cursor: pointer;
	}
	.status {
		color: var(--slate);
	}
	.status.error {
		color: var(--danger);
	}
	.table-wrap {
		overflow-x: auto;
		border: 1px solid var(--line);
		border-radius: 8px;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.9rem;
	}
	th,
	td {
		text-align: left;
		padding: 0.65rem 0.85rem;
		border-bottom: 1px solid var(--line);
	}
	th {
		background: #f7fafc;
		font-weight: 600;
	}
</style>
