<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import type { I18nState } from '#lib/i18n/i18n.svelte';
	import PageHeader from '../../../../../lib/components/PageHeader.svelte';
	import UiBanner from '../../../../../lib/components/UiBanner.svelte';
	import UiLoader from '../../../../../lib/components/UiLoader.svelte';
	import { createInventoryState } from '../state/inventoryState.svelte';

	const i18n = getContext<I18nState>('i18n');
	const vm = createInventoryState();

	onMount(() => {
		void vm.load();
	});
</script>

<section class="inventory page">
	<PageHeader
		eyebrow="ABELLIS · SMART WMS"
		title={i18n.t('Inventario')}
		subtitle={i18n.t('Consulta de existencias por almacén, SKU y ubicación.')}
	/>

	{#if vm.error}
		<UiBanner variant="error" message={vm.error} />
	{/if}

	<form
		class="toolbar"
		onsubmit={(e) => {
			e.preventDefault();
			void vm.load();
		}}
	>
		<label>
			<span>{i18n.t('SKU / búsqueda')}</span>
			<input type="search" bind:value={vm.query} placeholder={i18n.t('SKU, nombre…')} disabled={vm.loading} />
		</label>
		<button type="submit" class="accent" disabled={vm.loading}>
			{vm.loading ? i18n.t('Cargando…') : i18n.t('Filtrar')}
		</button>
		<button type="button" class="secondary" onclick={() => vm.load()} disabled={vm.loading}>
			{i18n.t('Actualizar')}
		</button>
	</form>

	{#if vm.loading && !vm.loadedOnce}
		<UiLoader label={i18n.t('Cargando inventario…')} size="lg" />
	{:else if !vm.loading && vm.rows.length === 0}
		<p class="empty">{i18n.t('Sin resultados')}</p>
	{:else}
		{#if vm.loading}
			<UiLoader label={i18n.t('Actualizando…')} size="sm" />
		{/if}
		<div class="table-wrap">
			<table>
				<thead>
					<tr>
						<th>{i18n.t('SKU')}</th>
						<th>{i18n.t('Producto')}</th>
						<th>{i18n.t('Ubicación')}</th>
						<th>{i18n.t('Cantidad')}</th>
					</tr>
				</thead>
				<tbody>
					{#each vm.rows as row (row.id)}
						<tr>
							<td>{row.sku}</td>
							<td>{row.name}</td>
							<td>{row.binCode ?? '—'}</td>
							<td>{row.quantity}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</section>

<style>
	.toolbar {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		align-items: end;
		margin-bottom: 1rem;
	}
	.toolbar label {
		display: grid;
		gap: 0.3rem;
		font-size: 0.8rem;
		color: var(--slate);
	}
	.empty {
		color: var(--slate);
		padding: 1.5rem 0;
	}
</style>
