<script lang="ts">
	import { onMount } from 'svelte';
	import { createWarehousesState } from '../state/warehousesState.svelte';

	const state = createWarehousesState();

	onMount(() => {
		void state.load();
	});
</script>

<section class="page">
	<header>
		<h1>Almacenes</h1>
		<p class="subtitle">Maestro de warehouses activos</p>
	</header>

	{#if state.loading}
		<p class="status">Cargando…</p>
	{:else if state.error}
		<p class="status error" role="alert">{state.error}</p>
		<button type="button" onclick={() => state.load()}>Reintentar</button>
	{:else if state.warehouses.length === 0}
		<p class="status">No hay almacenes.</p>
	{:else}
		<div class="table-wrap">
			<table>
				<thead>
					<tr>
						<th>Código</th>
						<th>Nombre</th>
						<th>Estado</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#each state.warehouses as wh (wh.id)}
						<tr>
							<td>{wh.code}</td>
							<td>{wh.name}</td>
							<td>{wh.active ? 'Activo' : 'Inactivo'}</td>
							<td>
								<a href={`/warehouses/${wh.id}`}>Zonas y bins</a>
							</td>
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
		max-width: 48rem;
		margin: 2rem auto;
		padding: 0 1.25rem;
		animation: page-in 180ms ease-out;
	}
	header {
		margin-bottom: 1.5rem;
	}
	h1 {
		margin: 0 0 0.25rem;
		font-size: 1.75rem;
	}
	.subtitle {
		margin: 0;
		color: var(--slate);
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
		background: #fff;
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
	a {
		color: var(--navy);
		text-decoration: none;
	}
	button {
		margin-top: 0.75rem;
		padding: 0.4rem 0.9rem;
		border-radius: 6px;
		border: 1px solid var(--line);
		background: #fff;
		cursor: pointer;
	}
</style>
