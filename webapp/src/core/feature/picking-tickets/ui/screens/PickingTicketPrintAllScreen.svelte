<script lang="ts">
  import { onMount } from 'svelte';
  import { createPickingTicketsDependencies } from '../../di/pickingTickets.dependencies';
  import { createPickingQueueDependencies } from '../../di/pickingQueue.dependencies';
  import type { PickingTicket } from '../../domain/entity/PickingTicket';
  import { groupOrdersByAddress } from '../../domain/policy/pickingGroups';
  const deps = createPickingTicketsDependencies();
  const queue = createPickingQueueDependencies();
  let { salesOrderIds, status, warehouseId, combine = false }: { salesOrderIds: number[]; status: string; warehouseId?: number; combine?: boolean } = $props();
  let tickets = $state<PickingTicket[]>([]);
  let loading = $state(true);
  let error = $state('');
  let markFailed = $state(false);
  let marking = $state(false);
  const limit = 200;
  let failedCount = $state(0);
  const combineBySalesOrderId = $derived.by(() => {
    const result = new Map<number, string[]>();
    if (!combine) return result;
    const groups = groupOrdersByAddress(tickets.map((ticket) => ({
      customerName: ticket.order.customerName,
      shipAddress: ticket.order.legacyShippingAddress,
      shipByDate: ticket.order.shipByDate,
      shippingAddress: ticket.order.shippingAddress
    })));
    for (const group of groups) {
      const numbers = group.orders.map((order) => tickets.find((ticket) =>
        ticket.order.salesOrderNumber === (order as typeof group.orders[number] & { salesOrderNumber?: string }).salesOrderNumber
      )?.order.salesOrderNumber).filter((value): value is string => Boolean(value));
      // Map by the original ticket order using the shared normalized address key.
      for (const ticket of tickets) {
        const key = groupOrdersByAddress([{
          customerName: ticket.order.customerName,
          shipAddress: ticket.order.legacyShippingAddress,
          shipByDate: ticket.order.shipByDate,
          shippingAddress: ticket.order.shippingAddress
        }])[0]?.key;
        if (key === group.key) result.set(ticket.order.salesOrderId, numbers.filter((number) => number !== ticket.order.salesOrderNumber));
      }
    }
    return result;
  });
  onMount(() => { void load(); });
  async function load() {
    loading = true; error = ''; markFailed = false;
    try {
      let ids = [...new Set(salesOrderIds)].slice(0, limit);
      if (!ids.length) {
        const page = await queue.getAllPrintableTickets.execute({ status: status === 'ALL' ? 'ALL' : status === 'PICKED' ? 'PICKED' : 'OPEN', hidePrinted: false, warehouseId });
        ids = page.items.slice(0, limit).map((order) => order.salesOrderId);
      }
      const results = await Promise.allSettled(ids.map((id) => deps.getTicket.execute(id)));
      tickets = results.filter((result): result is PromiseFulfilledResult<PickingTicket> => result.status === 'fulfilled').map((result) => result.value);
      failedCount = results.filter((result) => result.status === 'rejected').length;
      if (!tickets.length && ids.length) throw new Error('No tickets could be loaded.');
      if (tickets.length) await markPrinted();
    } catch (cause) { error = cause instanceof Error ? cause.message : 'Could not load tickets.'; }
    finally { loading = false; }
  }
  async function markPrinted() {
    if (!tickets.length) return;
    marking = true;
    try { await deps.markPrinted.execute(tickets.map((ticket) => ticket.order.salesOrderId)); markFailed = false; }
    catch { markFailed = true; }
    finally { marking = false; }
  }
  function print() { if (tickets.length && typeof window !== 'undefined') window.print(); }
  function addressLines(ticket: PickingTicket): string[] {
    const a = ticket.order.shippingAddress;
    const lines = [a.name || ticket.order.customerName, a.line1, a.line2, [a.city,a.state,a.postalCode].filter(Boolean).join(' '),a.country].filter(Boolean) as string[];
    return lines.length ? lines : (ticket.order.legacyShippingAddress || '').split(/\r?\n/).filter(Boolean);
  }
