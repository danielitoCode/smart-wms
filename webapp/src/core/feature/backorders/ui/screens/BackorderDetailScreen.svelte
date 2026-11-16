<script lang="ts">
  import { getContext } from 'svelte';
  import type { I18nState } from '#lib/i18n/i18n.svelte.ts';
  import type { User } from '../../../auth/domain/entity/User';
  import type { CancelBackorderReason } from '../../domain/entity/Backorder';
  import { resolveBackorderWarehouseScope } from '../../domain/policy/BackorderScopePolicy';
  import { createBackordersState } from '../state/backordersState.svelte';

  interface Props { backorderId: number; }
  let { backorderId }: Props = $props();

  const i18n = getContext<I18nState>('i18n');
  const guard = getContext<{ status: string; user: User | null }>('authGuard');
  const vm = createBackordersState();

  let reason = $state<CancelBackorderReason>('other');
  let confirmCancel = $state(false);
  let successMessage = $state('');
  let cancelError = $state<string | null>(null);

  const hasSalesOrderPermission = $derived(
    guard.user?.role === 'ADMIN' || guard.user?.allowedPages.includes('sales-orders') === true
  );
  const order = $derived(vm.detail?.order ?? null);

  function canAccessOrderWarehouse(warehouseId: number | null): boolean {
    try {
      resolveBackorderWarehouseScope({
        role: guard.user?.role ?? 'USER',
        allowedPages: guard.user?.allowedPages ?? [],
        assignedWarehouseIds: guard.user?.warehouseIds ?? [],
        selectedWarehouseId: warehouseId
      });
      return true;
    } catch {
      return false;
    }
  }

  const hasOrderWarehouseAccess = $derived(
    order === null || canAccessOrderWarehouse(order.warehouseId)
  );
  const cancelable = $derived(
    order !== null &&
    hasSalesOrderPermission &&
    hasOrderWarehouseAccess &&
    order.orderType === 'backorder' &&
    order.parentSoId !== null &&
    ['WAITING_STOCK', 'OPEN', 'PICKED', 'PACKED'].includes(order.status)
  );

  $effect(() => {
    if (guard.status === 'authenticated' && hasSalesOrderPermission) {
      void vm.loadDetail(backorderId);
    }
  });

  function formatTimestamp(value: string | null | undefined): string {
    if (!value) return '—';
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
  }

  async function submitCancel(): Promise<void> {
    if (!order || !cancelable) return;
    cancelError = null;
    try {
      resolveBackorderWarehouseScope({
        role: guard.user?.role ?? 'USER',
        allowedPages: guard.user?.allowedPages ?? [],
        assignedWarehouseIds: guard.user?.warehouseIds ?? [],
        selectedWarehouseId: order.warehouseId
      });
    } catch (cause) {
      cancelError = cause instanceof Error ? cause.message : i18n.t('No tienes acceso al almacén seleccionado.');
      return;
    }
    const ok = await vm.cancel(order.salesOrderId, reason);
    if (!ok) {
      cancelError = vm.error;
      return;
    }
    confirmCancel = false;
    successMessage = reason === 'refunded'
      ? i18n.t('Backorder marcado como reembolsado. El pedido original no fue cancelado.')
      : i18n.t('Backorder cancelado. El pedido original no fue modificado.');
    await vm.loadDetail(backorderId);
  }
</script>

