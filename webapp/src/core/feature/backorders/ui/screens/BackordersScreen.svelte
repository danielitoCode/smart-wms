<script lang="ts">
	import UiStatePanel from '#lib/components/UiStatePanel.svelte';
  import { getContext } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import type { I18nState } from '#lib/i18n/i18n.svelte.ts';
  import type { User } from '../../../auth/domain/entity/User';
  import { createBackordersState } from '../state/backordersState.svelte';
  import type { Backorder, BackorderQueueTab, CancelBackorderReason } from '../../domain/entity/Backorder';
  import { resolveBackorderWarehouseScope } from '../../domain/policy/BackorderScopePolicy';

  const i18n = getContext<I18nState>('i18n');
  const selection = getContext<{ warehouseId: number | null }>('warehouseSelection');
  const guard = getContext<{ status: string; user: User | null }>('authGuard');
  const vm = createBackordersState();

  let search = $state('');
  let scopeError = $state(false);
  let scopeErrorMessage = $state('');
  let cancelTarget = $state<Backorder | null>(null);
  let cancelReason = $state<CancelBackorderReason>('other');
  let cancelError = $state('');
  let successMessage = $state('');

  const canOpenSalesOrderDetail = $derived(
    guard.user?.role === 'ADMIN' || guard.user?.allowedPages.includes('sales-orders') === true
  );
  const activeTab = $derived<BackorderQueueTab>(
    page.url.searchParams.get('tab') === 'ready-to-ship' ? 'ready-to-ship' : 'waiting'
  );
  const visibleRows = $derived.by(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return vm.rows;
    return vm.rows.filter((row) =>
      [
        row.salesOrderNumber,
        row.parentSalesOrderNumber,
        row.customerName,
        ...row.items.flatMap((item) => [item.sku, item.itemName, item.openPurchaseOrder?.purchaseOrderNumber ?? ''])
      ].some((value) => value?.toLocaleLowerCase().includes(query))
    );
  });

  $effect(() => {
    if (guard.status !== 'authenticated') return;
    try {
      const warehouseId = resolveBackorderWarehouseScope({
        role: guard.user?.role ?? 'USER',
        assignedWarehouseIds: guard.user?.warehouseIds ?? [],
        selectedWarehouseId: selection?.warehouseId ?? null
      });
      scopeError = false;
      scopeErrorMessage = '';
      void vm.load(warehouseId, activeTab);
    } catch (cause) {
      scopeError = true;
      scopeErrorMessage = cause instanceof Error ? cause.message : i18n.t('No tienes acceso al almacén seleccionado.');
    }
  });

  function canAccessWarehouse(warehouseId: number): boolean {
    try {
      resolveBackorderWarehouseScope({
        role: guard.user?.role ?? 'USER',
        assignedWarehouseIds: guard.user?.warehouseIds ?? [],
        selectedWarehouseId: warehouseId
      });
      return true;
    } catch {
      return false;
    }
  }

  function openCancel(row: Backorder): void {
    if (!canOpenSalesOrderDetail || !canAccessWarehouse(row.warehouseId)) return;
    cancelTarget = row;
    cancelReason = 'other';
    cancelError = '';
  }

  async function submitCancel(): Promise<void> {
    if (!cancelTarget || vm.saving) return;
    cancelError = '';
    if (!canAccessWarehouse(cancelTarget.warehouseId)) {
      cancelError = i18n.t('No tienes acceso al almacén de este backorder.');
      return;
    }

    const target = cancelTarget;
    const ok = await vm.cancel(target.salesOrderId, cancelReason);
    if (!ok) {
      cancelError = vm.error || i18n.t('No se pudo cancelar el backorder.');
      return;
    }

    cancelTarget = null;
    successMessage = cancelReason === 'refunded'
      ? i18n.t('Backorder marcado como reembolsado. El pedido original no fue cancelado.')
      : i18n.t('Backorder cancelado. El pedido original no fue modificado.');

    try {
      const warehouseId = resolveBackorderWarehouseScope({
        role: guard.user?.role ?? 'USER',
        assignedWarehouseIds: guard.user?.warehouseIds ?? [],
        selectedWarehouseId: selection?.warehouseId ?? null
      });
      await vm.load(warehouseId, activeTab);
    } catch (cause) {
      scopeError = true;
      scopeErrorMessage = cause instanceof Error
        ? cause.message
        : i18n.t('No tienes acceso al almacén seleccionado.');
    }
  }

  async function changeTab(tab: BackorderQueueTab): Promise<void> {
    const params = new URLSearchParams(page.url.search);
    params.set('tab', tab);
    await goto(page.url.pathname + '?' + params.toString(), { replaceState: true });
  }

  function formatDateOnly(value: string | null): string {
    if (!value) return '—';
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    if (!match) return value;
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])).toLocaleDateString();
  }
