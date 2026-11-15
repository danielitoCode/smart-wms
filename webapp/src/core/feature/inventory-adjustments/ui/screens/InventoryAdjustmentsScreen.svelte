<script lang="ts">
	import { getContext } from 'svelte';
	import { page } from '$app/state';
	import type { I18nState } from '../../../../../lib/i18n/i18n.svelte';
	import { createInventoryAdjustmentsState } from '../state/inventoryAdjustmentsState.svelte';
	import { authSession } from '../../../../infrastructure/auth/AuthSession';
	import { canPerform } from '../../../auth/domain/policy/AccessPolicy';
	import { AdjustmentApprovalPolicy } from '../../domain/policy/AdjustmentApprovalPolicy';
	import type {
		CreateInventoryAdjustment,
		InventoryAdjustment,
		InventoryAdjustmentStatus
	} from '../../domain/entity/InventoryAdjustment';

	const i18n = getContext<I18nState>('i18n');
	const selection = getContext<{ warehouseId: number | null }>('warehouseSelection');
	const vm = createInventoryAdjustmentsState();
	const approvals = $derived(page.params.feature === 'count-approvals');
	let editorOpen = $state(false);
	let detail = $state<InventoryAdjustment | null>(null);
	let itemId = $state('');
	let binId = $state('');
	let quantity = $state('1');
	let reason = $state('');
	let type = $state<'ADD' | 'REMOVE'>('ADD');
	let status = $state<InventoryAdjustmentStatus | 'ALL'>('ALL');

	$effect(() => {
		const warehouseId = selection?.warehouseId ?? null;
		const isApprovals = approvals;
		const selectedStatus = status;
		void vm.load(warehouseId, {
			pendingOnly: isApprovals && selectedStatus === 'PENDING',
			status: selectedStatus !== 'ALL' ? selectedStatus : null
		});
	});

	function canReview(): boolean {
		const user = authSession.getUser();
		if (!user) return false;
		return canPerform(user.role, user.allowedPages, user.allowedOverrides ?? [], {
			pageKey: 'adjustments',
			capability: 'approve_or_modify'
		});
	}

	async function openDetail(row: InventoryAdjustment) {
		detail = await vm.getDetail(row.adjustmentId, selection?.warehouseId ?? null);
	}

	async function create() {
		const input: CreateInventoryAdjustment = {
			itemId: Number(itemId),
			binId: Number(binId),
			warehouseId: selection?.warehouseId ?? 0,
			type,
			quantity: Number(quantity),
			reason
		};
		if (await vm.createDirect(input, selection?.warehouseId ?? null)) {
			editorOpen = false;
			itemId = '';
			binId = '';
			quantity = '1';
			reason = '';
		}
	}

	async function decide(row: InventoryAdjustment, action: 'approve' | 'reject') {
		if (!AdjustmentApprovalPolicy.canTransition(row.status, action)) return;
		const rejectionReason = action === 'reject'
			? window.prompt(i18n.t('Indica el motivo del rechazo (obligatorio, máximo 500 caracteres):'))?.trim()
			: undefined;
		if (action === 'reject' && !rejectionReason) return;
		if (rejectionReason && rejectionReason.length > 500) {
			window.alert(i18n.t('El motivo no puede superar 500 caracteres.'));
			return;
		}
		const label = action === 'approve' ? 'aprobar' : 'rechazar';
		const confirmation = action === 'approve'
			? 'La aprobación modificará las existencias del almacén. ¿Deseas continuar?'
			: 'El ajuste quedará rechazado y no modificará las existencias. ¿Deseas continuar?';
		if (!window.confirm(`¿Confirmas ${label} el ajuste #${row.adjustmentId}?\\n\\n${confirmation}`)) return;
		const succeeded = await vm.review(
			{ adjustmentId: row.adjustmentId, action, rejectionReason },
			selection?.warehouseId ?? null
		);
		if (succeeded) detail = null;
	}

	function signed(value: number) {
		return value > 0 ? `+${value}` : String(value);
	}

	function statusLabel(value: InventoryAdjustmentStatus) {
		return value === 'PENDING' ? 'Pendiente' : value === 'APPROVED' ? 'Aprobado' : 'Rechazado';
	}
</script>

