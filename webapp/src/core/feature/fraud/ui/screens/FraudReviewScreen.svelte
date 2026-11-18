<script lang="ts">
  import { getContext } from 'svelte';
  import UiLoader from '../../../../../lib/components/UiLoader.svelte';
  import type { I18nState } from '../../../../../lib/i18n/i18n.svelte';
  import type { WarehouseSelectionState } from '../../../warehouses/ui/state/warehouseSelectionState.svelte';
  import { createFraudReviewState } from '../state/fraudReviewState.svelte';

  const i18n = getContext<I18nState>('i18n');
  const warehouseSelection = getContext<WarehouseSelectionState>('warehouseSelection');
  const vm = createFraudReviewState();
  let memoDrafts = $state<Record<number, string>>({});
  let searchInput = $state('');
  let activeQuery = $state('');

  $effect(() => {
    const warehouseId = warehouseSelection.warehouseId;
    const initialized = warehouseSelection.initialized;
    if (initialized && warehouseId !== null) void vm.load(warehouseId, activeQuery);
    else vm.clear();
  });

  function search() {
    activeQuery = searchInput.trim();
    const warehouseId = warehouseSelection.warehouseId;
    if (warehouseId !== null) void vm.load(warehouseId, activeQuery);
  }

  async function openDetail(id: number) {
    const warehouseId = warehouseSelection.warehouseId;
    if (warehouseId !== null) await vm.openDetail(id, warehouseId);
  }

  async function saveMemo(id: number) {
    const warehouseId = warehouseSelection.warehouseId;
    if (warehouseId === null) return;
    const draft = memoDrafts[id] ?? vm.rows.find((row) => row.salesOrderId === id)?.memo ?? '';
    const saved = await vm.updateMemo(id, draft, warehouseId);
    if (saved) delete memoDrafts[id];
  }

  async function pushToQueue(id: number) {
    const warehouseId = warehouseSelection.warehouseId;
    if (warehouseId === null) return;
    if (confirm(i18n.t('¿Liberar este pedido para que vuelva a la cola de preparación?'))) {
      await vm.push(id, warehouseId);
    }
  }

  function address(parts: Array<string | null>) {
    return parts.filter((part) => Boolean(part?.trim())).join(', ') || '—';
  }
</script>