</script>

<section class="page">
  <header class="page-header">
    <div>
      <p class="eyebrow">SMART WMS · OPERACIONES</p>
      <h1>{i18n.t('Pedidos pendientes')}</h1>
      <p>{i18n.t('Pedidos retenidos por falta de inventario y pedidos que ya pueden continuar a despacho.')}</p>
    </div>
    <div class="summary">
      <span>{i18n.t('Pedidos en esta cola')}</span>
      <strong>{visibleRows.length}</strong>
    </div>
  </header>

  <nav class="tabs" aria-label={i18n.t('Colas de pedidos pendientes')}>
    <button type="button" class:active={activeTab === 'waiting'} aria-pressed={activeTab === 'waiting'} onclick={() => void changeTab('waiting')}>
      {i18n.t('Pendientes de inventario')}
    </button>
    <button type="button" class:active={activeTab === 'ready-to-ship'} aria-pressed={activeTab === 'ready-to-ship'} onclick={() => void changeTab('ready-to-ship')}>
      {i18n.t('Listos para despacho')}
    </button>
  </nav>

  {#if successMessage}
    <p class="message success" role="status">{successMessage}</p>
  {/if}

  <div class="filters">
    <label>
      <span>{i18n.t('Buscar')}</span>
      <input bind:value={search} type="search" placeholder={i18n.t('Pedido, original, cliente o SKU')} />
    </label>
    <span class="filter-hint">{i18n.t('La cola se limita al almacén seleccionado.')}</span>
  </div>

  {#if scopeError}
    <p class="message error" role="alert">{scopeErrorMessage}</p>
  {:else if vm.error}
    <UiStatePanel kind="error" title={i18n.t('No se pudieron cargar los backorders')} message={vm.error} retry={() => vm.load(selection?.warehouseId ?? null, activeTab)} />
  {:else if vm.loading}
    <UiStatePanel kind="loading" title={i18n.t('Cargando backorders')} message={i18n.t('Estamos consultando los pedidos pendientes y su disponibilidad.')} />
  {:else if visibleRows.length === 0}
    <UiStatePanel kind="empty" title={i18n.t('Sin pedidos pendientes')} message={search.trim() ? i18n.t('No hay resultados para este filtro.') : activeTab === 'waiting' ? i18n.t('No hay pedidos esperando inventario.') : i18n.t('No hay pedidos listos para despacho.')} />
  {:else}
    <div class="cards">
      {#each visibleRows as row (row.salesOrderId)}
        <article class="card">
          <div class="card-head">
            <div>
              <p class="eyebrow">{i18n.t('Backorder')}</p>
              <h2>{row.salesOrderNumber}</h2>
            </div>
            <span class:ready={row.status !== 'WAITING_STOCK'} class="status">{row.status}</span>
          </div>
          <div class="metadata">
            <span><b>{i18n.t('Pedido original')}:</b> {row.parentSalesOrderNumber || '—'}</span>
            <span><b>{i18n.t('Cliente')}:</b> {row.customerName || '—'}</span>
            <span><b>{i18n.t('Almacén')}:</b> {row.warehouseId}</span>
            <span><b>{i18n.t('Días pendientes')}:</b> {row.daysWaiting}</span>
            {#if activeTab === 'ready-to-ship'}
              <span><b>{i18n.t('Disponible desde')}:</b> {formatDateOnly(row.fulfillableSince)}</span>
            {/if}
          </div>
          <div class="items">
            <h3>{i18n.t('Artículos pendientes')}</h3>
            {#each row.items as item, index}
              <div class="item" class:last={index === row.items.length - 1}>
                <div>
                  <strong>{item.sku}</strong>
                  <span>{item.itemName}</span>
                </div>
                <b>× {item.quantity}</b>
                <small>
                  {#if item.openPurchaseOrder}
                    {i18n.t('Compra abierta')}: {item.openPurchaseOrder.purchaseOrderNumber}
                    · {i18n.t('Pendiente')}: {item.openPurchaseOrder.quantityRemaining}
                    · {i18n.t('Fecha estimada')}: {formatDateOnly(item.openPurchaseOrder.expectedDate)}
                  {:else}
                    {i18n.t('No se encontró una orden de compra abierta para este artículo en este almacén.')}
                  {/if}
                </small>
              </div>
            {/each}
          </div>
          <div class="card-actions">
            {#if canOpenSalesOrderDetail}
              <a class="detail-link" href={'/management/backorders/' + row.salesOrderId + '?tab=' + activeTab}>{i18n.t('Ver detalle')}</a>
              {#if row.parentSalesOrderNumber && canAccessWarehouse(row.warehouseId)}
                <button class="cancel-link" type="button" onclick={() => openCancel(row)}>
                  {i18n.t('Cancelar backorder')}
                </button>
              {/if}
            {:else}
              <p class="permission-note">{i18n.t('Para abrir el detalle o cancelar necesitas el permiso Pedidos de venta.')}</p>
            {/if}
          </div>
        </article>
      {/each}
    </div>
  {/if}

  {#if cancelTarget}
    <div class="overlay">
      <dialog open class="dialog" aria-labelledby="queue-cancel-title">
        <h2 id="queue-cancel-title">{i18n.t('Confirmar cancelación')}</h2>
        <p>
          {i18n.t('Se cancelará únicamente el backorder')}
          <strong>{cancelTarget.salesOrderNumber}</strong>.
          {i18n.t('El pedido original')}
          <strong>{cancelTarget.parentSalesOrderNumber || '—'}</strong>
          {i18n.t('no se cancelará por esta acción.')}
        </p>
        <p class="dialog-hint">{i18n.t('El servidor validará que sea un backorder cancelable, comprobará su pedido original y aplicará la liberación operativa correspondiente. Las órdenes POS sin padre no pueden cancelarse desde esta acción.')}</p>
        <label>{i18n.t('Motivo')}
          <select bind:value={cancelReason}>
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
          <button type="button" disabled={vm.saving} onclick={() => cancelTarget = null}>
            {i18n.t('Conservar backorder')}
          </button>
          <button class="danger" type="button" disabled={vm.saving} onclick={() => void submitCancel()}>
            {vm.saving ? i18n.t('Cancelando…') : i18n.t('Confirmar cancelación')}
          </button>
        </footer>
      </dialog>
    </div>
  {/if}
</section>

<style>
  .page{max-width:82rem;margin:1.5rem auto;padding:0 1.25rem;color:var(--ink)}
  .page-header{display:flex;align-items:flex-end;justify-content:space-between;gap:1rem;margin-bottom:1.25rem}
  h1{margin:0;font:700 1.7rem var(--disp)}
  .page-header>div:first-child>p:last-child{color:var(--slate);margin:.45rem 0 0;font-size:.9rem}
  .eyebrow{font:600 .65rem var(--disp);letter-spacing:.13em;color:var(--slate);margin:0 0 .35rem}
  .summary{display:grid;gap:.2rem;text-align:right;color:var(--slate);font-size:.78rem}
  .summary strong{font:700 1.5rem var(--disp);color:var(--ink)}
  .tabs{display:flex;gap:.5rem;border-bottom:1px solid var(--line);margin-bottom:1rem}
  .tabs button{border:0;border-bottom:2px solid transparent;background:transparent;color:var(--slate);padding:.7rem .9rem;cursor:pointer;font:600 .85rem var(--disp)}
  .tabs button.active{color:var(--ink);border-bottom-color:var(--accent)}
  .filters{display:flex;align-items:end;gap:1rem;flex-wrap:wrap;margin:1rem 0}
  .filters label{display:grid;gap:.3rem;width:min(100%,25rem);font-size:.78rem;color:var(--slate)}
  .filters input{min-height:40px;border:1px solid var(--line);border-radius:8px;padding:.55rem .7rem;background:var(--card);color:var(--ink)}
  .filter-hint{font-size:.75rem;color:var(--slate);padding-bottom:.65rem}
  .cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,350px),1fr));gap:.9rem}
  .card{border:1px solid var(--line);border-radius:12px;background:var(--card);padding:1rem;min-width:0}
  .card-head{display:flex;justify-content:space-between;gap:.7rem;align-items:flex-start}
  h2{margin:0;font:700 1.1rem var(--disp)}
  .status{border:1px solid var(--line);border-radius:99px;padding:.25rem .55rem;font-size:.7rem;color:var(--slate)}
  .status.ready{color:var(--success);border-color:var(--success)}
  .metadata{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.45rem;margin:.9rem 0;color:var(--slate);font-size:.76rem}
  .metadata b{color:var(--ink);font-weight:600}
  .items{border-top:1px solid var(--line);margin-top:.8rem;padding-top:.65rem}
  h3{margin:0 0 .4rem;font:650 .8rem var(--disp)}
  .item{display:grid;grid-template-columns:1fr auto;gap:.2rem .5rem;padding:.55rem 0;border-bottom:1px solid var(--line);font-size:.78rem}
  .item.last{border-bottom:0}
  .item>div{display:grid;gap:.1rem}
  .item>div span,.item small{color:var(--slate)}
  .item small{grid-column:1/-1;font-size:.7rem;line-height:1.4}
  .card-actions{display:flex;align-items:center;gap:1rem;flex-wrap:wrap;margin-top:.75rem}
  .detail-link{display:inline-flex;color:var(--accent);font-size:.82rem;font-weight:650;text-decoration:none}
  .cancel-link{border:0;background:transparent;color:var(--danger);padding:0;font:650 .82rem var(--disp);cursor:pointer}
  .cancel-link:hover{text-decoration:underline}
  .detail-link:hover{text-decoration:underline}
  .permission-note,.empty{color:var(--slate);font-size:.82rem}
  .empty{padding:2rem 0}
  .message{padding:.7rem .85rem;border:1px solid var(--line);border-radius:8px;font-size:.82rem}
  .error{color:var(--danger)} .success{color:var(--success)}
  .overlay{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;background:#0008;padding:1rem}
  .dialog{width:min(100%,34rem);max-height:calc(100vh - 2rem);overflow:auto;margin:auto;padding:1.2rem;border:1px solid var(--line);border-radius:14px;background:var(--card);box-shadow:0 20px 60px #0003}
  .dialog p{font-size:.84rem;line-height:1.5}
  .dialog-hint{color:var(--slate)}
  .dialog label{display:grid;gap:.35rem;font-size:.8rem;color:var(--slate);margin:1rem 0}
  .dialog select{min-height:40px;border:1px solid var(--line);border-radius:8px;padding:.5rem;background:var(--card);color:var(--ink)}
  .dialog footer{display:flex;justify-content:flex-end;gap:.5rem;flex-wrap:wrap;margin-top:1rem}
  .dialog button{border:1px solid var(--line);border-radius:8px;padding:.55rem .8rem;background:var(--card);color:var(--ink);cursor:pointer}
  .dialog button.danger{border-color:var(--danger);color:var(--danger)}
  .dialog button:disabled{opacity:.55;cursor:not-allowed}
  @media(max-width:600px){.page-header{align-items:flex-start}.summary{display:none}.metadata{grid-template-columns:1fr}.tabs{overflow-x:auto}.tabs button{white-space:nowrap}}
</style>
