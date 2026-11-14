<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import type { I18nState } from '#lib/i18n/i18n.svelte.ts';
	import PageHeader from '../../../../../lib/components/PageHeader.svelte';
	import UiBanner from '../../../../../lib/components/UiBanner.svelte';
	import { createItemsState } from '../state/itemsState.svelte';

	const i18n = getContext<I18nState>('i18n');
	const vm = createItemsState();

	let searchTimer: ReturnType<typeof setTimeout> | null = null;

	onMount(() => {
		void vm.load(1);
	});

	function onSearchInput(value: string) {
		vm.setQuery(value);
		if (searchTimer) clearTimeout(searchTimer);
		searchTimer = setTimeout(() => void vm.load(1), 300);
	}

	function onFilterChange(value: 'active' | 'archived' | 'all') {
		vm.setFilter(value);
		void vm.load(1);
	}
</script>

<section class="items page">
	<PageHeader
		title={i18n.t('Productos')}
		subtitle={i18n.t('Consulta y busca los productos registrados en el almacén.')}
	>
		{#snippet actions()}
			<button type="button" class="accent" onclick={() => vm.openCreate()}>{i18n.t('Nuevo producto')}</button>
		{/snippet}
	</PageHeader>

	<div class="toolbar">
		<input
			type="search"
			placeholder={i18n.t('Buscar por SKU, nombre, UPC o MPN…')}
			value={vm.query}
			oninput={(e) => onSearchInput(e.currentTarget.value)}
			disabled={vm.loading}
		/>
		<select
			value={vm.filter}
			onchange={(e) => onFilterChange(e.currentTarget.value as 'active' | 'archived' | 'all')}
			disabled={vm.loading}
		>
			<option value="active">{i18n.t('Activos')}</option>
			<option value="archived">{i18n.t('Archivados')}</option>
			<option value="all">{i18n.t('Todos')}</option>
		</select>
		<button type="button" class="secondary" onclick={() => vm.load(vm.page)} disabled={vm.loading}>
			{i18n.t('Actualizar')}
		</button>
	</div>

	{#if vm.error}
		<UiBanner tone="error" message={vm.error} />
	{/if}

	{#if vm.loading && vm.items.length === 0}
		<p class="status">{i18n.t('Cargando…')}</p>
	{:else if vm.items.length === 0}
		<p class="status">{i18n.t('Todavía no hay productos registrados.')}</p>
	{:else}
		<div class="table-wrap">
			<table>
				<thead>
					<tr>
						<th>{i18n.t('SKU')}</th>
						<th>{i18n.t('Nombre')}</th>
						<th>{i18n.t('UPC')}</th>
						<th>{i18n.t('MPN')}</th>
						<th>{i18n.t('Categoría')}</th>
						<th>{i18n.t('Estado')}</th>
						<th>{i18n.t('Acciones')}</th>
					</tr>
				</thead>
				<tbody>
					{#each vm.items as item (item.id)}
						<tr>
							<td>
								<button type="button" class="link" onclick={() => vm.openDetail(item.id)}>{item.sku}</button>
							</td>
							<td>{item.name}</td>
							<td>{item.upc ?? '—'}</td>
							<td>{item.mpn ?? '—'}</td>
							<td>{item.category ?? '—'}</td>
							<td>{item.active ? i18n.t('Activo') : i18n.t('Archivado')}</td>
							<td class="actions">
								<button type="button" class="ghost" onclick={() => vm.openEdit(item)}>{i18n.t('Editar')}</button>
								<button type="button" class="ghost" onclick={() => vm.toggleArchive(item)}>
									{item.active ? i18n.t('Archivar') : i18n.t('Restaurar')}
								</button>
								<button type="button" class="danger-ghost" onclick={() => vm.setDeleteId(item.id)}>
									{i18n.t('Eliminar')}
								</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<div class="pager">
			<button type="button" disabled={vm.page <= 1 || vm.loading} onclick={() => vm.load(vm.page - 1)}>
				{i18n.t('Anterior')}
			</button>
			<span>{vm.page} / {vm.pages} · {vm.total}</span>
			<button type="button" disabled={vm.page >= vm.pages || vm.loading} onclick={() => vm.load(vm.page + 1)}>
				{i18n.t('Siguiente')}
			</button>
		</div>
	{/if}
</section>

{#if vm.showForm}
	<div class="modal" role="dialog" aria-modal="true">
		<div class="panel">
			<h2>{vm.editId ? i18n.t('Editar producto') : i18n.t('Nuevo producto')}</h2>
			<label>
				{i18n.t('SKU')}
				<input value={vm.form.sku} oninput={(e) => vm.setFormField('sku', e.currentTarget.value)} required />
			</label>
			<label>
				{i18n.t('Nombre')}
				<input
					value={vm.form.itemName}
					oninput={(e) => vm.setFormField('itemName', e.currentTarget.value)}
					required
				/>
			</label>
			<label>
				{i18n.t('Descripción')}
				<textarea
					value={vm.form.description}
					oninput={(e) => vm.setFormField('description', e.currentTarget.value)}
				></textarea>
			</label>
			<label>
				{i18n.t('UPC')}
				<input value={vm.form.upc} oninput={(e) => vm.setFormField('upc', e.currentTarget.value)} />
			</label>
			<label>
				{i18n.t('MPN')}
				<input value={vm.form.mpn} oninput={(e) => vm.setFormField('mpn', e.currentTarget.value)} />
			</label>
			<label>
				{i18n.t('Categoría')}
				<input value={vm.form.category} oninput={(e) => vm.setFormField('category', e.currentTarget.value)} />
			</label>
			<label>
				{i18n.t('Peso (lbs)')}
				<input
					type="number"
					min="0"
					step="0.01"
					value={vm.form.weightLbs}
					oninput={(e) => vm.setFormField('weightLbs', e.currentTarget.value)}
				/>
			</label>
			<label>
				{i18n.t('Bin por defecto (ID)')}
				<input
					type="number"
					min="1"
					value={vm.form.defaultBinId}
					oninput={(e) => vm.setFormField('defaultBinId', e.currentTarget.value)}
				/>
			</label>
			<div class="modal-actions">
				<button type="button" class="secondary" onclick={() => vm.closeForm()} disabled={vm.saving}>
					{i18n.t('Cancelar')}
				</button>
				<button type="button" class="accent" onclick={() => vm.save()} disabled={vm.saving}>
					{vm.saving ? i18n.t('Guardando…') : i18n.t('Guardar')}
				</button>
			</div>
		</div>
	</div>
{/if}

{#if vm.detail}
	<div class="modal" role="dialog" aria-modal="true">
		<div class="panel wide">
			<h2>{vm.detail.item.sku} · {vm.detail.item.name}</h2>
			<p class="meta">
				{vm.detail.item.active ? i18n.t('Activo') : i18n.t('Archivado')}
				{#if vm.detail.item.category} · {vm.detail.item.category}{/if}
			</p>
			{#if vm.detail.inventory.length}
				<h3>{i18n.t('Inventario')}</h3>
				<table>
					<thead>
						<tr>
							<th>{i18n.t('Ubicación')}</th>
							<th>{i18n.t('Zona')}</th>
							<th>{i18n.t('Cantidad')}</th>
							<th>{i18n.t('Asignado')}</th>
						</tr>
					</thead>
					<tbody>
						{#each vm.detail.inventory as line (line.inventoryId)}
							<tr>
								<td>{line.binCode ?? line.binId}</td>
								<td>{line.zoneName ?? '—'}</td>
								<td>{line.quantityOnHand}</td>
								<td>{line.quantityAllocated}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{:else}
				<p class="status">{i18n.t('Sin existencias.')}</p>
			{/if}
			{#if vm.detail.preferredBins.length}
				<h3>{i18n.t('Ubicaciones preferidas')}</h3>
				<ul>
					{#each vm.detail.preferredBins as pb (pb.preferredBinId)}
						<li>{pb.priority}. {pb.binCode ?? pb.binId} ({pb.zoneName ?? '—'})</li>
					{/each}
				</ul>
			{/if}
			<div class="modal-actions">
				<button type="button" class="secondary" onclick={() => vm.closeDetail()}>{i18n.t('Cerrar')}</button>
			</div>
		</div>
	</div>
{/if}

{#if vm.deleteId != null}
	<div class="modal" role="dialog" aria-modal="true">
		<div class="panel">
			<h2>{i18n.t('Eliminar producto')}</h2>
			<p>
				{i18n.t(
					'El producto y sus datos asociados se eliminarán de forma permanente. No se puede eliminar si tiene inventario o historial de pedidos.'
				)}
			</p>
			<div class="modal-actions">
				<button type="button" class="secondary" onclick={() => vm.setDeleteId(null)} disabled={vm.saving}>
					{i18n.t('Cancelar')}
				</button>
				<button type="button" class="danger" onclick={() => vm.confirmDelete()} disabled={vm.saving}>
					{vm.saving ? i18n.t('Eliminando…') : i18n.t('Eliminar')}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.toolbar {
		display: flex;
		flex-wrap: wrap;
		gap: 0.65rem;
		margin-bottom: 1rem;
	}
	.toolbar input[type='search'] {
		flex: 1 1 16rem;
		min-height: 40px;
		padding: 0.45rem 0.7rem;
		border: 1px solid var(--line);
		border-radius: var(--radius-field, 8px);
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
	}
	.link {
		background: none;
		border: none;
		color: var(--navy, #0b1f3a);
		font-weight: 600;
		cursor: pointer;
		text-decoration: underline;
		padding: 0;
	}
	.pager {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-top: 0.85rem;
	}
	.modal {
		position: fixed;
		inset: 0;
		background: rgba(11, 31, 58, 0.45);
		display: grid;
		place-items: center;
		padding: 1rem;
		z-index: 40;
	}
	.panel {
		width: min(28rem, 100%);
		max-height: 90vh;
		overflow: auto;
		background: var(--surface, #fff);
		border-radius: 12px;
		padding: 1.15rem 1.2rem;
		border: 1px solid var(--line);
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
	}
	.panel.wide {
		width: min(40rem, 100%);
	}
	.panel label {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		font-size: 0.875rem;
	}
	.panel input,
	.panel textarea {
		padding: 0.45rem 0.55rem;
		border: 1px solid var(--line);
		border-radius: 8px;
	}
	.modal-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
		margin-top: 0.5rem;
	}
	.meta {
		color: var(--slate);
		margin: 0;
	}
	.status {
		color: var(--slate);
	}
</style>
