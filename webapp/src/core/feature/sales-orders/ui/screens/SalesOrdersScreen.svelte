<script lang="ts">
  import { getContext, onMount } from 'svelte';
  import { page as route } from '$app/state';
  import type { I18nState } from '../../../../../lib/i18n/i18n.svelte';
  import { createSalesOrdersState } from '../state/salesOrdersState.svelte';
  import type {
    CreateSalesOrder,
    SalesOrder,
    SalesOrderAddress
  } from '../../domain/entity/SalesOrder';
  import PageHeader from '../../../../../lib/components/PageHeader.svelte';
  import UiBanner from '../../../../../lib/components/UiBanner.svelte';
  import { pushToast } from '../../../../../lib/ui/toast.svelte';

  type AddressForm = { [Key in keyof SalesOrderAddress]: string };

  function createAddressForm(address?: SalesOrderAddress): AddressForm {
    return {
      name: address?.name ?? '',
      line1: address?.line1 ?? '',
      line2: address?.line2 ?? '',
      city: address?.city ?? '',
      state: address?.state ?? '',
      postalCode: address?.postalCode ?? '',
      country: address?.country ?? '',
      phone: address?.phone ?? ''
    };
  }

  const i18n = getContext<I18nState>('i18n');
  const vm = createSalesOrdersState();
  const warehouseSelection = getContext<{ warehouseId: number | null }>('warehouseSelection');

  let showCreate = $state(false);
  let orderNumber = $state('');
  let warehouseId = $state('');
  let customerName = $state('');
  let customerEmail = $state('');
  let customerPhone = $state('');
  let shipMethod = $state('');
  let shipAddress = $state('');
  let shipByDate = $state('');
  let memo = $state('');
  let initialItemId = $state('');
  let initialQuantity = $state('1');
  let editCustomerName = $state('');
  let editCustomerPhone = $state('');
  let editCustomerEmail = $state('');
  let editShipMethod = $state('');
  let editShipAddress = $state('');
  let editShipByDate = $state('');
  let editMemo = $state('');
  let billingAddress = $state<AddressForm>(createAddressForm());
  let shippingAddress = $state<AddressForm>(createAddressForm());
  let newItemId = $state('');
  let newItemQuantity = $state('1');
  let lineQuantity = $state<Record<number, string>>({});
  let feedback = $state<string | null>(null);
  let relatedTrail = $state<number[]>([]);
  let editMode = $state(false);
  let editPriority = $state('0');
  let editSourceSystem = $state('');
  let editOrderOrigin = $state('');
  let editCarrier = $state('');
  let editTrackingNumber = $state('');
  let editShippedDate = $state('');
  let partialShorts = $state<Record<number, string>>({});
  let partialReason = $state('');
  let revertTargetStatus = $state('OPEN');
  let releasePickTaskIds = $state<number[]>([]);
  let rmaQuantities = $state<Record<number, string>>({});
  let rmaReason = $state('');
  let showRma = $state(false);
  let showReceiveReturn = $state(false);
  let returnItemId = $state('');
  let returnQuantity = $state('1');
  let returnWarehouseId = $state('');
  let returnBinId = $state('');
  let returnNotes = $state('');

  onMount(() => {
    const initialSearch = route.url.searchParams.get('q') ?? route.url.searchParams.get('focus') ?? '';
    vm.setSearch(initialSearch);
    void vm.load().then(() => {
      const focus = route.url.searchParams.get('focus');
      if (!focus) return;
      const match = vm.orders.find((order) => order.salesOrderNumber.toLowerCase() === focus.toLowerCase());
      if (match) void openOrder(match.salesOrderId);
    });
  });

  function openCreateForm(): void {
    showCreate = true;
    orderNumber = '';
    warehouseId = String(warehouseSelection?.warehouseId ?? '');
    customerName = '';
    customerEmail = '';
    customerPhone = '';
    shipMethod = '';
    shipAddress = '';
    shipByDate = '';
    memo = '';
    initialItemId = '';
    initialQuantity = '1';
  }

  function createPayload(): CreateSalesOrder {
    return {
      salesOrderNumber: orderNumber,
      warehouseId: Number(warehouseId),
      customerName: customerName || null,
      customerEmail: customerEmail || null,
      customerPhone: customerPhone || null,
      shipMethod: shipMethod || null,
      shipAddress: shipAddress || null,
      shipByDate: shipByDate || null,
      memo: memo || null,
      lines: [{ itemId: Number(initialItemId), quantityOrdered: Number(initialQuantity) }]
    };
  }

  async function submitCreate(): Promise<void> {
    const ok = await vm.create(createPayload());
    if (ok) {
      showCreate = false;
      pushToast(i18n.t('Pedido creado correctamente.'), 'success');
    } else if (vm.error) pushToast(vm.error, 'error');
  }

  function beginEdit(order: SalesOrder): void {
    editCustomerName = order.customerName ?? '';
    editCustomerPhone = order.customerPhone ?? '';
    editCustomerEmail = order.customerEmail ?? '';
    editShipMethod = order.shipMethod ?? '';
    editShipAddress = order.shipAddress ?? '';
    editShipByDate = order.shipByDate ?? '';
    editMemo = order.memo ?? '';
    editPriority = String(order.priority ?? 0);
    editSourceSystem = order.sourceSystem ?? '';
    editOrderOrigin = order.orderOrigin ?? '';
    editCarrier = order.carrier ?? '';
    editTrackingNumber = order.trackingNumber ?? '';
    editShippedDate = order.shippedDateLocal ?? '';
    editMode = true;
    billingAddress = createAddressForm(order.billingAddress);
    shippingAddress = createAddressForm(order.shippingAddress);
    feedback = null;
  }

  async function openOrder(orderId: number): Promise<void> {
    relatedTrail = [];
    await vm.open(orderId);
    if (vm.selected) {
      beginEdit(vm.selected);
      editMode = false;
      void vm.loadRelated();
      void vm.loadSourceSystems();
    }
  }

  async function openRelatedOrder(orderId: number): Promise<void> {
    if (!vm.selected || vm.selected.salesOrderId === orderId) return;
    const previousId = vm.selected.salesOrderId;
    const opened = await vm.open(orderId);
    if (!opened || !vm.selected) return;
    relatedTrail = [...relatedTrail, previousId];
    beginEdit(vm.selected);
    editMode = false;
    void vm.loadRelated();
  }

  async function returnToRelatedOrder(): Promise<void> {
    const previousId = relatedTrail.at(-1);
    if (!previousId) return;
    const opened = await vm.open(previousId);
    if (!opened || !vm.selected) return;
    relatedTrail = relatedTrail.slice(0, -1);
    beginEdit(vm.selected);
    editMode = false;
    await vm.loadRelated();
  }

  async function saveHeader(order: SalesOrder): Promise<void> {
    const ok = await vm.update(order.salesOrderId, {
      customerName: editCustomerName || null,
      customerPhone: editCustomerPhone || null,
      customerEmail: editCustomerEmail || null,
      shipMethod: editShipMethod || null,
      shipAddress: editShipAddress || null,
      shipByDate: editShipByDate || null,
      memo: editMemo || null,
      orderOrigin: editOrderOrigin || null,
      priority: Number(editPriority),
      sourceSystem: editSourceSystem || null,
      carrier: editCarrier || null,
      trackingNumber: editTrackingNumber || null,
      shippedAt: editShippedDate || null
    });
    if (ok) {
      feedback = i18n.t('Pedido actualizado correctamente.');
      pushToast(feedback, 'success');
    }
  }

  async function saveAddresses(order: SalesOrder): Promise<void> {
    const ok = await vm.updateAddress(order.salesOrderId, {
      billingAddress,
      shippingAddress
    });
    if (ok) {
      feedback = i18n.t('Direcciones actualizadas correctamente.');
      pushToast(feedback, 'success');
    }
  }

  async function applyAllocation(lineId: number, delta: number): Promise<void> {
    const result = await vm.updateAllocation(lineId, delta);
    if (result) {
      feedback = result.unchanged
        ? i18n.t('La asignación no cambió: no había inventario disponible o se alcanzó el límite.')
        : i18n.t('Asignación actualizada. Cantidad reservada: ') + result.quantityAllocated;
      pushToast(feedback, result.unchanged ? 'warning' : 'success');
    }
  }

  async function submitPartialFulfill(): Promise<void> {
    const lines = Object.entries(partialShorts)
      .map(([soLineId, shortQuantity]) => ({ soLineId: Number(soLineId), shortQuantity: Number(shortQuantity) }))
      .filter((line) => Number.isInteger(line.shortQuantity) && line.shortQuantity > 0);
    const ok = await vm.partialFulfill({ lines, reason: partialReason.trim() });
    if (ok) {
      partialShorts = {};
      partialReason = '';
      feedback = i18n.t('Fulfillment parcial registrado; se creó el pedido pendiente.');
      pushToast(feedback, 'success');
    } else if (vm.error) pushToast(vm.error, 'error');
  }

  async function submitRevert(): Promise<void> {
    const ok = await vm.revertStatus({ newStatus: revertTargetStatus, releasePickTaskIds });
    if (ok) {
      feedback = i18n.t('Estado del pedido revertido.');
      pushToast(feedback, 'success');
    } else if (vm.error) pushToast(vm.error, 'error');
  }

  async function submitRma(): Promise<void> {
    const order = vm.selected;
    if (!order) return;
    const lines = Object.entries(rmaQuantities)
      .map(([itemId, quantity]) => {
        const line = order.lines.find((candidate) => candidate.itemId === Number(itemId));
        return { itemId: Number(itemId), quantity: Number(quantity), originalSoLineId: line?.soLineId ?? null };
      })
      .filter((line) => Number.isInteger(line.quantity) && line.quantity > 0);
    const ok = await vm.createRma({ lines, reason: rmaReason || null });
    if (ok) {
      showRma = false;
      rmaQuantities = {};
      rmaReason = '';
      await vm.loadRelated();
      feedback = i18n.t('RMA creado correctamente.');
      pushToast(feedback, 'success');
    }
  }

  async function submitReceiveReturn(): Promise<void> {
    const order = vm.selected;
    if (!order) return;
    const ok = await vm.receiveReturn({
      itemId: Number(returnItemId),
      quantity: Number(returnQuantity),
      warehouseId: Number(returnWarehouseId || order.warehouseId),
      binId: Number(returnBinId),
      notes: returnNotes || null
    });
    if (ok) {
      showReceiveReturn = false;
      returnItemId = '';
      returnQuantity = '1';
      returnWarehouseId = '';
      returnBinId = '';
      returnNotes = '';
      feedback = i18n.t('Recepción de devolución registrada.');
      pushToast(feedback, 'success');
    }
  }

  async function voidCurrentReturn(): Promise<void> {
    if (!confirm(i18n.t('¿Anular este RMA? Esta operación es exclusiva de ADMIN y deja el registro auditado.'))) return;
    const ok = await vm.voidReturn();
    if (ok) {
      feedback = i18n.t('RMA anulado.');
      pushToast(feedback, 'success');
    } else if (vm.error) pushToast(vm.error, 'error');
  }

  async function addLine(): Promise<void> {
    const ok = await vm.addLine(Number(newItemId), Number(newItemQuantity));
    if (ok) {
      newItemId = '';
      newItemQuantity = '1';
      feedback = i18n.t('Línea añadida correctamente.');
      pushToast(feedback, 'success');
    }
  }

  async function updateLine(lineId: number): Promise<void> {
    const quantity = Number(lineQuantity[lineId]);
    const ok = await vm.updateLine(lineId, quantity);
    if (ok) {
      feedback = i18n.t('Cantidad actualizada.');
      pushToast(feedback, 'success');
    }
  }

  async function removeLine(lineId: number): Promise<void> {
    if (!confirm(i18n.t('¿Eliminar esta línea del pedido?'))) return;
    const ok = await vm.deleteLine(lineId);
    if (ok) {
      feedback = i18n.t('Línea eliminada.');
      pushToast(feedback, 'success');
    }
  }

  async function cancelOrder(order: SalesOrder): Promise<void> {
    if (!confirm(i18n.t('¿Confirmas la cancelación del pedido?'))) return;
    const ok = await vm.cancel(order.salesOrderId);
    if (ok) {
      feedback = i18n.t('Pedido cancelado.');
      pushToast(feedback, 'success');
    }
  }

  async function shipOrder(order: SalesOrder): Promise<void> {
    if (!confirm(i18n.t('¿Registrar el despacho administrativo de las cantidades recogidas?'))) return;
    const ok = await vm.adminShip();
    if (ok) {
      feedback = i18n.t('Despacho registrado.');
      pushToast(feedback, 'success');
    }
  }

  let showAdminPick = $state(false);
  let pickEntriesByLine = $state<Record<number, Array<{ binId: string; quantity: string }>>>({});

  async function openAdminPick(order: SalesOrder): Promise<void> {
    if (order.status !== 'OPEN') return;
    showAdminPick = true;
    pickEntriesByLine = {};
    const eligibleLines = order.lines.filter((line) => line.quantityOrdered > line.quantityPicked);
    await Promise.all(eligibleLines.map((line) => vm.loadAvailableBins(line.soLineId)));
    for (const line of eligibleLines) {
      const firstBin = vm.availableBinsByLine[line.soLineId]?.[0];
      pickEntriesByLine[line.soLineId] = [{
        binId: firstBin ? String(firstBin.binId) : '',
        quantity: firstBin
          ? String(Math.min(line.quantityOrdered - line.quantityPicked, firstBin.quantityAvailable))
          : ''
      }];
    }
  }

  async function submitAdminPick(order: SalesOrder): Promise<void> {
    const picks = order.lines.flatMap((line) =>
      (pickEntriesByLine[line.soLineId] ?? []).flatMap((entry) => {
        const binId = Number(entry.binId);
        const quantity = Number(entry.quantity);
        if (!Number.isInteger(binId) || binId < 1 || !Number.isInteger(quantity) || quantity < 1) return [];
        return [{ soLineId: line.soLineId, binId, quantity }];
      })
    );
    if (!picks.length) {
      feedback = i18n.t('Selecciona al menos una ubicación y una cantidad válida.');
      pushToast(feedback, 'warning');
      return;
    }
    const ok = await vm.adminPick(picks);
    if (ok) {
      showAdminPick = false;
      feedback = i18n.t('Picking administrativo registrado.');
      pushToast(feedback, 'success');
    }
  }

  function updatePickEntry(lineId: number, index: number, field: 'binId' | 'quantity', value: string): void {
    const entries = [...(pickEntriesByLine[lineId] ?? [])];
    if (!entries[index]) return;
    entries[index] = { ...entries[index], [field]: value };
    pickEntriesByLine = { ...pickEntriesByLine, [lineId]: entries };
  }

  function addPickEntry(lineId: number): void {
    pickEntriesByLine = {
      ...pickEntriesByLine,
      [lineId]: [...(pickEntriesByLine[lineId] ?? []), { binId: '', quantity: '' }]
    };
  }

  function removePickEntry(lineId: number, index: number): void {
    const entries = (pickEntriesByLine[lineId] ?? []).filter((_, entryIndex) => entryIndex !== index);
    pickEntriesByLine = { ...pickEntriesByLine, [lineId]: entries };
  }

  function displayDate(value: string | null): string {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
  }
