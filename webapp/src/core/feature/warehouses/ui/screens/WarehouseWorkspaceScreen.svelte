<script lang="ts">
	import { onMount } from 'svelte';
	import WarehouseDetailScreen from './WarehouseDetailScreen.svelte';
	import { createWarehousesDependencies } from '../../di/warehouses.dependencies';
	import type { Warehouse } from '../../domain/entity/Warehouse';

	let { mode }: { mode: 'zones' | 'bins' } = $props();
	const deps = createWarehousesDependencies();
	let warehouses = $state<Warehouse[]>([]);
	let selectedId = $state<number | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);

	onMount(async () => {
		try {
			warehouses = await deps.listWarehouses.execute();
			selectedId = warehouses[0]?.id ?? null;
			if (warehouses.length === 0) error = 'No hay almacenes activos disponibles.';
		} catch (err) {
			error = err instanceof Error ? err.message : 'No se pudieron cargar los almacenes.';
		} finally {
			loading = false;
		}
	});
</script>

<section class="workspace">
	<header class="header"><div><p class="eyebrow">Datos maestros</p><h1>{mode === 'zones' ? 'Zonas' : 'Bins'}</h1></div>
		{#if warehouses.length > 0}<label>Almacén<select bind:value={selectedId}><option value={null}>Seleccionar…</option>{#each warehouses as wh}<option value={wh.id}>{wh.code} — {wh.name}</option>{/each}</select></label>{/if}
	</header>
	{#if loading}<p class="status">Cargando almacenes…</p>
	{:else if error}<p class="error" role="alert">{error}</p>
	{:else if selectedId != null}
		{#key selectedId}
			<WarehouseDetailScreen warehouseId={selectedId} showZones={mode === 'zones'} showBins={mode === 'bins'} includeBins={mode === 'bins'} />
		{/key}
	{/if}
</section>

<style>
	.workspace { padding-top:1rem; } .header { max-width:70rem; margin:0 auto; padding:0 1.25rem; display:flex; align-items:end; justify-content:space-between; gap:1rem; }
	.eyebrow { margin:0 0 .2rem; color:var(--navy); font-size:.7rem; font-weight:700; letter-spacing:.1em; text-transform:uppercase; }
	h1 { margin:0; font:700 1.6rem var(--disp); } label { display:flex; align-items:center; gap:.5rem; color:var(--slate); font-size:.84rem; font-weight:600; }
	select { min-width:15rem; padding:.5rem .6rem; border:1px solid var(--line); border-radius:var(--radius-field); background:var(--card); color:var(--ink); font:inherit; }
	.status,.error { max-width:70rem; margin:1.25rem auto; padding:0 1.25rem; color:var(--slate); } .error { color:var(--danger); }
	@media(max-width:600px) { .header { align-items:stretch; flex-direction:column; } select { width:100%; } }
</style>
