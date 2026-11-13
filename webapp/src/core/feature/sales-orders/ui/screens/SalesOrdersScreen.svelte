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
    if (ok) showCreate = false;
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
    await vm.open(orderId);
    if (vm.selected) beginEdit(vm.selected);
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
    if (ok) feedback = i18n.t('Pedido actualizado correctamente.');
  }

  async function saveAddresses(order: SalesOrder): Promise<void> {
    const ok = await vm.updateAddress(order.salesOrderId, {
      billingAddress,
      shippingAddress
    });
    if (ok) feedback = i18n.t('Direcciones actualizadas correctamente.');
  }

  async function addLine(): Promise<void> {
    const ok = await vm.addLine(Number(newItemId), Number(newItemQuantity));
    if (ok) {
      newItemId = '';
      newItemQuantity = '1';
      feedback = i18n.t('Línea añadida correctamente.');
    }
  }

  async function updateLine(lineId: number): Promise<void> {
    const quantity = Number(lineQuantity[lineId]);
    const ok = await vm.updateLine(lineId, quantity);
    if (ok) feedback = i18n.t('Cantidad actualizada.');
  }

  async function removeLine(lineId: number): Promise<void> {
    if (!confirm(i18n.t('¿Eliminar esta línea del pedido?'))) return;
    const ok = await vm.deleteLine(lineId);
    if (ok) feedback = i18n.t('Línea eliminada.');
  }

  async function cancelOrder(order: SalesOrder): Promise<void> {
    if (!confirm(i18n.t('¿Confirmas la cancelación del pedido?'))) return;
    const ok = await vm.cancel(order.salesOrderId);
    if (ok) feedback = i18n.t('Pedido cancelado.');
  }

  async function shipOrder(order: SalesOrder): Promise<void> {
    if (!confirm(i18n.t('¿Registrar el despacho administrativo de las cantidades recogidas?'))) return;
    const ok = await vm.adminShip();
    if (ok) feedback = i18n.t('Despacho registrado.');
  }

  function displayDate(value: string | null): string {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
  }
</script>

