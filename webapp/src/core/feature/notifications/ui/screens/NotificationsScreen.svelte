<script lang="ts">
	import { onMount, getContext } from 'svelte';
	import type { I18nState } from '#lib/i18n/i18n.svelte';
	import { createNotificationsState } from '../state/notificationsState.svelte';
	const i18n = getContext<I18nState>('i18n');
	const vm = createNotificationsState();
	let name = $state('');
	let url = $state('');
	let showForm = $state(false);
	onMount(() => { void vm.load(); });
	async function onCreate() {
		const ok = await vm.create({ name, url });
		if (ok) { name = ''; url = ''; showForm = false; }
	}
</script>
<section class="page">
	header>
		<div>
			<p class="eyebrow">ABELLIS · SMART WMS</p>
			<h1>{i18n.t('Notificaciones')}</h1>
			<p>{i18n.t('Webhooks de notificación operativa.')}</p>
		</div>
		<button class="primary" type="button" onclick={() => (showForm = !showForm)}>{i18n.t('Nueva notificación')}</button>
	</header>
	{#if vm.error}<p class="error" role="alert">{vm.error}</p>{/if}
	{#if vm.message}<p class="success" role="status">{i18n.t(vm.message)}</p>{/if}
	{#if showForm}
		<form class="form" onsubmit={(e) => { e.preventDefault(); void onCreate(); }}>
			<label>{i18n.t('Nombre')}<input required bind:value={name} /></label>
			<label>{i18n.t('URL')}<input required type="url" bind:value={url} /></label>
			<div class="actions">
				<button type="button" onclick={() => (showForm = false)}>{i18n.t('Cancelar')}</button>
				<button class="primary" type="submit" disabled={vm.saving}>{i18n.t('Crear')}</button>
			</div>
		</form>
	{/if}
	{#if vm.loading}<p>{i18n.t('Cargando…')}</p>
	{:else if vm.rows.length === 0}<p class="empty">{i18n.t('No hay notificaciones.')}</p>
	{:else}
		<div class="table-wrap"><table>
			<thead><tr><th>{i18n.t('Nombre')}</th><th>{i18n.t('URL')}</th><th>{i18n.t('Activo')}</th><th>{i18n.t('Acciones')}</th></tr></thead>
			<tbody>
			{#each vm.rows as row (row.webhookId)}
				<tr>
					<td>{row.name}</td><td class="mono">{row.url}</td><td>{row.active ? i18n.t('Sí') : i18n.t('No')}</td>
					<td class="actions">
						<button type="button" disabled={vm.saving} onclick={() => void vm.testSend(row.webhookId)}>{i18n.t('Probar')}</button>
						<button type="button" class="danger" disabled={vm.saving} onclick={() => void vm.remove(row.webhookId)}>{i18n.t('Eliminar')}</button>
					</td>
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
	.actions{display:flex;flex-wrap:wrap;gap:.4rem}
	button{padding:.45rem .75rem;border:1px solid var(--line);border-radius:8px;background:var(--surface);cursor:pointer}
	.primary{background:var(--navy);color:#fff;border-color:var(--navy)}
	.danger{color:var(--danger)}
	.error{color:var(--danger)}
	.success{color:var(--success,#0f5132)}
	.empty{color:var(--slate)}
	.table-wrap{overflow:auto;border:1px solid var(--line);border-radius:10px}
	table{width:100%;border-collapse:collapse;font-size:.88rem}
	th,td{padding:.65rem .75rem;border-bottom:1px solid var(--line);text-align:left}
	th{background:var(--surface);color:var(--slate)}
	.mono{font-family:ui-monospace,monospace;font-size:.8rem}
</style>
