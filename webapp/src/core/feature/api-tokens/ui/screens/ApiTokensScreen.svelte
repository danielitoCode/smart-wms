<script lang="ts">
	import { onMount, getContext } from 'svelte';
	import type { I18nState } from '#lib/i18n/i18n.svelte';
	import { createApiTokensState } from '../state/apiTokensState.svelte';

	const i18n = getContext<I18nState>('i18n');
	const vm = createApiTokensState();

	let name = $state('');
	let warehouseIds = $state<number[]>([]);
	let eventTypes = $state<string[]>([]);
	let endpoints = $state<string[]>([]);
	let sourceSystem = $state('');
	let inboundResources = $state<string[]>([]);
	let mappingOverride = $state(false);
	let expiresAt = $state('');
	let showForm = $state(false);
	let formError = $state<string | null>(null);

	onMount(() => { void vm.load(); });

	function toggle<T>(values: T[], value: T): T[] {
		return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
	}

	function resetForm() {
		name = ''; warehouseIds = []; eventTypes = []; endpoints = [];
		sourceSystem = ''; inboundResources = []; mappingOverride = false; expiresAt = '';
		formError = null;
	}

	async function onCreate() {
		formError = null;
		try {
			const ok = await vm.create({
				name, warehouseIds, eventTypes, endpoints,
				sourceSystem: sourceSystem || null,
				inboundResources, mappingOverride,
				expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null
			});
			if (ok) { showForm = false; resetForm(); }
		} catch (error) {
			formError = error instanceof Error ? error.message : 'No se pudo crear el token';
		}
	}

	async function onRotate(tokenId: number) {
		if (!confirm(i18n.t('La rotación invalida el secreto anterior. ¿Continuar?'))) return;
		await vm.rotate(tokenId);
	}

	async function onRevoke(tokenId: number) {
		if (!confirm(i18n.t('La revocación impedirá usar este token. Esta acción no se puede deshacer. ¿Continuar?'))) return;
		await vm.revoke(tokenId);
	}

	async function onDelete(tokenId: number) {
		if (!confirm(i18n.t('La eliminación borra permanentemente el registro del token. ¿Continuar?'))) return;
		await vm.remove(tokenId);
	}

	async function copySecret() {
		if (!vm.plaintext) return;
		try { await navigator.clipboard.writeText(vm.plaintext); } catch { /* secret remains visible for manual copy */ }
	}
</script>

