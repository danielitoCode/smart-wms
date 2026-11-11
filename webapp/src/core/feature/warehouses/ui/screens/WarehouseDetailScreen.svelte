<script lang="ts">
	import { getContext } from 'svelte';
	import type { I18nState } from '../../../../../lib/i18n/i18n.svelte';
	const i18n = getContext<I18nState>('i18n');
	import { onDestroy, onMount } from 'svelte';
	import { createWarehouseDetailState } from '../state/warehouseDetailState.svelte';
	import type { Bin, BinType, Zone, ZoneType } from '../../domain/entity/Warehouse';

	let { warehouseId, showZones = true, showBins = true, includeBins = true, backHref = '/warehouses' }: { warehouseId: number; showZones?: boolean; showBins?: boolean; includeBins?: boolean; backHref?: string } = $props();
	// svelte-ignore state_referenced_locally
	const vm = createWarehouseDetailState(warehouseId, includeBins);

	type ZoneForm = { code: string; name: string; zoneType: ZoneType; active: boolean };
	type BinForm = { zoneId: number | null; code: string; barcode: string; binType: BinType; aisle: string; pickSequence: number; active: boolean };
	let showZoneForm = $state(false);
	let editingZone = $state(null as Zone | null);
	let deleteZoneTarget = $state(null as Zone | null);
	let zoneForm = $state({ code: '', name: '', zoneType: 'STORAGE', active: true } as ZoneForm);
	let showBinForm = $state(false);
	let editingBin = $state(null as Bin | null);
	let deleteBinTarget = $state(null as Bin | null);
	let binForm = $state({ zoneId: null, code: '', barcode: '', binType: 'Pickable', aisle: '', pickSequence: 0, active: true } as BinForm);
	let exporting = $state(false);
	let searchTimer: ReturnType<typeof setTimeout> | undefined;

	onMount(() => { void vm.load(); });
	function zoneTypeLabel(type: ZoneType): string {
		const labels: Record<ZoneType, string> = { RECEIVING: i18n.t('Recepción'), STORAGE: i18n.t('Almacenamiento'), PICKING: i18n.t('Preparación'), STAGING: i18n.t('Zona temporal'), SHIPPING: i18n.t('Despacho') };
		return i18n.t(labels[type]);
	}
	function binTypeLabel(type: BinType): string {
		const labels: Record<BinType, string> = { Staging: 'Temporal', PickableStaging: 'Temporal para preparación', Pickable: 'Disponible para preparación' };
		return i18n.t(labels[type]);
	}

	onDestroy(() => { if (searchTimer) clearTimeout(searchTimer); });

	function openCreateZone() {
		editingZone = null; zoneForm = { code: '', name: '', zoneType: 'STORAGE', active: true };
		vm.clearError(); showZoneForm = true;
	}
	function openEditZone(zone: Zone) {
		editingZone = zone; zoneForm = { code: zone.code, name: zone.name, zoneType: zone.zoneType, active: zone.active };
		vm.clearError(); showZoneForm = true;
	}
	async function saveZone(event: SubmitEvent) {
		event.preventDefault();
		const ok = editingZone
			? await vm.updateZone({ id: editingZone.id, code: zoneForm.code, name: zoneForm.name, zoneType: zoneForm.zoneType, active: zoneForm.active })
			: await vm.createZone({ code: zoneForm.code, name: zoneForm.name, zoneType: zoneForm.zoneType });
		if (ok) showZoneForm = false;
	}
	async function deleteZone() {
		if (deleteZoneTarget && await vm.removeZone(deleteZoneTarget.id) deleteZoneTarget = null;
	}
	function openCreateBin() {
		editingBin = null; binForm = { zoneId: vm.zones[0]?.id ?? null, code: '', barcode: '', binType: 'Pickable', aisle: '', pickSequence: 0, active: true };
		vm.clearError(); showBinForm = true;
	}
	function openEditBin(bin: Bin) {
		editingBin = bin; binForm = { zoneId: bin.zoneId, code: bin.code, barcode: bin.barcode ?? '', binType: bin.binType, aisle: bin.aisle ?? '', pickSequence: bin.pickSequence, active: bin.active };
		vm.clearError(); showBinForm = true;
	}
	async function saveBin(event: SubmitEvent) {
		event.preventDefault();
		if (binForm.zoneId == null) return;
		const ok = editingBin
			? await vm.updateBin({ id: editingBin.id, zoneId: binForm.zoneId, code: binForm.code, barcode: binForm.barcode, binType: binForm.binType, aisle: binForm.aisle || null, pickSequence: binForm.pickSequence, active: binForm.active })
			: await vm.createBin({ zoneId: binForm.zoneId, code: binForm.code, barcode: binForm.barcode, binType: binForm.binType, aisle: binForm.aisle || null, pickSequence: binForm.pickSequence });
		if (ok) showBinForm = false;
	}
	async function deleteBin() {
		if (deleteBinTarget && await vm.removeBin(deleteBinTarget.id) deleteBinTarget = null;
	}
	function onSearch(value: string) {
		if (searchTimer) clearTimeout(searchTimer);
		searchTimer = setTimeout(() => { void vm.searchBins(value); }, 250);
	}
	async function exportCsv() {
		exporting = true;
		try {
			const rows = await vm.exportAllBins();
			const columns = ['bin_code','bin_barcode','zone','warehouse_id','bin_type','aisle','pick_sequence','putaway_sequence','description'];
			const csvCell = (value: unknown) => {
				if (value == null) return '';
				const raw = String(value);
				return raw.includes(',') || raw.includes('"') || raw.includes(String.fromCharCode(10) ? '"' + raw.replace(/"/g, '""') + '"' : raw;
			};
			const csv = [columns.join(','), ...rows.map(bin => [bin.code,bin.barcode,bin.zoneName,bin.warehouseId,bin.binType,bin.aisle,bin.pickSequence,bin.putawaySequence,''].map(csvCell).join(',')].join('\r\n');
			const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' });
			const link = document.createElement('a'); link.href = url; link.download = 'ubicaciones_almacen' + warehouseId + '_' + new Date().toISOString().slice(0,10) + '.csv'; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
		} catch { vm.setError('No se pudo exportar el listado de ubicaciones.'); }
		finally { exporting = false; }
	}
</script>

<section class="page">
	<header><p class="back"><a href={backHref}>← Volver a datos maestros</a></p>
		{#if vm.warehouse}<h1>{vm.warehouse.name}</h1><p class="subtitle">{vm.warehouse.code} · {vm.warehouse.active ? i18n.t('Activo') : i18n.t('Inactivo')}</p>{#if vm.warehouse.address}<p class="subtitle">{vm.warehouse.address}</p>{/if}
		{:else}<h1>Almacén #{warehouseId}</h1>{/if}
	</header>
	{#if vm.loading && !vm.warehouse}<p class="status">{i18n.t('Cargando…')}</p>
	{:else if vm.error && !vm.warehouse}<p class="error" role="alert">{vm.error}</p><button type="button" onclick={() => vm.load()}>{i18n.t('Reintentar')}</button>
	{:else}
		{#if vm.error}<p class="error" role="alert">{vm.error}</p>{/if}
		{#if showZones}<section class="panel">
			<div class="section-header"><h2>{i18n.t('Zonas')}</h2><button class="quiet" type="button" onclick={openCreateZone}>{i18n.t('Nueva zona')}</button></div>
			{#if vm.zones.length === 0}<p class="status">{i18n.t('Sin zonas.')}</p>
			{:else}<div class="table-wrap"><table><thead><tr><th>{i18n.t('Código')}</th><th>{i18n.t('Nombre')}</th><th>{i18n.t('Tipo')}</th><th>{i18n.t('Estado')}</th><th>{i18n.t('Acciones')}</th></tr></thead><tbody>
				{#each vm.zones as zone (zone.id)}<tr class:selected={vm.selectedZoneId === zone.id}><td class="mono">{zone.code}</td><td>{zone.name}</td><td>{zoneTypeLabel(zone.zoneType)}</td><td>{zone.active ? i18n.t('Activo') : i18n.t('Inactivo')}</td>
					<td class="actions"><button class="quiet" type="button" onclick={() => vm.loadBinsForZone(zone.id,1)}>{i18n.t('Ubicaciones')}</button><button class="quiet" type="button" onclick={() => openEditZone(zone)}>{i18n.t('Editar')}</button><button class="danger" type="button" onclick={() => deleteZoneTarget = zone}>{i18n.t('Eliminar')}</button></td></tr>{/each}
			</tbody></table></div>
			{#if vm.selectedZoneId != null}<p class="filter-hint">Filtrando por zona #{vm.selectedZoneId} <button class="linkish" type="button" onclick={() => vm.loadBinsForZone(null,1)}>Quitar filtro</button></p>{/if}{/if}
		</section>{/if}
		{#if showBins}<section class="panel">
			<div class="section-header bin-heading"><h2>{i18n.t('Ubicaciones')}</h2><div class="bin-tools"><input aria-label="Buscar ubicaciones" placeholder={i18n.t('Buscar código o código de barras')} value={vm.binSearch} oninput={(e) => onSearch(e.currentTarget.value)} /><button class="quiet" type="button" onclick={exportCsv} disabled={exporting || vm.binTotal === 0}>{exporting ? i18n.t('Exportando…') : i18n.t('Exportar CSV')}</button><button class="accent" type="button" onclick={openCreateBin disabled={vm.zones.length === 0}>{i18n.t('Nueva ubicación')}</button></div></div>
			{#if vm.binsLoading}<p class="status">{i18n.t('Actualizando ubicaciones…')}</p>
			{:else if vm.bins.length === 0}<p class="status">{i18n.t('No hay ubicaciones para este filtro.')}</p>
			{:else}<div class="table-wrap"><table><thead><tr><th>{i18n.t('Código')}</th><th>{i18n.t('Código de barras')}</th><th>{i18n.t('Tipo')}</th><th>Zona</th><th>{i18n.t('Pasillo')}</th><th>{i18n.t('Orden de preparación')}</th><th>{i18n.t('Estado')}</th><th>{i18n.t('Acciones')}</th></tr></thead><tbody>
				{#each vm.bins as bin (bin.id)}<tr><td><button class="linkish mono" type="button" onclick={() => vm.viewBin(bin.id)}>{bin.code}</button></td><td class="mono">{bin.barcode ?? '—'}</td><td>{binTypeLabel(bin.binType)}</td><td>{bin.zoneName ?? bin.zoneId ?? '—'}</td><td>{bin.aisle ?? '—'}</td><td>{bin.pickSequence}</td><td>{bin.active ? i18n.t('Activo') : i18n.t('Inactivo')}</td><td class="actions"><button class="quiet" type="button" onclick={() => openEditBin(bin)}>{i18n.t('Editar')}</button><button class="danger" type="button" onclick={() => deleteBinTarget = bin}>{i18n.t('Eliminar')}</button></td></tr>{/each}
			</tbody></table></div>
			<div class="pagination"><span>{vm.binTotal} ubicaciones · página {vm.binPage} de {vm.binPages}</span><div><button type="button" disabled={vm.binPage <= 1 || vm.binsLoading} onclick={() => vm.loadBinsForZone(vm.selectedZoneId,vm.binPage - 1)}>Anterior</button><button type="button" disabled={vm.binPage >= vm.binPages || vm.binsLoading} onclick={() => vm.loadBinsForZone(vm.selectedZoneId,vm.binPage + 1)}>Siguiente</button></div></div>{/if}
		</section>{/if}
	{/if}
</section>

{#if showZoneForm}<div class="backdrop"><section class="dialog" role="dialog" aria-modal="true"><h2>{editingZone ? i18n.t('Editar zona') : i18n.t('Nueva zona')}</h2><form onsubmit={saveZone}>
	<label>{i18n.t('Código')}<input bind:value={zoneForm.code} maxlength="32" required disabled={vm.mutating} /></label><label>{i18n.t('Nombre')}<input bind:value={zoneForm.name} maxlength="128" required disabled={vm.mutating} /></label>
	<label>{i18n.t('Tipo')}<select bind:value={zoneForm.zoneType} disabled={vm.mutating}>{#each ['RECEIVING','STORAGE','PICKING','STAGING','SHIPPING'] as type}<option value={type}>{zoneTypeLabel(type as ZoneType)}</option>{/each}</select></label>
	{#if editingZone}<label class="check"><input type="checkbox" bind:checked={zoneForm.active} /> Activa</label>{/if}
	{#if vm.error}<p class="error" role="alert">{vm.error}</p>{/if}<footer><button class="quiet" type="button" onclick={() => showZoneForm = false}>{i18n.t('Cancelar')}</button><button class="accent" type="submit" disabled={vm.mutating}>{i18n.t('Guardar')}</button></footer>
</form></section></div>{/if}
{#if showBinForm}<div class="backdrop"><section class="dialog" role="dialog" aria-modal="true"><h2>{editingBin ? i18n.t('Editar ubicación') : i18n.t('Nueva ubicación')}</h2><form onsubmit={saveBin}>
	<label>{i18n.t('Código')}<input bind:value={binForm.code} maxlength="64" required disabled={vm.mutating} /></label><label>{i18n.t('Código de barras')}<input bind:value={binForm.barcode} maxlength="128" required disabled={vm.mutating} /></label>
	<label>{i18n.t('Tipo')}<select bind:value={binForm.binType} disabled={vm.mutating}>{#each ['Staging','PickableStaging','Pickable'] as type}<option value={type}>{binTypeLabel(type as BinType)}</option>{/each}</select></label>
	<label>Zona<select bind:value={binForm.zoneId} required disabled={vm.mutating}><option value={null}>{i18n.t('Seleccionar zona')}</option>{#each vm.zones as zone}<option value={zone.id}>{zone.code} — {zone.name}</option>{/each}</select></label>
	<label>{i18n.t('Pasillo')}<input bind:value={binForm.aisle} maxlength="32" disabled={vm.mutating} /></label><label>{i18n.t('Orden de preparación')}<input type="number" min="0" step="1" bind:value={binForm.pickSequence} disabled={vm.mutating} /></label>
	{#if editingBin}<label class="check"><input type="checkbox" bind:checked={binForm.active} /> Activo</label>{/if}
	{#if vm.error}<p class="error" role="alert">{vm.error}</p>{/if}<footer><button class="quiet" type="button" onclick={() => showBinForm = false}>{i18n.t('Cancelar')}</button><button class="primary" type="submit" disabled={vm.mutating || binForm.zoneId == null}>{i18n.t('Guardar')}</button></footer>
</form></section></div>{/if}
{#if deleteZoneTarget}<div class="backdrop"><section class="dialog" role="alertdialog" aria-modal="true"><h2>{i18n.t('Eliminar zona')}</h2><p>¿Eliminar <strong>{deleteZoneTarget.code} — {deleteZoneTarget.name}</strong>? El backend rechazará la operación si aún tiene ubicaciones asociadas.</p>{#if vm.error}<p class="error" role="alert">{vm.error}</p>{/if}<footer><button class="quiet" type="button" onclick={() => deleteZoneTarget = null}>{i18n.t('Cancelar')}</button><button class="danger" type="button" onclick={deleteZone} disabled={vm.mutating}>{i18n.t('Eliminar')}</button></footer></section></div>{/if}
{#if deleteBinTarget}<div class="backdrop"><section class="dialog" role="alertdialog" aria-modal="true"><h2>{i18n.t('Eliminar ubicación')}</h2><p>¿Eliminar <strong>{deleteBinTarget.code}</strong>? No puede tener existencias ni referencias de ubicaciones preferidas.</p>{#if vm.error}<p class="error" role="alert">{vm.error}</p>{/if}<footer><button class="quiet" type="button" onclick={() => deleteBinTarget = null}>{i18n.t('Cancelar')}</button><button class="danger" type="button" onclick={deleteBin} disabled={vm.mutating}>{i18n.t('Eliminar')}</button></footer></section></div>{/if}
{#if vm.selectedBinDetail}<div class="backdrop"><section class="dialog wide" role="dialog" aria-modal="true"><h2>Ubicación {vm.selectedBinDetail.bin.code}</h2>
	<dl><dt>{i18n.t('Código de barras')}</dt><dd>{vm.selectedBinDetail.bin.barcode ?? '—'}</dd><dt>{i18n.t('Tipo')}</dt><dd>{binTypeLabel(vm.selectedBinDetail.bin.binType)}</dd><dt>Zona</dt><dd>{vm.selectedBinDetail.bin.zoneName ?? '—'}</dd><dt>{i18n.t('Pasillo')}</dt><dd>{vm.selectedBinDetail.bin.aisle ?? '—'}</dd><dt>{i18n.t('Orden de preparación')}</dt><dd>{vm.selectedBinDetail.bin.pickSequence}</dd><dt>{i18n.t('Estado')}</dt><dd>{vm.selectedBinDetail.bin.active ? i18n.t('Activo') : i18n.t('Inactivo')}</dd></dl>
	<h3>{i18n.t('Inventario')}</h3>{#if vm.selectedBinDetail.inventory.length === 0}<p class="status">{i18n.t('Esta ubicación no tiene existencias.')}</p>{:else}<div class="table-wrap"><table><thead><tr><th>SKU</th><th>{i18n.t('Producto')}</th><th>{i18n.t('Disponible')}</th><th>{i18n.t('Asignado')}</th></tr></thead><tbody>{#each vm.selectedBinDetail.inventory as row (row.inventoryId)}<tr><td class="mono">{row.sku}</td><td>{row.itemName}</td><td>{row.quantityOnHand}</td><td>{row.quantityAllocated}</td></tr>{/each}</tbody></table></div>{/if}
	<footer><button class="quiet" type="button" onclick={() => vm.closeBinDetail()}>{i18n.t('Cerrar')}</button></footer></section></div>{/if}

<style>
	.page { max-width:70rem; margin:1.5rem auto; padding:0 1.25rem; font-family:var(--body); } .back { margin:0 0 .5rem; } .back a { color:var(--navy); text-decoration:none; font-size:.9rem; }
	h1 { margin:0 0 .25rem; font:700 1.75rem var(--disp); } h2 { margin:0; font:650 1.1rem var(--disp); color:var(--ink); } h3 { margin:1rem 0 .5rem; font:650 .95rem var(--disp); }
	.subtitle { margin:.15rem 0 0; color:var(--slate); font-size:.9rem; } .panel { margin-top:1.25rem; padding:1rem; border:1px solid var(--line); border-radius:var(--radius-card); background:var(--card); }
	.section-header { display:flex; align-items:center; justify-content:space-between; gap:.75rem; margin-bottom:.75rem; } .bin-tools { display:flex; flex-wrap:wrap; gap:.45rem; } .bin-tools input { min-width:14rem; padding:.45rem .6rem; border:1px solid var(--line); border-radius:var(--radius-field); font:inherit; }
	.table-wrap { overflow-x:auto; border:1px solid var(--line); border-radius:8px; background:var(--surface); } table { width:100%; border-collapse:collapse; font-size:.84rem; } th,td { text-align:left; padding:.58rem .7rem; border-bottom:1px solid var(--line); white-space:nowrap; } th { background:var(--surface-subtle,#f7fafc); color:var(--slate); font-size:.73rem; text-transform:uppercase; letter-spacing:.04em; } tr.selected { background:var(--surface-selected,#e0f2fe); }
	.mono { font-family:var(--mono); } .actions { display:flex; gap:.35rem; } .status { color:var(--slate); } .error { color:var(--danger); font-size:.88rem; } .filter-hint { margin:.55rem 0 0; color:var(--slate); font-size:.82rem; } .linkish { padding:0; border:0; background:none; color:var(--navy); cursor:pointer; font:inherit; }
	.primary,.quiet,.danger { padding:.42rem .7rem; border:1px solid var(--line); border-radius:7px; cursor:pointer; font:600 .82rem var(--body); } .primary { background:var(--navy); border-color:var(--navy); color:white; } .quiet { background:var(--card); color:var(--ink); } .danger { background:var(--surface); color:var(--danger); border-color:color-mix(in srgb,var(--danger) 35%,var(--line); } button:disabled { opacity:.55; cursor:not-allowed; }
	.pagination { display:flex; align-items:center; justify-content:space-between; gap:.75rem; margin-top:.75rem; color:var(--slate); font-size:.83rem; } .pagination div { display:flex; gap:.4rem; }
	.backdrop { position:fixed; inset:0; z-index:50; display:grid; place-items:center; padding:1rem; background:rgba(12,22,36,.48); } .dialog { width:min(100%,30rem); max-height:90vh; overflow:auto; padding:1.3rem; border:1px solid var(--line); border-radius:14px; background:var(--card); box-shadow:var(--shadow-2,0 20px 60px #0003); } .dialog.wide { width:min(100%,45rem); }
	form { display:flex; flex-direction:column; gap:.75rem; margin-top:1rem; } label { display:flex; flex-direction:column; gap:.25rem; color:var(--slate); font-size:.83rem; font-weight:600; } label input:not([type=checkbox]),label select { box-sizing:border-box; width:100%; padding:.55rem .65rem; border:1px solid var(--line); border-radius:var(--radius-field); color:var(--ink); background:var(--surface); font:400 .9rem var(--body); } .check { flex-direction:row; align-items:center; } footer { display:flex; justify-content:flex-end; gap:.45rem; margin-top:.8rem; } dl { display:grid; grid-template-columns:10rem 1fr; gap:.4rem .75rem; font-size:.85rem; } dt { color:var(--slate); } dd { margin:0; color:var(--ink); }
	@media(max-width:680px) { .section-header { align-items:flex-start; flex-direction:column; } .bin-heading { align-items:stretch; } .bin-tools { width:100%; } .bin-tools input { flex:1; min-width:10rem; } .actions { flex-wrap:wrap; } }
</style>
