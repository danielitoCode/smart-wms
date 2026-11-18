<script lang="ts">
  import { onMount, getContext } from 'svelte';
  import { page as route } from '$app/state';
  import type { I18nState } from '../../../../../lib/i18n/i18n.svelte';
  import { createPurchaseOrdersState } from '../state/purchaseOrdersState.svelte';
  import type { CreatePurchaseOrder, CreatePurchaseOrderLine, UpdatePurchaseOrder } from '../../domain/entity/PurchaseOrder';

  const i18n = getContext<I18nState>('i18n');
  const selection = getContext<{ warehouseId: number | null }>('warehouseSelection');
  const vm = createPurchaseOrdersState();

  let createOpen = $state(false);
  let editOpen = $state(false);
  let poNumber = $state('');
  let vendorName = $state('');
  let expectedDate = $state('');
  let notes = $state('');
  let draftLines = $state<Array<{ itemId: string; quantity: string; unitCost: string }>>([
    { itemId: '', quantity: '1', unitCost: '' }
  ]);
  let editHeader = $state({ poNumber: '', vendorName: '', expectedDate: '', notes: '' });
  let newLine = $state({ itemId: '', quantity: '1', unitCost: '' });
  let quantityEdits = $state<Record<number, string>>({});

  onMount(() => {
    vm.setFilter('search', route.url.searchParams.get('q') ?? '');
    void vm.load(selection?.warehouseId ?? null);
  });

  function resetCreate() {
    poNumber = ''; vendorName = ''; expectedDate = ''; notes = '';
    draftLines = [{ itemId: '', quantity: '1', unitCost: '' }];
    createOpen = false;
  }
  function addDraftLine() { draftLines = [...draftLines, { itemId: '', quantity: '1', unitCost: '' }]; }
  function removeDraftLine(index: number) { if (draftLines.length > 1) draftLines = draftLines.filter((_, i) => i !== index); }

  async function createOrder(event: SubmitEvent) {
    event.preventDefault();
    const lines: CreatePurchaseOrderLine[] = draftLines.map(line => ({
      itemId: Number(line.itemId), quantityOrdered: Number(line.quantity),
      unitCost: line.unitCost === '' ? null : Number(line.unitCost)
    }));
    const payload: CreatePurchaseOrder = {
      poNumber, warehouseId: selection?.warehouseId ?? 0, vendorName: vendorName || null,
      expectedDate: expectedDate || null, notes: notes || null, lines
    };
    if (await vm.create(payload)) { resetCreate(); await vm.load(selection?.warehouseId ?? null); }
  }

  async function openDetail(id: number) {
    await vm.detail(id);
    if (vm.selected) {
      editHeader = {
        poNumber: vm.selected.poNumber, vendorName: vm.selected.vendorName ?? '',
        expectedDate: vm.selected.expectedDate?.slice(0, 10) ?? '', notes: vm.selected.notes ?? ''
      };
      quantityEdits = Object.fromEntries(vm.selected.lines.map(line => [line.poLineId, String(line.quantityOrdered)]));
    }
  }

  async function saveHeader(event: SubmitEvent) {
    event.preventDefault();
    if (!vm.selected) return;
    const input: UpdatePurchaseOrder = {
      poNumber: editHeader.poNumber, vendorName: editHeader.vendorName || null,
      expectedDate: editHeader.expectedDate || null, notes: editHeader.notes || null
    };
    if (await vm.update(vm.selected.poId, input)) {
      await openDetail(vm.selected.poId); await vm.load(selection?.warehouseId ?? null);
    }
  }

  async function addLine(event: SubmitEvent) {
    event.preventDefault();
    if (!vm.selected) return;
    if (await vm.addLine(vm.selected.poId, {
      itemId: Number(newLine.itemId), quantityOrdered: Number(newLine.quantity),
      unitCost: newLine.unitCost === '' ? null : Number(newLine.unitCost)
    })) {
      newLine = { itemId: '', quantity: '1', unitCost: '' };
      await openDetail(vm.selected.poId); await vm.load(selection?.warehouseId ?? null);
    }
  }

  async function saveLine(lineId: number) {
    if (!vm.selected) return;
    if (await vm.updateLine(vm.selected.poId, lineId, Number(quantityEdits[lineId]))) {
      await openDetail(vm.selected.poId); await vm.load(selection?.warehouseId ?? null);
    }
  }

  async function removeLine(lineId: number) {
    if (!vm.selected) return;
    if (await vm.deleteLine(vm.selected.poId, lineId)) {
      await openDetail(vm.selected.poId); await vm.load(selection?.warehouseId ?? null);
    }
  }

  async function changeLifecycle(action: 'close' | 'reopen') {
    if (!vm.selected) return;
    if (action === 'close') {
      const outstanding = vm.selected.lines.reduce((sum, line) => sum + line.quantityRemaining, 0);
      const message = outstanding > 0
        ? `Esta orden tiene ${outstanding} unidades pendientes de recepción. Al cerrarla ya no se podrán recibir. ¿Continuar?`
        : '¿Cerrar esta orden de compra?';
      if (!confirm(message)) return;
    }
    if (await vm.lifecycle(vm.selected.poId, action)) {
      await openDetail(vm.selected.poId); await vm.load(selection?.warehouseId ?? null);
    }
  }