<section class="page">
	<header>
		<div>
			<p class="eyebrow">ABELLIS · SMART WMS</p>
			<h1>{i18n.t('Tokens API')}</h1>
			<p>{i18n.t('Emisión, rotación, revocación y control de scopes.')}</p>
		</div>
		<button class="primary" type="button" onclick={() => { resetForm(); showForm = !showForm; }} disabled={vm.saving}>
			{i18n.t('Nuevo token')}
		</button>
	</header>

	{#if vm.error}<p class="error" role="alert">{vm.error}</p>{/if}

	{#if vm.plaintext}
		<section class="secret-panel" aria-live="polite">
			<strong>{i18n.t('Secreto generado — solo se muestra esta vez')}</strong>
			<p>{i18n.t('Cópialo y guárdalo ahora. No puede recuperarse desde el listado; si lo pierdes tendrás que rotar el token.')}</p>
			<code>{vm.plaintext}</code>
			<div class="actions">
				<button type="button" onclick={() => void copySecret()}>{i18n.t('Copiar secreto')}</button>
				<button class="primary" type="button" onclick={() => { vm.clearPlaintext(); }}>
					{i18n.t('Ya lo he guardado · Ocultar')}
				</button>
			</div>
		</section>
	{/if}

	{#if showForm}
		<form class="form" onsubmit={(event) => { event.preventDefault(); void onCreate(); }}>
			<h2>{i18n.t('Crear token')}</h2>
			<label>{i18n.t('Nombre')}<input required maxlength="128" bind:value={name} /></label>
			<label>{i18n.t('Expira el (opcional)')}<input type="datetime-local" bind:value={expiresAt} /></label>

			<fieldset>
				<legend>{i18n.t('Almacenes autorizados')}</legend>
				<p class="hint">{i18n.t('Sin almacenes seleccionados, el token no tendrá acceso a ningún almacén.')}</p>
				{#if vm.warehouses.length === 0}<p class="hint">{i18n.t('No hay almacenes disponibles.')}</p>{/if}
				<div class="option-grid">
					{#each vm.warehouses as warehouse (warehouse.id)}
						<label class="check"><input type="checkbox" checked={warehouseIds.includes(warehouse.id)} onchange={() => warehouseIds = toggle(warehouseIds, warehouse.id)} />
							{warehouse.code}{#if warehouse.name} — {warehouse.name}{/if}
						</label>
					{/each}
				</div>
			</fieldset>

			<fieldset>
				<legend>{i18n.t('Tipos de evento')}</legend>
				<p class="hint">{i18n.t('Lista permitida para eventos salientes.')}</p>
				<div class="option-grid">
					{#each vm.catalog.eventTypes as item (item)}
						<label class="check"><input type="checkbox" checked={eventTypes.includes(item)} onchange={() => eventTypes = toggle(eventTypes, item)} />{item}</label>
					{/each}
				</div>
			</fieldset>

			<fieldset>
				<legend>{i18n.t('Endpoints salientes')}</legend>
				<p class="hint">{i18n.t('Selecciona al menos un endpoint o configura un origen y recursos entrantes.')}</p>
				<div class="option-grid">
					{#each vm.catalog.endpoints as item (item)}
						<label class="check"><input type="checkbox" checked={endpoints.includes(item)} onchange={() => endpoints = toggle(endpoints, item)} />{item}</label>
					{/each}
				</div>
			</fieldset>

			<fieldset>
				<legend>{i18n.t('Permisos entrantes')}</legend>
				<label>{i18n.t('Sistema de origen')}
					<select bind:value={sourceSystem}>
						<option value="">{i18n.t('Ninguno (token solo saliente)')}</option>
						{#each vm.catalog.sourceSystems as item (item.sourceSystem)}
							<option value={item.sourceSystem}>{item.sourceSystem} ({item.kind})</option>
						{/each}
					</select>
				</label>
				<p class="hint">{i18n.t('El origen y los recursos entrantes deben configurarse juntos.')}</p>
				<div class="option-grid">
					{#each vm.catalog.inboundResources as item (item)}
						<label class="check"><input type="checkbox" checked={inboundResources.includes(item)} onchange={() => inboundResources = toggle(inboundResources, item)} />{item}</label>
					{/each}
				</div>
				<label class="check capability"><input type="checkbox" bind:checked={mappingOverride} />{i18n.t('Permitir mapping overrides')}</label>
			</fieldset>

			{#if formError}<p class="error" role="alert">{formError}</p>{/if}
			<div class="actions">
				<button type="button" onclick={() => { showForm = false; resetForm(); }}>{i18n.t('Cancelar')}</button>
				<button class="primary" type="submit" disabled={vm.saving}>{vm.saving ? i18n.t('Creando…') : i18n.t('Crear token')}</button>
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
				<thead><tr>
					<th>{i18n.t('Nombre')}</th><th>{i18n.t('Estado')}</th><th>{i18n.t('Almacenes')}</th>
					<th>{i18n.t('Eventos / Endpoints')}</th><th>{i18n.t('Origen entrante')}</th>
					<th>{i18n.t('Expiración')}</th><th>{i18n.t('Rotación')}</th><th>{i18n.t('Último uso')}</th><th>{i18n.t('Acciones')}</th>
				</tr></thead>
				<tbody>
					{#each vm.rows as row (row.tokenId)}
						<tr>
							<td>{row.name}</td>
							<td><span class:revoked={row.status === 'revoked'} class:expired={row.status === 'expired'} class="status">{row.status}</span></td>
							<td>{row.warehouseIds.join(', ') || '—'}</td>
							<td>{[...row.eventTypes, ...row.endpoints].join(', ') || '—'}</td>
							<td>{row.sourceSystem ? row.sourceSystem + ': ' + row.inboundResources.join(', ') : '—'}</td>
							<td>{row.expiresAt ? new Date(row.expiresAt).toLocaleString() : '—'}</td>
							<td>{row.rotationStatus === 'none' ? '—' : row.rotationStatus}</td>
							<td>{row.lastUsedAt ? new Date(row.lastUsedAt).toLocaleString() : '—'}</td>
							<td class="actions-cell">
								<button type="button" disabled={vm.saving || row.status !== 'active'} onclick={() => void onRotate(row.tokenId)}>{i18n.t('Rotar')}</button>
								<button type="button" disabled={vm.saving || row.status !== 'active'} onclick={() => void onRevoke(row.tokenId)}>{i18n.t('Revocar')}</button>
								<button type="button" class="danger" disabled={vm.saving} onclick={() => void onDelete(row.tokenId)}>{i18n.t('Eliminar')}</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</section>

<style>
	.page { max-width: 90rem; margin: 0 auto; padding: 2rem 1.25rem; }
	header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 1.25rem; }
	.eyebrow { margin: 0; font-size: .68rem; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; color: var(--navy); }
	h1 { margin: .2rem 0 .35rem; font-size: 1.45rem; } header p { margin: 0; color: var(--slate); }
	h2 { margin: 0; font-size: 1.1rem; }
	.form, .secret-panel { display: flex; flex-direction: column; gap: .85rem; margin-bottom: 1rem; padding: 1rem; border: 1px solid var(--line); border-radius: 10px; }
	.secret-panel { border-color: #d6a83c; background: #fff9e9; }
	.secret-panel code { display: block; padding: .75rem; background: white; border: 1px solid var(--line); border-radius: 6px; overflow-wrap: anywhere; user-select: all; }
	label { display: flex; flex-direction: column; gap: .3rem; font-size: .88rem; }
	label.check { flex-direction: row; align-items: center; gap: .45rem; }
	input:not([type=checkbox]), select { padding: .5rem .65rem; border: 1px solid var(--line); border-radius: var(--radius-field); max-width: 32rem; }
	fieldset { border: 1px solid var(--line); border-radius: 8px; padding: .7rem .8rem; }
	legend { font-weight: 600; padding: 0 .25rem; }
	.option-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr)); gap: .4rem .8rem; max-height: 12rem; overflow: auto; }
	.hint { margin: .2rem 0 .6rem; color: var(--slate); font-size: .8rem; }
	.capability { margin-top: .8rem; }
	.actions, .actions-cell { display: flex; flex-wrap: wrap; gap: .4rem; }
	button { padding: .45rem .75rem; border: 1px solid var(--line); border-radius: 8px; background: var(--surface); cursor: pointer; }
	button:disabled { opacity: .55; cursor: not-allowed; }
	.primary { background: var(--navy); color: #fff; border-color: var(--navy); }
	.danger, .error { color: var(--danger); } .error { margin: .6rem 0; }
	.table-wrap { overflow: auto; border: 1px solid var(--line); border-radius: 10px; }
	table { width: 100%; border-collapse: collapse; font-size: .84rem; min-width: 72rem; }
	th, td { padding: .65rem .75rem; border-bottom: 1px solid var(--line); text-align: left; vertical-align: top; }
	th { background: var(--surface); color: var(--slate); white-space: nowrap; }
	.status { font-weight: 600; } .status.revoked, .status.expired { color: var(--danger); }
	.empty { color: var(--slate); }
	@media (max-width: 640px) { .page { padding: 1.2rem .75rem; } header { flex-direction: column; } header button { width: 100%; } }
</style>
