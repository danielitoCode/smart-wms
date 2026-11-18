<script lang="ts">
	import { onMount, getContext } from 'svelte';
	import type { I18nState } from '#lib/i18n/i18n.svelte';
	import { createChannelsState } from '../state/channelsState.svelte';
	const i18n = getContext<I18nState>('i18n');
	const vm = createChannelsState();
	let name = $state('');
	let showForm = $state(false);
	onMount(() => { void vm.load(); });
	async function onCreate() {
		const ok = await vm.create({ name });
		if (ok) { name = ''; showForm = false; }
	}
</script>
<section class="page">
	<header>
		<div>
			<p class="eyebrow">ABELLIS · SMART WMS</p>
			<h1>{i18n.t('Canales')}</h1>
			<p>{i18n.t('Canales de integración y su estado operativo.')}</p>
		</div>
		<button class="primary" type="button" onclick={() => (showForm = !showForm)}>{i18n.t('Nuevo canal')}</button>
	</header>
	{#if vm.error}<p class="error" role="alert">{vm.error}</p>{/if}
	{#if showForm}
		<form class="form" onsubmit={(e) => { e.preventDefault(); void onCreate(); }}>
			<label>{i18n.t('Nombre')}<input required bind:value={name} /></label>
			<div class="actions">
				<button type="button" onclick={() => (showForm = false)}>{i18n.t('Cancelar')}</button>
				<button class="primary" type="submit" disabled={vm.saving}>{i18n.t('Crear')}</button>
			</div>
		</form>
	{/if}
	{#if vm.loading}<p>{i18n.t('Cargando…')}</p>
	{:else if vm.rows.length === 0}<p class="empty">{i18n.t('No hay canales.')}</p>
	{:else}
		<div class="table-wrap"><table>
			<thead><tr><th>{i18n.t('Nombre')}</th><th>{i18n.t('Estado')}</th><th>{i18n.t('Sistema origen')}</th><th>{i18n.t('Acciones')}</th></tr></thead>
			<tbody>
				{#each vm.rows as row (row.channelId)}
					<tr>
						<td>{row.name}</td><td>{row.status}</td><td>{row.sourceSystem ?? '—'}</td>
						<td><button type="button" class="danger" disabled={vm.saving} onclick={() => void vm.remove(row.channelId)}>{i18n.t('Eliminar')}</button></td>
					</tr>
				{/each}
			</tbody>
		</table></div>
	{/if}
</section>
<style>
	.page{max-width:56rem;margin:0 auto;padding:2rem 1.25rem}
	header{display:flex;justify-content:space-between;gap:1rem;margin-bottom:1.25rem}
	.eyebrow{margin:0;font-size:.68rem;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--navy)}
	h1{margin:.2rem 0 .35rem;font-size:1.45rem}
	header p{margin:0;color:var(--slate)}
	.form{display:flex;flex-direction:column;gap:.8rem;margin-bottom:1rem;padding:1rem;border:1px solid var(--line);border-radius:10px}
	label{display:flex;flex-direction:column;gap:.3rem}
	input{padding:.5rem .65rem;border:1px solid var(--line);border-radius:var(--radius-field)}
	.actions{display:flex;gap:.5rem}
	button{padding:.45rem .75rem;border:1px solid var(--line);border-radius:8px;background:var(--surface);cursor:pointer}
	.primary{background:var(--navy);color:#fff;border-color:var(--navy)}
	.danger{color:var(--danger)}
	.error{color:var(--danger)}
	.empty{color:var(--slate)}
	.table-wrap{overflow:auto;border:1px solid var(--line);border-radius:10px}
	table{width:100%;border-collapse:collapse;font-size:.88rem}
	th,td{padding:.65rem .75rem;border-bottom:1px solid var(--line);text-align:left}
	th{background:var(--surface);color:var(--slate)}
</style>
