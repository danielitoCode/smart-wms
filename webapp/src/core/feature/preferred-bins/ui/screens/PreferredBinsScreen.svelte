<script lang="ts">
	import UiStatePanel from '#lib/components/UiStatePanel.svelte';
	import { onMount, getContext } from 'svelte';
	import type { I18nState } from '../../../../../lib/i18n/i18n.svelte';
	import { createPreferredBinsState } from '../state/preferredBinsState.svelte';

	const i18n = getContext<I18nState>('i18n');
	const vm = createPreferredBinsState();
	let priorityDrafts = $state<Record<number, number>>({});

	onMount(() => { void vm.loadCatalogs(); });

	function onItemSearch(event: Event) {
		void vm.searchItemCatalog((event.currentTarget as HTMLInputElement).value);
	}

	function onBinSearch(event: Event) {
		void vm.loadBins((event.currentTarget as HTMLInputElement).value);
	}

	function onRowsSearch(event: Event) {
		void vm.searchRows((event.currentTarget as HTMLInputElement).value);
	}

	async function savePriority(id: number, current: number) {
		const next = priorityDrafts[id] ?? current;
		if (next === current) return;
		const saved = await vm.updatePriority(id, next);
		if (saved) delete priorityDrafts[id];
		else priorityDrafts[id] = current;
	}

	async function deleteRelation(id: number) {
		if (confirm(i18n.t('¿Eliminar esta ubicación preferida?'))) await vm.remove(id);
	}

	function csvCell(value: unknown): string {
		const text = String(value ?? '');
		const safe = /^[=+\-@\t\r]/.test(text) ? "'" + text : text;
		return '"' + safe.replace(/"/g, '""') + '"';
	}

	function exportCsv() {
		const header = ['SKU', 'Producto', 'Almacén', 'Ubicación', 'Zona', 'Prioridad', 'Última actualización'];
		const lines = vm.rows.map(row => {
			const warehouse = vm.warehouseOptions.find(option => option.id === row.warehouseId);
			return [
				row.sku, row.itemName, warehouse ? warehouse.code + ' · ' + warehouse.name : row.warehouseId,
				row.binCode, row.zoneName, row.priority, row.updatedAt
			].map(csvCell).join(',');
		});
		const blob = new Blob(['\uFEFF' + [header.map(csvCell).join(','), ...lines].join('\r\n')], {
			type: 'text/csv;charset=utf-8;'
		});
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement('a');
		anchor.href = url;
		anchor.download = 'preferred-bins.csv';
		anchor.click();
		URL.revokeObjectURL(url);
	}
</script>

<section class="page">
	<header class="page-header">
		<div>
			<p class="eyebrow">ABELLIS · SMART WMS</p>
			<h1>{i18n.t('Ubicaciones preferidas')}</h1>
			<p class="subtitle">{i18n.t('Configura el orden de las ubicaciones de picking para cada producto.')}</p>
		</div>
		<button class="secondary" type="button" onclick={exportCsv} disabled={vm.rows.length === 0}>{i18n.t('Exportar CSV')}</button>
	</header>

	{#if vm.error}
		<UiStatePanel kind="error" title={i18n.t('No se pudieron cargar las ubicaciones preferidas')} message={vm.error ?? ''} />
	{/if}

	<section class="panel assignment" aria-labelledby="assignment-title">
		<div class="section-heading">
			<div><h2 id="assignment-title">{i18n.t('Nueva asignación')}</h2><p>{i18n.t('Selecciona un producto y una ubicación Pickable del almacén.')}</p></div>
		</div>

		<div class="form-grid">
			<label class="field item-field">
				<span>{i18n.t('Producto')}</span>
				<input type="search" value={vm.itemQuery} oninput={onItemSearch} placeholder={i18n.t('Buscar por SKU o nombre…')} autocomplete="off" />
				{#if vm.searchingItems}<small>{i18n.t('Buscando productos…')}</small>{/if}
				{#if vm.itemOptions.length > 0}
					<div class="suggestions" role="listbox">
						{#each vm.itemOptions as item (item.id)}
							<button type="button" class="suggestion" onclick={() => vm.chooseItem(item)}>
								<strong>{item.sku}</strong><span>{item.name}</span>
							</button>
						{/each}
					</div>
				{/if}
				{#if vm.selectedItem}<small class="selected">{vm.selectedItem.sku} · {vm.selectedItem.name}</small>{/if}
			</label>

			<label class="field">
				<span>{i18n.t('Almacén')}</span>
				<select value={vm.selectedWarehouseId ?? ''} onchange={event => void vm.chooseWarehouse(event.currentTarget.value ? Number(event.currentTarget.value) : null)}>
					<option value="">{i18n.t('Seleccionar almacén')}</option>
					{#each vm.warehouseOptions as warehouse (warehouse.id)}
						<option value={warehouse.id}>{warehouse.code} · {warehouse.name}</option>
					{/each}
				</select>
			</label>

			<label class="field">
				<span>{i18n.t('Buscar ubicación por código')}</span>
				<input type="search" value={vm.binQuery} oninput={onBinSearch} disabled={!vm.selectedWarehouseId} placeholder={i18n.t('Código de bin…')} />
			</label>

			<label class="field">
				<span>{i18n.t('Ubicación Pickable')}</span>
				<select value={vm.selectedBinId ?? ''} onchange={event => vm.setSelectedBinId(event.currentTarget.value ? Number(event.currentTarget.value) : null)} disabled={!vm.selectedWarehouseId || vm.loadingBins}>
					<option value="">{vm.loadingBins ? i18n.t('Cargando ubicaciones…') : i18n.t('Seleccionar ubicación')}</option>
					{#each vm.binOptions as bin (bin.id)}
						<option value={bin.id}>{bin.code}{bin.zoneName ? ' · ' + bin.zoneName : ''}</option>
					{/each}
				</select>
				<small>{i18n.t('Solo se muestran bins Pickable activos del almacén seleccionado.')}</small>
			</label>

			<label class="field priority-field">
				<span>{i18n.t('Prioridad inicial')}</span>
				<input type="number" min="1" max="100" step="1" value={vm.priority} oninput={event => vm.setPriority(Number(event.currentTarget.value))} />
			</label>
			<div class="field action-field">
				<span aria-hidden="true">&nbsp;</span>
				<button class="primary" type="button" onclick={() => void vm.add()} disabled={vm.saving || !vm.selectedItem || !vm.selectedWarehouseId || !vm.selectedBinId || !Number.isInteger(vm.priority) || vm.priority < 1 || vm.priority > 100}>
					{vm.saving ? i18n.t('Guardando…') : i18n.t('Añadir ubicación')}
				</button>
			</div>
		</div>
	</section>

	<section class="panel list-panel" aria-labelledby="list-title">
		<div class="section-heading">
			<div><h2 id="list-title">{i18n.t('Orden de ubicaciones')}</h2><p>{i18n.t('Administra las asignaciones disponibles en tus almacenes autorizados.')}</p></div>
			<span class="count">{vm.rows.length} {i18n.t('ubicaciones')}</span>
		</div>

		<div class="filters">
			<label class="field search-field">
				<span>{i18n.t('Buscar asignaciones por SKU o nombre')}</span>
				<input type="search" value={vm.rowsQuery} oninput={onRowsSearch} placeholder={i18n.t('Buscar por SKU o nombre…')} />
			</label>
			<label class="field warehouse-filter">
				<span>{i18n.t('Filtrar por almacén')}</span>
				<select value={vm.filterWarehouseId ?? ''} onchange={event => void vm.setWarehouseFilter(event.currentTarget.value ? Number(event.currentTarget.value) : null)}>
					<option value="">{i18n.t('Todos los almacenes autorizados')}</option>
					{#each vm.warehouseOptions as warehouse (warehouse.id)}
						<option value={warehouse.id}>{warehouse.code} · {warehouse.name}</option>
					{/each}
				</select>
			</label>
		</div>

		{#if vm.loading || vm.loadingCatalogs}
			<UiStatePanel kind="loading" title={i18n.t('Cargando ubicaciones preferidas')} message={i18n.t('Estamos recuperando las asignaciones y el catálogo de ubicaciones.')} />
		{:else if vm.rows.length === 0}
			<UiStatePanel kind="empty" title={i18n.t('Sin ubicaciones preferidas')} message={i18n.t('Añade una ubicación Pickable para definir la prioridad de un producto.')} />
		{:else}
			<div class="table-wrap">
				<table>
					<thead><tr>
						<th>{i18n.t('SKU')}</th><th>{i18n.t('Producto')}</th><th>{i18n.t('Almacén')}</th>
						<th>{i18n.t('Código')}</th><th>{i18n.t('Zona')}</th><th>{i18n.t('Prioridad')}</th>
						<th>{i18n.t('Última actualización')}</th><th>{i18n.t('Acciones')}</th>
					</tr></thead>
					<tbody>
						{#each vm.rows as row (row.preferredBinId)}
							<tr>
								<td><strong>{row.sku ?? '—'}</strong></td>
								<td>{row.itemName ?? '—'}</td>
								<td>{vm.warehouseOptions.find(option => option.id === row.warehouseId)?.code ?? row.warehouseId}</td>
								<td>{row.binCode ?? '—'}</td>
								<td>{row.zoneName ?? '—'}</td>
								<td><input class="priority-input" aria-label={i18n.t('Prioridad')} type="number" min="1" max="100" step="1" value={priorityDrafts[row.preferredBinId] ?? row.priority} oninput={event => priorityDrafts[row.preferredBinId] = Number(event.currentTarget.value)} onchange={() => void savePriority(row.preferredBinId, row.priority)} disabled={vm.saving} /></td>
								<td>{row.updatedAt ? new Date(row.updatedAt).toLocaleDateString() : '—'}</td>
								<td><button class="danger-button" type="button" onclick={() => void deleteRelation(row.preferredBinId)} disabled={vm.saving}>{i18n.t('Eliminar')}</button></td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			<p class="footnote">{i18n.t('El servidor reorganiza automáticamente las prioridades para mantener una secuencia continua sin duplicados.')}</p>
		{/if}
	</section>
</section>

<style>
	.page{max-width:86rem;margin:1.5rem auto;padding:0 1.25rem 2.5rem;color:var(--ink)}
	.page-header{display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;margin-bottom:1.25rem}
	h1{margin:0;font:700 1.65rem var(--disp);letter-spacing:-.025em}
	.subtitle,.section-heading p{margin:.35rem 0 0;color:var(--slate);font-size:.88rem}
	.eyebrow{margin:0 0 .45rem;color:var(--slate);font:600 .65rem var(--disp);letter-spacing:.14em}
	.panel{border:1px solid var(--line);border-radius:14px;background:var(--card);padding:1.15rem;margin-bottom:1rem;box-shadow:0 2px 8px #172b4d08}
	.section-heading{display:flex;align-items:center;justify-content:space-between;gap:1rem;margin-bottom:1rem}
	h2{margin:0;font:650 1.05rem var(--disp)}
	.form-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1rem}
	.filters{display:grid;grid-template-columns:minmax(15rem,2fr) minmax(13rem,1fr);gap:1rem;margin-bottom:1rem}
	.field{position:relative;display:grid;align-content:start;gap:.4rem;min-width:0}
	.field>span{font-size:.78rem;font-weight:600;color:var(--slate)}
	input,select{width:100%;min-height:40px;border:1px solid var(--line);border-radius:8px;padding:.55rem .7rem;background:var(--card);color:var(--ink);font:inherit}
	input:focus,select:focus{outline:2px solid var(--focus);outline-offset:1px}
	small{color:var(--slate);font-size:.72rem}
	.selected{color:var(--success)}
	.suggestions{position:absolute;z-index:5;top:100%;left:0;right:0;max-height:220px;overflow:auto;border:1px solid var(--line);border-radius:9px;background:var(--card);box-shadow:0 8px 24px #172b4d20}
	.suggestion{display:flex;gap:.6rem;width:100%;padding:.65rem .75rem;border:0;border-bottom:1px solid var(--line);background:transparent;color:var(--ink);text-align:left;cursor:pointer}
	.suggestion:hover{background:var(--surface)}
	.suggestion span{overflow:hidden;text-overflow:ellipsis}
	button{border:1px solid var(--line);border-radius:8px;padding:.55rem .8rem;background:var(--card);color:var(--ink);font:600 .82rem var(--disp);cursor:pointer}
	button:disabled{opacity:.55;cursor:not-allowed}
	.primary{background:var(--navy);border-color:var(--navy);color:white}
	.secondary{white-space:nowrap}
	.danger-button{color:var(--danger)}
	.alert{margin-bottom:1rem;padding:.75rem 1rem;border:1px solid color-mix(in srgb,var(--danger) 35%,transparent);border-radius:9px;color:var(--danger);background:color-mix(in srgb,var(--danger) 7%,var(--card));font-size:.85rem}
	.count{padding:.3rem .6rem;border-radius:999px;background:var(--surface);color:var(--slate);font-size:.75rem}
	.table-wrap{overflow:auto;border:1px solid var(--line);border-radius:10px}
	table{width:100%;border-collapse:collapse;white-space:nowrap;font-size:.84rem}
	th,td{padding:.75rem .85rem;border-bottom:1px solid var(--line);text-align:left}
	th{background:var(--surface);color:var(--slate);font:600 .68rem var(--disp);letter-spacing:.06em;text-transform:uppercase}
	tr:last-child td{border-bottom:0}
	.priority-input{width:5.5rem;min-height:34px}
	.empty{display:grid;justify-items:center;gap:.4rem;padding:2.4rem 1rem;text-align:center;color:var(--slate);font-size:.85rem}
	.empty p{margin:0;max-width:34rem}
	.footnote{margin:.75rem 0 0;color:var(--slate);font-size:.74rem}
	@media(max-width:900px){.form-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.filters{grid-template-columns:1fr}}
	@media(max-width:600px){.page{padding:0 .8rem 2rem}.panel{padding:.85rem}.form-grid{grid-template-columns:1fr}.section-heading{align-items:flex-start;flex-direction:column}.page-header{flex-direction:column}}
</style>