<section class="page">
  <header>
    <div>
      <p class="eyebrow">ABELLIS · SMART WMS</p>
      <h1>{i18n.t('Revisión de pedidos')}</h1>
      <p>{i18n.t('Pedidos retenidos por revisión manual antes de preparación.')}</p>
    </div>
    <button type="button" onclick={() => { const id = warehouseSelection.warehouseId; if (id !== null) void vm.load(id, activeQuery); }} disabled={vm.loading || warehouseSelection.warehouseId === null}>
      {i18n.t('Actualizar')}
    </button>
  </header>

  <aside class="security-notice" role="note">
    <strong>{i18n.t('Alcance de seguridad pendiente')}</strong>
    <p>{i18n.t('La consulta se filtra por el almacén seleccionado en esta pantalla. Flask todavía no valida el almacén del pedido en el detalle ni en las acciones de memo y retorno a cola; este filtro de interfaz no sustituye el control del servidor.')}</p>
    <p>{i18n.t('Los cambios se registran en auditoría, pero el backend no ofrece un endpoint para consultar aquí el historial.')}</p>
  </aside>

  <div class="filters">
    <label for="fraud-search">{i18n.t('Buscar pedido o cliente')}</label>
    <input id="fraud-search" bind:value={searchInput} onkeydown={(event) => event.key === 'Enter' && search()} placeholder="SO-…"/>
    <button type="button" onclick={search} disabled={vm.loading || warehouseSelection.warehouseId === null}>{i18n.t('Buscar')}</button>
    <span class="warehouse">
      {i18n.t('Almacén')}: {warehouseSelection.warehouses.find((item) => item.id === warehouseSelection.warehouseId)?.name ?? warehouseSelection.warehouseId ?? '—'}
    </span>
  </div>

  {#if vm.error}
    <p class="error" role="alert">{vm.error}</p>
  {/if}

  {#if warehouseSelection.loading || !warehouseSelection.initialized}
    <UiLoader label={i18n.t('Cargando almacenes…')} />
  {:else if warehouseSelection.warehouseId === null}
    <p class="empty">{i18n.t('No hay un almacén autorizado seleccionado. Selecciona un almacén para consultar la bandeja.')}</p>
  {:else if vm.loading}
    <UiLoader label={i18n.t('Cargando pedidos retenidos…')} />
  {:else if vm.rows.length === 0}
    <p class="empty">{i18n.t('No hay pedidos retenidos para este almacén.')}</p>
  {:else}
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>{i18n.t('Pedido')}</th>
            <th>{i18n.t('Cliente')}</th>
            <th>{i18n.t('Facturación')}</th>
            <th>{i18n.t('Envío')}</th>
            <th>{i18n.t('Origen')}</th>
            <th>{i18n.t('Fecha')}</th>
            <th>{i18n.t('Observaciones')}</th>
            <th>{i18n.t('Acciones')}</th>
          </tr>
        </thead>
        <tbody>
          {#each vm.rows as row (row.salesOrderId)}
            <tr>
              <td>
                <strong>{row.salesOrderNumber}</strong>
                <small>#{row.salesOrderId} · {row.status}</small>
              </td>
              <td>{row.customerName ?? '—'}<small>{row.customerPhone ?? ''}</small></td>
              <td>{address([row.billingAddressLine1, row.billingAddressLine2, row.billingAddressCity, row.billingAddressState, row.billingAddressPostalCode])}</td>
              <td>{address([row.shippingAddressLine1, row.shippingAddressLine2, row.shippingAddressCity, row.shippingAddressState, row.shippingAddressPostalCode])}</td>
              <td>{row.orderOrigin ?? row.orderSource ?? '—'}</td>
              <td>{row.createdAt ?? '—'}</td>
              <td>
                <textarea
                  rows="2"
                  maxlength="4000"
                  value={memoDrafts[row.salesOrderId] ?? row.memo ?? ''}
                  oninput={(event) => memoDrafts[row.salesOrderId] = event.currentTarget.value}
                  aria-label={i18n.t('Observaciones del pedido') + ' ' + row.salesOrderNumber}
                  disabled={vm.saving}
                ></textarea>
                <small>{(memoDrafts[row.salesOrderId] ?? row.memo ?? '').length}/4000</small>
                <button type="button" onclick={() => void saveMemo(row.salesOrderId)} disabled={vm.saving || (memoDrafts[row.salesOrderId] ?? row.memo ?? '') === (row.memo ?? '')}>
                  {i18n.t('Guardar nota')}
                </button>
              </td>
              <td class="actions">
                <button type="button" onclick={() => void openDetail(row.salesOrderId)} disabled={vm.detailLoading}>{i18n.t('Ver detalle')}</button>
                <button class="primary" type="button" onclick={() => void pushToQueue(row.salesOrderId)} disabled={vm.saving}>
                  {i18n.t('Enviar a preparación')}
                </button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}

  {#if vm.detailLoading}
    <UiLoader label={i18n.t('Cargando detalle…')} />
  {:else if vm.selectedDetail}
    <section class="detail" aria-label={i18n.t('Detalle del pedido')}>
      <header class="detail-header">
        <div><h2>{i18n.t('Detalle')} · {vm.selectedDetail.order.salesOrderNumber}</h2><p>{i18n.t('Almacén')} {vm.selectedDetail.order.warehouseId} · {vm.selectedDetail.order.status}</p></div>
        <button type="button" onclick={() => vm.closeDetail()}>{i18n.t('Cerrar')}</button>
      </header>
      <div class="detail-grid">
        <div><strong>{i18n.t('Facturación')}</strong><p>{address([vm.selectedDetail.order.billingAddressLine1, vm.selectedDetail.order.billingAddressLine2, vm.selectedDetail.order.billingAddressCity, vm.selectedDetail.order.billingAddressState, vm.selectedDetail.order.billingAddressPostalCode])}</p></div>
        <div><strong>{i18n.t('Envío')}</strong><p>{address([vm.selectedDetail.order.shippingAddressLine1, vm.selectedDetail.order.shippingAddressLine2, vm.selectedDetail.order.shippingAddressCity, vm.selectedDetail.order.shippingAddressState, vm.selectedDetail.order.shippingAddressPostalCode])}</p></div>
        <div><strong>{i18n.t('Sistema origen')}</strong><p>{vm.selectedDetail.sourceSystem ?? vm.selectedDetail.order.orderOrigin ?? vm.selectedDetail.order.orderSource ?? '—'}</p></div>
        <div><strong>{i18n.t('Cliente')}</strong><p>{vm.selectedDetail.order.customerName ?? '—'} · {vm.selectedDetail.order.customerPhone ?? '—'}</p></div>
      </div>
      <h3>{i18n.t('Líneas del pedido')}</h3>
      <div class="table-wrap"><table><thead><tr><th>{i18n.t('SKU')}</th><th>{i18n.t('Producto')}</th><th>{i18n.t('Solicitado')}</th><th>{i18n.t('Asignado')}</th><th>{i18n.t('Preparado')}</th><th>{i18n.t('Empacado')}</th><th>{i18n.t('Enviado')}</th><th>{i18n.t('Estado')}</th></tr></thead><tbody>
        {#each vm.selectedDetail.lines as line (line.lineId)}
          <tr><td>{line.sku ?? line.itemId}</td><td>{line.itemName}</td><td>{line.quantityOrdered}</td><td>{line.quantityAllocated}</td><td>{line.quantityPicked}</td><td>{line.quantityPacked}</td><td>{line.quantityShipped}</td><td>{line.status}</td></tr>
        {/each}
      </tbody></table></div>
      <p class="history-note">{i18n.t('El backend registra los cambios de memo y la liberación en audit_log, pero no ofrece un endpoint para consultar el historial desde esta pantalla.')}</p>
    </section>
  {/if}
</section>

<style>
  .page{max-width:90rem;margin:1.4rem auto;padding:0 1.1rem;color:var(--ink)}
  header{display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;margin-bottom:1rem}
  h1{margin:0;font:700 1.6rem var(--disp)}
  header p{color:var(--slate);font-size:.9rem}
  .eyebrow{font:600 .65rem var(--disp);letter-spacing:.14em}
  button{border:1px solid var(--line);border-radius:8px;padding:.5rem .7rem;background:var(--card);color:var(--ink);cursor:pointer}
  button:disabled{opacity:.55;cursor:not-allowed}
  .primary{background:var(--navy);color:#fff;border-color:var(--navy)}
  .security-notice{border:1px solid var(--warning,var(--line));border-radius:10px;padding:.75rem 1rem;margin:1rem 0;background:var(--surface)}
  .security-notice p{margin:.35rem 0;color:var(--slate);font-size:.82rem;line-height:1.45}
  .filters{display:flex;align-items:center;gap:.55rem;flex-wrap:wrap;margin:1rem 0}
  .filters label{font-size:.82rem;font-weight:600}
  .filters input{min-width:14rem;max-width:24rem;border:1px solid var(--line);border-radius:8px;padding:.5rem .65rem;background:var(--card);color:var(--ink)}
  .warehouse{margin-left:auto;color:var(--slate);font-size:.82rem}
  .actions{min-width:10rem}.actions button{display:block;margin-bottom:.35rem}
  .detail{margin-top:1.25rem;padding:1rem;border:1px solid var(--line);border-radius:12px;background:var(--card)}
  .detail-header{align-items:center}.detail-header h2{margin:0;font-size:1.1rem}.detail-header p{margin:.25rem 0;color:var(--slate)}
  .detail-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem;margin:1rem 0}.detail-grid p{margin:.35rem 0;color:var(--slate);font-size:.85rem}
  .detail h3{font-size:.95rem}.history-note{padding:.65rem;border-radius:8px;background:var(--surface);color:var(--slate);font-size:.8rem}
  .table-wrap{overflow:auto;border:1px solid var(--line);border-radius:12px;background:var(--card)}
  table{width:100%;min-width:76rem;border-collapse:collapse;font-size:.82rem}
  th,td{text-align:left;padding:.65rem;border-bottom:1px solid var(--line);vertical-align:top}
  th{color:var(--slate);font-size:.7rem;text-transform:uppercase;white-space:nowrap}
  td small{display:block;color:var(--slate);font-size:.72rem;margin-top:.2rem}
  textarea{width:100%;min-width:12rem;max-width:18rem;border:1px solid var(--line);border-radius:8px;padding:.4rem;background:var(--card);color:var(--ink);resize:vertical}
  .error{color:var(--danger)}
  .empty{color:var(--slate);padding:1rem}
  @media(max-width:720px){header{flex-direction:column}.warehouse{margin-left:0}.filters input{flex:1;min-width:10rem}.detail-grid{grid-template-columns:1fr}}
</style>
