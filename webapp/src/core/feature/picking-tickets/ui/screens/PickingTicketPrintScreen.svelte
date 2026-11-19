<script lang="ts">
	import UiStatePanel from '$lib/components/UiStatePanel.svelte';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { createPickingTicketsDependencies } from '../../di/pickingTickets.dependencies';
  import Code128Barcode from '../components/Code128Barcode.svelte';
  import type { PickingTicket } from '../../domain/entity/PickingTicket';
  const deps = createPickingTicketsDependencies();
  let { salesOrderId }: { salesOrderId: number } = $props();
  let ticket = $state<PickingTicket | null>(null);
  let loading = $state(true);
  let error = $state('');
  let markFailed = $state(false);
  let marking = $state(false);
  onMount(() => { void load(); });
  async function load() {
    loading = true; error = ''; markFailed = false;
    if (!Number.isInteger(salesOrderId) || salesOrderId < 1) {
      error = 'Invalid sales order identifier.'; loading = false; return;
    }
    try {
      ticket = await deps.getTicket.execute(salesOrderId);
      loading = false;
      await markPrinted();
    } catch (cause) {
      error = cause instanceof Error ? cause.message : 'Could not load picking ticket.';
      loading = false;
    }
  }
  async function markPrinted() {
    if (!ticket) return;
    marking = true;
    try { await deps.markPrinted.execute([ticket.order.salesOrderId]); markFailed = false; }
    catch { markFailed = true; }
    finally { marking = false; }
  }
  function print() { if (ticket && typeof window !== 'undefined') window.print(); }
  const addressLines = $derived.by(() => {
    if (!ticket) return [];
    const a = ticket.order.shippingAddress;
    const lines = [a.name || ticket.order.customerName, a.line1, a.line2,
      [a.city, a.state, a.postalCode].filter(Boolean).join(' '), a.country].filter(Boolean) as string[];
    return lines.length ? lines : (ticket.order.legacyShippingAddress || '').split(/\r?\n/).filter(Boolean);
  });
