<script lang="ts">
	import { onMount } from 'svelte';
	import { createWarehousesState } from '../state/warehousesState.svelte';
	import { authSession } from '../../../../infrastructure/auth/AuthSession';
	import type { Warehouse } from '../../domain/entity/Warehouse';

	const state = createWarehousesState();
	let showForm = $state(false);
	let editing = $state<Warehouse | null>(null);
	let deleteTarget = $state<Warehouse | null>(null);
	let form = $state({ code: '', name: '', address: '', active: true });

	const canOpenLayout = $derived(
		authSession.getUser()?.role === 'ADMIN' ||
		['zones', 'bins'].every(key => authSession.getUser()?.allowedPages.includes(key))
	);

	onMount(() => { void state.load(); });

	function openCreate() {
		editing = null;
		form = { code: '', name: '', address: '', active: true };
		showForm = true;
	}
	function openEdit(warehouse: Warehouse) {
		editing = warehouse;
		form = {
			code: warehouse.code,
			name: warehouse.name,
			address: warehouse.address ?? '',
			active: warehouse.active
		};
		showForm = true;
	}
	async function save() {
		const ok = editing
			? await state.update({ id: editing.id, name: form.name, address: form.address || null, active: form.active })
			: await state.create({ code: form.code, name: form.name, address: form.address || null });
		if (ok) showForm = false;
	}
	async function remove() {
		if (deleteTarget && await state.remove(deleteTarget.id)) deleteTarget = null;
	}
</script>