</script>

<section class="page">
  <PageHeader
    title={i18n.t('Pedidos de venta')}
    subtitle={i18n.t('Consulta y administra pedidos, líneas y datos de expedición.')}
  >
    {#snippet actions()}
      <button class="primary" type="button" onclick={openCreateForm}>{i18n.t('Nuevo pedido')}</button>
    {/snippet}
  </PageHeader>

  {#if vm.error}<UiBanner tone="error" message={vm.error} />{/if}
  {#if feedback}<UiBanner tone="success" message={feedback} />{/if}

  <form class="filters" onsubmit={(event) => { event.preventDefault(); void vm.load(); }}>
    <label class="search-field">
      <span>{i18n.t('Buscar')}</span>
      <input type="search" placeholder={i18n.t('Número de pedido o cliente')} value={vm.search} oninput={(event) => vm.setSearch(event.currentTarget.value)} />
    </label>
    <label>
      <span>{i18n.t('Estado')}</span>
      <select value={vm.status} onchange={(event) => { vm.setStatus(event.currentTarget.value); void vm.load(); }}>
        {#each ['All', 'OPEN', 'FRAUD_REVIEW', 'WAITING_STOCK', 'PICKED', 'PACKED', 'SHIPPED', 'CANCELLED', 'REFUNDED'] as value}
          <option value={value}>{value === 'All' ? i18n.t('Todos') : value}</option>
        {/each}
      </select>
    </label>
    <button type="submit" disabled={vm.loading}>{i18n.t('Filtrar')}</button>
  </form>

  {#if vm.loading && vm.orders.length === 0}
    <div class="skeleton" aria-label={i18n.t('Cargando')}><span></span><span></span><span></span></div>
  {:else if vm.orders.length === 0}
    <p class="empty">{i18n.t('No se encontraron pedidos.')}</p>
  {:else}
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th>{i18n.t('Pedido')}</th><th>{i18n.t('Cliente')}</th><th>{i18n.t('Almacén')}</th>
          <th>{i18n.t('Fecha límite')}</th><th>{i18n.t('Estado')}</th><th>{i18n.t('Tipo')}</th>
        </tr></thead>
        <tbody>
          {#each vm.orders as order (order.salesOrderId)}
            <tr>
              <td><button class="link" type="button" onclick={() => void openOrder(order.salesOrderId)}>{order.salesOrderNumber}</button></td>
              <td>{order.customerName ?? '—'}</td>
              <td>{order.warehouseId}</td>
              <td>{displayDate(order.shipByDate)}</td>
              <td><span class="status">{order.status}</span></td>
              <td>{order.orderType}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <footer class="pagination">
      <span>{vm.pagination.total} {i18n.t('registros')} · {i18n.t('Página')} {vm.pagination.page} / {vm.pagination.pages}</span>
      <div>
        <button type="button" onclick={() => { vm.setPage(vm.page - 1); void vm.load(); }} disabled={vm.page <= 1 || vm.loading}>{i18n.t('Anterior')}</button>
        <button type="button" onclick={() => { vm.setPage(vm.page + 1); void vm.load(); }} disabled={vm.page >= vm.pagination.pages || vm.loading}>{i18n.t('Siguiente')}</button>
      </div>
    </footer>
  {/if}
</section>

{#if showCreate}
  <div class="so-overlay">
    <section class="so-dialog" role="dialog" aria-modal="true" aria-labelledby="so-create-title">
      <header class="so-dialog-head"><h2 id="so-create-title">{i18n.t('Nuevo pedido')}</h2><button type="button" onclick={() => showCreate = false}>×</button></header>
      <form onsubmit={(event) => { event.preventDefault(); void submitCreate(); }}>
        <div class="so-form-grid">
          <label>{i18n.t('Número de pedido')}<input required maxlength="128" bind:value={orderNumber} /></label>
          <label>{i18n.t('Almacén ID')}<input required type="number" min="1" step="1" bind:value={warehouseId} /></label>
          <label>{i18n.t('Cliente')}<input maxlength="256" bind:value={customerName} /></label>
          <label>{i18n.t('Email')}<input type="email" maxlength="255" bind:value={customerEmail} /></label>
          <label>{i18n.t('Teléfono')}<input maxlength="64" bind:value={customerPhone} /></label>
          <label>{i18n.t('Método de envío')}<input maxlength="100" bind:value={shipMethod} /></label>
          <label>{i18n.t('Dirección de envío')}<input maxlength="512" bind:value={shipAddress} /></label>
          <label>{i18n.t('Enviar antes de')}<input type="date" bind:value={shipByDate} /></label>
          <label>{i18n.t('Artículo ID')}<input required type="number" min="1" step="1" bind:value={initialItemId} /></label>
          <label>{i18n.t('Cantidad')}<input required type="number" min="1" max="1000000" step="1" bind:value={initialQuantity} /></label>
        </div>
        <p class="so-hint">{i18n.t('La API exige al menos una línea. El artículo se valida en el servidor.')}</p>
        <label>{i18n.t('Notas')}<textarea maxlength="4096" bind:value={memo}></textarea></label>
        <footer class="so-dialog-actions"><button type="button" onclick={() => showCreate = false}>{i18n.t('Cerrar')}</button><button class="so-primary" type="submit" disabled={vm.saving}>{vm.saving ? i18n.t('Guardando…') : i18n.t('Crear pedido')}</button></footer>
      </form>
    </section>
  </div>
{/if}

{#if vm.selected}
  {@const order = vm.selected}
  <div class="so-overlay">
    <section class="so-dialog so-detail" role="dialog" aria-modal="true" aria-labelledby="so-detail-title">
      <header class="so-dialog-head">
        <div><h2 id="so-detail-title">{order.salesOrderNumber}</h2><p><span class="status">{order.status}</span> · {order.orderType ?? 'sale'} · {i18n.t('Almacén')} {order.warehouseId ?? '—'}</p></div>
        <button type="button" aria-label={i18n.t('Cerrar')} onclick={() => { vm.close(); relatedTrail = []; editMode = false; }}>×</button>
      </header>
      {#if vm.error}<UiBanner tone="error" message={vm.error} />{/if}
      <nav class="so-actions">
        {#if relatedTrail.length > 0}<button type="button" onclick={() => void returnToRelatedOrder()}>{i18n.t('Volver')}</button>{/if}
        {#if editMode}<button type="button" onclick={() => editMode = false}>{i18n.t('Vista')}</button>{:else}<button type="button" onclick={() => beginEdit(order)}>{i18n.t('Editar')}</button>{/if}
        {#if order.status !== 'CANCELLED' && order.status !== 'REFUNDED' && order.status !== 'SHIPPED'}<button class="so-danger" type="button" disabled={vm.saving} onclick={() => void cancelOrder(order)}>{i18n.t('Cancelar pedido')}</button>{/if}
        {#if order.status === 'OPEN' && order.orderType !== 'return' && order.orderType !== 'refund'}<button type="button" onclick={() => void openAdminPick(order)}>{i18n.t('Picking administrativo')}</button>{/if}
        {#if ['PICKED', 'PACKED', 'SHIPPED'].includes(order.status) && order.orderType !== 'return' && order.orderType !== 'refund' && order.lines.some((line) => line.quantityPicked > line.quantityShipped)}<button type="button" onclick={() => void shipOrder(order)}>{i18n.t('Despacho administrativo')}</button>{/if}
        {#if (order.status === 'OPEN' || order.status === 'PICKED') && !['backorder', 'return', 'refund'].includes(order.orderType ?? '')}<button type="button" onclick={() => partialShorts = {}}>{i18n.t('Fulfillment parcial')}</button>{/if}
        {#if ['PICKED', 'PACKED', 'SHIPPED'].includes(order.status)}<button type="button" onclick={() => { revertTargetStatus = order.status === 'SHIPPED' ? 'PACKED' : order.status === 'PACKED' ? 'PICKED' : 'OPEN'; releasePickTaskIds = []; }}>{i18n.t('Revertir estado')}</button>{/if}
        {#if order.status === 'SHIPPED' && order.orderType !== 'return' && order.orderType !== 'refund'}<button type="button" onclick={() => { rmaQuantities = {}; showRma = true; }}>{i18n.t('Crear RMA')}</button>{/if}
        {#if order.orderType === 'return' && order.status !== 'CANCELLED'}<button type="button" onclick={() => { returnWarehouseId = String(order.warehouseId ?? ''); showReceiveReturn = true; }}>{i18n.t('Recibir devolución')}</button><button class="so-danger" type="button" onclick={() => void voidCurrentReturn()}>{i18n.t('Anular RMA')}</button>{/if}
      </nav>

      <section class="so-section">
        <h3>{i18n.t('Datos del pedido')}</h3>
        {#if editMode}
          <div class="so-form-grid">
            <label>{i18n.t('Cliente')}<input bind:value={editCustomerName} /></label>
            <label>{i18n.t('Email')}<input type="email" bind:value={editCustomerEmail} /></label>
            <label>{i18n.t('Teléfono')}<input bind:value={editCustomerPhone} /></label>
            <label>{i18n.t('Método de envío')}<input bind:value={editShipMethod} /></label>
            <label>{i18n.t('Dirección de envío')}<input bind:value={editShipAddress} /></label>
            <label>{i18n.t('Enviar antes de')}<input type="date" bind:value={editShipByDate} /></label>
            <label>{i18n.t('Prioridad (0–10)')}<input type="number" min="0" max="10" step="1" bind:value={editPriority} /></label>
            <label>{i18n.t('Sistema de origen')}<select bind:value={editSourceSystem}><option value="">{i18n.t('Sin asignar')}</option>{#each vm.sourceSystems as source}<option value={source.sourceSystem}>{source.sourceSystem} · {source.kind}</option>{/each}</select></label>
            <label>{i18n.t('Origen externo')}<input maxlength="64" bind:value={editOrderOrigin} /></label>
            <label>{i18n.t('Transportista')}<input maxlength="64" bind:value={editCarrier} /></label>
            <label>{i18n.t('Tracking')}<input maxlength="128" bind:value={editTrackingNumber} /></label>
            <label>{i18n.t('Fecha de despacho')}<input type="date" bind:value={editShippedDate} /></label>
          </div>
          <label>{i18n.t('Notas')}<textarea maxlength="4096" bind:value={editMemo}></textarea></label>
          <button class="so-primary" type="button" disabled={vm.saving} onclick={() => void saveHeader(order)}>{i18n.t('Guardar cambios')}</button>
        {:else}
          <dl class="so-summary">
            <div><dt>{i18n.t('Cliente')}</dt><dd>{order.customerName ?? '—'}</dd></div>
            <div><dt>{i18n.t('Email')}</dt><dd>{order.customerEmail ?? '—'}</dd></div>
            <div><dt>{i18n.t('Teléfono')}</dt><dd>{order.customerPhone ?? '—'}</dd></div>
            <div><dt>{i18n.t('Método de envío')}</dt><dd>{order.shipMethod ?? '—'}</dd></div>
            <div><dt>{i18n.t('Enviar antes de')}</dt><dd>{displayDate(order.shipByDate)}</dd></div>
            <div><dt>{i18n.t('Origen')}</dt><dd>{order.orderOrigin ?? '—'}</dd></div>
            <div><dt>{i18n.t('Sistema de origen')}</dt><dd>{order.sourceSystem ?? '—'}</dd></div>
            <div><dt>{i18n.t('Tracking')}</dt><dd>{order.trackingNumber ?? '—'}</dd></div>
            <div><dt>{i18n.t('Transportista')}</dt><dd>{order.carrier ?? '—'}</dd></div>
            <div><dt>{i18n.t('Total')}</dt><dd>{order.orderTotal ?? '—'}</dd></div>
            <div><dt>{i18n.t('Notas')}</dt><dd>{order.memo ?? '—'}</dd></div>
          </dl>
        {/if}
      </section>

      <section class="so-section">
        <h3>{i18n.t('Direcciones')}</h3>
        {#if editMode}
          <div class="so-address-grid">
            <fieldset><legend>{i18n.t('Facturación')}</legend>
              <label>{i18n.t('Nombre')}<input bind:value={billingAddress.name} /></label>
              <label>{i18n.t('Línea 1')}<input bind:value={billingAddress.line1} /></label>
              <label>{i18n.t('Línea 2')}<input bind:value={billingAddress.line2} /></label>
              <label>{i18n.t('Ciudad')}<input bind:value={billingAddress.city} /></label>
              <label>{i18n.t('Provincia / Estado')}<input bind:value={billingAddress.state} /></label>
              <label>{i18n.t('Código postal')}<input bind:value={billingAddress.postalCode} /></label>
              <label>{i18n.t('País')}<input bind:value={billingAddress.country} /></label>
              <label>{i18n.t('Teléfono')}<input bind:value={billingAddress.phone} /></label>
            </fieldset>
            <fieldset><legend>{i18n.t('Envío')}</legend>
              <label>{i18n.t('Nombre')}<input bind:value={shippingAddress.name} /></label>
              <label>{i18n.t('Línea 1')}<input bind:value={shippingAddress.line1} /></label>
              <label>{i18n.t('Línea 2')}<input bind:value={shippingAddress.line2} /></label>
              <label>{i18n.t('Ciudad')}<input bind:value={shippingAddress.city} /></label>
              <label>{i18n.t('Provincia / Estado')}<input bind:value={shippingAddress.state} /></label>
              <label>{i18n.t('Código postal')}<input bind:value={shippingAddress.postalCode} /></label>
              <label>{i18n.t('País')}<input bind:value={shippingAddress.country} /></label>
              <label>{i18n.t('Teléfono')}<input bind:value={shippingAddress.phone} /></label>
            </fieldset>
          </div>
          <button type="button" disabled={vm.saving} onclick={() => void saveAddresses(order)}>{i18n.t('Guardar direcciones')}</button>
        {:else}
          <div class="so-address-grid"><article><h4>{i18n.t('Facturación')}</h4><p>{[order.billingAddress.name, order.billingAddress.line1, order.billingAddress.line2, order.billingAddress.city, order.billingAddress.state, order.billingAddress.postalCode, order.billingAddress.country, order.billingAddress.phone].filter(Boolean).join(', ') || '—'}</p></article><article><h4>{i18n.t('Envío')}</h4><p>{[order.shippingAddress.name, order.shippingAddress.line1, order.shippingAddress.line2, order.shippingAddress.city, order.shippingAddress.state, order.shippingAddress.postalCode, order.shippingAddress.country, order.shippingAddress.phone].filter(Boolean).join(', ') || order.shipAddress || '—'}</p></article></div>
        {/if}
      </section>

      <section class="so-section">
        <h3>{i18n.t('Líneas')}</h3>
        <div class="so-table-wrap"><table>
          <thead><tr><th>#</th><th>SKU</th><th>{i18n.t('Artículo')}</th><th>{i18n.t('Pedida')}</th><th>{i18n.t('Asignada')}</th><th>{i18n.t('Recogida')}</th><th>{i18n.t('Empacada')}</th><th>{i18n.t('Enviada')}</th><th>{i18n.t('Acciones')}</th></tr></thead>
          <tbody>{#each order.lines as line (line.soLineId)}
            <tr>
              <td>{line.lineNumber ?? '—'}</td><td>{line.sku}</td><td>{line.itemName}</td>
              <td>{#if editMode && !['SHIPPED', 'CANCELLED', 'REFUNDED'].includes(order.status)}<input class="so-qty" type="number" min="1" max="1000000" value={lineQuantity[line.soLineId] ?? String(line.quantityOrdered)} oninput={(event) => lineQuantity[line.soLineId] = event.currentTarget.value} /><button type="button" onclick={() => void updateLine(line.soLineId)}>✓</button>{:else}{line.quantityOrdered}{/if}</td>
              <td>{line.quantityAllocated}</td><td>{line.quantityPicked}</td><td>{line.quantityPacked}</td><td>{line.quantityShipped}</td>
              <td>{#if editMode && !['SHIPPED', 'CANCELLED', 'REFUNDED'].includes(order.status)}<button type="button" onclick={() => void applyAllocation(line.soLineId, 1)} title={i18n.t('Reservar una unidad')}>+A</button><button type="button" onclick={() => void applyAllocation(line.soLineId, -1)} title={i18n.t('Liberar una unidad')}>−A</button><button class="so-danger" type="button" onclick={() => void removeLine(line.soLineId)}>×</button>{/if}<button type="button" onclick={() => void vm.loadAvailableBins(line.soLineId)}>{i18n.t('Bins')}</button></td>
            </tr>
            {#if vm.availableBinsByLine[line.soLineId]}
              <tr><td colspan="9"><div class="so-bin-list">{#each vm.availableBinsByLine[line.soLineId] as bin}<span>{bin.binCode} · {bin.quantityAvailable}{bin.preferredPriority !== null ? ' ★' : ''}</span>{:else}<span>{i18n.t('No hay stock disponible en ubicaciones de este almacén.')}</span>{/each}</div></td></tr>
            {/if}
          {/each}</tbody>
        </table></div>
        {#if editMode && !['SHIPPED', 'CANCELLED', 'REFUNDED'].includes(order.status)}
          <div class="so-inline-form"><label>{i18n.t('Artículo ID')}<input type="number" min="1" bind:value={newItemId} /></label><label>{i18n.t('Cantidad')}<input type="number" min="1" max="1000000" bind:value={newItemQuantity} /></label><button type="button" disabled={vm.saving} onclick={() => void addLine()}>{i18n.t('Añadir línea')}</button></div>
        {/if}
      </section>

      {#if vm.adminShipShortfall}
        <section class="so-section so-shortfall" role="alert">
          <h3>{i18n.t('Faltantes que requieren confirmación')}</h3>
          <p class="so-hint">{i18n.t('El servidor bloqueó el despacho porque estas líneas no tienen una marca SHORT. Si confirmas, solo se despachará la cantidad ya recogida; el resto quedará sin enviar.')}</p>
          <ul>{#each vm.adminShipShortfall as shortfall (shortfall.sku)}<li><strong>{shortfall.sku}</strong>: {i18n.t('pedidas')} {shortfall.ordered}, {i18n.t('recogidas')} {shortfall.picked}</li>{/each}</ul>
          <button class="so-danger" type="button" disabled={vm.saving} onclick={() => void vm.adminShip(true)}>{vm.saving ? i18n.t('Despachando…') : i18n.t('Confirmar despacho de cantidades recogidas')}</button>
        </section>
      {/if}

      <section class="so-section">
        <div class="so-section-head"><h3>{i18n.t('Pedidos relacionados')}</h3><button type="button" onclick={() => void vm.loadRelated()} disabled={vm.loadingRelated}>{i18n.t('Actualizar')}</button></div>
        {#if vm.loadingRelated}<p>{i18n.t('Cargando…')}</p>{:else if vm.relatedOrders.length === 0}<p>{i18n.t('No hay pedidos relacionados.')}</p>{:else}
          <div class="so-related">{#each vm.relatedOrders as related (related.soId)}
            <article class:current={related.isCurrent} class:voided={related.isVoided}>
              <button type="button" disabled={related.isCurrent} onclick={() => void openRelatedOrder(related.soId)}>{related.soNumber}</button>
              <span>{related.orderType ?? '—'} · {related.status}</span>
              {#if related.isVoided}<span>{i18n.t('Anulado')}</span>{/if}
              <small>{related.lines.length} {i18n.t('líneas')}</small>
            </article>
          {/each}</div>
        {/if}
      </section>

      {#if (order.status === 'OPEN' || order.status === 'PICKED') && order.orderType !== 'backorder'}
        <section class="so-section">
          <h3>{i18n.t('Fulfillment parcial')}</h3>
          <p class="so-hint">{i18n.t('Indica unidades no disponibles. El servidor reduce las líneas originales y crea un backorder; vuelve a validar los límites antes de aplicar cambios.')}</p>
          {#each order.lines as line (line.soLineId)}
            <label class="so-short-row"><span>{line.sku} · {line.itemName} · {i18n.t('Pendiente')}: {line.quantityOrdered - line.quantityPicked}</span><input type="number" min="0" max={Math.max(0, line.quantityOrdered - line.quantityPicked)} step="1" value={partialShorts[line.soLineId] ?? ''} oninput={(event) => partialShorts[line.soLineId] = event.currentTarget.value} /></label>
          {/each}
          <label>{i18n.t('Motivo')}<input maxlength="500" bind:value={partialReason} /></label>
          <button type="button" disabled={vm.saving} onclick={() => void submitPartialFulfill()}>{i18n.t('Crear backorder')}</button>
        </section>
      {/if}

      {#if ['PICKED', 'PACKED', 'SHIPPED'].includes(order.status)}
        <section class="so-section">
          <h3>{i18n.t('Revertir estado')}</h3>
          <label>{i18n.t('Nuevo estado')}<select bind:value={revertTargetStatus}><option value="OPEN">OPEN</option><option value="PICKED">PICKED</option><option value="PACKED">PACKED</option></select></label>
          <p class="so-hint">{i18n.t('Las tareas seleccionadas se liberan y devuelven unidades al bin. Las no seleccionadas permanecen recogidas; el servidor impide estados incompatibles.')}</p>
          {#each order.pickTasks as task (task.pickTaskId)}
            <label class="so-short-row"><span>{task.sku} · {task.binCode} · {task.quantityPicked}</span><input type="checkbox" checked={releasePickTaskIds.includes(task.pickTaskId)} onchange={(event) => releasePickTaskIds = event.currentTarget.checked ? [...releasePickTaskIds, task.pickTaskId] : releasePickTaskIds.filter((id) => id !== task.pickTaskId)} /></label>
          {/each}
          <button type="button" disabled={vm.saving} onclick={() => void submitRevert()}>{i18n.t('Confirmar reversión')}</button>
        </section>
      {/if}
    </section>
  </div>
{/if}

{#if showAdminPick && vm.selected}
  <div class="so-overlay so-nested"><section class="so-dialog" role="dialog" aria-modal="true"><header class="so-dialog-head"><h2>{i18n.t('Picking administrativo')}</h2><button type="button" onclick={() => showAdminPick = false}>×</button></header>
    {#each vm.selected.lines.filter((line) => line.quantityOrdered > line.quantityPicked) as line (line.soLineId)}
      <div class="so-pick-row"><strong>{line.sku}</strong><select value={pickBinByLine[line.soLineId] ?? ''} onchange={(event) => pickBinByLine[line.soLineId] = event.currentTarget.value}><option value="">{i18n.t('Seleccionar bin')}</option>{#each vm.availableBinsByLine[line.soLineId] ?? [] as bin}<option value={bin.binId}>{bin.binCode} · {bin.quantityAvailable}</option>{/each}</select><input type="number" min="1" max={line.quantityOrdered - line.quantityPicked} value={pickQuantityByLine[line.soLineId] ?? ''} oninput={(event) => pickQuantityByLine[line.soLineId] = event.currentTarget.value} /></div>
    {/each}
    <footer class="so-dialog-actions"><button type="button" onclick={() => showAdminPick = false}>{i18n.t('Cerrar')}</button><button class="so-primary" type="button" disabled={vm.saving} onclick={() => vm.selected && void submitAdminPick(vm.selected)}>{i18n.t('Registrar picking')}</button></footer>
  </section></div>
{/if}

{#if showRma && vm.selected}
  <div class="so-overlay so-nested"><section class="so-dialog" role="dialog" aria-modal="true"><header class="so-dialog-head"><h2>{i18n.t('Crear devolución (RMA)')}</h2><button type="button" onclick={() => showRma = false}>×</button></header>
    <p class="so-hint">{i18n.t('Indica cantidades por cada línea enviada. Las cantidades máximas son informativas; el servidor valida las devoluciones permitidas.')}</p>
    <div class="so-table-wrap"><table><thead><tr><th>SKU</th><th>{i18n.t('Enviada')}</th><th>{i18n.t('Recibida')}</th><th>{i18n.t('Devolver')}</th></tr></thead><tbody>
      {#each vm.selected.lines as line (line.soLineId)}
        {@const remaining = Math.max(0, line.quantityShipped - line.quantityReceived)}
        {#if remaining > 0}<tr><td>{line.sku}</td><td>{line.quantityShipped}</td><td>{line.quantityReceived}</td><td><input type="number" min="0" max={remaining} step="1" value={rmaQuantities[line.itemId ?? 0] ?? ''} oninput={(event) => rmaQuantities[line.itemId ?? 0] = event.currentTarget.value} /></td></tr>{/if}
      {/each}
    </tbody></table></div>
    <label>{i18n.t('Motivo / notas')}<textarea maxlength="4000" bind:value={rmaReason}></textarea></label>
    <footer class="so-dialog-actions"><button type="button" onclick={() => showRma = false}>{i18n.t('Cerrar')}</button><button class="so-primary" type="button" disabled={vm.saving || !Object.values(rmaQuantities).some((value) => Number(value) > 0)} onclick={() => void submitRma()}>{i18n.t('Crear RMA')}</button></footer>
  </section></div>
{/if}

{#if showReceiveReturn && vm.selected}
  <div class="so-overlay so-nested"><section class="so-dialog" role="dialog" aria-modal="true"><header class="so-dialog-head"><h2>{i18n.t('Recibir devolución')}</h2><button type="button" onclick={() => showReceiveReturn = false}>×</button></header>
    <label>{i18n.t('Artículo')}<select bind:value={returnItemId}><option value="">{i18n.t('Seleccionar artículo')}</option>{#each vm.selected.lines as line}<option value={line.itemId}>{line.sku} · {line.itemName}</option>{/each}</select></label>
    <label>{i18n.t('Cantidad')}<input type="number" min="1" max="1000000" step="1" bind:value={returnQuantity} /></label>
    <label>{i18n.t('Almacén ID')}<input type="number" min="1" bind:value={returnWarehouseId} /></label>
    <label>{i18n.t('Bin ID')}<input type="number" min="1" bind:value={returnBinId} /></label>
    <label>{i18n.t('Notas')}<textarea maxlength="500" bind:value={returnNotes}></textarea></label>
    <footer class="so-dialog-actions"><button type="button" onclick={() => showReceiveReturn = false}>{i18n.t('Cerrar')}</button><button class="so-primary" type="button" disabled={vm.saving || !returnItemId || !returnBinId || !returnWarehouseId} onclick={() => void submitReceiveReturn()}>{i18n.t('Confirmar recepción')}</button></footer>
  </section></div>
{/if}

<style>
  .so-overlay { position: fixed; inset: 0; z-index: 80; display: grid; place-items: center; padding: 1rem; background: rgb(15 23 42 / 52%); }
  .so-nested { z-index: 90; }
  .so-dialog { width: min(760px, 100%); max-height: min(92vh, 980px); overflow: auto; padding: 1.25rem; border: 1px solid var(--line, #dce3eb); border-radius: 14px; background: var(--card, #fff); box-shadow: 0 24px 80px rgb(0 0 0 / 22%); }
  .so-detail { width: min(1180px, 100%); }
  .so-dialog-head, .so-section-head { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
  .so-dialog-head { position: sticky; top: -1.25rem; z-index: 2; margin: -1.25rem -1.25rem 1rem; padding: 1rem 1.25rem; border-bottom: 1px solid var(--line, #dce3eb); background: var(--card, #fff); }
  .so-dialog-head h2 { margin: 0; }
  .so-dialog-head p, .so-hint { color: var(--text-secondary, #64748b); font-size: .85rem; }
  .so-actions, .so-dialog-actions, .so-inline-form { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem; margin: .75rem 0; }
  .so-section { padding: 1rem 0; border-top: 1px solid var(--line, #e2e8f0); }
  .so-section h3 { margin: 0 0 .75rem; font-size: 1rem; }
  .so-form-grid, .so-summary, .so-address-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: .75rem; }
  .so-form-grid label, .so-dialog label, .so-address-grid label, .so-inline-form label { display: grid; gap: .3rem; font-size: .85rem; }
  .so-dialog input, .so-dialog select, .so-dialog textarea { min-width: 0; width: 100%; padding: .55rem .65rem; border: 1px solid var(--line, #cbd5e1); border-radius: 7px; font: inherit; background: var(--surface, #fff); color: var(--ink, #172033); }
  .so-dialog textarea { min-height: 74px; resize: vertical; }
  .so-address-grid fieldset { display: grid; gap: .55rem; min-width: 0; padding: .75rem; border: 1px solid var(--line, #dce3eb); border-radius: 9px; }
  .so-address-grid legend { padding: 0 .3rem; font-weight: 600; }
  .so-summary { margin: 0; }
  .so-summary > div { padding: .5rem; border-radius: 8px; background: var(--surface, #f8fafc); }
  .so-summary dt { color: var(--text-secondary, #64748b); font-size: .75rem; }
  .so-summary dd { margin: .2rem 0 0; overflow-wrap: anywhere; }
  .so-table-wrap { overflow-x: auto; }
  .so-section table { width: 100%; border-collapse: collapse; }
  .so-section th, .so-section td { padding: .55rem; border-bottom: 1px solid var(--line, #e2e8f0); text-align: left; white-space: nowrap; }
  .so-qty { width: 76px; }
  .so-bin-list { display: flex; flex-wrap: wrap; gap: .5rem; }
  .so-bin-list span, .so-related article { padding: .35rem .55rem; border-radius: 7px; background: var(--surface, #f1f5f9); }
  .so-related { display: grid; gap: .5rem; }
  .so-related article { display: flex; flex-wrap: wrap; align-items: center; gap: .75rem; }
  .so-related article.current { outline: 1px solid var(--accent, #64748b); }
  .so-related article.voided { opacity: .6; }
  .so-related small { margin-left: auto; color: var(--text-secondary, #64748b); }
  .so-short-row, .so-pick-row { display: grid; grid-template-columns: 1fr minmax(90px, 130px); align-items: center; gap: .75rem; margin: .4rem 0; }
  .so-pick-row { grid-template-columns: minmax(90px, 1fr) minmax(140px, 2fr) minmax(80px, 100px); }
  .so-primary { color: white; background: var(--primary, #174ea6); border: 1px solid var(--primary, #174ea6); }
  .so-danger { color: var(--danger, #b42318); }
  .so-dialog button { cursor: pointer; padding: .45rem .7rem; border: 1px solid var(--line, #cbd5e1); border-radius: 7px; background: var(--card, #fff); font: inherit; }
  .so-dialog button:disabled { opacity: .5; cursor: not-allowed; }
  @media (max-width: 640px) { .so-dialog { padding: .85rem; } .so-dialog-head { top: -.85rem; margin: -.85rem -.85rem .75rem; padding: .8rem .85rem; } .so-pick-row { grid-template-columns: 1fr; } .so-short-row { grid-template-columns: 1fr 90px; } }
</style>
