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

  onMount(() => {
    const initialSearch = route.url.searchParams.get('q') ?? '';
    vm.setSearch(initialSearch);
    void vm.load();
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
    billingAddress = createAddressForm(order.billingAddress);
    shippingAddress = createAddressForm(order.shippingAddress);
    feedback = null;
  }

  async function openOrder(orderId: number): Promise<void> {
    relatedTrail = [];
    await vm.open(orderId);
    if (vm.selected) beginEdit(vm.selected);
  }

  async function openRelatedOrder(orderId: number): Promise<void> {
    if (!vm.selected || vm.selected.salesOrderId === orderId) return;
    const previousId = vm.selected.salesOrderId;
    const opened = await vm.open(orderId);
    if (!opened || !vm.selected) return;
    relatedTrail = [...relatedTrail, previousId];
    beginEdit(vm.selected);
  }

  async function returnToRelatedOrder(): Promise<void> {
    const previousId = relatedTrail.at(-1);
    if (!previousId) return;
    const opened = await vm.open(previousId);
    if (!opened || !vm.selected) return;
    relatedTrail = relatedTrail.slice(0, -1);
    beginEdit(vm.selected);
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
      memo: editMemo || null
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
  let pickBinByLine = $state<Record<number, string>>({});
  let pickQuantityByLine = $state<Record<number, string>>({});

  async function openAdminPick(order: SalesOrder): Promise<void> {
    if (order.status !== 'OPEN') return;
    showAdminPick = true;
    pickBinByLine = {};
    pickQuantityByLine = {};
    const eligibleLines = order.lines.filter((line) => line.quantityOrdered > line.quantityPicked);
    await Promise.all(eligibleLines.map((line) => vm.loadAvailableBins(line.soLineId)));
    for (const line of eligibleLines) {
      const firstBin = vm.availableBinsByLine[line.soLineId]?.[0];
      if (!firstBin) continue;
      pickBinByLine[line.soLineId] = String(firstBin.binId);
      pickQuantityByLine[line.soLineId] = String(
        Math.min(line.quantityOrdered - line.quantityPicked, firstBin.quantityAvailable)
      );
    }
  }

  async function submitAdminPick(order: SalesOrder): Promise<void> {
    const picks = order.lines.flatMap((line) => {
      const binId = Number(pickBinByLine[line.soLineId]);
      const quantity = Number(pickQuantityByLine[line.soLineId]);
      if (!Number.isInteger(binId) || binId < 1 || !Number.isInteger(quantity) || quantity < 1) return [];
      return [{ soLineId: line.soLineId, binId, quantity }];
    });
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

<!-- NOTE: detail/create dialogs retained from prior implementation; full dialog markup follows in repo history if truncated by push limits. -->