</script>
<svelte:head><title>{ticket ? `Picking ticket ${ticket.order.salesOrderNumber}` : 'Picking ticket'}</title></svelte:head>
<div class="print-root">
  <div class="toolbar no-print">
    <button class="secondary" onclick={() => goto('/picking-tickets')}>← Back to tickets</button>
    <button class="secondary" onclick={load} disabled={loading}>Refresh</button>
    <span class="spacer"></span>
    {#if markFailed}<span class="warning" role="alert">Ticket loaded, but print status was not saved.</span><button class="secondary" onclick={markPrinted} disabled={marking}>{marking ? 'Retrying…' : 'Retry mark printed'}</button>{/if}
    <button onclick={print} disabled={!ticket}>Print</button>
  </div>
  {#if loading}<UiStatePanel kind="loading" title="Loading ticket" message="Retrieving the ticket details for printing." />
  {:else if error}<section class="message error"><h2>Could not render ticket</h2><p>{error}</p></section>
  {:else if ticket}
    <article class="ticket">
      <header class="ticket-header">
        <div class="brand">
          {#if ticket.branding.logoUrl}<img src={ticket.branding.logoUrl} alt={ticket.branding.companyName || 'Company logo'} />{/if}
          <div><strong>{ticket.branding.companyName || ' '}</strong>{#each (ticket.branding.companyAddress || '').split(/\r?\n/).filter(Boolean) as line}<div>{line}</div>{/each}</div>
        </div>
        <div class="order-heading"><h1>Picking Ticket</h1><strong>Order #{ticket.order.salesOrderNumber}</strong><span>Must ship by: {ticket.order.shipByDate || '—'}</span></div>
      </header>
      <section class="address"><div><h2>Ship to</h2>{#each addressLines as line}<div>{line}</div>{/each}</div><Code128Barcode class="barcode-small" value={ticket.order.salesOrderNumber} modulePx={1} height={32} /></section>
      <section class="meta"><div><small>Shipping method</small><strong>{ticket.order.shipMethod || '—'}</strong></div><div><small>Order date</small><strong>{ticket.order.orderDate || ticket.order.createdAt || '—'}</strong></div><div><small>Status</small><strong>{ticket.order.status}</strong></div></section>
      {#if ticket.lines.length === 0}<p class="empty">No lines are available on this sales order.</p>
      {:else}
        <table><thead><tr><th>Qty</th><th>Shipped</th><th>Item</th><th>Box</th><th>Bin</th><th>UPC</th></tr></thead>
          <tbody>{#each ticket.lines as line (line.salesOrderLineId)}<tr>
            <td class="center">{line.quantityOrdered}</td><td class="center">{line.quantityShipped}</td>
            <td><strong>{line.sku}</strong> {line.itemName}</td><td></td><td>{line.preferredBinCode || ''}</td><td>{line.upc || ''}</td>
          </tr>{/each}</tbody>
        </table>
      {/if}
      {#if ticket.branding.returnsText}<p class="returns">{ticket.branding.returnsText}</p>{/if}
      <footer><Code128Barcode class="barcode-large" value={ticket.order.salesOrderNumber} modulePx={1.2} height={40} /></footer>
    </article>
  {/if}
</div>
<style>
.print-root{max-width:58rem;margin:1rem auto;padding:0 1rem;color:#111;background:white;min-height:70vh}.toolbar{display:flex;align-items:center;gap:.6rem;margin-bottom:1rem}.spacer{flex:1}button{padding:.55rem .9rem;border:1px solid #123b60;border-radius:.45rem;background:#123b60;color:white;cursor:pointer}.secondary{background:white;color:#123b60;border-color:#cbd5e1}.warning{color:#92400e;font-size:.8rem}.message{padding:2rem;color:#475569}.error{color:#991b1b}.ticket{padding:1.2rem;background:white;color:#111;font:12px Arial,sans-serif}.ticket-header{display:flex;justify-content:space-between;gap:1rem;border-bottom:2px solid #111;padding-bottom:1rem}.brand{display:flex;gap:.8rem;align-items:flex-start}.brand img{max-width:6rem;max-height:4rem;object-fit:contain}.order-heading{text-align:right;display:flex;flex-direction:column;gap:.35rem}.order-heading h1{font-size:1.5rem;margin:0}.address{margin:1rem 0;padding:.8rem;border:1px solid #999;min-height:4rem;display:flex;justify-content:space-between;gap:1rem}.barcode-small{width:11rem;height:2rem;align-self:center}.barcode-large{width:min(24rem,100%);height:2.5rem}.address h2{font-size:.8rem;text-transform:uppercase;margin:0 0 .4rem}.meta{display:flex;gap:2rem;margin:1rem 0}.meta div{display:flex;flex-direction:column;gap:.2rem}.meta small{color:#555}.ticket table{width:100%;border-collapse:collapse;margin-top:1rem}.ticket th,.ticket td{padding:.5rem .35rem;border:1px solid #555;text-align:left}.ticket th{background:#eee}.ticket .center{text-align:center}.returns{margin-top:2rem}.ticket footer{margin-top:1rem;display:flex;justify-content:center}.empty{padding:1rem;text-align:center;border:1px dashed #999}
@media print{@page{size:auto;margin:12mm}:global(.sidebar),:global(.topbar),:global(.scrim){display:none!important}:global(.shell){display:block!important;min-height:0!important}:global(.main),:global(.content){display:block!important;padding:0!important;margin:0!important}.print-root{max-width:none;margin:0;padding:0;min-height:0}.no-print{display:none!important}.ticket{padding:0}.ticket-header,.address,.meta,.ticket table,.returns,footer{break-inside:avoid}body{background:white!important;color:#111!important}}
</style>
