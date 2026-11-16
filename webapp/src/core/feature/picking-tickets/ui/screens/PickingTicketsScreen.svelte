<script lang="ts">
  import { getContext } from 'svelte';
  import { goto } from '$app/navigation';
  import PageHeader from '#lib/components/PageHeader.svelte';
  import UiBanner from '#lib/components/UiBanner.svelte';
  import { createPickingQueueDependencies } from '../../di/pickingQueue.dependencies';
  import type { SalesOrder } from '#core/feature/sales-orders/domain/entity/SalesOrder';
  import { groupOrdersByAddress } from '../../domain/policy/pickingGroups';
  const queue = createPickingQueueDependencies();
  const warehouse = getContext<{ warehouseId: number | null }>('warehouseSelection');
  let orders = $state<SalesOrder[]>([]);
  let status = $state<'OPEN' | 'PICKED' | 'ALL'>('OPEN');
  let hidePrinted = $state(true);
  let search = $state('');
  let multiOrders = $state(false);
  let longOrders = $state(false);
  let sortKey = $state<'shipByDate' | 'salesOrderNumber' | 'customerName' | 'primaryBinPickSequence'>('shipByDate');
  let sortDirection = $state<'asc' | 'desc'>('asc');
  let selected = $state<number[]>([]);
  let loading = $state(false);
  let lookupLoading = $state(false);
  let error = $state('');
  const batchLimit = 200;
  const sortedOrders = $derived.by(() => {
    const term = search.trim().toLowerCase();
    return [...orders].filter((order) => !term ||
      order.salesOrderNumber.toLowerCase().includes(term) ||
      (order.customerName ?? '').toLowerCase().includes(term))
      .sort((a, b) => {
        const av = a[sortKey]; const bv = b[sortKey];
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        const result = sortKey === 'primaryBinPickSequence'
          ? Number(av) - Number(bv)
          : sortKey === 'shipByDate'
            ? new Date(String(av)).getTime() - new Date(String(bv)).getTime()
            : String(av).localeCompare(String(bv), undefined, { numeric: true });
        return result * (sortDirection === 'asc' ? 1 : -1);
      });
  });
  const displayRows = $derived.by(() => {
    let base = sortedOrders;
    if (longOrders) base = base.filter((order) => Number(order.lineCount) >= 5);
    if (!multiOrders) return base.map((order) => ({ order, groupIndex: null as number | null, groupSize: null as number | null }));
    const rows: Array<{ order: SalesOrder; groupIndex: number; groupSize: number }> = [];
    groupOrdersByAddress(base).forEach((group, index) => {
      group.orders.forEach((order) => rows.push({ order, groupIndex: index + 1, groupSize: group.orders.length }));
    });
    return rows;
  });
  const visibleOrders = $derived(displayRows.map((row) => row.order));
  const selectedVisibleIds = $derived(visibleOrders.filter((order) => selected.includes(order.salesOrderId)).map((order) => order.salesOrderId));
  let observedWarehouseId: number | null | undefined = undefined;
  $effect(() => {
    const id = warehouse?.warehouseId ?? null;
    if (id === observedWarehouseId) return;
    observedWarehouseId = id;
    selected = [];
    if (id == null) { orders = []; return; }
    void load();
  });
  async function load() {
    const selectedWarehouseId = warehouse?.warehouseId;
    if (selectedWarehouseId == null) { orders = []; loading = false; return; }
    loading = true; error = '';
    try {
      const page = await queue.getAllPrintableTickets.execute({
        warehouseId: selectedWarehouseId, status, hidePrinted
      });
      orders = page.items.filter((order) => ['OPEN', 'PICKED'].includes(order.status) &&
        !['return', 'refund'].includes(order.orderType ?? ''));
      selected = selected.filter((id) => orders.some((order) => order.salesOrderId === id));
    } catch (cause) {
      error = cause instanceof Error ? cause.message : 'Could not load picking tickets.';
    } finally { loading = false; }
  }
  function toggleSort(key: typeof sortKey) {
    if (sortKey === key) sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    else { sortKey = key; sortDirection = 'asc'; }
  }
  function toggleSelected(id: number) {
    selected = selected.includes(id) ? selected.filter((value) => value !== id) : [...selected, id];
  }
  function openTicket(id: number) {
    if (typeof window !== 'undefined') window.open(`/picking-tickets/${id}/print`, '_blank', 'noopener');
  }
  function openPrintBatch(ids: number[]) {
    if (!ids.length) return;
    const params = new URLSearchParams({ status, so_ids: ids.join(',') });
    if (warehouse?.warehouseId != null) params.set('warehouse_id', String(warehouse.warehouseId));
    if (multiOrders) params.set('combine', '1');
    if (typeof window !== 'undefined') window.open(`/picking-tickets/print-all?${params.toString()}`, '_blank', 'noopener');
  }
  function printSelected() { openPrintBatch(selectedVisibleIds.slice(0, batchLimit)); }
  function printAll() { openPrintBatch(visibleOrders.slice(0, batchLimit).map((order) => order.salesOrderId)); }
  async function openByNumber() {
    const term = search.trim();
    if (!term) return;
    lookupLoading = true; error = '';
    try {
      const page = await queue.findOrder.execute(term);
      const exact = page.items.find((order) => order.salesOrderNumber.toLowerCase() === term.toLowerCase());
      const match = exact ?? page.items[0];
      if (match) openTicket(match.salesOrderId);
      else error = `No sales order found matching "${term}".`;
    } catch (cause) {
      error = cause instanceof Error ? cause.message : 'Could not search sales orders.';
    } finally { lookupLoading = false; }
  }
