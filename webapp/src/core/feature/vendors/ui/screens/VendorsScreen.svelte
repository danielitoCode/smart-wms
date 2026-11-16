<script lang="ts">
	import { onMount } from 'svelte';
	import { page as route } from '$app/state';
	import { getContext } from 'svelte';
	import type { I18nState } from '../../../../../lib/i18n/i18n.svelte';
	import { createVendorsState } from '../state/vendorsState.svelte';
	import type { CreateVendor, UpdateVendor, Vendor } from '../../domain/entity/Vendor';

	const i18n = getContext<I18nState>('i18n');
	const vm = createVendorsState();
	let showForm = $state(false);
	let confirmTarget = $state<Vendor | null>(null);
	let confirmMode = $state<'deactivate' | 'delete' | null>(null);
	let vendorName = $state('');
	let contactName = $state('');
	let email = $state('');
	let phone = $state('');
	let billingAddress = $state('');
	let remitToAddress = $state('');
	let taxId = $state('');
	let paymentTerms = $state('');
	let isActive = $state(true);

	let searchTimer: ReturnType<typeof setTimeout> | undefined;

	onMount(() => {
		void (async () => {
			await vm.load();
			const canonicalId = route.url.searchParams.get('canonical_id');
			if (canonicalId) await vm.loadDetail(canonicalId);
		})();
		return () => {
			if (searchTimer) clearTimeout(searchTimer);
		};
	});

	function scheduleSearch(value: string) {
		vm.setSearch(value);
		if (searchTimer) clearTimeout(searchTimer);
		searchTimer = setTimeout(() => {
			searchTimer = undefined;
			void vm.load();
		}, 300);
	}

	function submitSearch() {
		if (searchTimer) clearTimeout(searchTimer);
		searchTimer = undefined;
		void vm.load();
	}

	function changeFilter(value: 'active' | 'archived' | 'all') {
		if (searchTimer) clearTimeout(searchTimer);
		searchTimer = undefined;
		vm.setFilter(value);
		void vm.load();
	}

	function resetForm() {
		showForm = false;
		vm.setEditing(null);
		vendorName = '';
		contactName = '';
		email = '';
		phone = '';
		billingAddress = '';
		remitToAddress = '';
		taxId = '';
		paymentTerms = '';
		isActive = true;
	}

	function openCreate() {
		resetForm();
		showForm = true;
	}

	function edit(vendor: Vendor) {
		vm.setEditing(vendor);
		vendorName = vendor.vendorName ?? '';
		contactName = vendor.contactName ?? '';
		email = vendor.email ?? '';
		phone = vendor.phone ?? '';
		billingAddress = vendor.billingAddress ?? '';
		remitToAddress = vendor.remitToAddress ?? '';
		taxId = vendor.taxId ?? '';
		paymentTerms = vendor.paymentTerms ?? '';
		isActive = vendor.isActive !== false;
		showForm = true;
	}

	async function save() {
		if (!vendorName.trim()) return;
		const payload = {
			vendorName: vendorName.trim(),
			contactName: contactName || null,
			email: email || null,
			phone: phone || null,
			billingAddress: billingAddress || null,
			remitToAddress: remitToAddress || null,
			taxId: taxId || null,
			paymentTerms: paymentTerms || null,
			isActive
		};
		const success = vm.editing
			? await vm.update(vm.editing.canonicalId, payload as UpdateVendor)
			: await vm.create(payload as CreateVendor);
		if (success) resetForm();
	}

	function askConfirm(vendor: Vendor, mode: 'deactivate' | 'delete') {
		confirmTarget = vendor;
		confirmMode = mode;
	}

	async function confirmAction() {
		if (!confirmTarget || !confirmMode) return;
		const target = confirmTarget;
		const success = confirmMode === 'deactivate'
			? await vm.deactivate(target.canonicalId)
			: await vm.remove(target.canonicalId);
		if (success) {
			confirmTarget = null;
			confirmMode = null;
		}
	}

	function closeConfirm() {
		confirmTarget = null;
		confirmMode = null;
	}
</script>

<svelte:head>
	<title>{i18n.t('Proveedores')} · Smart WMS</title>
</svelte:head>

