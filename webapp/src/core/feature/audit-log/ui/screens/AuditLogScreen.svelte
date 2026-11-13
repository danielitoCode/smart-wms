<script lang="ts">
	import { onMount, getContext } from 'svelte';
	import type { I18nState } from '#lib/i18n/i18n.svelte';
	import { createAuditLogState } from '../state/auditLogState.svelte';

	const i18n = getContext<I18nState>('i18n');
	const vm = createAuditLogState();

	onMount(() => { void vm.load(); });

	function formatDate(value: string | null): string {
		if (!value) return '—';
		const d = new Date(value);
		return Number.isNaN(d.getTime()) ? value : d.toLocaleString(i18n.locale);
	}
</script>

<section class="page">
	<header>
		<div>
			<p class="eyebrow">ABELLIS · SMART WMS</p>
			<h1>{i18n.t('Registro de auditoría')}</h1>
			<p>{i18n.t('Historial de acciones operativas y de seguridad.')}</p>
		</div>
	</header>

	{#if vm.error}<p class="error" role="alert">{vm.error}</p>{/if}

	<div class="toolbar">
		<input type="text" placeholder={i18n.t('Tipo de acción')} value={vm.actionType}
			oninput={(e) => vm.setActionType(e.currentTarget.value)} />
		<input type="text" placeholder={i18n.t('Tipo de entidad')} value={vm.entityType}
			oninput={(e) => vm.setEntityType(e.currentTarget.value)} />
		<button type="button" onclick={() => { vm.setPage(1); void vm.load(); }} disabled={vm.loading}>
			{i18n.t('Filtrar')}
		</button>
	</div>

	{#if vm.loading}
		<p>{i18n.t('Cargando…')}</p>
	{:else if vm.rows.length === 0}
		<p class="empty">{i18n.t('No hay entradas de auditoría.')}</p>
	{:else}
		<div class="table-wrap">
			<table>
				<thead>
					<tr>
						<th>{i18n.t('Fecha')}</th>
						<th>{i18n.t('Acción')}</th>
						<th>{i18n.t('Entidad')}</th>
						<th>{i18n.t('ID')}</th>
						<th>{i18n.t('Usuario')}</th>
						<th>{i18n.t('Almacén')}</th>
					</tr>
				</thead>
				<tbody>
					{#each vm.rows as row (row.logId)}
						<tr>
							<td>{formatDate(row.createdAt)}</td>
							<td><span class="tag">{row.actionType}</span></td>
							<td>{row.entityType}</td>
							<td>{row.entityId ?? '—'}</td>
							<td>{row.username ?? row.userId ?? '—'}</td>
							<td>{row.warehouseId ?? '—'}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<div class="pager">
			<button type="button" disabled={vm.page <= 1 || vm.loading} onclick={() => { vm.setPage(vm.page - 1); void vm.load(); }}>{i18n.t('Anterior')}</button>
			<span>{i18n.t('Página')} {vm.page} · {vm.total} {i18n.t('total')}</span>
			<button type="button" disabled={vm.loading || vm.rows.length < vm.perPage} onclick={() => { vm.setPage(vm.page + 1); void vm.load(); }}>{i18n.t('Siguiente')}</button>
		</div>
	{/if}
</section>

<style>
	.page { max-width: 64rem; margin: 0 auto; padding: 2rem 1.25rem; }
	header { margin-bottom: 1.25rem; }
	.eyebrow { margin: 0; font-size: 0.68rem; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; color: var(--navy); }
	h1 { margin: 0.2rem 0 0.35rem; font-size: 1.45rem; }
	header p { margin: 0; color: var(--slate); font-size: 0.92rem; }
	.toolbar { display: flex; flex-wrap: wrap; gap: 0.6rem; margin-bottom: 1rem; }
	.toolbar input { min-width: 10rem; padding: 0.5rem 0.65rem; border: 1px solid var(--line); border-radius: var(--radius-field); }
	.toolbar button, .pager button { padding: 0.5rem 0.85rem; border: 1px solid var(--line); border-radius: 8px; background: var(--surface); cursor: pointer; }
	.error { color: var(--danger); }
	.empty { color: var(--slate); }
	.table-wrap { overflow: auto; border: 1px solid var(--line); border-radius: 10px; }
	table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
	th, td { padding: 0.65rem 0.75rem; border-bottom: 1px solid var(--line); text-align: left; }
	th { background: var(--surface); font-weight: 600; color: var(--slate); }
	.tag { display: inline-block; padding: 0.15rem 0.45rem; border-radius: 999px; background: var(--surface); border: 1px solid var(--line); font-size: 0.75rem; font-weight: 600; }
	.pager { display: flex; align-items: center; gap: 0.75rem; margin-top: 0.9rem; color: var(--slate); font-size: 0.88rem; }
</style>
