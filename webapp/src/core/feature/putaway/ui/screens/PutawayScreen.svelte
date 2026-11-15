<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import type { I18nState } from '../../../../../lib/i18n/i18n.svelte';
	import { createPutawayState } from '../state/putawayState.svelte';
	const i18n = getContext<I18nState>('i18n');
	const state = createPutawayState();
	onMount(() => { void state.load(); });
</script>
<section class="page">
	<header><h1>{i18n.t('Ubicación de productos')}</h1><p class="subtitle">{i18n.t('Traslada los productos recibidos a su ubicación definitiva.')}</p></header>
	<div class="toolbar">
		<label>{i18n.t('ID de almacén')}<input type="number" min="1" value={state.warehouseId} oninput={(e) => state.setWarehouseId(Number(e.currentTarget.value))} /></label>
		<button type="button" onclick={() => state.load()} disabled={state.loading}>{state.loading ? i18n.t('Cargando…') : i18n.t('Actualizar')}</button>
	</div>
	{#if state.error}<p class="status error" role="alert">{state.error}</p>{/if}
	{#if state.feedback}<p class="status ok" role="status">{state.feedback}</p>{/if}
	<section class="staging" aria-labelledby="staging-heading">
		<h2 id="staging-heading">{i18n.t('Resumen de staging')}</h2>
		{#if state.stagingBins.length === 0}<p class="muted">{i18n.t('No hay bins de staging configurados en este almacén.')}</p>
		{:else}<div class="bin-grid">
			{#each state.stagingBins as bin (bin.binId)}
				<article class="bin-card"><strong>{bin.binCode}</strong><span>{bin.skuCount} SKU · {bin.totalQuantity} {i18n.t('unidades')}</span>
					{#if bin.items.length}<ul>{#each bin.items as row (row.inventoryId)}<li>{row.sku}: {row.quantity}{#if row.lotNumber} · {row.lotNumber}{/if}</li>{/each}</ul>
					{:else}<span class="muted">{i18n.t('Vacío')}</span>{/if}
				</article>
			{/each}
		</div>{/if}
	</section>
	<section class="worklist"><h2>{i18n.t('Putaway pendiente')}</h2>
		{#if state.loading && state.items.length === 0}<p class="status">{i18n.t('Cargando…')}</p>
		{:else if state.items.length === 0}<p class="status">{i18n.t('No hay productos pendientes de ubicación.')}</p>
		{:else}<div class="table-wrap"><table><thead><tr>
			<th>{i18n.t('SKU')}</th><th>{i18n.t('Nombre')}</th><th>{i18n.t('Cantidad')}</th><th>{i18n.t('Desde')}</th><th>{i18n.t('Lote')}</th><th>{i18n.t('Ubicación sugerida')}</th><th>{i18n.t('Barcode destino')}</th><th>{i18n.t('Acciones')}</th>
		</tr></thead><tbody>
			{#each state.items as item (state.keyOf(item))}
				{@const k = state.keyOf(item)}
				<tr><td><strong>{item.sku}</strong></td><td>{item.itemName}</td><td>{item.quantity}</td><td>{item.binCode}<small>{item.binBarcode ?? ''}</small></td><td>{item.lotNumber ?? '—'}</td>
					<td>{#if item.suggestedBin}<strong>{item.suggestedBin.binCode}</strong><small>{item.suggestedBin.priority != null ? i18n.t('Prioridad') + ' ' + item.suggestedBin.priority : i18n.t('Ubicación predeterminada')}</small>{#if item.suggestedBin.zoneName}<small>{item.suggestedBin.zoneName}</small>{/if}
						{:else}<span class="no-suggestion">{i18n.t('Sin ubicación sugerida')}</span>{/if}
						<button class="secondary" type="button" onclick={() => state.suggest(item)} disabled={state.submittingKey === k}>{i18n.t('Sugerir destino')}</button>
					</td>
					<td><label class="scan-label"><span>{i18n.t('Escanear o introducir barcode')}</span><input type="text" autocomplete="off" placeholder={i18n.t('Barcode de ubicación')} value={state.toBarcodeByKey[k] ?? ''} oninput={(e) => state.setToBarcode(item, e.currentTarget.value)} disabled={state.submittingKey === k} /></label>
						<details><summary>{i18n.t('Usar ID de bin')}</summary><input type="number" min="1" aria-label={i18n.t('ID de ubicación destino')} value={state.toBinByKey[k] ?? ''} oninput={(e) => state.setToBin(item, e.currentTarget.value)} disabled={state.submittingKey === k} /></details>
					</td>
					<td class="actions"><button type="button" onclick={() => state.confirm(item)} disabled={state.submittingKey === k || state.loading}>{state.submittingKey === k ? i18n.t('Procesando…') : i18n.t('Confirmar putaway')}</button>
						{#if item.suggestedBin}<button class="secondary" type="button" onclick={() => state.updatePreferred(item)} disabled={state.submittingKey === k}>{i18n.t('Establecer como preferida')}</button>{/if}
					</td>
				</tr>
			{/each}
		</tbody></table></div>{/if}
	</section>
</section>
<style>
	.page { max-width:76rem; margin:1.5rem auto; padding:0 1.25rem; } header { margin-bottom:1rem; } h1 { margin:0 0 .25rem; font-size:1.75rem; } h2 { margin:1.25rem 0 .75rem; font-size:1.15rem; } .subtitle,.muted { color:#64748b; }
	.toolbar { display:flex; flex-wrap:wrap; gap:.75rem; align-items:end; margin-bottom:1rem; } label { display:flex; flex-direction:column; gap:.25rem; font-size:.85rem; color:#475569; } input { box-sizing:border-box; width:100%; min-width:8rem; padding:.45rem .55rem; border:1px solid #cbd5e1; border-radius:6px; }
	button { padding:.45rem .75rem; border:1px solid #0f172a; border-radius:6px; background:#0f172a; color:white; cursor:pointer; white-space:nowrap; } button:disabled { opacity:.55; cursor:not-allowed; } button.secondary { margin-top:.35rem; background:white; color:#334155; border-color:#cbd5e1; }
	.status { color:#475569; } .status.error { color:#b91c1c; } .status.ok { color:#166534; } .bin-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(13rem,1fr)); gap:.65rem; } .bin-card { display:flex; flex-direction:column; gap:.25rem; border:1px solid #e2e8f0; border-radius:8px; padding:.8rem; background:white; } .bin-card ul { margin:.25rem 0 0; padding-left:1.1rem; font-size:.82rem; color:#475569; }
	.table-wrap { overflow-x:auto; border:1px solid #e2e8f0; border-radius:8px; background:white; } table { width:100%; border-collapse:collapse; font-size:.88rem; } th,td { text-align:left; vertical-align:top; padding:.65rem .7rem; border-bottom:1px solid #e2e8f0; } th { background:#f8fafc; font-weight:600; white-space:nowrap; } td small { display:block; margin-top:.2rem; color:#64748b; } .scan-label { min-width:10rem; } .scan-label span { font-size:.78rem; } details { margin-top:.4rem; font-size:.8rem; color:#64748b; } .actions { display:flex; flex-direction:column; align-items:flex-start; gap:.3rem; } .no-suggestion { color:#b45309; }
	@media(max-width:700px) { .page { padding:0 .75rem; } th,td { padding:.5rem; } }
</style>
