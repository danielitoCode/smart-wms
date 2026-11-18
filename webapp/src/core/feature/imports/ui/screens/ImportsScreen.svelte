<script lang="ts">
	import { getContext } from 'svelte';
	import type { I18nState } from '#lib/i18n/i18n.svelte';
	import { createImportsState } from '../state/importsState.svelte';
	import type { CsvImportType } from '../../domain/entity/CsvImport';
	import { IMPORT_PREVIEW_ROWS } from '../../domain/entity/CsvImport';

	const i18n = getContext<I18nState>('i18n');
	const vm = createImportsState();
	let fileInput: HTMLInputElement | null = $state(null);

	async function onFileChange(event: Event) {
		const file = (event.currentTarget as HTMLInputElement).files?.[0];
		if (file) await vm.prepareFile(file);
	}

	function downloadTemplate() {
		const templates: Record<CsvImportType, string> = {
			items: 'sku,name,description,category,upc,default_bin,weight,quantity\nWIDGET-001,Blue Widget,Standard blue widget,Widgets,012345678901,A-01-01-01,0.50,100',
			bins: 'bin_code,bin_barcode,zone,warehouse_id,aisle,bin_type,pick_sequence,putaway_sequence,description\nC-01-01-01,C-01-01-01,STORAGE,1,C,Pickable,100,100,Shelf C Row 1 Level 1',
			'purchase-orders': 'po_number,warehouse_id,vendor,sku,quantity,expected_date\nPO-1001,1,Acme Supply Co,WIDGET-001,100,2026-05-01',
			'sales-orders': 'so_number,warehouse_id,customer,customer_phone,customer_address,sku,quantity\nSO-5001,1,John Smith,555-0101,123 Main St,WIDGET-001,2',
			'inventory-adjustments': 'sku,warehouse,bin,qty,memo\nWIDGET-001,WH-01,PICK-01,5,Found stock during cycle count'
		};
		const blob = new Blob([templates[vm.importType]], { type: 'text/csv;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement('a');
		anchor.href = url;
		anchor.download = `import-${vm.importType}.csv`;
		anchor.click();
		URL.revokeObjectURL(url);
	}

	function downloadErrorReport() {
		if (!vm.result?.errors.length) return;
		const quote = (value: string) => `"${value.replaceAll('"', '""')}"`;
		const csv = ['row,error', ...vm.result.errors.map((item) => `${item.row},${quote(item.message)}`)].join('\n');
		const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
		const anchor = document.createElement('a');
		anchor.href = url;
		anchor.download = `import-errors-${vm.importType}.csv`;
		anchor.click();
		URL.revokeObjectURL(url);
	}
</script>

<section class="page">
	<header>
		<div>
			<p class="eyebrow">ABELLIS · SMART WMS</p>
			<h1>{i18n.t('Importaciones')}</h1>
			<p>{i18n.t('Importa datos desde archivos CSV o JSON y revisa el resultado de cada fila.')}</p>
		</div>
	</header>

	{#if vm.error}<p class="error" role="alert">{vm.error}</p>{/if}

	<section class="panel">
		<label>{i18n.t('Tipo de importación')}
			<select value={vm.importType} onchange={(event) => vm.setImportType(event.currentTarget.value as CsvImportType)}>
				{#each vm.types as type}
					<option value={type.value}>{i18n.t(type.label)} — {i18n.t(type.description)}</option>
				{/each}
			</select>
		</label>
		<p class="hint">{i18n.t('Cada tipo utiliza un contrato y unas columnas diferentes. Descarga la plantilla correspondiente antes de preparar el archivo.')}</p>
		<div class="actions">
			<button class="secondary" type="button" onclick={downloadTemplate}>{i18n.t('Descargar plantilla CSV')}</button>
		</div>
		<label>{i18n.t('Archivo CSV o JSON')}
			<input type="file" accept=".csv,.json,text/csv,application/json" bind:this={fileInput} onchange={onFileChange} />
		</label>
		{#if vm.source}
			<p class="file-meta">{vm.source.name} · {(vm.source.size / 1024).toFixed(1)} KB · {vm.records.length} {i18n.t('registros preparados')}</p>
		{/if}
	</section>

	{#if vm.records.length}
		<section class="panel">
			<div class="section-heading">
				<div><h2>{i18n.t('Vista previa')}</h2><p class="hint">{i18n.t('Primeras')} {Math.min(vm.records.length, IMPORT_PREVIEW_ROWS)} {i18n.t('filas de')} {vm.records.length}. {i18n.t('La validación definitiva ocurre al enviar al servidor.')}</p></div>
				<button class="primary" type="button" disabled={vm.importing} onclick={() => void vm.executeImport()}>{vm.importing ? i18n.t('Importando…') : i18n.t('Ejecutar importación')}</button>
			</div>
			<div class="table-wrap">
				<table>
					<thead><tr><th>#</th>{#each Object.keys(vm.records[0]) as header}<th>{header}</th>{/each}</tr></thead>
					<tbody>
						{#each vm.records.slice(0, IMPORT_PREVIEW_ROWS) as record, index}
							<tr><td>{index + 1}</td>{#each Object.keys(vm.records[0]) as header}<td>{String(record[header] ?? '')}</td>{/each}</tr>
						{/each}
					</tbody>
				</table>
			</div>
			{#if vm.records.length > IMPORT_PREVIEW_ROWS}<p class="hint">{i18n.t('La vista previa está limitada; todas las filas se enviarán al ejecutar.')}</p>{/if}
		</section>
	{/if}

	{#if vm.result}
		<section class="panel result" aria-live="polite">
			<h2>{i18n.t('Resultado de la importación')}</h2>
			<div class="metrics">
				<div><strong>{vm.result.total}</strong><span>{i18n.t('Procesadas')}</span></div>
				<div><strong>{vm.result.imported}</strong><span>{i18n.t('Importadas')}</span></div>
				<div><strong>{vm.result.skipped}</strong><span>{i18n.t('Omitidas')}</span></div>
			</div>
			{#if vm.result.errors.length}
				<div class="section-heading"><h3>{i18n.t('Errores por fila')}</h3><div class="actions"><button class="secondary" type="button" onclick={downloadErrorReport}>{i18n.t('Descargar informe CSV')}</button><button class="secondary" type="button" disabled={vm.importing || !vm.failedRows.length} onclick={() => void vm.retryFailedRows()}>{i18n.t('Reintentar filas fallidas')}</button></div></div>
				<ul class="errors">{#each vm.result.errors as item}<li><strong>{i18n.t('Fila')} {item.row}:</strong> {item.message}</li>{/each}</ul>
			{:else}
				<p class="success">{i18n.t('Todas las filas se importaron correctamente.')}</p>
			{/if}
		</section>
	{/if}
</section>

<style>
	.page{max-width:76rem;margin:0 auto;padding:2rem 1.25rem;display:grid;gap:1rem}
	header{margin-bottom:.25rem}.eyebrow{margin:0;font-size:.68rem;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--navy)}
	h1{margin:.2rem 0 .35rem;font-size:1.55rem}header p{margin:0;color:var(--slate)}
	.panel{padding:1.1rem;border:1px solid var(--line);border-radius:12px;background:var(--surface, white);display:grid;gap:.8rem}
	label{display:flex;flex-direction:column;gap:.35rem;font-size:.88rem;color:var(--slate);font-weight:600}
	select,input{max-width:100%;padding:.6rem .7rem;border:1px solid var(--line);border-radius:var(--radius-field);background:var(--surface, white);color:inherit}
	.hint,.file-meta{margin:0;color:var(--slate);font-size:.82rem}.actions{display:flex;gap:.55rem;flex-wrap:wrap}
	.primary,.secondary{padding:.55rem .85rem;border:1px solid var(--line);border-radius:8px;cursor:pointer;font:inherit}
	.primary{background:var(--navy);border-color:var(--navy);color:#fff}.secondary{background:transparent;color:inherit}
	button:disabled{opacity:.55;cursor:not-allowed}.section-heading{display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap}
	h2,h2{margin:0;font-size:1.05rem}h3{margin:0;font-size:.92rem}.table-wrap{overflow:auto;max-height:26rem;border:1px solid var(--line);border-radius:8px}
	table{border-collapse:collapse;width:100%;font-size:.8rem;white-space:nowrap}th,td{text-align:left;padding:.5rem .65rem;border-bottom:1px solid var(--line);max-width:18rem;overflow:hidden;text-overflow:ellipsis}
	th{position:sticky;top:0;background:var(--surface, white);font-weight:650} .metrics{display:flex;gap:1rem;flex-wrap:wrap}
	.metrics div{min-width:7rem;padding:.65rem .8rem;border:1px solid var(--line);border-radius:8px;display:grid;gap:.15rem}
	.metrics strong{font-size:1.35rem}.metrics span{font-size:.78rem;color:var(--slate)}
	.errors{margin:0;padding-left:1.2rem;color:var(--danger);display:grid;gap:.3rem}.error{color:var(--danger)}.success{color:var(--success, #16804a);margin:0}
	@media(max-width:600px){.page{padding:1.25rem .75rem}.section-heading{align-items:flex-start}}
</style>
