<script lang="ts">
	import { onMount, getContext } from 'svelte';
	import type { I18nState } from '#lib/i18n/i18n.svelte';
	import { createApiTokensState } from '../state/apiTokensState.svelte';

	const i18n = getContext<I18nState>('i18n');
	const vm = createApiTokensState();

	let name = $state('');
	let selectedScopes = $state<string[]>([]);
	let showForm = $state(false);

	onMount(() => { void vm.load(); });

	function toggleScope(scope: string) {
		selectedScopes = selectedScopes.includes(scope)
			? selectedScopes.filter((s) => s !== scope)
			: [...selectedScopes, scope];
	}

	async function onCreate() {
		const ok = await vm.create({ name, scopes: selectedScopes });
		if (ok) {
			name = '';
			selectedScopes = [];
			showForm = false;
		}
	}
</script>

<section class="page">
	<header>
		<div>
			<p class="eyebrow">ABELLIS · SMART WMS</p>
			<h1>{i18n.t('Tokens API')}</h1>
			<p>{i18n.t('Emisión, rotación y revocación de tokens WMS.')}</p>
		</div>
		<button class="primary" type="button" onclick={() => (showForm = !showForm)}>{i18n.t('Nuevo token')}</button>
	</header>

	{#if vm.error}<p class="error" role="alert">{vm.error}</p>{/if}
	{#if vm.plaintext}
		<p class="warn" role="status">
			{i18n.t('Copia el token ahora; no se volverá a mostrar:')}
			<code>{vm.plaintext}</code>
			<button type="button" onclick={() => vm.clearPlaintext()}>{i18n.t('Ocultar')}</button>
		</p>
	{/if}

	{#if showForm}
		<form class="form" onsubmit={(e) => { e.preventDefault(); void onCreate(); }}>
			<label>{i18n.t('Nombre')}<input required maxlength="120" bind:value={name} /></label>
			<fieldset>
				<legend>{i18n.t('Scopes')}</legend>
				{#each vm.scopes as scope}
					<label class="check"><input type="checkbox" checked={selectedScopes.includes(scope)} onchange={() => toggleScope(scope)} />{scope}</label>
				{/each}
			</fieldset>
			<div class="actions">
				<button type="button" onclick={() => (showForm = false)}>{i18n.t('Cancelar')}</button>
				<button class="primary" type="submit" disabled={vm.saving}>{vm.saving ? i18n.t('Guardando…') : i18n.t('Crear')}</button>
			</div>
		</form>
	{/if}

	{#if vm.loading}
		<p>{i18n.t('Cargando…')}</p>
	{:else if vm.rows.length === 0}
		<p class="empty">{i18n.t('No hay tokens registrados.')}</p>
	{:else}
		<div class="table-wrap">
			<table>
				<thead>
					<tr>
						<th>{i18n.t('Nombre')}</th>
						<th>{i18n.t('Scopes')}</th>
						<th>{i18n.t('Rotación')}</th>
						<th>{i18n.t('Último uso')}</th>
						<th>{i18n.t('Estado')}</th>
						<th>{i18n.t('Acciones')}</th>
					</tr>
				</thead>
				<tbody>
					{#each vm.rows as row (row.tokenId)}
						<tr>
							<td>{row.name}</td>
							<td>{row.scopes.join(', ') || '—'}</td>
							<td>{row.rotationStatus}</td>
							<td>{row.lastUsedAt ?? '—'}</td>
							<td>{row.revokedAt ? i18n.t('Revocado') : i18n.t('Activo')}</td>
							<td class="actions-cell">
								<button type="button" disabled={vm.saving || !!row.revokedAt} onclick={() => void vm.rotate(row.tokenId)}>{i18n.t('Rotar')}</button>
								<button type="button" disabled={vm.saving || !!row.revokedAt} onclick={() => void vm.revoke(row.tokenId)}>{i18n.t('Revocar')}</button>
								<button type="button" class="danger" disabled={vm.saving} onclick={() => void vm.remove(row.tokenId)}>{i18n.t('Eliminar')}</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</section>

<style>
	.page { max-width: 64rem; margin: 0 auto; padding: 2rem 1.25rem; }
	header { display: flex; justify-content: space-between; gap: 1rem; margin-bottom: 1.25rem; }
	.eyebrow { margin: 0; font-size: 0.68rem; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; color: var(--navy); }
	h1 { margin: 0.2rem 0 0.35rem; font-size: 1.45rem; }
	header p { margin: 0; color: var(--slate); }
	.form { display: flex; flex-direction: column; gap: 0.8rem; margin-bottom: 1rem; padding: 1rem; border: 1px solid var(--line); border-radius: 10px; }
	label { display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.88rem; }
	label.check { flex-direction: row; align-items: center; gap: 0.45rem; }
	input { padding: 0.5rem 0.65rem; border: 1px solid var(--line); border-radius: var(--radius-field); }
	fieldset { border: 1px solid var(--line); border-radius: 8px; padding: 0.6rem 0.75rem; }
	.actions, .actions-cell { display: flex; flex-wrap: wrap; gap: 0.4rem; }
	button { padding: 0.45rem 0.75rem; border: 1px solid var(--line); border-radius: 8px; background: var(--surface); cursor: pointer; }
	.primary { background: var(--navy); color: #fff; border-color: var(--navy); }
	.danger { color: var(--danger); }
	.error { color: var(--danger); }
	.warn { background: #fff7e6; border: 1px solid #f0d9a6; padding: 0.7rem 0.85rem; border-radius: 8px; }
	.warn code { display: block; margin: 0.4rem 0; word-break: break-all; }
	.table-wrap { overflow: auto; border: 1px solid var(--line); border-radius: 10px; }
	table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
	th, td { padding: 0.65rem 0.75rem; border-bottom: 1px solid var(--line); text-align: left; }
	th { background: var(--surface); color: var(--slate); }
	.empty { color: var(--slate); }
</style>
