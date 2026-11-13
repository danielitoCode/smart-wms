<script lang="ts">
	import { getContext } from 'svelte';
	import type { I18nState } from '#lib/i18n/i18n.svelte';
	import { createImportsState } from '../state/importsState.svelte';
	import type { CsvImportType } from '../../domain/entity/CsvImport';
	const i18n = getContext<I18nState>('i18n');
	const vm = createImportsState();
	let fileInput: HTMLInputElement | null = $state(null);
	async function onImport() {
		const file = fileInput?.files?.[0];
		if (!file) return;
		await vm.importFile(file);
	}
</script>
<section class="page">
	<header>
		<div>
			<p class="eyebrow">ABELLIS · SMART WMS</p>
			<h1>{i18n.t('Importaciones')}</h1>
			<p>{i18n.t('Carga masiva CSV/JSON hacia el backend Flask.')}</p>
		</div>
	</header>
	{#if vm.error}<p class="error" role="alert">{vm.error}</p>{/if}
	<form class="form" onsubmit={(e) => { e.preventDefault(); void onImport(); }}>
		<label>{i18n.t('Tipo de importación')}
			<select value={vm.importType} onchange={(e) => vm.setImportType(e.currentTarget.value as CsvImportType)}>
				{#each vm.types as t}
					<option value={t.value}>{i18n.t(t.label)} — {i18n.t(t.description)}</option>
				{/each}
			</select>
		</label>
		<label>{i18n.t('Archivo')}
			<input type="file" accept=".csv,.json,text/csv,application/json" bind:this={fileInput} />
		</label>
		<button class="primary" type="submit" disabled={vm.importing}>{vm.importing ? i18n.t('Importando…') : i18n.t('Importar')}</button>
	</form>
	{#if vm.result}
		<div class="result">
			<p>{i18n.t('Creados')}: {vm.result.created} · {i18n.t('Actualizados')}: {vm.result.updated}</p>
			{#if vm.result.errors.length}
				<ul>
					{#each vm.result.errors as err}
						<li>{err.row != null ? `Fila ${err.row}: ` : ''}{err.message}</li>
					{/each}
				</ul>
			{/if}
		</div>
	{/if}
</section>
<style>
	.page{max-width:40rem;margin:0 auto;padding:2rem 1.25rem}
	header{margin-bottom:1.25rem}
	.eyebrow{margin:0;font-size:.68rem;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--navy)}
	h1{margin:.2rem 0 .35rem;font-size:1.45rem}
	header p{margin:0;color:var(--slate)}
	.form{display:flex;flex-direction:column;gap:.9rem}
	label{display:flex;flex-direction:column;gap:.3rem;font-size:.88rem;color:var(--slate)}
	select,input{padding:.55rem .7rem;border:1px solid var(--line);border-radius:var(--radius-field)}
	.primary{padding:.55rem 1rem;border:0;border-radius:8px;background:var(--navy);color:#fff;cursor:pointer;align-self:flex-start}
	.error{color:var(--danger)}
	.result{margin-top:1rem;padding:1rem;border:1px solid var(--line);border-radius:10px}
	.result ul{margin:.5rem 0 0;padding-left:1.1rem;color:var(--danger)}
</style>
