<script lang="ts">
	import { onMount, getContext } from 'svelte';
	import type { I18nState } from '#lib/i18n/i18n.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import UiBanner from '#lib/components/UiBanner.svelte';
	import { createAuditLogState } from '../state/auditLogState.svelte';
	import type { AuditEvent } from '../../domain/entity/AuditLogEntry';

	const i18n = getContext<I18nState>('i18n');
	const vm = createAuditLogState();
	onMount(() => { void vm.load(); });

	function formatDate(value: string | null): string {
		if (!value) return '—';
		const date = new Date(value);
		return Number.isNaN(date.getTime()) ? value : date.toLocaleString(i18n.locale);
	}
	function formatMetadata(value: unknown): string {
		if (value == null) return 'Sin metadata disponible';
		try { return JSON.stringify(value, null, 2) ?? String(value); } catch { return String(value); }
	}
	function metadataPreview(value: unknown): string {
		if (value == null) return '—';
		const raw = typeof value === 'string' ? value : (JSON.stringify(value) ?? String(value));
		return raw.length > 140 ? raw.slice(0, 137) + '…' : raw;
	}
	function actorLabel(row: AuditEvent) { return row.actor || 'Actor no disponible'; }
</script>

<section class="page">
	<PageHeader title={i18n.t('Registro de auditoría')} subtitle={i18n.t('Historial de acciones operativas y de seguridad. Los eventos son de solo lectura.')} />
	{#if vm.error}<UiBanner tone="error" message={vm.error} />{/if}

	<form class="filters" onsubmit={(event) => { event.preventDefault(); void vm.applyFilters(); }}>
		<label>{i18n.t('Acción')}
			<input value={vm.actionType} oninput={(event) => vm.setActionType(event.currentTarget.value)} placeholder="TOKEN_ISSUE" />
		</label>
		<label>{i18n.t('Actor / usuario')}
			<input value={vm.actor} oninput={(event) => vm.setActor(event.currentTarget.value)} placeholder={i18n.t('Nombre de usuario')} />
		</label>
		<label>{i18n.t('ID de artículo')}
			<input type="number" min="1" step="1" value={vm.itemId} oninput={(event) => vm.setItemId(event.currentTarget.value)} placeholder="—" />
		</label>
		<label>{i18n.t('Desde')}
			<input type="date" value={vm.startDate} oninput={(event) => vm.setStartDate(event.currentTarget.value)} />
		</label>
		<label>{i18n.t('Hasta')}
			<input type="date" value={vm.endDate} oninput={(event) => vm.setEndDate(event.currentTarget.value)} />
		</label>
		<div class="filter-actions">
			<button type="submit" disabled={vm.loading}>{i18n.t('Aplicar filtros')}</button>
			<button class="secondary" type="button" onclick={vm.clearFilters} disabled={vm.loading}>{i18n.t('Limpiar')}</button>
		</div>
	</form>

	<div class="table-meta">
		<span>{vm.total} {i18n.t('eventos')}</span>
		<label>{i18n.t('Filas por página')}
			<select value={String(vm.perPage)} onchange={(event) => { const value = Number(event.currentTarget.value); if (value) { void vm.changePerPage(value); } }}>
				<option value="25">25</option><option value="50">50</option><option value="100">100</option>
			</select>
		</label>
	</div>

	{#if vm.loading && vm.rows.length === 0}
		<p class="empty" role="status">{i18n.t('Cargando auditoría…')}</p>
	{:else if vm.rows.length === 0}
		<p class="empty">{i18n.t('No hay eventos para los filtros seleccionados.')}</p>
	{:else}
		<div class="table-wrap">
			<table>
				<thead><tr>
					<th><button class="sort" type="button" disabled={vm.loading} onclick={() => void vm.changeSort('created_at')}>{i18n.t('Fecha')} {vm.sortBy === 'created_at' ? (vm.sortDirection === 'asc' ? '↑' : '↓') : ''}</button></th>
					<th><button class="sort" type="button" disabled={vm.loading} onclick={() => void vm.changeSort('action_type')}>{i18n.t('Acción')} {vm.sortBy === 'action_type' ? (vm.sortDirection === 'asc' ? '↑' : '↓') : ''}</button></th>
					<th><button class="sort" type="button" disabled={vm.loading} onclick={() => void vm.changeSort('entity_type')}>{i18n.t('Recurso')} {vm.sortBy === 'entity_type' ? (vm.sortDirection === 'asc' ? '↑' : '↓') : ''}</button></th>
					<th><button class="sort" type="button" disabled={vm.loading} onclick={() => void vm.changeSort('user_id')}>{i18n.t('Actor')} {vm.sortBy === 'user_id' ? (vm.sortDirection === 'asc' ? '↑' : '↓') : ''}</button></th><th>{i18n.t('Almacén')}</th><th>{i18n.t('Contexto')}</th><th></th>
				</tr></thead>
				<tbody>
					{#each vm.rows as row (row.logId)}
						<tr>
							<td class="date">{formatDate(row.occurredAt)}</td>
							<td><span class="tag">{row.action}</span></td>
							<td><strong>{row.resourceType || '—'}</strong><small>{row.resourceName ?? row.resourceId ?? '—'}</small></td>
							<td>{actorLabel(row)}{#if row.deviceId}<small>{i18n.t('Dispositivo')}: {row.deviceId}</small>{/if}</td>
							<td>{row.warehouseCode ?? row.warehouseId ?? '—'}</td>
							<td class="metadata">{metadataPreview(row.metadata)}</td>
							<td><button class="link" type="button" onclick={() => vm.openDetail(row)}>{i18n.t('Detalle')}</button></td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		{#if vm.loading}<p class="loading-note" role="status">{i18n.t('Actualizando…')}</p>{/if}
	{/if}

	<footer class="pagination">
		<span>{i18n.t('Página')} {vm.page} / {vm.pages} · {vm.total} {i18n.t('registros')}</span>
		<div>
			<button class="secondary" type="button" disabled={vm.page <= 1 || vm.loading} onclick={() => void vm.changePage(vm.page - 1)}>{i18n.t('Anterior')}</button>
			<button class="secondary" type="button" disabled={vm.page >= vm.pages || vm.loading} onclick={() => void vm.changePage(vm.page + 1)}>{i18n.t('Siguiente')}</button>
		</div>
	</footer>
</section>

{#if vm.selected}
	<div class="backdrop" role="presentation" onclick={(event) => { if (event.target === event.currentTarget) vm.closeDetail(); }}>
		<section class="detail" role="dialog" aria-modal="true" aria-labelledby="audit-detail-title">
			<header><div><p class="eyebrow">{i18n.t('Evento de auditoría')} #{vm.selected.logId}</p><h2 id="audit-detail-title">{vm.selected.action}</h2></div>
				<button class="secondary" type="button" onclick={vm.closeDetail}>{i18n.t('Cerrar')}</button></header>
			<dl>
				<dt>{i18n.t('Fecha')}</dt><dd>{formatDate(vm.selected.occurredAt)}</dd>
				<dt>{i18n.t('Actor')}</dt><dd>{actorLabel(vm.selected)}</dd>
				<dt>{i18n.t('Recurso')}</dt><dd>{vm.selected.resourceType} · {vm.selected.resourceName ?? vm.selected.resourceId ?? '—'}</dd>
				<dt>{i18n.t('Almacén')}</dt><dd>{vm.selected.warehouseCode ?? vm.selected.warehouseId ?? '—'}</dd>
				<dt>{i18n.t('Dispositivo')}</dt><dd>{vm.selected.deviceId ?? '—'}</dd>
			</dl>
			<h3>{i18n.t('Metadata / contexto')}</h3>
			<pre>{formatMetadata(vm.selected.metadata)}</pre>
			<p class="privacy">{i18n.t('Los valores sensibles identificados se ocultan antes de mostrarse. El registro no permite modificar ni eliminar eventos.')}</p>
		</section>
	</div>
{/if}

<style>
	.page{max-width:82rem;margin:0 auto;padding:1.5rem 1.25rem 3rem;color:var(--ink)}
	.filters{display:grid;grid-template-columns:repeat(auto-fit,minmax(10rem,1fr));gap:.75rem;align-items:end;margin:1rem 0;padding:1rem;border:1px solid var(--line);border-radius:var(--radius-card);background:var(--surface)}
	label{display:grid;gap:.35rem;font-size:.78rem;font-weight:600;color:var(--slate)}
	input,select{box-sizing:border-box;min-width:0;width:100%;padding:.55rem .65rem;border:1px solid var(--line);border-radius:var(--radius-field);background:var(--bg);color:var(--ink);font:inherit}
	button{padding:.5rem .8rem;border:1px solid var(--navy);border-radius:var(--radius-field);background:var(--navy);color:white;cursor:pointer}
	button:disabled{opacity:.5;cursor:not-allowed}.secondary{background:var(--surface);color:var(--ink);border-color:var(--line)}
	.filter-actions{display:flex;gap:.5rem}.table-meta{display:flex;justify-content:space-between;align-items:center;color:var(--slate);font-size:.82rem;margin:.8rem 0}
	.table-meta label{display:flex;align-items:center;gap:.5rem}.table-meta select{width:auto}
	.table-wrap{overflow:auto;border:1px solid var(--line);border-radius:var(--radius-card);background:var(--surface)}
	table{width:100%;border-collapse:collapse;white-space:nowrap;font-size:.82rem}th,td{padding:.7rem .75rem;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}
	th{background:var(--surface);color:var(--slate);font-size:.7rem;text-transform:uppercase;letter-spacing:.04em}
	.sort{padding:0;border:0;background:none;color:inherit;font:inherit;text-transform:inherit;letter-spacing:inherit}
	td small{display:block;margin-top:.2rem;color:var(--slate);font-size:.72rem}
	.date{font-variant-numeric:tabular-nums;color:var(--slate)}.tag{display:inline-block;padding:.18rem .45rem;border:1px solid var(--line);border-radius:6px;background:var(--surface-2);font:600 .72rem ui-monospace,monospace}
	.metadata{max-width:16rem;overflow:hidden;text-overflow:ellipsis;color:var(--slate);font-size:.75rem}.link{padding:0;border:0;background:none;color:var(--navy);text-decoration:underline}
	.empty{padding:2rem;text-align:center;color:var(--slate)}.loading-note{color:var(--slate);font-size:.78rem}
	.pagination{display:flex;justify-content:space-between;align-items:center;gap:1rem;margin-top:.9rem;color:var(--slate);font-size:.82rem}.pagination>div{display:flex;gap:.5rem}
	.backdrop{position:fixed;inset:0;z-index:160;display:grid;place-items:center;padding:1rem;background:#0008}
	.detail{width:min(48rem,100%);max-height:90vh;overflow:auto;padding:1.25rem;border:1px solid var(--line);border-radius:14px;background:var(--surface);box-shadow:var(--shadow-2)}
	.detail header{display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;margin-bottom:1rem}.eyebrow{margin:0;color:var(--slate);font-size:.68rem;letter-spacing:.1em;text-transform:uppercase}
	h2{margin:.25rem 0;font-size:1.2rem}h3{margin:1.1rem 0 .5rem;font-size:.9rem}
	dl{display:grid;grid-template-columns:9rem minmax(0,1fr);gap:.55rem .8rem;font-size:.83rem}dt{color:var(--slate)}dd{margin:0;overflow-wrap:anywhere}
	pre{max-height:22rem;overflow:auto;padding:.85rem;border:1px solid var(--line);border-radius:8px;background:var(--bg);font-size:.75rem;white-space:pre-wrap;overflow-wrap:anywhere}
	.privacy{margin:.8rem 0 0;color:var(--slate);font-size:.75rem;line-height:1.5}
	@media(max-width:600px){.pagination{align-items:flex-start;flex-direction:column}.table-meta{align-items:flex-start;gap:.5rem;flex-direction:column}dl{grid-template-columns:1fr;gap:.2rem}dd{margin-bottom:.45rem}}
</style>