<section class="page">
	<header class="page-header">
		<div><h1>Almacenes</h1><p class="subtitle">Maestro de almacenes</p></div>
		<button class="primary" type="button" onclick={openCreate}>Nuevo almacén</button>
	</header>

	{#if state.loading}
		<p class="status">Cargando almacenes…</p>
	{:else if state.error && !state.loadedOnce}
		<p class="error" role="alert">{state.error}</p>
		<button type="button" onclick={() => state.load()}>Reintentar</button>
	{:else if state.warehouses.length === 0}
		<p class="empty">No hay almacenes registrados.</p>
	{:else}
		<div class="table-wrap"><table>
			<thead><tr><th>Código</th><th>Nombre</th><th>Dirección</th><th>Estado</th><th>Acciones</th></tr></thead>
			<tbody>
				{#each state.warehouses as wh (wh.id)}
					<tr>
						<td class="mono">{wh.code}</td><td>{wh.name}</td><td>{wh.address ?? '—'}</td>
						<td><span class:inactive={!wh.active} class="status-pill">{wh.active ? 'Activo' : 'Inactivo'}</span></td>
						<td class="actions">
							{#if canOpenLayout}<a href={'/warehouses/' + wh.id}>Zonas y bins</a>{/if}
							<button type="button" class="quiet" onclick={() => openEdit(wh)}>Editar</button>
							<button type="button" class="danger" onclick={() => deleteTarget = wh}>Eliminar</button>
						</td>
					</tr>
				{/each}
			</tbody>
		</table></div>
	{/if}
	{#if state.error && state.loadedOnce}<p class="error" role="alert">{state.error}</p>{/if}
</section>

{#if showForm}
	<div class="backdrop" role="presentation" onclick={(e) => { if (e.target === e.currentTarget) showForm = false; }}>
		<section class="dialog" role="dialog" aria-modal="true" aria-labelledby="warehouse-form-title">
			<h2 id="warehouse-form-title">{editing ? 'Editar almacén' : 'Nuevo almacén'}</h2>
			<form onsubmit={(e) => { e.preventDefault(); void save(); }}>
				{#if !editing}
					<label>Código<input bind:value={form.code} maxlength="32" required disabled={state.mutating} /></label>
				{/if}
				<label>Nombre<input bind:value={form.name} maxlength="256" required disabled={state.mutating} /></label>
				<label>Dirección<input bind:value={form.address} maxlength="512" disabled={state.mutating} /></label>
				{#if editing}<label class="check"><input type="checkbox" bind:checked={form.active} disabled={state.mutating} /> Activo</label>{/if}
				{#if state.error}<p class="error" role="alert">{state.error}</p>{/if}
				<footer><button type="button" class="quiet" onclick={() => showForm = false} disabled={state.mutating}>Cancelar</button>
					<button type="submit" class="primary" disabled={state.mutating}>{state.mutating ? 'Guardando…' : 'Guardar'}</button></footer>
			</form>
		</section>
	</div>
{/if}

{#if deleteTarget}
	<div class="backdrop">
		<section class="dialog" role="alertdialog" aria-modal="true">
			<h2>Eliminar almacén</h2>
			<p>¿Eliminar <strong>{deleteTarget.code} — {deleteTarget.name}</strong>? La operación solo será posible si no tiene inventario, bins ni zonas asociados.</p>
			{#if state.error}<p class="error" role="alert">{state.error}</p>{/if}
			<footer><button type="button" class="quiet" onclick={() => deleteTarget = null} disabled={state.mutating}>Cancelar</button>
				<button type="button" class="danger" onclick={remove} disabled={state.mutating}>{state.mutating ? 'Eliminando…' : 'Eliminar'}</button></footer>
		</section>
	</div>
{/if}

<style>
	.page { max-width: 68rem; margin: 1.5rem auto; padding: 0 1.25rem; font-family: var(--body); }
	.page-header { display:flex; align-items:center; justify-content:space-between; gap:1rem; margin-bottom:1.25rem; }
	h1 { margin:0; font:700 1.65rem var(--disp); color:var(--ink); } h2 { margin:0 0 1rem; font:650 1.2rem var(--disp); color:var(--ink); }
	.subtitle { margin:.25rem 0 0; color:var(--slate); font-size:.9rem; }
	.table-wrap { overflow-x:auto; border:1px solid var(--line); border-radius:var(--radius-card); background:var(--card); }
	table { width:100%; border-collapse:collapse; font-size:.88rem; } th,td { padding:.7rem .8rem; border-bottom:1px solid var(--line); text-align:left; white-space:nowrap; } th { background:var(--surface-subtle,#f7fafc); color:var(--slate); font-size:.76rem; text-transform:uppercase; letter-spacing:.04em; }
	.mono { font-family:var(--mono); } .status-pill { padding:.2rem .5rem; border-radius:99px; background:#e8f5ed; color:#17643a; font-size:.76rem; font-weight:600; } .status-pill.inactive { background:#f1f2f4; color:#687386; }
	.actions { display:flex; align-items:center; gap:.45rem; } .actions a { color:var(--navy); text-decoration:none; font-weight:600; }
	.primary,.quiet,.danger { padding:.48rem .8rem; border-radius:8px; border:1px solid var(--line); cursor:pointer; font:600 .85rem var(--body); }
	.primary { background:var(--navy); border-color:var(--navy); color:#fff; } .quiet { background:var(--card); color:var(--ink); } .danger { background:#fff; color:var(--danger); border-color:color-mix(in srgb,var(--danger) 35%,var(--line)); }
	button:disabled { opacity:.55; cursor:not-allowed; } .status,.empty { color:var(--slate); padding:1rem 0; } .error { color:var(--danger); font-size:.88rem; }
	.backdrop { position:fixed; inset:0; z-index:50; display:grid; place-items:center; padding:1rem; background:rgba(12,22,36,.48); }
	.dialog { width:min(100%,30rem); padding:1.35rem; border:1px solid var(--line); border-radius:14px; background:var(--card); box-shadow:var(--shadow-2,0 20px 60px #0003); }
	form { display:flex; flex-direction:column; gap:.85rem; } label { display:flex; flex-direction:column; gap:.3rem; color:var(--slate); font-size:.84rem; font-weight:600; } label input:not([type=checkbox]) { width:100%; box-sizing:border-box; padding:.58rem .65rem; border:1px solid var(--line); border-radius:var(--radius-field); color:var(--ink); font:400 .92rem var(--body); }
	.check { flex-direction:row; align-items:center; } footer { display:flex; justify-content:flex-end; gap:.5rem; margin-top:.35rem; }
	@media(max-width:640px) { .page-header { align-items:flex-start; flex-direction:column; } .actions { flex-wrap:wrap; } }
</style>