<section class="page">
	<header class="page-header">
		<div>
			<p class="eyebrow">ABELLIS · SMART WMS</p>
			<h1>{i18n.t('Proveedores')}</h1>
			<p class="subtitle">{i18n.t('Gestiona el catálogo de proveedores y sus datos de contacto.')}</p>
		</div>
		<button class="primary" type="button" onclick={openCreate}>{i18n.t('Nuevo proveedor')}</button>
	</header>

	{#if vm.error}
		<div class="error" role="alert">{vm.error}<button type="button" class="link" onclick={() => vm.load()}>{i18n.t('Reintentar')}</button></div>
	{/if}

	{#if showForm}
		<form class="editor panel" onsubmit={(event) => { event.preventDefault(); void save(); }}>
			<div class="panel-heading">
				<h2>{vm.editing ? i18n.t('Editar proveedor') : i18n.t('Nuevo proveedor')}</h2>
				{#if vm.editing}<span class="canonical">{i18n.t('ID canónico')}: {vm.editing.canonicalId}</span>{/if}
			</div>
			<label>{i18n.t('Nombre del proveedor')} *<input required maxlength="200" bind:value={vendorName} /></label>
			<label>{i18n.t('Persona de contacto')}<input maxlength="200" bind:value={contactName} /></label>
			<label>{i18n.t('Correo electrónico')}<input type="email" maxlength="255" bind:value={email} /></label>
			<label>{i18n.t('Teléfono')}<input maxlength="50" bind:value={phone} /></label>
			<label>{i18n.t('Dirección de facturación')}<textarea maxlength="2000" rows="2" bind:value={billingAddress}></textarea></label>
			<label>{i18n.t('Dirección de envío / Remitente')}<textarea maxlength="2000" rows="2" bind:value={remitToAddress}></textarea></label>
			<label>{i18n.t('Identificación fiscal')}<input maxlength="64" bind:value={taxId} /></label>
			<label>{i18n.t('Condiciones de pago')}<input maxlength="64" bind:value={paymentTerms} /></label>
			<label class="check"><input type="checkbox" bind:checked={isActive} />{i18n.t('Proveedor activo')}</label>
			<div class="form-actions">
				<button type="button" onclick={resetForm}>{i18n.t('Cancelar')}</button>
				<button class="primary" type="submit" disabled={vm.saving}>{vm.saving ? i18n.t('Guardando…') : i18n.t('Guardar')}</button>
			</div>
		</form>
	{/if}

	<form class="filters" onsubmit={(event) => { event.preventDefault(); submitSearch(); }}>
		<label class="search-field">
			<span>{i18n.t('Buscar proveedor')}</span>
			<input type="search" placeholder={i18n.t('Nombre, contacto o correo')} value={vm.search} oninput={(event) => scheduleSearch(event.currentTarget.value)} />
		</label>
		<label class="filter-field">
			<span>{i18n.t('Estado')}</span>
			<select value={vm.filter} onchange={(event) => changeFilter(event.currentTarget.value as 'active' | 'archived' | 'all')}>
				<option value="active">{i18n.t('Activos')}</option>
				<option value="archived">{i18n.t('Inactivos')}</option>
				<option value="all">{i18n.t('Todos')}</option>
			</select>
		</label>
		<button type="submit" disabled={vm.loading}>{i18n.t('Buscar')}</button>
	</form>

	{#if vm.loading}
		<p class="status" role="status">{i18n.t('Cargando proveedores…')}</p>
	{:else if vm.vendors.length === 0}
		<p class="empty">{i18n.t('No hay proveedores con estos criterios.')}</p>
	{:else}
		<div class="table-wrap">
			<table>
				<thead><tr>
					<th>{i18n.t('Proveedor')}</th><th>{i18n.t('Contacto')}</th><th>{i18n.t('Correo')}</th>
					<th>{i18n.t('Teléfono')}</th><th>{i18n.t('Condiciones de pago')}</th><th>{i18n.t('Estado')}</th><th>{i18n.t('Acciones')}</th>
				</tr></thead>
				<tbody>
					{#each vm.vendors as vendor (vendor.canonicalId)}
						<tr>
							<td><button class="link vendor-name" type="button" onclick={() => vm.loadDetail(vendor.canonicalId)}>{vendor.vendorName ?? '—'}</button></td>
							<td>{vendor.contactName ?? '—'}</td><td>{vendor.email ?? '—'}</td><td>{vendor.phone ?? '—'}</td>
							<td>{vendor.paymentTerms ?? '—'}</td>
							<td><span class:active={vendor.isActive !== false} class="status-pill">{vendor.isActive !== false ? i18n.t('Activo') : i18n.t('Inactivo')}</span></td>
							<td class="row-actions">
								<button type="button" onclick={() => edit(vendor)}>{i18n.t('Editar')}</button>
								{#if vendor.isActive !== false}<button type="button" onclick={() => askConfirm(vendor, 'deactivate')}>{i18n.t('Desactivar')}</button>{/if}
								<button class="danger" type="button" onclick={() => askConfirm(vendor, 'delete')}>{i18n.t('Eliminar')}</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}

	<footer class="pagination">
		<span>{i18n.t('Página')} {vm.pagination.page} / {vm.pagination.pages} · {vm.pagination.total} {i18n.t('proveedores')}</span>
		<div>
			<button type="button" onclick={() => { vm.setPage(1); void vm.load(); }} disabled={vm.loading || vm.page <= 1}>{i18n.t('Primera')}</button>
			<button type="button" onclick={() => { vm.setPage(vm.page - 1); void vm.load(); }} disabled={vm.loading || vm.page <= 1}>{i18n.t('Anterior')}</button>
			<button type="button" onclick={() => { vm.setPage(vm.page + 1); void vm.load(); }} disabled={vm.loading || vm.page >= vm.pagination.pages}>{i18n.t('Siguiente')}</button>
			<button type="button" onclick={() => { vm.setPage(vm.pagination.pages); void vm.load(); }} disabled={vm.loading || vm.page >= vm.pagination.pages}>{i18n.t('Última')}</button>
		</div>
	</footer>
</section>

{#if vm.detailLoading || vm.detail || vm.detailError}
	<div class="overlay" role="presentation">
		<div class="dialog panel" role="dialog" aria-modal="true" aria-labelledby="vendor-detail-title">
			<div class="panel-heading"><h2 id="vendor-detail-title">{i18n.t('Detalle del proveedor')}</h2><button type="button" onclick={() => vm.closeDetail()} aria-label={i18n.t('Cerrar')}>×</button></div>
			{#if vm.detailLoading}<p>{i18n.t('Cargando…')}</p>
			{:else if vm.detailError}<p class="error" role="alert">{vm.detailError}</p>
			{:else if vm.detail}
				<dl class="detail-grid">
					<dt>{i18n.t('Nombre')}</dt><dd>{vm.detail.vendorName ?? '—'}</dd>
					<dt>{i18n.t('ID canónico')}</dt><dd class="canonical">{vm.detail.canonicalId}</dd>
					<dt>{i18n.t('ID externo')}</dt><dd>{vm.detail.externalId}</dd>
					<dt>{i18n.t('Contacto')}</dt><dd>{vm.detail.contactName ?? '—'}</dd>
					<dt>{i18n.t('Correo')}</dt><dd>{vm.detail.email ?? '—'}</dd>
					<dt>{i18n.t('Teléfono')}</dt><dd>{vm.detail.phone ?? '—'}</dd>
					<dt>{i18n.t('Dirección de facturación')}</dt><dd>{vm.detail.billingAddress ?? '—'}</dd>
					<dt>{i18n.t('Dirección de envío / Remitente')}</dt><dd>{vm.detail.remitToAddress ?? '—'}</dd>
					<dt>{i18n.t('Identificación fiscal')}</dt><dd>{vm.detail.taxId ?? '—'}</dd>
					<dt>{i18n.t('Condiciones de pago')}</dt><dd>{vm.detail.paymentTerms ?? '—'}</dd>
					<dt>{i18n.t('Estado')}</dt><dd>{vm.detail.isActive === false ? i18n.t('Inactivo') : i18n.t('Activo')}</dd>
					<dt>{i18n.t('Creado')}</dt><dd>{vm.detail.createdAt}</dd>
					<dt>{i18n.t('Actualizado')}</dt><dd>{vm.detail.updatedAt}</dd>
				</dl>
			{/if}
			<div class="form-actions"><button type="button" onclick={() => vm.closeDetail()}>{i18n.t('Cerrar')}</button></div>
		</div>
	</div>
{/if}

{#if confirmTarget && confirmMode}
	<div class="overlay" role="presentation">
		<div class="dialog panel" role="alertdialog" aria-modal="true" aria-labelledby="vendor-confirm-title">
			<h2 id="vendor-confirm-title">{confirmMode === 'deactivate' ? i18n.t('Desactivar proveedor') : i18n.t('Eliminar proveedor')}</h2>
			<p>{confirmMode === 'deactivate'
				? i18n.t('El proveedor dejará de aparecer como activo. Podrás consultarlo en el filtro Inactivos y reactivarlo editándolo.')
				: i18n.t('Esta acción eliminará permanentemente el proveedor y no se puede deshacer.')}</p>
			{#if vm.error}<p class="error" role="alert">{vm.error}</p>{/if}
			<div class="form-actions">
				<button type="button" onclick={closeConfirm}>{i18n.t('Cancelar')}</button>
				<button class:danger={confirmMode === 'delete'} class="primary" type="button" onclick={() => void confirmAction()} disabled={vm.saving}>{vm.saving ? i18n.t('Procesando…') : confirmMode === 'deactivate' ? i18n.t('Desactivar') : i18n.t('Eliminar')}</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.page{max-width:78rem;margin:1.5rem auto;padding:0 1.1rem 2rem;color:var(--ink)}
	.page-header,.panel-heading,.filters,.pagination,.form-actions{display:flex;align-items:center;justify-content:space-between;gap:.8rem}
	.page-header{margin-bottom:1.25rem}.page-header h1{margin:0;font:700 1.65rem var(--disp)}.subtitle{margin:.35rem 0 0;color:var(--slate);font-size:.9rem}.eyebrow{margin:0 0 .35rem;font:600 .65rem var(--disp);letter-spacing:.14em;color:var(--slate)}
	button,input,select,textarea{font:inherit}button{border:1px solid var(--line);border-radius:8px;padding:.52rem .75rem;background:var(--card);color:var(--ink);cursor:pointer}button:disabled{opacity:.5;cursor:not-allowed}.primary{background:var(--navy);border-color:var(--navy);color:#fff}.danger{color:var(--danger)}.link{border:0;background:none;padding:0;color:var(--navy);text-align:left;text-decoration:underline}.vendor-name{font-weight:650;text-decoration:none}
	.panel{border:1px solid var(--line);border-radius:12px;background:var(--card);padding:1rem}.editor{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.85rem;margin-bottom:1.2rem}.panel-heading{grid-column:1/-1}.panel-heading h2,.dialog h2{margin:0;font-size:1.05rem}.canonical{font: .75rem ui-monospace,monospace;color:var(--slate);overflow-wrap:anywhere}.editor label,.filters label{display:grid;gap:.35rem;color:var(--slate);font-size:.8rem}.editor input,.editor textarea,.filters input,.filters select{width:100%;min-width:0;box-sizing:border-box;border:1px solid var(--line);border-radius:8px;padding:.55rem .65rem;background:var(--surface);color:var(--ink)}.editor .check{display:flex;align-items:center;gap:.5rem}.editor .check input{width:auto}.form-actions{grid-column:1/-1;justify-content:flex-end}
	.filters{justify-content:flex-start;align-items:flex-end;margin:1rem 0}.search-field{flex:1;min-width:14rem}.filter-field{width:12rem}.filters label span{font-size:.72rem;font-weight:600;text-transform:uppercase;letter-spacing:.04em}.table-wrap{overflow:auto;border:1px solid var(--line);border-radius:12px;background:var(--card)}table{width:100%;border-collapse:collapse;white-space:nowrap;font-size:.84rem}th,td{text-align:left;padding:.72rem .8rem;border-bottom:1px solid var(--line)}th{background:var(--surface);color:var(--slate);font-size:.7rem;text-transform:uppercase;letter-spacing:.04em}tbody tr:last-child td{border-bottom:0}.row-actions{display:flex;gap:.3rem}.row-actions button{font-size:.76rem;padding:.35rem .5rem}.status-pill{display:inline-block;padding:.2rem .5rem;border-radius:999px;background:var(--surface);color:var(--slate);font-size:.75rem}.status-pill.active{background:color-mix(in oklab,var(--success) 12%,var(--surface));color:var(--success)}.pagination{margin-top:.9rem;color:var(--slate);font-size:.82rem}.pagination div{display:flex;gap:.35rem}.empty,.status{padding:1.5rem;color:var(--slate)}.error{padding:.7rem .85rem;border:1px solid color-mix(in oklab,var(--danger) 35%,var(--line));border-radius:8px;color:var(--danger);margin:.8rem 0}
	.overlay{position:fixed;inset:0;z-index:80;display:grid;place-items:center;padding:1rem;background:rgb(10 20 35 / .48)}.dialog{width:min(44rem,100%);max-height:min(85dvh,48rem);overflow:auto}.dialog p{color:var(--slate);line-height:1.5}.detail-grid{display:grid;grid-template-columns:minmax(10rem,.7fr) minmax(0,1.3fr);gap:.55rem .9rem;margin:1rem 0}.detail-grid dt{color:var(--slate);font-size:.82rem}.detail-grid dd{margin:0;overflow-wrap:anywhere;font-size:.88rem}
	@media(max-width:700px){.page-header,.pagination{align-items:flex-start;flex-direction:column}.editor{grid-template-columns:1fr}.panel-heading{align-items:flex-start;flex-direction:column}.filters{align-items:stretch;flex-direction:column}.search-field,.filter-field{width:100%}.detail-grid{grid-template-columns:1fr;gap:.2rem}.detail-grid dd{margin-bottom:.55rem}.row-actions{flex-wrap:wrap}}
</style>
