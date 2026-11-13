<script lang="ts">
	import { onMount, getContext } from 'svelte';
	import type { I18nState } from '#lib/i18n/i18n.svelte';
	import { createInboundActivityState } from '../state/inboundActivityState.svelte';
	const i18n = getContext<I18nState>('i18n');
	const vm = createInboundActivityState();
	onMount(() => { void vm.load(); });
</script>
<section class="page">
	<header>
		<div>
			<p class="eyebrow">ABELLIS · SMART WMS</p>
			<h1>{i18n.t('Actividad inbound')}</h1>
			<p>{i18n.t('Tráfico de entrada por recurso y sistema origen.')}</p>
		</div>
	</header>
	{#if vm.error}<p class="error" role="alert">{vm.error}</p>{/if}
	<div class="toolbar">
		<input type="text" placeholder={i18n.t('Recurso')} value={vm.resource} oninput={(e) => vm.setResource(e.currentTarget.value)} />
		<button type="button" onclick={() => { vm.setPage(1); void vm.load(); }} disabled={vm.loading}>{i18n.t('Filtrar')}</button>
	</div>
	{#if vm.loading}<p>{i18n.t('Cargando…')}</p>
	{:else if vm.rows.length === 0}<p class="empty">{i18n.t('No hay actividad inbound.')}</p>
	{:else}
		<div class="table-wrap"><table>
			<thead><tr><th>{i18n.t('ID')}</th><th>{i18n.t('Recurso')}</th><th>{i18n.t('Sistema')}</th><th>{i18n.t('Estado')}</th><th>{i18n.t('Externo')}</th><th>{i18n.t('Acciones')}</th></tr></thead>
			<tbody>
			{#each vm.rows as row (`${row.resource}-${row.inboundId}`)}
				<tr>
					<td>{row.inboundId}</td><td>{row.resource}</td><td>{row.sourceSystem ?? '—'}</td><td>{row.status}</td><td>{row.externalId ?? '—'}</td>
					<td><button type="button" onclick={() => void vm.openDetail(row.resource, row.inboundId)}>{i18n.t('Detalle')}</button></td>
				</tr>
			{/each}
			</tbody>
		</table></div>
	{/if}
	{#if vm.detail}
		<aside class="detail">
			<header>
				<h2>{vm.detail.row.resource} #{vm.detail.row.inboundId}</h2>
				<button type="button" onclick={() => vm.clearDetail()}>{i18n.t('Cerrar')}</button>
			</header>
			<pre>{JSON.stringify(vm.detail.payload, null, 2)}</pre>
		</aside>
	{/if}
</section>
<style>
	.page{max-width:64rem;margin:0 auto;padding:2rem 1.25rem}
	header{margin-bottom:1.25rem}
	.eyebrow{margin:0;font-size:.68rem;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--navy)}
	h1{margin:.2rem 0 .35rem;font-size:1.45rem}
	header p{margin:0;color:var(--slate)}
	.toolbar{display:flex;gap:.6rem;margin-bottom:1rem}
	input{padding:.5rem .65rem;border:1px solid var(--line);border-radius:var(--radius-field)}
	button{padding:.45rem .75rem;border:1px solid var(--line);border-radius:8px;background:var(--surface);cursor:pointer}
	.error{color:var(--danger)}
	.empty{color:var(--slate)}
	.table-wrap{overflow:auto;border:1px solid var(--line);border-radius:10px}
	table{width:100%;border-collapse:collapse;font-size:.88rem}
	th,td{padding:.65rem .75rem;border-bottom:1px solid var(--line);text-align:left}
	th{background:var(--surface);color:var(--slate)}
	.detail{margin-top:1rem;border:1px solid var(--line);border-radius:10px;padding:1rem}
	.detail header{display:flex;justify-content:space-between;align-items:center;margin-bottom:.6rem}
	pre{margin:0;overflow:auto;font-size:.78rem;background:var(--surface);padding:.75rem;border-radius:8px}
</style>
