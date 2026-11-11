<script lang="ts">
	import { getContext } from 'svelte';
	import type { I18nState } from '../../../../lib/i18n/i18n.svelte';
	const i18n = getContext<I18nState>('i18n');
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
		<h1>{i18n.t(i18n.t('Productos'))}</h1>
		<p class="subtitle">{i18n.t(i18n.t('Consulta y busca los productos registrados en el almacén.'))}</p>
	</header>

	<form class="search" onsubmit={onSearch}>
		<input
			type="search"
			placeholder={i18n.t(i18n.t('Buscar por código, nombre o código de barras'))}
			value={state.query}
			oninput={(e) => state.setQuery(e.currentTarget.value)}
		/>
		<button type="submit" class="accent" disabled={state.loading}>{i18n.t(i18n.t('Buscar'))}</button>
	</form>

	{#if state.loading}
		<p class="status">{i18n.t(i18n.t('Cargando…'))}</p>
	{:else if state.error}
		<p class="status error" role="alert">{state.error}</p>
		<button type="button" onclick={() => state.load()}>{i18n.t(i18n.t('Reintentar'))}</button>
	{:else if state.items.length === 0}
		<p class="status">{i18n.t(i18n.t('Todavía no hay productos registrados.'))}</p>
	{:else}
		<div class="table-wrap">
			<table>
				<thead>
					<tr>
						<th>{i18n.t(i18n.t('SKU'))}</th>
						<th>{i18n.t(i18n.t('Nombre'))}</th>
						<th>{i18n.t(i18n.t('Código de barras'))}</th>
						<th>{i18n.t(i18n.t('Categoría'))}</th>
						<th>{i18n.t(i18n.t('Estado'))}</th>
					</tr>
				</thead>
				<tbody>
					{#each state.items as item (item.id)}
						<tr>
							<td>{item.sku}</td>
							<td>{item.name}</td>
							<td>{item.upc ?? '—'}</td>
							<td>{item.category ?? '—'}</td>
							<td>{item.active ? i18n.t('Activo') : i18n.t('Inactivo')}</td>
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