</script>

<section class="page">
  <header class="page-header">
    <div><p class="eyebrow">SMART WMS · COMPRAS</p><h1>{i18n.t('Órdenes de compra')}</h1>
      <p>{i18n.t('Planifica pedidos, controla cantidades pendientes y consulta sus recepciones.')}</p></div>
    <button class="primary" onclick={() => createOpen = !createOpen}>{i18n.t('Nueva orden')}</button>
  </header>

  {#if vm.error}<p class="error" role="alert">{vm.error}</p>{/if}

  {#if createOpen}
    <form class="panel editor" onsubmit={createOrder}>
      <h2>{i18n.t('Nueva orden de compra')}</h2>
      <label>{i18n.t('Número')}<input required maxlength="128" bind:value={poNumber} /></label>
      <label>{i18n.t('Proveedor')}<input bind:value={vendorName} maxlength="256" /></label>
      <label>{i18n.t('Fecha prevista')}<input type="date" bind:value={expectedDate} /></label>
      <label class="wide">{i18n.t('Notas')}<input bind:value={notes} maxlength="1000" /></label>
      <div class="wide lines-editor">
        <h3>{i18n.t('Líneas de la orden')}</h3>
        {#each draftLines as line, index}
          <div class="line-inputs">
            <label>{i18n.t('ID de producto')}<input type="number" min="1" required bind:value={line.itemId} /></label>
            <label>{i18n.t('Cantidad')}<input type="number" min="1" max="1000000" step="1" required bind:value={line.quantity} /></label>
            <label>{i18n.t('Costo unitario')}<input type="number" min="0" step="0.01" bind:value={line.unitCost} /></label>
            <button type="button" disabled={draftLines.length === 1} onclick={() => removeDraftLine(index)}>{i18n.t('Eliminar')}</button>
          </div>
        {/each}
        <button type="button" onclick={addDraftLine}>{i18n.t('Añadir línea')}</button>
      </div>
      <div class="actions wide"><button type="button" onclick={resetCreate}>{i18n.t('Cancelar')}</button>
        <button class="primary" disabled={vm.saving || !selection?.warehouseId}>{i18n.t('Guardar orden')}</button></div>
    </form>
  {/if}

  <div class="filters panel">
    <label>{i18n.t('Buscar orden o proveedor')}<input value={vm.filters.search ?? ''} oninput={e => vm.setFilter('search', e.currentTarget.value)} onkeydown={e => { if (e.key === 'Enter') void vm.load(selection?.warehouseId ?? null); }} /></label>
    <label>{i18n.t('Estado')}<select value={vm.filters.status ?? ''} onchange={e => vm.setFilter('status', e.currentTarget.value as never)}>
      <option value="">{i18n.t('Todos')}</option>
      {#each ['OPEN','PARTIAL','RECEIVED','CLOSED','ARCHIVED'] as status}<option value={status}>{status}</option>{/each}
    </select></label>
    <label>{i18n.t('Fecha prevista desde')}<input type="date" value={vm.filters.dateFrom ?? ''} onchange={e => vm.setFilter('dateFrom', e.currentTarget.value)} /></label>
    <label>{i18n.t('Fecha prevista hasta')}<input type="date" value={vm.filters.dateTo ?? ''} onchange={e => vm.setFilter('dateTo', e.currentTarget.value)} /></label>
    <label class="check"><input type="checkbox" checked={vm.filters.includeArchived ?? false} onchange={e => vm.setFilter('includeArchived', e.currentTarget.checked)} /> {i18n.t('Incluir archivadas')}</label>
    <button onclick={() => void vm.load(selection?.warehouseId ?? null)}>{i18n.t('Aplicar filtros')}</button>
  </div>

  {#if vm.loading}<p class="muted">{i18n.t('Cargando…')}</p>
  {:else}
    <div class="table-wrap panel">
      <table><thead><tr><th>{i18n.t('Orden')}</th><th>{i18n.t('Proveedor')}</th><th>{i18n.t('Almacén')}</th><th>{i18n.t('Estado')}</th><th>{i18n.t('Fecha prevista')}</th><th>{i18n.t('Acciones')}</th></tr></thead>
        <tbody>
          {#each vm.rows as order (order.poId)}
            <tr><td><button class="link" onclick={() => void openDetail(order.poId)}>{order.poNumber}</button></td>
              <td>{order.vendorName ?? '—'}</td><td>{order.warehouseId}</td><td><span class="status">{order.status}</span></td>
              <td>{order.expectedDate ?? '—'}</td><td><button onclick={() => void openDetail(order.poId)}>{i18n.t('Gestionar')}</button></td></tr>
          {:else}<tr><td colspan="6" class="empty">{i18n.t('No hay órdenes que coincidan con los filtros.')}</td></tr>{/each}
        </tbody>
      </table>
      <footer class="pagination"><span>{vm.pagination.total} {i18n.t('órdenes')}</span>
        <button disabled={vm.pagination.page <= 1} onclick={() => { vm.setPage(vm.pagination.page - 1); void vm.load(selection?.warehouseId ?? null); }}>‹</button>
        <span>{vm.pagination.page} / {vm.pagination.pages}</span>
        <button disabled={vm.pagination.page >= vm.pagination.pages} onclick={() => { vm.setPage(vm.pagination.page + 1); void vm.load(selection?.warehouseId ?? null); }}>›</button>
      </footer>
    </div>
  {/if}

  {#if vm.selected}
    <section class="panel detail">
      <div class="detail-heading"><div><p class="eyebrow">{i18n.t('DETALLE DE ORDEN')}</p><h2>{vm.selected.poNumber}</h2>
        <p class="muted">{vm.selected.vendorName ?? '—'} · {vm.selected.status} · WH {vm.selected.warehouseId}</p></div>
        <button onclick={vm.clearSelected}>{i18n.t('Cerrar detalle')}</button></div>
      {#if vm.selected.status !== 'CLOSED' && vm.selected.status !== 'ARCHIVED'}
        <form class="header-edit" onsubmit={saveHeader}>
          <label>{i18n.t('Número')}<input required bind:value={editHeader.poNumber} /></label>
          <label>{i18n.t('Proveedor')}<input bind:value={editHeader.vendorName} /></label>
          <label>{i18n.t('Fecha prevista')}<input type="date" bind:value={editHeader.expectedDate} /></label>
          <label>{i18n.t('Notas')}<input bind:value={editHeader.notes} /></label>
          <button class="primary" disabled={vm.saving}>{i18n.t('Guardar cambios')}</button>
        </form>
      {/if}

      <h3>{i18n.t('Líneas y cantidades')}</h3>
      <div class="table-wrap"><table><thead><tr><th>SKU</th><th>{i18n.t('Producto')}</th><th>{i18n.t('Pedida')}</th><th>{i18n.t('Recibida')}</th><th>{i18n.t('Pendiente')}</th><th>{i18n.t('Costo')}</th><th>{i18n.t('Acciones')}</th></tr></thead>
        <tbody>{#each vm.selected.lines as line (line.poLineId)}
          <tr><td>{line.sku ?? line.itemId}</td><td>{line.itemName ?? '—'}</td>
            <td><input class="qty" type="number" min={line.quantityReceived > 0 ? line.quantityReceived : 1} max="1000000" step="1" value={quantityEdits[line.poLineId] ?? String(line.quantityOrdered)} oninput={e => quantityEdits = { ...quantityEdits, [line.poLineId]: e.currentTarget.value }} /></td>
            <td>{line.quantityReceived}</td><td>{line.quantityRemaining}</td><td>{line.unitCost ?? '—'}</td>
            <td><button disabled={vm.saving || vm.selected.status === 'CLOSED' || vm.selected.status === 'ARCHIVED'} onclick={() => void saveLine(line.poLineId)}>{i18n.t('Actualizar')}</button>
              <button disabled={vm.saving || line.quantityReceived > 0 || vm.selected.status === 'CLOSED' || vm.selected.status === 'ARCHIVED'} onclick={() => void removeLine(line.poLineId)}>{i18n.t('Eliminar')}</button></td></tr>
        {:else}<tr><td colspan="7">{i18n.t('Esta orden no tiene líneas.')}</td></tr>{/each}</tbody>
      </table></div>

      {#if vm.selected.status !== 'CLOSED' && vm.selected.status !== 'ARCHIVED'}
        <form class="add-line" onsubmit={addLine}>
          <h3>{i18n.t('Añadir línea')}</h3>
          <label>{i18n.t('ID de producto')}<input type="number" min="1" required bind:value={newLine.itemId} /></label>
          <label>{i18n.t('Cantidad')}<input type="number" min="1" max="1000000" step="1" required bind:value={newLine.quantity} /></label>
          <label>{i18n.t('Costo unitario')}<input type="number" min="0" step="0.01" bind:value={newLine.unitCost} /></label>
          <button class="primary" disabled={vm.saving}>{i18n.t('Añadir')}</button>
        </form>
      {/if}

      <h3>{i18n.t('Historial de recepciones')}</h3>
      {#if vm.receiptsError}<p class="muted">{vm.receiptsError}</p>
      {:else if vm.receipts.length}
        <div class="table-wrap"><table><thead><tr><th>{i18n.t('Fecha')}</th><th>SKU</th><th>{i18n.t('Cantidad')}</th><th>{i18n.t('Bin')}</th><th>{i18n.t('Recibido por')}</th><th>{i18n.t('Lote')}</th></tr></thead>
          <tbody>{#each vm.receipts as receipt (receipt.receiptId)}<tr><td>{receipt.receivedAt ?? '—'}</td><td>{receipt.sku}</td><td>{receipt.quantityReceived}</td><td>{receipt.binCode}</td><td>{receipt.receivedBy}</td><td>{receipt.lotNumber ?? '—'}</td></tr>{/each}</tbody>
        </table></div>
      {:else}<p class="muted">{i18n.t('Todavía no hay recepciones registradas.')}</p>{/if}

      <div class="lifecycle">
        {#if vm.selected.status === 'CLOSED'}
          <button class="primary" disabled={vm.saving} onclick={() => void changeLifecycle('reopen')}>{i18n.t('Reabrir orden')}</button>
        {:else if vm.selected.status !== 'ARCHIVED'}
          <button class="danger" disabled={vm.saving} onclick={() => void changeLifecycle('close')}>{i18n.t('Cerrar orden')}</button>
        {/if}
      </div>
    </section>
  {/if}
</section>

<style>
  .page{max-width:88rem;margin:1.4rem auto;padding:0 1.1rem;color:var(--ink)}
  .page-header,.detail-heading{display:flex;justify-content:space-between;align-items:center;gap:1rem;margin-bottom:1rem}
  h1{margin:0;font:700 1.65rem var(--disp)}h2{margin:.15rem 0}.page-header p{color:var(--slate);font-size:.9rem}
  .eyebrow{font:600 .66rem var(--disp);letter-spacing:.14em;color:var(--slate)}
  button{border:1px solid var(--line);border-radius:8px;padding:.55rem .8rem;background:var(--card);color:var(--ink);cursor:pointer}
  button:disabled{opacity:.5;cursor:not-allowed}.primary{background:var(--navy);color:white;border-color:var(--navy)}
  .danger{color:var(--danger);border-color:var(--danger)}.panel{border:1px solid var(--line);border-radius:12px;background:var(--card);padding:1rem;margin:1rem 0}
  .editor,.filters,.header-edit,.add-line{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.75rem}
  .editor h2,.wide{grid-column:1/-1}.editor label,.filters label,.header-edit label,.add-line label{display:grid;gap:.3rem;color:var(--slate);font-size:.8rem}
  input,select{min-width:0;min-height:38px;border:1px solid var(--line);border-radius:8px;padding:.45rem .6rem;background:var(--card);color:var(--ink)}
  .lines-editor{border-top:1px solid var(--line);padding-top:.8rem}.line-inputs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr)) auto;align-items:end;gap:.6rem;margin:.6rem 0}
  .actions{display:flex;justify-content:flex-end;gap:.5rem}.filters{align-items:end}.filters .check{display:flex;align-items:center;gap:.45rem}
  .table-wrap{overflow:auto;border:1px solid var(--line);border-radius:10px;margin:.8rem 0}
  table{width:100%;border-collapse:collapse;white-space:nowrap;font-size:.84rem}th,td{text-align:left;padding:.7rem;border-bottom:1px solid var(--line)}
  th{color:var(--slate);font-size:.72rem;text-transform:uppercase}tr:last-child td{border-bottom:0}
  .link{border:0;background:none;color:var(--accent);text-decoration:underline;padding:0}.status{font-size:.75rem;font-weight:650}
  .pagination{display:flex;justify-content:flex-end;align-items:center;gap:.7rem;padding:.65rem}.empty,.muted{color:var(--slate)}
  .detail{padding:1.2rem}.detail-heading{align-items:flex-start}.header-edit,.add-line{grid-template-columns:repeat(4,minmax(0,1fr));align-items:end;margin:1rem 0;padding:1rem;background:var(--surface);border-radius:10px}
  .add-line h3{grid-column:1/-1;margin:0}.qty{width:5.5rem}.lifecycle{display:flex;justify-content:flex-end;margin-top:1rem}
  @media(max-width:850px){.filters,.editor,.header-edit,.add-line{grid-template-columns:repeat(2,minmax(0,1fr))}}
  @media(max-width:560px){.page-header,.detail-heading{align-items:flex-start;flex-direction:column}.filters,.editor,.header-edit,.add-line{grid-template-columns:1fr}.line-inputs{grid-template-columns:1fr 1fr}.line-inputs label:first-child{grid-column:1/-1}}
</style>