<section class="page">
  <header class="page-header">
    <div>
      <p class="eyebrow">ABELLIS · SMART WMS</p>
      <h1>{i18n.t('Pedidos de venta')}</h1>
      <p class="subtitle">{i18n.t('Consulta y administra pedidos, líneas y datos de expedición.')}</p>
    </div>
    <button class="primary" type="button" onclick={openCreateForm}>{i18n.t('Nuevo pedido')}</button>
  </header>

  {#if vm.error}<p class="error" role="alert">{vm.error}</p>{/if}
  {#if feedback}<p class="feedback" role="status">{feedback}</p>{/if}

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
  <div class="overlay">
    <section class="dialog" role="dialog" aria-modal="true" aria-labelledby="create-title">
      <h2 id="create-title">{i18n.t('Crear pedido de venta')}</h2>
      <form class="form-grid" onsubmit={(event) => { event.preventDefault(); void submitCreate(); }}>
        <label>{i18n.t('Número de pedido')} *<input required maxlength="128" bind:value={orderNumber} /></label>
        <label>{i18n.t('ID de almacén')} *<input required type="number" min="1" step="1" bind:value={warehouseId} /></label>
        <label>{i18n.t('ID de artículo inicial')} *<input required type="number" min="1" step="1" bind:value={initialItemId} /></label>
        <label>{i18n.t('Cantidad')} *<input required type="number" min="1" max="1000000" step="1" bind:value={initialQuantity} /></label>
        <label>{i18n.t('Cliente')}<input maxlength="256" bind:value={customerName} /></label>
        <label>{i18n.t('Correo')}<input type="email" maxlength="255" bind:value={customerEmail} /></label>
        <label>{i18n.t('Teléfono')}<input maxlength="64" bind:value={customerPhone} /></label>
        <label>{i18n.t('Método de envío')}<input maxlength="100" bind:value={shipMethod} /></label>
        <label>{i18n.t('Dirección de envío')}<input maxlength="512" bind:value={shipAddress} /></label>
        <label>{i18n.t('Enviar antes de')}<input type="date" bind:value={shipByDate} /></label>
        <label class="wide">{i18n.t('Observaciones')}<textarea maxlength="4096" rows="3" bind:value={memo}></textarea></label>
        <div class="dialog-actions">
          <button type="button" onclick={() => showCreate = false}>{i18n.t('Cancelar')}</button>
          <button class="primary" type="submit" disabled={vm.saving}>{vm.saving ? i18n.t('Guardando…') : i18n.t('Crear pedido')}</button>
        </div>
      </form>
    </section>
  </div>
{/if}

{#if vm.selected}
  {@const order = vm.selected}
  <div class="overlay" role="presentation" onclick={(event) => { if (event.target === event.currentTarget) vm.close(); }}>
    <section class="dialog detail-dialog" role="dialog" aria-modal="true" aria-labelledby="detail-title">
      <header class="detail-header">
        <div><p class="eyebrow">{i18n.t('Detalle del pedido')}</p><h2 id="detail-title">{order.salesOrderNumber}</h2><span class="status">{order.status}</span></div>
        <button type="button" aria-label={i18n.t('Cerrar')} onclick={() => vm.close()}>×</button>
      </header>

      <section class="detail-section">
        <h3>{i18n.t('Datos del cliente y expedición')}</h3>
        <div class="form-grid">
          <label>{i18n.t('Cliente')}<input bind:value={editCustomerName} /></label>
          <label>{i18n.t('Teléfono')}<input bind:value={editCustomerPhone} /></label>
          <label>{i18n.t('Correo')}<input type="email" bind:value={editCustomerEmail} /></label>
          <label>{i18n.t('Método de envío')}<input bind:value={editShipMethod} /></label>
          <label>{i18n.t('Dirección de envío')}<input bind:value={editShipAddress} /></label>
          <label>{i18n.t('Fecha límite')}<input type="date" bind:value={editShipByDate} /></label>
          <label class="wide">{i18n.t('Observaciones')}<textarea rows="2" bind:value={editMemo}></textarea></label>
        </div>
        <button class="primary" type="button" onclick={() => void saveHeader(order)} disabled={vm.saving}>{i18n.t('Guardar cambios')}</button>
      </section>

      <section class="detail-section">
        <h3>{i18n.t('Direcciones de facturación y envío')}</h3>
        <div class="address-grid">
          <fieldset>
            <legend>{i18n.t('Dirección de facturación')}</legend>
            <label>{i18n.t('Nombre')}<input bind:value={billingAddress.name} maxlength="200" /></label>
            <label>{i18n.t('Dirección')}<input bind:value={billingAddress.line1} maxlength="200" /></label>
            <label>{i18n.t('Complemento')}<input bind:value={billingAddress.line2} maxlength="200" /></label>
            <label>{i18n.t('Ciudad')}<input bind:value={billingAddress.city} maxlength="100" /></label>
            <label>{i18n.t('Provincia / Estado')}<input bind:value={billingAddress.state} maxlength="100" /></label>
            <label>{i18n.t('Código postal')}<input bind:value={billingAddress.postalCode} maxlength="32" /></label>
            <label>{i18n.t('País')}<input bind:value={billingAddress.country} maxlength="64" /></label>
            <label>{i18n.t('Teléfono')}<input bind:value={billingAddress.phone} maxlength="64" /></label>
          </fieldset>
          <fieldset>
            <legend>{i18n.t('Dirección de envío')}</legend>
            <label>{i18n.t('Nombre')}<input bind:value={shippingAddress.name} maxlength="200" /></label>
            <label>{i18n.t('Dirección')}<input bind:value={shippingAddress.line1} maxlength="200" /></label>
            <label>{i18n.t('Complemento')}<input bind:value={shippingAddress.line2} maxlength="200" /></label>
            <label>{i18n.t('Ciudad')}<input bind:value={shippingAddress.city} maxlength="100" /></label>
            <label>{i18n.t('Provincia / Estado')}<input bind:value={shippingAddress.state} maxlength="100" /></label>
            <label>{i18n.t('Código postal')}<input bind:value={shippingAddress.postalCode} maxlength="32" /></label>
            <label>{i18n.t('País')}<input bind:value={shippingAddress.country} maxlength="64" /></label>
            <label>{i18n.t('Teléfono')}<input bind:value={shippingAddress.phone} maxlength="64" /></label>
          </fieldset>
        </div>
        <button class="primary" type="button" onclick={() => void saveAddresses(order)} disabled={vm.saving}>
          {i18n.t('Guardar direcciones')}
        </button>
      </section>

      <section class="detail-section">
        <h3>{i18n.t('Líneas del pedido')}</h3>
        <div class="table-wrap">
          <table>
            <thead><tr><th>SKU</th><th>{i18n.t('Artículo')}</th><th>{i18n.t('Solicitado')}</th><th>{i18n.t('Asignado')}</th><th>{i18n.t('Recogido')}</th><th>{i18n.t('Enviado')}</th><th>{i18n.t('Acciones')}</th></tr></thead>
            <tbody>
              {#each order.lines as line (line.soLineId)}
                <tr>
                  <td>{line.sku ?? '—'}</td><td>{line.itemName ?? '—'}</td>
                  <td><input class="qty" type="number" min="1" max="1000000" value={lineQuantity[line.soLineId] ?? String(line.quantityOrdered)} oninput={(event) => lineQuantity[line.soLineId] = event.currentTarget.value} /></td>
                  <td>{line.quantityAllocated}</td><td>{line.quantityPicked}</td><td>{line.quantityShipped}</td>
                  <td><button type="button" onclick={() => void updateLine(line.soLineId)} disabled={vm.saving}>{i18n.t('Guardar')}</button><button class="danger" type="button" onclick={() => void removeLine(line.soLineId)} disabled={vm.saving || line.quantityPicked > 0 || line.quantityPacked > 0 || line.quantityShipped > 0}>{i18n.t('Eliminar')}</button></td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
        <form class="inline-form" onsubmit={(event) => { event.preventDefault(); void addLine(); }}>
          <label>{i18n.t('ID de artículo')}<input type="number" min="1" step="1" required bind:value={newItemId} /></label>
          <label>{i18n.t('Cantidad')}<input type="number" min="1" max="1000000" step="1" required bind:value={newItemQuantity} /></label>
          <button type="submit" disabled={vm.saving}>{i18n.t('Añadir línea')}</button>
        </form>
      </section>

      <section class="detail-section">
        <h3>{i18n.t('Información operativa')}</h3>
        <dl>
          <div><dt>{i18n.t('Almacén')}</dt><dd>{order.warehouseId}</dd></div>
          <div><dt>{i18n.t('Tipo de pedido')}</dt><dd>{order.orderType}</dd></div>
          <div><dt>{i18n.t('Pedido original')}</dt><dd>{order.parentSalesOrderNumber ?? '—'}</dd></div>
          <div><dt>{i18n.t('Transportista')}</dt><dd>{order.carrier ?? '—'}</dd></div>
          <div><dt>{i18n.t('Seguimiento')}</dt><dd>{order.trackingNumber ?? '—'}</dd></div>
          <div><dt>{i18n.t('Total')}</dt><dd>{order.orderTotal ?? '—'}</dd></div>
        </dl>
        {#if order.pickTasks.length}
          <h4>{i18n.t('Tareas de picking pendientes')}</h4>
          <ul>{#each order.pickTasks as task (task.pickTaskId)}<li>{task.sku} · {task.quantityPicked} · {task.binCode} · {task.pickedBy ?? '—'}</li>{/each}</ul>
        {/if}
      </section>

      <footer class="dialog-actions">
        {#if order.status !== 'CANCELLED' && order.status !== 'SHIPPED'}
          <button class="danger" type="button" onclick={() => void cancelOrder(order)} disabled={vm.saving}>{i18n.t('Cancelar pedido')}</button>
        {/if}
        {#if order.status === 'PICKED' || order.status === 'PACKED'}
          <button class="primary" type="button" onclick={() => void shipOrder(order)} disabled={vm.saving}>{i18n.t('Registrar despacho')}</button>
        {/if}
        <button type="button" onclick={() => vm.close()}>{i18n.t('Cerrar')}</button>
      </footer>
    </section>
  </div>
{/if}

<style>
  .page { max-width: 82rem; margin: 1.5rem auto; padding: 0 1.25rem; color: var(--ink); }
  .page-header, .detail-header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
  .page-header { margin-bottom: 1.25rem; }
  .eyebrow { margin: 0 0 .35rem; color: var(--slate); font: 600 .66rem var(--disp); letter-spacing: .14em; }
  h1, h2, h3 { font-family: var(--disp); }
  h1 { margin: 0; font-size: 1.7rem; }
  h2 { margin: 0; font-size: 1.35rem; }
  h3 { margin: 0 0 .85rem; font-size: 1rem; }
  h4 { margin-bottom: .5rem; }
  .subtitle { margin: .4rem 0 0; color: var(--slate); font-size: .9rem; }
  button, input, select, textarea { font: inherit; }
  button { min-height: 38px; padding: .5rem .8rem; border: 1px solid var(--line); border-radius: 8px; background: var(--card); color: var(--ink); cursor: pointer; }
  button:disabled { opacity: .5; cursor: not-allowed; }
  .primary { border-color: var(--navy); background: var(--navy); color: white; }
  .danger { color: var(--danger); }
  .filters, .inline-form { display: flex; align-items: end; gap: .7rem; flex-wrap: wrap; margin-bottom: 1rem; }
  label { display: grid; gap: .3rem; color: var(--slate); font-size: .78rem; font-weight: 600; }
  input, select, textarea { min-height: 39px; width: 100%; padding: .55rem .65rem; border: 1px solid var(--line); border-radius: 8px; background: var(--card); color: var(--ink); }
  .search-field { flex: 1; min-width: 220px; }
  .table-wrap { overflow: auto; border: 1px solid var(--line); border-radius: 12px; background: var(--card); }
  table { width: 100%; border-collapse: collapse; white-space: nowrap; font-size: .84rem; }
  th, td { padding: .7rem .8rem; border-bottom: 1px solid var(--line); text-align: left; }
  th { color: var(--slate); font-size: .7rem; text-transform: uppercase; letter-spacing: .04em; }
  .link { padding: 0; border: 0; background: none; color: var(--navy); font-weight: 700; text-decoration: underline; }
  .status { display: inline-block; padding: .2rem .5rem; border-radius: 99px; background: var(--surface-subtle); font-size: .72rem; font-weight: 700; }
  .pagination, .dialog-actions { display: flex; align-items: center; justify-content: space-between; gap: .65rem; margin-top: 1rem; }
  .pagination { color: var(--slate); font-size: .82rem; }
  .empty { padding: 2rem 0; color: var(--slate); }
  .error { color: var(--danger); }
  .feedback { padding: .7rem .9rem; border: 1px solid var(--line); border-radius: 8px; color: var(--success); }
  .skeleton { display: grid; gap: .55rem; }
  .skeleton span { height: 2.8rem; border-radius: 8px; background: var(--surface-subtle); animation: pulse 1s infinite alternate; }
  .overlay { position: fixed; inset: 0; z-index: 60; display: grid; place-items: center; padding: 1rem; background: #10182799; }
  .dialog { width: min(100%, 52rem); max-height: min(92vh, 900px); overflow: auto; padding: 1.25rem; border: 1px solid var(--line); border-radius: 14px; background: var(--card); box-shadow: 0 20px 60px #0003; }
  .detail-dialog { width: min(100%, 74rem); }
  .detail-header { margin-bottom: 1.2rem; }
  .detail-section { margin-top: 1.2rem; padding-top: 1rem; border-top: 1px solid var(--line); }
  .form-grid, .address-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .8rem; }
  .address-grid fieldset { min-width: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .65rem; padding: .8rem; border: 1px solid var(--line); border-radius: 10px; }
  .address-grid legend { padding: 0 .35rem; color: var(--slate); font-size: .8rem; font-weight: 700; }
  .address-grid label { min-width: 0; }
  .address-grid label:nth-child(3), .address-grid label:nth-child(4) { grid-column: 1 / -1; }
  .wide, .dialog-actions { grid-column: 1 / -1; }
  .dialog-actions { justify-content: flex-end; }
  .inline-form label { min-width: 130px; }
  .qty { width: 90px; }
  dl { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .8rem; }
  dl div { padding: .65rem; border-radius: 8px; background: var(--surface-subtle); }
  dt { color: var(--slate); font-size: .72rem; }
  dd { margin: .25rem 0 0; font-weight: 600; }
  @keyframes pulse { to { opacity: .45; } }
  @media (max-width: 650px) {
    .page-header { align-items: flex-start; flex-direction: column; }
    .form-grid, .address-grid, .address-grid fieldset, dl { grid-template-columns: 1fr; }
    .address-grid label { grid-column: auto; }
    .filters { align-items: stretch; flex-direction: column; }
    .search-field { min-width: 100%; }
    .pagination { align-items: flex-start; flex-direction: column; }
  }
  @media (prefers-reduced-motion: reduce) { .skeleton span { animation: none; } }
</style>