<section class="page">
	<header class="page-header">
		<div>
			<p class="eyebrow">ABELLIS · SMART WMS</p>
			<h1>{approvals ? i18n.t('Revisión de ajustes') : i18n.t('Ajustes de inventario')}</h1>
			<p>{approvals
				? i18n.t('Revisa las diferencias pendientes antes de modificar las existencias.')
				: i18n.t('Consulta el historial por estado y registra correcciones directas.')}</p>
		</div>
		{#if !approvals}
			<button class="primary" onclick={() => (editorOpen = !editorOpen)}>
				{editorOpen ? i18n.t('Cerrar formulario') : i18n.t('Nuevo ajuste directo')}
			</button>
		{/if}
	</header>

	{#if vm.error}
		<p class="error" role="alert">{vm.error}</p>
	{/if}
	{#if approvals && !canReview()}
		<p class="error" role="alert">{i18n.t('Necesitas el permiso Ajustes para consultar y decidir aprobaciones.')}</p>
	{/if}
	{#if approvals && !canReview()}
		<p class="error" role="alert">{i18n.t('Necesitas el permiso Ajustes para consultar y decidir aprobaciones.')}</p>
	{/if}
	{#if approvals && !canReview()}
		<p class="error" role="alert">{i18n.t('Necesitas el permiso Ajustes para consultar y decidir aprobaciones.')}</p>
	{/if}

	{#if editorOpen && !approvals}
		<form class="editor" onsubmit={(event) => { event.preventDefault(); void create(); }}>
			<div class="editor-heading">
				<h2>{i18n.t('Registrar ajuste directo')}</h2>
				<p>{i18n.t('Este ajuste se aplicará inmediatamente al inventario y quedará auditado.')}</p>
			</div>
			<label>{i18n.t('ID de producto')}
				<input type="number" min="1" required bind:value={itemId} />
			</label>
			<label>{i18n.t('ID de ubicación')}
				<input type="number" min="1" required bind:value={binId} />
			</label>
			<label>{i18n.t('Tipo de ajuste')}
				<select bind:value={type}>
					<option value="ADD">{i18n.t('Añadir existencias')}</option>
					<option value="REMOVE">{i18n.t('Retirar existencias')}</option>
				</select>
			</label>
			<label>{i18n.t('Cantidad')}
				<input type="number" min="1" max="1000000" step="1" required bind:value={quantity} />
			</label>
			<label class="wide">{i18n.t('Motivo / justificación')}
				<textarea required maxlength="500" rows="3" bind:value={reason}></textarea>
			</label>
			<div class="form-actions">
				<button type="button" onclick={() => (editorOpen = false)}>{i18n.t('Cancelar')}</button>
				<button class="primary" disabled={vm.saving || !selection?.warehouseId}>
					{vm.saving ? i18n.t('Aplicando…') : i18n.t('Confirmar ajuste')}
				</button>
			</div>
		</form>
	{/if}

	<div class="toolbar">
		<div>
			<h2>{approvals
				? status === 'PENDING'
					? i18n.t('Pendientes de revisión')
					: i18n.t('Historial de aprobaciones')
				: i18n.t('Registro de ajustes')}</h2>
			<p>{vm.rows.length} {i18n.t('registros')}</p>
		</div>
		<label class="status-filter">{i18n.t('Estado')}
				<select bind:value={status}>
					<option value="ALL">{i18n.t('Todos')}</option>
					<option value="PENDING">{i18n.t('Pendientes')}</option>
					<option value="APPROVED">{i18n.t('Aprobados')}</option>
					<option value="REJECTED">{i18n.t('Rechazados')}</option>
				</select>
			</label>
	</div>

	{#if vm.loading}
		<div class="loading" aria-live="polite">{i18n.t('Cargando ajustes…')}</div>
	{:else if vm.rows.length === 0}
		<div class="empty">
			<strong>{i18n.t('No hay ajustes para mostrar')}</strong>
			<p>{approvals ? i18n.t('No existen ajustes pendientes en este almacén.') : i18n.t('Prueba otro estado o registra un ajuste directo.')}</p>
		</div>
	{:else}
		<div class="table-wrap">
			<table>
				<thead>
					<tr>
						<th>{i18n.t('Ajuste')}</th>
						<th>SKU / {i18n.t('Producto')}</th>
						<th>{i18n.t('Ubicación')}</th>
						<th>{i18n.t('Tipo')}</th>
						<th>{i18n.t('Diferencia')}</th>
						<th>{i18n.t('Motivo')}</th>
						<th>{i18n.t('Estado')}</th>
						<th>{i18n.t('Registrado por')}</th>
						<th>{i18n.t('Detalle')}</th>
					</tr>
				</thead>
				<tbody>
					{#each vm.rows as row (row.adjustmentId)}
						<tr>
							<td class="mono">#{row.adjustmentId}</td>
							<td><strong>{row.sku ?? row.itemId}</strong><small>{row.itemName ?? ''}</small></td>
							<td>{row.binCode ?? row.binId}</td>
							<td><span class:positive={row.quantityChange > 0} class:negative={row.quantityChange < 0} class="type-pill">{row.quantityChange > 0 ? i18n.t('Entrada') : i18n.t('Salida')}</span></td>
							<td class="mono">{signed(row.quantityChange)}</td>
							<td class="reason">{row.reasonDetail ?? row.reasonCode}</td>
							<td><span class:pending={row.status === 'PENDING'} class:approved={row.status === 'APPROVED'} class:rejected={row.status === 'REJECTED'} class="status-pill">{statusLabel(row.status)}</span></td>
							<td>{row.adjustedBy}</td>
							<td><button class="text-button" onclick={() => void openDetail(row)}>{i18n.t('Ver detalle')}</button></td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</section>

{#if detail}
	<div class="overlay" role="presentation" onclick={(event) => { if (event.target === event.currentTarget) detail = null; }}>
		<dialog open class="detail-panel" aria-labelledby="adjustment-detail-title">
			<div class="detail-header">
				<div><p class="eyebrow">AJUSTE #{detail.adjustmentId}</p><h2 id="adjustment-detail-title">{detail.sku ?? detail.itemId} · {detail.itemName ?? ''}</h2></div>
				<button aria-label={i18n.t('Cerrar')} onclick={() => (detail = null)}>×</button>
			</div>
			<dl>
				<div><dt>{i18n.t('Almacén')}</dt><dd>{detail.warehouseId}</dd></div>
				<div><dt>{i18n.t('Ubicación')}</dt><dd>{detail.binCode ?? detail.binId}</dd></div>
				<div><dt>{i18n.t('Tipo')}</dt><dd>{detail.quantityChange > 0 ? i18n.t('Añadir') : i18n.t('Retirar')}</dd></div>
				<div><dt>{i18n.t('Diferencia')}</dt><dd class="mono">{signed(detail.quantityChange)}</dd></div>
				<div><dt>{i18n.t('Esperado')}</dt><dd>{detail.expectedQuantity ?? '—'}</dd></div>
				<div><dt>{i18n.t('Contado')}</dt><dd>{detail.countedQuantity ?? '—'}</dd></div>
				<div><dt>{i18n.t('Código de motivo')}</dt><dd>{detail.reasonCode}</dd></div>
				<div><dt>{i18n.t('Estado')}</dt><dd>{statusLabel(detail.status)}</dd></div>
				<div><dt>{i18n.t('Registrado por')}</dt><dd>{detail.adjustedBy}</dd></div>
				<div><dt>{i18n.t('Revisado por')}</dt><dd>{detail.reviewedBy ?? '—'}</dd></div>
				<div><dt>{i18n.t('Fecha de revisión')}</dt><dd>{detail.reviewedAt ? new Date(detail.reviewedAt).toLocaleString() : '—'}</dd></div>
				<div><dt>{i18n.t('Fecha')}</dt><dd>{detail.adjustedAt ? new Date(detail.adjustedAt).toLocaleString() : '—'}</dd></div>
			</dl>
			<div class="reason-box"><strong>{i18n.t('Motivo / justificación')}</strong><p>{detail.reasonDetail ?? '—'}</p></div>
			{#if detail.rejectionReason}
				<div class="reason-box rejection-reason"><strong>{i18n.t('Motivo del rechazo')}</strong><p>{detail.rejectionReason}</p></div>
			{/if}
			{#if approvals && detail.status === 'PENDING' && canReview()}
				<div class="decision-actions">
					<button class="danger" disabled={vm.saving} onclick={() => void decide(detail!, 'reject')}>{i18n.t('Rechazar ajuste')}</button>
					<button class="primary" disabled={vm.saving} onclick={() => void decide(detail!, 'approve')}>{i18n.t('Aprobar y aplicar')}</button>
				</div>
			{/if}
		</dialog>
	</div>
{/if}

<style>
	.page{max-width:86rem;margin:1.4rem auto;padding:0 1.1rem;color:var(--ink)}
	.page-header,.toolbar,.detail-header{display:flex;justify-content:space-between;align-items:center;gap:1rem}
	.page-header{margin-bottom:1.4rem}.page-header h1{margin:0;font:700 1.65rem var(--disp)}.page-header p,.toolbar p,.editor-heading p{margin:.35rem 0 0;color:var(--slate);font-size:.88rem}
	.eyebrow{font:600 .65rem var(--disp);letter-spacing:.14em;color:var(--slate)}
	h2{margin:0;font:650 1.05rem var(--disp)}button{border:1px solid var(--line);border-radius:8px;padding:.55rem .8rem;background:var(--card);color:var(--ink);cursor:pointer}button:disabled{opacity:.55;cursor:not-allowed}
	.primary{background:var(--navy);color:white;border-color:var(--navy)}.danger,.error{color:var(--danger)}.error{padding:.75rem;border:1px solid currentColor;border-radius:8px}
	.editor{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.8rem;padding:1rem;border:1px solid var(--line);border-radius:12px;background:var(--card);margin-bottom:1.5rem}
	.editor-heading,.wide,.form-actions{grid-column:1/-1}.editor-heading{padding-bottom:.3rem}.editor label,.status-filter{display:grid;gap:.35rem;color:var(--slate);font-size:.78rem}
	.editor input,.editor select,.editor textarea,.status-filter select{width:100%;min-height:39px;border:1px solid var(--line);border-radius:8px;padding:.55rem .65rem;background:var(--card);color:var(--ink);font:inherit}
	.form-actions{display:flex;justify-content:flex-end;gap:.5rem}.toolbar{margin:1.2rem 0}.toolbar p{font-size:.78rem}.status-filter{min-width:150px}
	.table-wrap{overflow:auto;border:1px solid var(--line);border-radius:12px;background:var(--card)}table{width:100%;border-collapse:collapse;min-width:900px;font-size:.82rem}th,td{text-align:left;padding:.75rem .7rem;border-bottom:1px solid var(--line);vertical-align:middle}th{color:var(--slate);font-size:.68rem;text-transform:uppercase;letter-spacing:.06em}tbody tr:last-child td{border-bottom:0}small{display:block;color:var(--slate);margin-top:.2rem}.mono{font-variant-numeric:tabular-nums;font-family:var(--mono,monospace)}.reason{max-width:230px;white-space:normal}.type-pill,.status-pill{display:inline-flex;padding:.22rem .5rem;border-radius:999px;font-size:.7rem;font-weight:650}.positive,.approved{color:var(--success);background:color-mix(in srgb,var(--success) 12%,transparent)}.negative,.rejected{color:var(--danger);background:color-mix(in srgb,var(--danger) 12%,transparent)}.pending{color:var(--warning);background:color-mix(in srgb,var(--warning) 14%,transparent)}.text-button{border:0;background:transparent;color:var(--accent);padding:.2rem}.empty,.loading{padding:2.5rem;text-align:center;border:1px dashed var(--line);border-radius:12px;color:var(--slate)}.empty strong{color:var(--ink)}.empty p{margin:.4rem 0 0;font-size:.85rem}
	.overlay{position:fixed;inset:0;z-index:50;display:flex;justify-content:flex-end;background:rgb(8 15 30 / 48%)}.detail-panel{width:min(38rem,100%);height:100%;max-width:none;max-height:none;margin:0;border:0;overflow:auto;background:var(--card);padding:1.4rem;box-shadow:-12px 0 40px rgb(0 0 0 / 15%)}.detail-header{align-items:flex-start;margin-bottom:1.3rem}.detail-header h2{font-size:1.2rem}.detail-header button{font-size:1.3rem;line-height:1;padding:.25rem .55rem}
	dl{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.9rem;margin:0}dl div{padding-bottom:.55rem;border-bottom:1px solid var(--line)}dt{font-size:.7rem;color:var(--slate)}dd{margin:.2rem 0 0;font-weight:600}.reason-box{margin-top:1.2rem;padding:1rem;border:1px solid var(--line);border-radius:10px}.reason-box p{margin:.5rem 0 0;white-space:pre-wrap;line-height:1.5}.decision-actions{display:flex;justify-content:flex-end;gap:.6rem;margin-top:1.4rem}
	@media(max-width:650px){.page-header{align-items:flex-start;flex-direction:column}.editor{grid-template-columns:1fr}.editor-heading,.wide,.form-actions{grid-column:1}.toolbar{align-items:flex-start;flex-direction:column}.detail-panel{padding:1rem}dl{grid-template-columns:1fr 1fr}}
</style>