<section class="page">
  <a class="back-link" href="/management/backorders">{i18n.t('Volver a pedidos pendientes')}</a>

  {#if guard.status !== 'authenticated'}
    <p class="message">{i18n.t('Verificando permisos…')}</p>
  {:else if !hasSalesOrderPermission}
    <div class="message error" role="alert">
      <h1>{i18n.t('Permiso adicional requerido')}</h1>
      <p>{i18n.t('La cola de backorders está disponible, pero el detalle y la cancelación utilizan las operaciones de Sales Orders. Necesitas el permiso Pedidos de venta para continuar.')}</p>
    </div>
  {:else if vm.detailLoading}
    <p class="empty">{i18n.t('Cargando detalle del backorder…')}</p>
  {:else if vm.detailError}
    <p class="message error" role="alert">{vm.detailError}</p>
  {:else if order && !hasOrderWarehouseAccess}
    <p class="message error" role="alert">{i18n.t('No tienes acceso al almacén de este pedido.')}</p>
  {:else if order}
    <header class="header">
      <div>
        <p class="eyebrow">SMART WMS · BACKORDER</p>
        <h1>{order.salesOrderNumber}</h1>
        <p>{order.customerName || i18n.t('Cliente no especificado')} · {i18n.t('Almacén')} {order.warehouseId ?? '—'}</p>
      </div>
      <span class="status">{order.status}</span>
    </header>

    {#if successMessage}
      <p class="message success" role="status">{successMessage}</p>
    {/if}
    {#if vm.error}
      <p class="message error" role="alert">{vm.error}</p>
    {/if}

    <div class="grid">
      <article class="panel">
        <h2>{i18n.t('Relación del pedido')}</h2>
        <dl>
          <dt>{i18n.t('Pedido pendiente')}</dt><dd>{order.salesOrderNumber}</dd>
          <dt>{i18n.t('Tipo de pedido')}</dt><dd>{order.orderType ?? '—'}</dd>
          <dt>{i18n.t('Pedido original')}</dt>
          <dd>
            {#if order.parentSoId !== null}
              <a href={'/sales-orders/' + order.parentSoId}>{order.parentSoNumber || order.parentSalesOrderNumber || order.parentSoId}</a>
            {:else}
              {order.parentSoNumber || order.parentSalesOrderNumber || '—'}
            {/if}
          </dd>
          <dt>{i18n.t('Estado del pedido original')}</dt><dd>{order.parentSoId === null ? '—' : i18n.t('Abre el pedido original para consultar su estado.')}</dd>
          <dt>{i18n.t('Motivo de cancelación')}</dt><dd>{order.cancellationReason || '—'}</dd>
        </dl>
        {#if order.parentSoId === null}
          <p class="hint">{i18n.t('Este pedido no tiene una relación de pedido padre disponible. Puede ser una orden POS retenida por falta de stock y no es cancelable mediante la operación específica de backorders.')}</p>
        {/if}
      </article>

      <article class="panel">
        <h2>{i18n.t('Seguimiento')}</h2>
        <dl>
          <dt>{i18n.t('Pendiente desde')}</dt><dd>{formatTimestamp(order.backorderOpenedAt)}</dd>
          <dt>{i18n.t('Disponible para despacho desde')}</dt><dd>{formatTimestamp(order.backorderFulfillableAt)}</dd>
          <dt>{i18n.t('Prioridad')}</dt><dd>{order.priority}</dd>
          <dt>{i18n.t('Origen')}</dt><dd>{order.orderOrigin || order.sourceSystem || '—'}</dd>
        </dl>
      </article>
    </div>

    <article class="panel lines-panel">
      <h2>{i18n.t('Líneas del pedido')}</h2>
      {#if order.lines.length === 0}
        <p class="hint">{i18n.t('El detalle no contiene líneas.')}</p>
      {:else}
        <div class="table-wrap">
          <table>
            <thead><tr>
              <th>{i18n.t('SKU')}</th><th>{i18n.t('Artículo')}</th>
              <th>{i18n.t('Solicitado')}</th><th>{i18n.t('Reservado')}</th>
              <th>{i18n.t('Recogido')}</th><th>{i18n.t('Empacado')}</th><th>{i18n.t('Enviado')}</th>
            </tr></thead>
            <tbody>
              {#each order.lines as line (line.soLineId)}
                <tr>
                  <td>{line.sku}</td><td>{line.itemName}</td>
                  <td>{line.quantityOrdered}</td><td>{line.quantityAllocated}</td>
                  <td>{line.quantityPicked}</td><td>{line.quantityPacked}</td><td>{line.quantityShipped}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </article>

    {#if order.orderType !== 'backorder' && order.backorderOpenedAt !== null}
      <p class="message warning">{i18n.t('Este pedido aparece en la cola por falta de inventario, pero no es una orden de tipo backorder con pedido padre. El endpoint de cancelación específica no lo admite.')}</p>
    {/if}

    {#if cancelable}
      <div class="actions">
        <button class="danger" type="button" disabled={vm.saving} onclick={() => { confirmCancel = true; cancelError = null; }}>
          {i18n.t('Cancelar backorder')}
        </button>
      </div>
    {:else if order.status === 'SHIPPED'}
      <p class="hint">{i18n.t('Un backorder enviado no puede cancelarse por esta operación.')}</p>
    {/if}

    {#if confirmCancel}
      <div class="overlay">
        <section class="dialog" role="dialog" aria-modal="true" aria-labelledby="cancel-title">
          <h2 id="cancel-title">{i18n.t('Confirmar cancelación')}</h2>
          <p>{i18n.t('Se cancelará únicamente el backorder')} <strong>{order.salesOrderNumber}</strong>. {i18n.t('El pedido original')} <strong>{order.parentSoNumber || order.parentSalesOrderNumber || order.parentSoId}</strong> {i18n.t('no se cancelará por esta acción.')}</p>
          {#if order.status === 'WAITING_STOCK'}
            <p class="hint">{i18n.t('Este estado no mantiene reservas de inventario; la cancelación no requiere liberar cantidades recogidas.')}</p>
          {:else if order.status === 'OPEN'}
            <p class="hint">{i18n.t('Si existen reservas activas, el servidor liberará las cantidades asignadas y las tareas pendientes.')}</p>
          {:else}
            <p class="hint">{i18n.t('El servidor restaurará las cantidades recogidas/empacadas en la ubicación de recepción predeterminada y limpiará el estado operativo de las líneas.')}</p>
          {/if}
          <label>{i18n.t('Motivo')}
            <select bind:value={reason}>
              <option value="found">{i18n.t('Existencias encontradas')}</option>
              <option value="customer_asked">{i18n.t('Solicitado por el cliente')}</option>
              <option value="refunded">{i18n.t('Reembolsado')}</option>
              <option value="other">{i18n.t('Otro')}</option>
            </select>
          </label>
          {#if cancelError}
            <p class="message error" role="alert">{cancelError}</p>
          {/if}
          <footer>
            <button type="button" disabled={vm.saving} onclick={() => confirmCancel = false}>{i18n.t('Conservar backorder')}</button>
            <button class="danger" type="button" disabled={vm.saving} onclick={() => void submitCancel()}>
              {vm.saving ? i18n.t('Cancelando…') : i18n.t('Confirmar cancelación')}
            </button>
          </footer>
        </section>
      </div>
    {/if}
  {:else}
    <p class="empty">{i18n.t('No se encontró el pedido pendiente.')}</p>
  {/if}
</section>

<style>
  .page{max-width:82rem;margin:1.5rem auto;padding:0 1.25rem;color:var(--ink)}
  .back-link{display:inline-block;margin-bottom:1rem;color:var(--accent);font-size:.82rem;text-decoration:none}
  .back-link:hover{text-decoration:underline}
  .header{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;margin-bottom:1.1rem}
  .eyebrow{font:600 .65rem var(--disp);letter-spacing:.13em;color:var(--slate);margin:0 0 .35rem}
  h1{margin:0;font:700 1.7rem var(--disp)}
  .header p:last-child{color:var(--slate);font-size:.85rem}
  .status{border:1px solid var(--line);border-radius:99px;padding:.35rem .65rem;font-size:.75rem}
  .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.9rem;margin-bottom:.9rem}
  .panel{border:1px solid var(--line);border-radius:12px;background:var(--card);padding:1rem;min-width:0}
  h2{margin:0 0 .8rem;font:650 1rem var(--disp)}
  dl{display:grid;grid-template-columns:minmax(9rem,.8fr) minmax(0,1.2fr);gap:.5rem .8rem;margin:0;font-size:.8rem}
  dt{color:var(--slate)} dd{margin:0;overflow-wrap:anywhere}
  a{color:var(--accent)}
  .hint{color:var(--slate);font-size:.78rem;line-height:1.5}
  .lines-panel{margin-top:.9rem}
  .table-wrap{overflow-x:auto}
  table{width:100%;border-collapse:collapse;font-size:.78rem;white-space:nowrap}
  th,td{text-align:left;padding:.65rem .55rem;border-bottom:1px solid var(--line)}
  th{color:var(--slate);font-weight:650}
  .actions{display:flex;justify-content:flex-end;margin-top:1rem}
  button{border:1px solid var(--line);border-radius:8px;padding:.55rem .8rem;background:var(--card);color:var(--ink);cursor:pointer}
  button:disabled{opacity:.55;cursor:not-allowed}
  .danger{border-color:var(--danger);color:var(--danger)}
  .message{padding:.7rem .85rem;border:1px solid var(--line);border-radius:8px;font-size:.82rem;margin:.8rem 0}
  .error{color:var(--danger)} .success{color:var(--success)} .warning{color:var(--slate)}
  .empty{padding:2rem 0;color:var(--slate)}
  .overlay{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;background:#0008;padding:1rem}
  .dialog{width:min(100%,34rem);padding:1.2rem;border:1px solid var(--line);border-radius:14px;background:var(--card);box-shadow:0 20px 60px #0003}
  .dialog p{font-size:.84rem;line-height:1.5}
  .dialog label{display:grid;gap:.35rem;font-size:.8rem;color:var(--slate);margin:1rem 0}
  .dialog select{min-height:40px;border:1px solid var(--line);border-radius:8px;padding:.5rem;background:var(--card);color:var(--ink)}
  .dialog footer{display:flex;justify-content:flex-end;gap:.5rem;flex-wrap:wrap;margin-top:1rem}
  @media(max-width:700px){.grid{grid-template-columns:1fr}.header{flex-direction:column}dl{grid-template-columns:1fr;gap:.2rem}dd{margin-bottom:.5rem}}
</style>
