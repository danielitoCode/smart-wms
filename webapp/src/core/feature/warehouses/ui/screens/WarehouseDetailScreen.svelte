<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { createWarehouseDetailState } from '../state/warehouseDetailState.svelte';
	import type { Bin, BinType, Zone, ZoneType } from '../../domain/entity/Warehouse';

	let { warehouseId }: { warehouseId: number } = $props();
	// svelte-ignore state_referenced_locally
	const state = createWarehouseDetailState(warehouseId);

	let showZoneForm = $state(false);
	let editingZone = $state<Zone | null>(null);
	let deleteZoneTarget = $state<Zone | null>(null);
	let zoneForm = $state<{ code: string; name: string; zoneType: ZoneType; active: boolean }>({
		code: '', name: '', zoneType: 'STORAGE', active: true
	});
	let showBinForm = $state(false);
	let editingBin = $state<Bin | null>(null);
	let deleteBinTarget = $state<Bin | null>(null);
	let binForm = $state<{ zoneId: number | null; code: string; barcode: string; binType: BinType; aisle: string; pickSequence: number; active: boolean }>({
		zoneId: null, code: '', barcode: '', binType: 'Pickable', aisle: '', pickSequence: 0, active: true
	});
	let exporting = $state(false);
	let searchTimer: ReturnType<typeof setTimeout> | undefined;

	onMount(() => { void state.load(); });
	onDestroy(() => { if (searchTimer) clearTimeout(searchTimer); });

	function openCreateZone() {
		editingZone = null;
		zoneForm = { code: '', name: '', zoneType: 'STORAGE', active: true };
		state.clearError();
		showZoneForm = true;
	}
	function openEditZone(zone: Zone) {
		editingZone = zone;
		zoneForm = { code: zone.code, name: zone.name, zoneType: zone.zoneType, active: zone.active };
		state.clearError();
		showZoneForm = true;
	}
	async function saveZone(event: SubmitEvent) {
		event.preventDefault();
		const ok = editingZone
			? await state.updateZone({ id: editingZone.id, code: zoneForm.code, name: zoneForm.name, zoneType: zoneForm.zoneType, active: zoneForm.active })
			: await state.createZone({ code: zoneForm.code, name: zoneForm.name, zoneType: zoneForm.zoneType });
		if (ok) showZoneForm = false;
	}
	async function deleteZone() {
		if (deleteZoneTarget && await state.removeZone(deleteZoneTarget.id)) deleteZoneTarget = null;
	}
	function openCreateBin() {
		editingBin = null;
		binForm = { zoneId: state.zones[0]?.id ?? null, code: '', barcode: '', binType: 'Pickable', aisle: '', pickSequence: 0, active: true };
		state.clearError();
		showBinForm = true;
	}
	function openEditBin(bin: Bin) {
		editingBin = bin;
		binForm = { zoneId: bin.zoneId, code: bin.code, barcode: bin.barcode ?? '', binType: bin.binType, aisle: bin.aisle ?? '', pickSequence: bin.pickSequence, active: bin.active };
		state.clearError();
		showBinForm = true;
	}
	async function saveBin(event: SubmitEvent) {
		event.preventDefault();
		if (binForm.zoneId == null) return;
		const ok = editingBin
			? await state.updateBin({ id: editingBin.id, zoneId: binForm.zoneId, code: binForm.code, barcode: binForm.barcode, binType: binForm.binType, aisle: binForm.aisle || null, pickSequence: binForm.pickSequence, active: binForm.active })
			: await state.createBin({ zoneId: binForm.zoneId, code: binForm.code, barcode: binForm.barcode, binType: binForm.binType, aisle: binForm.aisle || null, pickSequence: binForm.pickSequence });
		if (ok) showBinForm = false;
	}
	async function deleteBin() {
		if (deleteBinTarget && await state.removeBin(deleteBinTarget.id)) deleteBinTarget = null;
	}
	function onSearch(value: string) {
		if (searchTimer) clearTimeout(searchTimer);
		searchTimer = setTimeout(() => { void state.searchBins(value); }, 250);
	}
	async function exportCsv() {
		exporting = true;
		try {
			const rows = await state.exportAllBins();
			const columns = ['bin_code','bin_barcode','bin_type','zone_name','aisle','pick_sequence','is_active'];
			const csvCell = (value: unknown) => '"' + String(value ?? '').replace(/"/g, '""') + '"';
			const csv = [columns.join(','), ...rows.map(bin => [
				bin.code, bin.barcode, bin.binType, bin.zoneName, bin.aisle, bin.pickSequence, bin.active
			].map(csvCell).join(','))].join('\r\n');
			const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
			const link = document.createElement('a');
			link.href = url; link.download = 'bins.csv'; link.click(); URL.revokeObjectURL(url);
		} catch {
			state.clearError();
		} finally {
			exporting = false;
		}
	}
</script>

<section class="page">
	<header>
		<p class="back"><a href="/warehouses">← Almacenes</a></p>
		{#if state.warehouse}
			<h1>{state.warehouse.name}</h1>
			<p class="subtitle">{state.warehouse.code} · {state.warehouse.active ? 'Activo' : 'Inactivo'}</p>
			{#if state.warehouse.address}<p class="subtitle">{state.warehouse.address}</p>{/if}
		{:else}<h1>Almacén #{warehouseId}</h1>{/if}
	</header>
	{#if state.loading && !state.warehouse}
		<p class="status">Cargando…</p>
	{:else if state.error && !state.warehouse}
		<p class="error" role="alert">{state.error}</p><button type="button" onclick={() => state.load()}>Reintentar</button>
	{:else}
		{#if state.error}<p class="error" role="alert">{state.error}</p>{/if}
		<section class="panel">
			<div class="section-header"><h2>Zonas</h2><button class="primary" type="button" onclick={openCreateZone}>Nueva zona</button></div>
			{#if state.zones.length === 0}<p class="status">Sin zonas.</p>
			{:else}
				<div class="table-wrap"><table>
					<thead><tr><th>Código</th><th>Nombre</th><th>Tipo</th><th>Estado</th><th>Acciones</th></tr></thead>
					<tbody>{#each state.zones as zone (zone.id)}
						<tr class:selected={state.selectedZoneId === zone.id}>
							<td class="mono">{zone.code}</td><td>{zone.name}</td><td>{zone.zoneType}</td><td>{zone.active ? 'Activo' : 'Inactivo'}</td>
							<td class="actions"><button class="quiet" type="button" onclick={() => state.loadBinsForZone(zone.id, 1)}>Bins</button><button class="quiet" type="button" onclick={() => openEditZone(zone)}>Editar</button><button class="danger" type="button" onclick={() => deleteZoneTarget = zone}>Eliminar</button></td>
						</tr>
					{/each}</tbody>
				</table></div>
				{#if state.selectedZoneId != null}<p class="filter-hint">Filtrando por zona #{state.selectedZoneId} <button class="linkish" type="button" onclick={() => state.loadBinsForZone(null, 1)}>Quitar filtro</button></p>{/if}
			{/if}
		</section>
		<section class="panel">
			<div class="section-header bin-heading"><h2>Bins</h2><div class="bin-tools"><input aria-label="Buscar bins" placeholder="Buscar código o barcode" value={state.binSearch} oninput={(e) => onSearch(e.currentTarget.value)} /><button class="quiet" type="button" onclick={exportCsv} disabled={exporting || state.binTotal === 0}>{exporting ? 'Exportando…' : 'Exportar CSV'}</button><button class="primary" type="button" onclick={openCreateBin} disabled={state.zones.length === 0}>Nuevo bin</button></div></div>
			{#if state.binsLoading}<p class="status">Actualizando bins…</p>
			{:else if state.bins.length === 0}<p class="status">Sin bins para este filtro.</p>
			{:else}
				<div class="table-wrap"><table>
					<thead><tr><th>Código</th><th>Barcode</th><th>Tipo</th><th>Zona</th><th>Pasillo</th><th>Sec. picking</th><th>Estado</th><th>Acciones</th></tr></thead>
					<tbody>{#each state.bins as bin (bin.id)}
						<tr><td><button class="linkish mono" type="button" onclick={() => state.viewBin(bin.id)}>{bin.code}</button></td><td class="mono">{bin.barcode ?? '—'}</td><td>{bin.binType}</td><td>{bin.zoneName ?? bin.zoneId ?? '—'}</td><td>{bin.aisle ?? '—'}</td><td>{bin.pickSequence}</td><td>{bin.active ? 'Activo' : 'Inactivo'}</td><td class="actions"><button class="quiet" type="button" onclick={() => openEditBin(bin)}>Editar</button><button class="danger" type="button" onclick={() => deleteBinTarget = bin}>Eliminar</button></td></tr>
					{/each}</tbody>
				</table></div>
				<div class="pagination"><span>{state.binTotal} bins · página {state.binPage} de {state.binPages}</span><div><button type="button" disabled={state.binPage <= 1 || state.binsLoading} onclick={() => state.loadBinsForZone(state.selectedZoneId, state.binPage - 1)}>Anterior</button><button type="button" disabled={state.binPage >= state.binPages || state.binsLoading} onclick={() => state.loadBinsForZone(state.selectedZoneId, state.binPage + 1)}>Siguiente</button></div></div>
			{/if}
		</section>
	{/if}
</section>

{#if showZoneForm}
	<div class="backdrop"><section class="dialog" role="dialog" aria-modal="true"><h2>{editingZone ? 'Editar zona' : 'Nueva zona'}</h2>
		<form onsubmit={saveZone}>
			<label>Código<input bind:value={zoneForm.code} maxlength="32" required disabled={state.mutating} /></label>
			<label>Nombre<input bind:value={zoneForm.name} maxlength="128" required disabled={state.mutating} /></label>
			<label>Tipo<select bind:value={zoneForm.zoneType} disabled={state.mutating}>{#each ['RECEIVING','STORAGE','PICKING','STAGING','SHIPPING'] as type}<option value={type}>{type}</option>{/each}</select></label>
			{#if editingZone}<label class="check"><input type="checkbox" bind:checked={zoneForm.active} /> Activa</label>{/if}
			{#if state.error}<p class="error" role="alert">{state.error}</p>{/if}
			<footer><button class="quiet" type="button" onclick={() => showZoneForm = false}>Cancelar</button><button class="primary" type="submit" disabled={state.mutating}>Guardar</button></footer>
		</form>
	</section></div>
{/if}

{#if showBinForm}
	<div class="backdrop"><section class="dialog" role="dialog" aria-modal="true"><h2>{editingBin ? 'Editar bin' : 'Nuevo bin'}</h2>
		<form onsubmit={saveBin}>
			<label>Código<input bind:value={binForm.code} maxlength="64" required disabled={state.mutating} /></label>
			<label>Barcode<input bind:value={binForm.barcode} maxlength="128" required disabled={state.mutating} /></label>
			<label>Tipo<select bind:value={binForm.binType} disabled={state.mutating}>{#each ['Staging','PickableStaging','Pickable'] as type}<option value={type}>{type}</option>{/each}</select></label>
			<label>Zona<select bind:value={binForm.zoneId} required disabled={state.mutating}><option value={null}>Seleccionar zona</option>{#each state.zones as zone}<option value={zone.id}>{zone.code} — {zone.name}</option>{/each}</select></label>
			<label>Pasillo<input bind:value={binForm.aisle} maxlength="32" disabled={state.mutating} /></label>
			<label>Secuencia de picking<input type="number" min="0" step="1" bind:value={binForm.pickSequence} disabled={state.mutating} /></label>
			{#if editingBin}<label class="check"><input type="checkbox" bind:checked={binForm.active} /> Activo</label>{/if}
			{#if state.error}<p class="error" role="alert">{state.error}</p>{/if}
			<footer><button class="quiet" type="button" onclick={() => showBinForm = false}>Cancelar</button><button class="primary" type="submit" disabled={state.mutating || binForm.zoneId == null}>Guardar</button></footer>
		</form>
	</section></div>
{/if}

{#if deleteZoneTarget}
	<div class="backdrop"><section class="dialog" role="alertdialog" aria-modal="true"><h2>Eliminar zona</h2><p>¿Eliminar la zona <strong>{deleteZoneTarget.code} — {deleteZoneTarget.name}</strong>? El backend rechazará la operación si aún tiene bins asociados.</p>{#if state.error}<p class="error" role="alert">{state.error}</p>{/if}<footer><button class="quiet" type="button" onclick={() => deleteZoneTarget = null}>Cancelar</button><button class="danger" type="button" onclick={deleteZone} disabled={state.mutating}>Eliminar</button></footer></section></div>
{/if}
{#if deleteBinTarget}
	<div class="backdrop"><section class="dialog" role="alertdialog" aria-modal="true"><h2>Eliminar bin</h2><p>¿Eliminar el bin <strong>{deleteBinTarget.code}</strong>? No puede tener existencias ni referencias de bins preferidos.</p>{#if state.error}<p class="error" role="alert">{state.error}</p>{/if}<footer><button class="quiet" type="button" onclick={() => deleteBinTarget = null}>Cancelar</button><button class="danger" type="button" onclick={deleteBin} disabled={state.mutating}>Eliminar</button></footer></section></div>
{/if}
{#if state.selectedBinDetail}
	<div class="backdrop"><section class="dialog wide" role="dialog" aria-modal="true"><h2>Bin {state.selectedBinDetail.bin.code}</h2>
		<dl><dt>Barcode</dt><dd>{state.selectedBinDetail.bin.barcode ?? '—'}</dd><dt>Tipo</dt><dd>{state.selectedBinDetail.bin.binType}</dd><dt>Zona</dt><dd>{state.selectedBinDetail.bin.zoneName ?? '—'}</dd><dt>Pasillo</dt><dd>{state.selectedBinDetail.bin.aisle ?? '—'}</dd><dt>Secuencia picking</dt><dd>{state.selectedBinDetail.bin.pickSequence}</dd><dt>Estado</dt><dd>{state.selectedBinDetail.bin.active ? 'Activo' : 'Inactivo'}</dd></dl>
		<h3>Inventario</h3>
		{#if state.selectedBinDetail.inventory.length === 0}<p class="status">Sin inventario en este bin.</p>{:else}<div class="table-wrap"><table><thead><tr><th>SKU</th><th>Producto</th><th>Disponible</th><th>Asignado</th></tr></thead><tbody>{#each state.selectedBinDetail.inventory as row (row.inventoryId)}<tr><td class="mono">{row.sku}</td><td>{row.itemName}</td><td>{row.quantityOnHand}</td><td>{row.quantityAllocated}</td></tr>{/each}</tbody></table></div>{/if}
		<footer><button class="quiet" type="button" onclick={() => state.closeBinDetail()}>Cerrar</button></footer>
	</section></div>
{/if}

<style>
	.page { max-width:70rem; margin:1.5rem auto; padding:0 1.25rem; font-family:var(--body); }
	.back { margin:0 0 .5rem; } .back a { color:var(--navy); text-decoration:none; font-size:.9rem; }
	h1 { margin:0 0 .25rem; font:700 1.75rem var(--disp); } h2 { margin:0; font:650 1.1rem var(--disp); color:var(--ink); } h3 { margin:1rem 0 .5rem; font:650 .95rem var(--disp); }
	.subtitle { margin:.15rem 0 0; color:var(--slate); font-size:.9rem; }
	.panel { margin-top:1.25rem; padding:1rem; border:1px solid var(--line); border-radius:var(--radius-card); background:var(--card); }
	.section-header { display:flex; align-items:center; justify-content:space-between; gap:.75rem; margin-bottom:.75rem; } .bin-tools { display:flex; flex-wrap:wrap; gap:.45rem; } .bin-tools input { min-width:14rem; padding:.45rem .6rem; border:1px solid var(--line); border-radius:var(--radius-field); font:inherit; }
	.table-wrap { overflow-x:auto; border:1px solid var(--line); border-radius:8px; background:#fff; } table { width:100%; border-collapse:collapse; font-size:.84rem; } th,td { text-align:left; padding:.58rem .7rem; border-bottom:1px solid var(--line); white-space:nowrap; } th { background:var(--surface-subtle,#f7fafc); color:var(--slate); font-size:.73rem; text-transform:uppercase; letter-spacing:.04em; } tr.selected { background:var(--surface-selected,#e0f2fe); }
	.mono { font-family:var(--mono); } .actions { display:flex; gap:.35rem; } .status { color:var(--slate); } .error { color:var(--danger); font-size:.88rem; } .filter-hint { margin:.55rem 0 0; color:var(--slate); font-size:.82rem; } .linkish { padding:0; border:0; background:none; color:var(--navy); cursor:pointer; font:inherit; }
	.primary,.quiet,.danger { padding:.42rem .7rem; border:1px solid var(--line); border-radius:7px; cursor:pointer; font:600 .82rem var(--body); } .primary { background:var(--navy); border-color:var(--navy); color:white; } .quiet { background:var(--card); color:var(--ink); } .danger { background:#fff; color:var(--danger); border-color:color-mix(in srgb,var(--danger) 35%,var(--line)); } button:disabled { opacity:.55; cursor:not-allowed; }
	.pagination { display:flex; align-items:center; justify-content:space-between; gap:.75rem; margin-top:.75rem; color:var(--slate); font-size:.83rem; } .pagination div { display:flex; gap:.4rem; }
	.backdrop { position:fixed; inset:0; z-index:50; display:grid; place-items:center; padding:1rem; background:rgba(12,22,36,.48); } .dialog { width:min(100%,30rem); max-height:90vh; overflow:auto; padding:1.3rem; border:1px solid var(--line); border-radius:14px; background:var(--card); box-shadow:var(--shadow-2,0 20px 60px #0003); } .dialog.wide { width:min(100%,45rem); }
	form { display:flex; flex-direction:column; gap:.75rem; margin-top:1rem; } label { display:flex; flex-direction:column; gap:.25rem; color:var(--slate); font-size:.83rem; font-weight:600; } label input:not([type=checkbox]),label select { box-sizing:border-box; width:100%; padding:.55rem .65rem; border:1px solid var(--line); border-radius:var(--radius-field); color:var(--ink); background:#fff; font:400 .9rem var(--body); } .check { flex-direction:row; align-items:center; } footer { display:flex; justify-content:flex-end; gap:.45rem; margin-top:.8rem; } dl { display:grid; grid-template-columns:10rem 1fr; gap:.4rem .75rem; font-size:.85rem; } dt { color:var(--slate); } dd { margin:0; color:var(--ink); }
	@media(max-width:680px) { .section-header { align-items:flex-start; flex-direction:column; } .bin-heading { align-items:stretch; } .bin-tools { width:100%; } .bin-tools input { flex:1; min-width:10rem; } .actions { flex-wrap:wrap; } }
</style>
