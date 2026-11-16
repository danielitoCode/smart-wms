<script lang="ts">
	import { onMount, getContext } from 'svelte';
	import type { I18nState } from '#lib/i18n/i18n.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import UiBanner from '#lib/components/UiBanner.svelte';
	import { createInboundActivityState } from '../state/inboundActivityState.svelte';
	import { INBOUND_RESOURCES, type InboundActivityResource, type InboundActivityStatus } from '../../domain/entity/InboundActivity';
	import { resolveInboundCanonicalLink } from '../links/inboundCanonicalLink';
	const i18n = getContext<I18nState>('i18n');
	const vm = createInboundActivityState();
	onMount(() => { void vm.load(); });
	const resourceLabels: Record<InboundActivityResource, string> = {
		sales_orders: 'Pedidos de venta', items: 'Artículos', customers: 'Clientes',
		vendors: 'Proveedores', purchase_orders: 'Órdenes de compra'
	};
	const moduleLinks: Record<InboundActivityResource, string> = {
		sales_orders: '/management/sales-orders', items: '/items', customers: '/management/customers',
		vendors: '/management/vendors', purchase_orders: '/management/purchase-orders'
	};
	const canonicalLink = $derived(vm.detail ? resolveInboundCanonicalLink(vm.detail.row.resource, vm.detail.canonicalPayload, vm.detail.row.canonicalId) : null);
	function formatDate(value: string | null) {
		if (!value) return '—';
		const date = new Date(value);
		return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
	}
	function prettyPayload(value: unknown) {
		return value == null ? 'No disponible (retención o payload vacío)' : JSON.stringify(value, null, 2);
	}
