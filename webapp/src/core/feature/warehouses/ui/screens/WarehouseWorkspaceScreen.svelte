<script lang="ts">
	import WarehouseDetailScreen from './WarehouseDetailScreen.svelte';
	import { createWarehouseSelectionState } from '../state/warehouseSelectionState.svelte';

	let { mode }: { mode: 'zones' | 'bins' } = $props();
	const selection = createWarehouseSelectionState();
</script>

<section class="workspace">
	<header class="header"><div><p class="eyebrow">Datos maestros</p><h1>{mode === 'zones' ? 'Zonas' : 'Bins'}</h1></div>
		{#if selection.canSelect && selection.warehouses.length > 0}
			<label>Almacén<select value={selection.warehouseId ?? ''} onchange={(e) => selection.select(Number(e.currentTarget.value))}>
				{#each selection.warehouses as wh}<option value={wh.id}>{wh.code} — {wh.name}</option>{/each}
			</select></label>
		{:else if selection.warehouseId != null}
			<p class="selected">Almacén seleccionado: #{selection.warehouseId}</p>
		{/if}
	</header>
	{#if selection.loading || !selection.initialized}<p class="status">Cargando almacén seleccionado…</p>
	{:else if selection.error && selection.warehouseId == null}<p class="error" role="alert">{selection.error}</p>
	{:else if selection.warehouseId == null}<p class="error" role="alert">No hay un almacén seleccionado. Un usuario con permiso de Almacenes debe establecer la selección primero.</p>
	{:else}
		{#key selection.warehouseId}
			<WarehouseDetailScreen warehouseId={selection.warehouseId} showZones={mode === 'zones'} showBins={mode === 'bins'} includeBins={mode === 'bins'} backHref={mode === 'zones' ? '/data/zones' : '/data/bins'} />
		{/key}
	{/if}
</section>

<style>
	.workspace { padding-top:1rem; } .header { max-width:70rem; margin:0 auto; padding:0 1.25rem; display:flex; align-items:end; justify-content:space-between; gap:1rem; }
	.eyebrow { margin:0 0 .2rem; color:var(--navy); font-size:.7rem; font-weight:700; letter-spacing:.1em; text-transform:uppercase; }
	h1 { margin:0; font:700 1.6rem var(--disp); } label { display:flex; align-items:center; gap:.5rem; color:var(--slate); font-size:.84rem; font-weight:600; }
	select { min-width:15rem; padding:.5rem .6rem; border:1px solid var(--line); border-radius:var(--radius-field); background:var(--card); color:var(--ink); font:inherit; }
	.status,.error { max-width:70rem; margin:1.25rem auto; padding:0 1.25rem; color:var(--slate); } .error { color:var(--danger); } .selected { margin:0; color:var(--slate); font-size:.85rem; }
	@media(max-width:600px) { .header { align-items:stretch; flex-direction:column; } select { width:100%; } }
</style>