</script>
<svelte:head><title>{loading ? 'Loading tickets…' : `Picking tickets (${tickets.length})`}</title></svelte:head>
<main class="print-all">
  <div class="toolbar no-print">
    <strong>{tickets.length} picking tickets</strong><span class="spacer"></span>
    {#if failedCount > 0}<span class="warning" role="alert">{failedCount} ticket(s) failed to load and were not marked printed.</span>{/if}
    {#if markFailed}<span class="warning" role="alert">Some tickets could not be marked printed.</span><button class="secondary" onclick={markPrinted} disabled={marking}>Retry</button>{/if}
    <button class="secondary" onclick={load} disabled={loading}>Reload</button><button onclick={print} disabled={!tickets.length}>Print all</button>
  </div>
  {#if loading}<p class="message">Preparing print batch…</p>
  {:else if error}<section class="message error"><h2>Could not render tickets</h2><p>{error}</p></section>
  {:else if !tickets.length}<p class="message">No tickets to print.</p>
  {:else}
    {#each tickets as ticket, index (ticket.order.salesOrderId)}
      <article class="ticket">
        <header><div class="brand">{#if ticket.branding.logoUrl}<img src={ticket.branding.logoUrl} alt={ticket.branding.companyName || 'Company logo'} />{/if}<div><strong>{ticket.branding.companyName || ''}</strong>{#each (ticket.branding.companyAddress || '').split(/\r?\n/).filter(Boolean) as line}<div>{line}</div>{/each}</div></div><div class="heading"><h1>Picking Ticket</h1><strong>Order #{ticket.order.salesOrderNumber}</strong><span>Must ship by: {ticket.order.shipByDate || '—'}</span></div></header>
        {#if combineBySalesOrderId.get(ticket.order.salesOrderId)?.length}<div class="combine-banner">SHIP WITH: {combineBySalesOrderId.get(ticket.order.salesOrderId)?.join(', ')}</div>{/if}
        <section class="address"><strong>Ship to</strong>{#each addressLines(ticket) as line}<div>{line}</div>{/each}</section>
        <section class="meta"><span>Ship method: {ticket.order.shipMethod || '—'}</span><span>Order date: {ticket.order.orderDate || ticket.order.createdAt || '—'}</span></section>
        {#if ticket.lines.length}<table><thead><tr><th>Qty</th><th>Shipped</th><th>Item</th><th>Box</th><th>Bin</th><th>UPC</th></tr></thead><tbody>{#each ticket.lines as line (line.salesOrderLineId)}<tr><td class="center">{line.quantityOrdered}</td><td class="center">{line.quantityShipped}</td><td><strong>{line.sku}</strong> {line.itemName}</td><td></td><td>{line.preferredBinCode || ''}</td><td>{line.upc || ''}</td></tr>{/each}</tbody></table>{:else}<p>No lines on this order.</p>{/if}
        {#if ticket.branding.returnsText}<p class="returns">{ticket.branding.returnsText}</p>{/if}
        <footer>{ticket.order.salesOrderNumber}</footer>
        <small class="page-count no-print">Ticket {index + 1} of {tickets.length}</small>
      </article>
    {/each}
  {/if}
</main>
<style>
.print-all{max-width:58rem;margin:1rem auto;padding:0 1rem;color:#111}.toolbar{display:flex;align-items:center;gap:.6rem;margin-bottom:1rem}.spacer{flex:1}button{padding:.55rem .9rem;border:1px solid #123b60;border-radius:.45rem;background:#123b60;color:white;cursor:pointer}.secondary{background:white;color:#123b60;border-color:#cbd5e1}.warning{font-size:.8rem;color:#92400e}.message{padding:2rem;color:#475569}.error{color:#991b1b}.ticket{padding:1.2rem;background:white;color:#111;font:12px Arial,sans-serif;min-height:20rem;position:relative}.ticket+ .ticket{border-top:2px dashed #bbb;margin-top:2rem;padding-top:2rem}.ticket header{display:flex;justify-content:space-between;gap:1rem;border-bottom:2px solid #111;padding-bottom:1rem}.brand{display:flex;gap:.8rem}.brand img{max-width:6rem;max-height:4rem;object-fit:contain}.heading{text-align:right;display:flex;flex-direction:column;gap:.35rem}.heading h1{font-size:1.5rem;margin:0}.address{margin:1rem 0;padding:.8rem;border:1px solid #999;min-height:3.5rem}.address strong{display:block;text-transform:uppercase;font-size:.8rem;margin-bottom:.4rem}.meta{display:flex;gap:2rem;margin:1rem 0}.ticket table{width:100%;border-collapse:collapse;margin-top:1rem}.ticket th,.ticket td{padding:.5rem .35rem;border:1px solid #555;text-align:left}.ticket th{background:#eee}.ticket .center{text-align:center}.returns{margin-top:1.5rem}.ticket footer{text-align:center;margin-top:1rem;letter-spacing:.2rem;font-size:1.1rem}.page-count{display:block;text-align:right;color:#777}.combine-banner{font-weight:700;letter-spacing:.08em;border:2px solid #111;padding:.4rem;text-align:center;margin:.7rem 0}
@media print{@page{size:auto;margin:12mm}.print-all{max-width:none;margin:0;padding:0}.no-print{display:none!important}.ticket{min-height:0;margin:0;padding:0;break-after:page;page-break-after:always}.ticket+.ticket{border:0;margin:0;padding:0}.ticket:last-of-type{break-after:auto;page-break-after:auto}body{background:white!important;color:#111!important}}
</style>
