<script lang="ts">
	import UiStatePanel from '#lib/components/UiStatePanel.svelte';
	import { getContext } from 'svelte';
	import type { I18nState } from '#lib/i18n/i18n.svelte.ts';
	import WarehouseDetailScreen from './WarehouseDetailScreen.svelte';
	import type { WarehouseSelectionState } from '../state/warehouseSelectionState.svelte';

	const i18n = getContext<I18nState>('i18n');
	let { mode, initialZoneId = null }: { mode: 'zones' | 'bins'; initialZoneId?: number | null } = $props();
	const selection = getContext<WarehouseSelectionState>('warehouseSelection');
</script>

<section class="workspace">
	<header class="header"><div><p class="eyebrow">{i18n.t('Datos maestros')}</p><h1>{mode === 'zones' ? i18n.t('Zonas') : i18n.t('Ubicaciones')}</h1></div>
		{#if selection.canSelect && selection.warehouses.length > 0}
			<label>{i18n.t('Almacén')}<select value={selection.warehouseId ?? ''} onchange={(e) => selection.select(Number(e.currentTarget.value))}>
				{#each selection.warehouses as wh}<option value={wh.id}>{wh.code} — {wh.name}</option>{/each}
			</select></label>
		{:else if selection.warehouseId != null}
			<p class="selected">{i18n.t('Almacén seleccionado:')} #{selection.warehouseId}</p>
		{/if}
	</header>
	{#if selection.loading || !selection.initialized}<UiStatePanel kind="loading" title={i18n.t('Validando almacén')} message={i18n.t('Estamos comprobando el contexto operativo seleccionado.')} />
	{:else if selection.error && selection.warehouseId == null}<UiStatePanel kind="error" title={i18n.t('No se pudo validar el almacén')} message={selection.error ?? ''} />
	{:else if selection.warehouseId == null}<UiStatePanel kind="forbidden" title={i18n.t('Almacén no disponible')} message={i18n.t('No hay un almacén activo asignado para este usuario.')} />
	{:else}
		{#key mode + ':' + selection.warehouseId + ':' + (mode === 'bins' ? initialZoneId ?? '' : '')}
			<WarehouseDetailScreen warehouseId={selection.warehouseId} showZones={mode === 'zones'} showBins={mode === 'bins'} includeBins={mode === 'bins'} initialZoneId={mode === 'bins' ? initialZoneId : null} backHref={mode === 'zones' ? '/data/zones' : '/data/bins'} />
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