</script>

<section class="page">
  <PageHeader title="Picking Tickets" subtitle="Review, print and reprint warehouse picking tickets." />
  {#if error}<UiBanner tone="error" message={error} />{/if}
  <section class="panel">
    <div class="toolbar">
      <label class="search">Find ticket or order
        <input bind:value={search} placeholder="Sales order number or customer" onkeydown={(event) => { if (event.key === 'Enter') void openByNumber(); }} />
      </label>
      <button class="secondary" onclick={openByNumber} disabled={!search.trim() || lookupLoading}>{lookupLoading ? 'Searching…' : 'Open ticket'}</button>
    </div>
    <div class="toolbar filters">
      <label>Status
        <select value={status} onchange={(event) => { status = event.currentTarget.value as typeof status; selected = []; void load(); }}>
          <option value="OPEN">OPEN</option><option value="PICKED">PICKED</option><option value="ALL">ALL (OPEN + PICKED)</option>
        </select>
      </label>
      <label class="check"><input type="checkbox" checked={hidePrinted} onchange={(event) => { hidePrinted = event.currentTarget.checked; selected = []; void load(); }} /> Hide printed</label>
      <label class="check"><input type="checkbox" bind:checked={multiOrders} /> Multi-Orders</label>
      <label class="check"><input type="checkbox" bind:checked={longOrders} /> Long Orders (5+ lines)</label>
      <button class="secondary" onclick={load} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</button>
      <span class="spacer"></span>
      <button class="secondary" onclick={printSelected} disabled={!selectedVisibleIds.length}>Print selected ({selectedVisibleIds.length})</button>
      <button onclick={printAll} disabled={!visibleOrders.length}>{visibleOrders.length > batchLimit ? `Print first ${batchLimit} of ${visibleOrders.length}` : `Print all (${visibleOrders.length})`}</button>
    </div>
    {#if loading}<p class="muted">Loading printable orders…</p>
    {:else if visibleOrders.length === 0}<p class="empty">{warehouse?.warehouseId == null ? 'Select a warehouse to load picking tickets.' : multiOrders ? 'No multi-order groups in this queue.' : longOrders ? 'No long orders in this queue.' : 'No orders ready for picking.'}</p>
    {:else}
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th><input type="checkbox" aria-label="Select visible tickets" checked={visibleOrders.length > 0 && selectedVisibleIds.length === visibleOrders.length} onchange={(event) => selected = event.currentTarget.checked ? visibleOrders.map((order) => order.salesOrderId) : []} /></th>
            {#if multiOrders}<th>Group</th>{/if}
            <th><button class="sort" onclick={() => toggleSort('salesOrderNumber')}>SO Number</button></th>
            <th><button class="sort" onclick={() => toggleSort('customerName')}>Customer</button></th>
            <th><button class="sort" onclick={() => toggleSort('shipByDate')}>Ship by</button></th>
            <th>Ship method</th><th><button class="sort" onclick={() => toggleSort('primaryBinPickSequence')}>Primary bin</button></th>
            <th>Status</th>{#if longOrders}<th>Items</th>{/if}<th></th>
          </tr></thead>
          <tbody>
            {#each displayRows as row (row.order.salesOrderId)}
              {@const order = row.order}
              <tr>
                <td><input type="checkbox" checked={selected.includes(order.salesOrderId)} onchange={() => toggleSelected(order.salesOrderId)} aria-label={`Select ${order.salesOrderNumber}`} /></td>
                {#if multiOrders}<td class="mono">#{row.groupIndex} ({row.groupSize})</td>{/if}
                <td class="mono">{order.salesOrderNumber}</td><td>{order.customerName || '—'}</td>
                <td class="mono">{order.shipByDate || '—'}</td><td>{order.shipMethod || '—'}</td>
                <td class="mono">{order.primaryBinCode || '—'}</td><td><span class="status">{order.status}</span></td>
                {#if longOrders}<td>{order.lineCount ?? '—'}</td>{/if}<td><button class="small" onclick={() => openTicket(order.salesOrderId)}>Print ticket</button></td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
    <p class="hint">The print queue is limited to {batchLimit} tickets per run. Reprint by disabling “Hide printed” or searching for an order.</p>
  </section>
</section>

<style>
.page{padding:1.25rem;max-width:90rem;margin:auto;color:var(--ink)}.panel{background:var(--surface);border:1px solid var(--line);border-radius:1rem;padding:1rem;box-shadow:var(--shadow-sm,0 8px 24px #10243b0a)}
.toolbar{display:flex;align-items:end;gap:.7rem;flex-wrap:wrap;margin-bottom:1rem}.search{flex:1 1 18rem}.filters{align-items:center}.filters label,.search{display:flex;flex-direction:column;gap:.3rem;font-size:.8rem;color:var(--slate)}input:not([type=checkbox]),select{min-height:2.45rem;padding:.5rem .7rem;border:1px solid var(--line);border-radius:.55rem;background:var(--surface);color:var(--ink)}button{border:1px solid var(--navy);background:var(--navy);color:white;border-radius:.55rem;padding:.55rem .85rem;cursor:pointer;font-weight:600}button.secondary{background:var(--surface);color:var(--ink);border-color:var(--line)}button.small{padding:.38rem .6rem;font-size:.78rem}.sort{background:none;border:0;color:inherit;padding:0;font:inherit}.check{display:flex!important;flex-direction:row!important;align-items:center;gap:.45rem!important}.spacer{flex:1}.table-wrap{overflow-x:auto}table{width:100%;border-collapse:collapse;font-size:.86rem}th,td{text-align:left;padding:.75rem .6rem;border-bottom:1px solid var(--line);white-space:nowrap}th{font-size:.72rem;color:var(--slate);text-transform:uppercase;letter-spacing:.04em}tbody tr:hover{background:color-mix(in srgb,var(--navy) 4%,transparent)}.mono{font-variant-numeric:tabular-nums;font-family:ui-monospace,monospace}.status{padding:.2rem .45rem;border-radius:99px;background:color-mix(in srgb,var(--navy) 9%,transparent);font-size:.72rem;font-weight:700}.muted,.hint{color:var(--slate);font-size:.82rem}.empty{text-align:center;padding:2rem;color:var(--slate)}.hint{margin:.9rem 0 0}@media(max-width:650px){.page{padding:.75rem}.panel{padding:.7rem}.filters>*{flex:1 1 auto}.spacer{display:none}}
</style>