</script>
<section class="page">
	<PageHeader title={i18n.t('Actividad entrante')} subtitle={i18n.t('Consulta los eventos inbound aceptados, su origen, estado y registro canónico asociado.')} />
	{#if vm.error}<UiBanner tone="error" message={vm.error} /><button class="secondary retry" type="button" onclick={() => void vm.load()} disabled={vm.loading}>{i18n.t('Reintentar')}</button>{/if}
	<form class="filters" onsubmit={(event) => { event.preventDefault(); void vm.applyFilters(); }}>
		<label>{i18n.t('Sistema origen')}<input value={vm.sourceSystem} oninput={(event) => vm.setSourceSystem(event.currentTarget.value)} placeholder="fabric" /></label>
		<label>{i18n.t('Recurso')}<select value={vm.resource} onchange={(event) => vm.setResource(event.currentTarget.value as InboundActivityResource | '')}>
			<option value="">{i18n.t('Todos')}</option>{#each INBOUND_RESOURCES as item}<option value={item}>{resourceLabels[item]}</option>{/each}
		</select></label>
		<label>{i18n.t('Estado')}<select value={vm.status} onchange={(event) => vm.setStatus(event.currentTarget.value as InboundActivityStatus | '')}>
			<option value="">{i18n.t('Todos')}</option><option value="applied">{i18n.t('Procesado')}</option><option value="superseded">{i18n.t('Sustituido')}</option>
		</select></label>
		<label>{i18n.t('Recibido desde')}<input type="datetime-local" value={vm.since} oninput={(event) => vm.setSince(event.currentTarget.value)} /></label>
		<label>{i18n.t('Recibido hasta')}<input type="datetime-local" value={vm.until} oninput={(event) => vm.setUntil(event.currentTarget.value)} /></label>
		<div class="actions"><button type="submit" disabled={vm.loading}>{i18n.t('Aplicar filtros')}</button>
			<button type="button" class="secondary" onclick={() => void vm.load()} disabled={vm.loading}>{i18n.t('Actualizar')}</button></div>
	</form>
	{#if vm.loading && vm.rows.length === 0}<p class="muted" role="status">{i18n.t('Cargando actividad entrante…')}</p>
	{:else if vm.rows.length === 0 && vm.error}<p class="empty">{i18n.t('No se pudo recuperar la actividad. Revisa el error anterior e inténtalo de nuevo.')}</p>
	{:else if vm.rows.length === 0}<p class="empty">{vm.loading ? i18n.t('Cargando actividad entrante…') : i18n.t('No hay actividad entrante para estos filtros.')}</p>
	{:else}
		{#if vm.loading}<p class="muted" role="status">{i18n.t('Actualizando actividad…')}</p>{/if}
		<div class="table-wrap"><table><thead><tr>
			<th>{i18n.t('Recibido')}</th><th>{i18n.t('Recurso')}</th><th>{i18n.t('Sistema origen')}</th>
			<th>{i18n.t('ID externo')}</th><th>{i18n.t('Versión')}</th><th>{i18n.t('Estado')}</th><th>{i18n.t('Acciones')}</th>
		</tr></thead><tbody>
			{#each vm.rows as row (`${row.resource}-${row.inboundId})}
				<tr><td>{formatDate(row.receivedAt)}</td><td>{resourceLabels[row.resource]}</td><td class="mono">{row.sourceSystem}</td>
					<td class="mono">{row.externalId}</td><td class="mono">{row.externalVersion}</td>
					<td><span class:processed={row.status === 'applied'} class="status">{row.status === 'applied' ? i18n.t('Procesado') : i18n.t('Sustituido')}</span></td>
					<td><button type="button" class="link-button" onclick={() => void vm.openDetail(row)}>{i18n.t('Ver detalle')}</button></td></tr>
			{/each}
		</tbody></table></div>
		<footer class="pagination"><span>{vm.total} {i18n.t('registros')} · {i18n.t('Página')} {vm.page}</span><div>
			<button class="secondary" type="button" disabled={vm.page <= 1 || vm.loading} onclick={() => { vm.setPage(vm.page - 1); void vm.load(); }}>{i18n.t('Anterior')}</button>
			<button class="secondary" type="button" disabled={!vm.hasNext || vm.loading} onclick={() => { vm.setPage(vm.page + 1); void vm.load(); }}>{i18n.t('Siguiente')}</button>
		</div></footer>
	{/if}
	{#if vm.detailLoading}<section class="detail" aria-live="polite"><p>{i18n.t('Cargando detalle…')}</p><div class="skeleton-line"></div><div class="skeleton-line short"></div></section>{/if}
	{#if vm.detailError}<UiBanner tone="error" message={vm.detailError} />{#if vm.selectedRow}<button class="secondary retry" type="button" onclick={() => void vm.openDetail(vm.selectedRow!)} disabled={vm.detailLoading}>{i18n.t('Reintentar detalle')}</button>{/if}{/if}
	{#if vm.detail}
		<section class="detail"><header><div><p class="eyebrow">{i18n.t('Detalle del evento')}</p><h2>{resourceLabels[vm.detail.row.resource]} #{vm.detail.row.inboundId}</h2></div>
			<button class="secondary" type="button" onclick={() => vm.clearDetail()}>{i18n.t('Cerrar')}</button></header>
			<dl>
				<dt>{i18n.t('Sistema origen')}</dt><dd>{vm.detail.row.sourceSystem}</dd>
				<dt>{i18n.t('ID externo')}</dt><dd class="mono">{vm.detail.row.externalId}</dd>
				<dt>{i18n.t('Versión')}</dt><dd>{vm.detail.row.externalVersion}</dd>
				<dt>{i18n.t('Recibido')}</dt><dd>{formatDate(vm.detail.row.receivedAt)}</dd>
				<dt>{i18n.t('Estado')}</dt><dd>{vm.detail.row.status}</dd>
				<dt>{i18n.t('Sustituido')}</dt><dd>{formatDate(vm.detail.row.supersededAt)}</dd>
				<dt>{i18n.t('ID canónico')}</dt><dd class="mono">{vm.detail.row.canonicalId ?? '—'}</dd>
				<dt>{i18n.t('Token de ingesta')}</dt><dd>{vm.detail.row.ingestedViaTokenId ?? '—'}</dd>
				<dt>{i18n.t('Registro canónico')}</dt><dd>{#if canonicalLink}<a href={canonicalLink.href}>{i18n.t('Buscar registro')} · {canonicalLink.label}</a>{:else}<a href={moduleLinks[vm.detail.row.resource]}>{i18n.t('Abrir módulo')} · {resourceLabels[vm.detail.row.resource]}</a><span class="hint">{i18n.t('No existe una ruta de detalle verificable para este identificador canónico; el enlace abre el módulo, no un registro específico.')}</span>{/if}</dd>
			</dl>
			{#if !vm.detail.sourcePayloadRetained}<p class="notice">{i18n.t('El payload de origen fue eliminado por la política de retención.')}</p>{/if}
			<div class="payloads"><section><h3>{i18n.t('Payload de origen')}</h3><pre>{prettyPayload(vm.detail.sourcePayload)}</pre></section>
				<section><h3>{i18n.t('Payload canónico')}</h3><pre>{prettyPayload(vm.detail.canonicalPayload)}</pre></section></div>
			<p class="hint">{i18n.t('Los campos sensibles se ocultan en el servidor. Esta vista es de solo lectura; los intentos rechazados no generan filas de staging.')}</p>
		</section>
	{/if}
</section>
<style>
	.page{max-width:76rem;margin:0 auto;padding:1.5rem 1.25rem}
	.filters{display:grid;grid-template-columns:repeat(auto-fit,minmax(10rem,1fr));gap:.8rem;align-items:end;margin:1rem 0;padding:1rem;border:1px solid var(--line);border-radius:var(--radius-card);background:var(--surface)}
	label{display:grid;gap:.35rem;font-size:.8rem;font-weight:600;color:var(--slate)}
	input,select{min-width:0;width:100%;padding:.55rem .65rem;border:1px solid var(--line);border-radius:var(--radius-field);background:var(--bg);color:var(--ink)}
	button{padding:.5rem .8rem;border:1px solid var(--navy);border-radius:var(--radius-field);background:var(--navy);color:white;cursor:pointer}
	button:disabled{opacity:.5;cursor:not-allowed}.secondary{background:var(--surface);color:var(--ink);border-color:var(--line)}
	.actions,.pagination,.pagination>div{display:flex;gap:.5rem;align-items:center;justify-content:space-between}
	.table-wrap{overflow:auto;border:1px solid var(--line);border-radius:var(--radius-card);background:var(--surface)}
	table{width:100%;border-collapse:collapse;white-space:nowrap;font-size:.84rem}th,td{padding:.7rem .8rem;border-bottom:1px solid var(--line);text-align:left}
	th{font-size:.72rem;text-transform:uppercase;letter-spacing:.04em;color:var(--slate);background:var(--surface)}
	.mono{font-family:ui-monospace,SFMono-Regular,monospace}.status{display:inline-block;padding:.2rem .45rem;border-radius:1rem;background:color-mix(in srgb,var(--danger) 12%,transparent);color:var(--danger);font-size:.75rem}
	.status.processed{background:color-mix(in srgb,var(--success) 12%,transparent);color:var(--success)}.link-button{padding:0;border:0;background:none;color:var(--navy);text-decoration:underline}
	.pagination{padding:.8rem .1rem;color:var(--slate);font-size:.82rem}.detail{margin-top:1.25rem;padding:1rem;border:1px solid var(--line);border-radius:var(--radius-card);background:var(--surface)}
	.detail>header{display:flex;justify-content:space-between;align-items:center;gap:1rem}h2{margin:.1rem 0 .8rem;font-size:1.15rem}
	.eyebrow{margin:0;color:var(--slate);font-size:.7rem;text-transform:uppercase;letter-spacing:.1em}
	dl{display:grid;grid-template-columns:minmax(8rem,12rem) minmax(0,1fr);gap:.45rem .8rem;font-size:.84rem}dt{color:var(--slate)}dd{margin:0;overflow-wrap:anywhere}
	.payloads{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,22rem),1fr));gap:1rem;margin-top:1rem}h3{font-size:.9rem}
	pre{max-height:22rem;overflow:auto;padding:.8rem;border:1px solid var(--line);border-radius:var(--radius-field);background:var(--bg);font-size:.76rem;white-space:pre-wrap;overflow-wrap:anywhere}
	.notice{padding:.65rem;background:var(--surface);border-left:3px solid var(--slate)}.hint,.muted,.empty{color:var(--slate);font-size:.82rem}.hint{display:block;margin-top:.25rem}.retry{margin:.25rem 0 .8rem}.skeleton-line{height:.75rem;width:70%;margin:.65rem 0;border-radius:6px;background:var(--line);animation:pulse 1.2s ease-in-out infinite}.skeleton-line.short{width:42%}@keyframes pulse{50%{opacity:.45}}
	@media(max-width:600px){.actions{grid-column:1/-1;justify-content:flex-start}.pagination{align-items:flex-start;flex-direction:column}dl{grid-template-columns:1fr;gap:.2rem}dd{margin-bottom:.5rem}}
</style>
