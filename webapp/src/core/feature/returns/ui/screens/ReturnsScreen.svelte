<script lang="ts">
	import UiStatePanel from '#lib/components/UiStatePanel.svelte';
  import { getContext } from 'svelte';
  import type { I18nState } from '../../../../../lib/i18n/i18n.svelte';
  import type { ReturnLine } from '../../domain/entity/Return';
  import { createReturnsState } from '../state/returnsState.svelte';

  const i18n = getContext<I18nState>('i18n');
  const vm = createReturnsState();
  const auth = getContext<{ user: { role: string; allowed_pages?: string[] } | null }>('authGuard');
  const isAdmin = auth?.user?.role === 'ADMIN';
  const canEditMemo = isAdmin || Boolean(auth?.user?.allowed_pages?.includes('fraud'));

  let idempotencyKeys = $state<Record<number, string>>({});
  let memoDraft = $state('');
  let warehouseId = $state('');
  let binId = $state('');
  let binQuery = $state('');
  let itemDrafts = $state<Record<number, string>>({});
  let notes = $state('');
  let originalQuery = $state('');
  let originalMemo = $state('');
  let requestedQuantities = $state<Record<number, string>>({});

  $effect(() => { void vm.load(); });
  $effect(() => {
    const selectedWarehouseId = Number(warehouseId);
    if (selectedWarehouseId > 0 && binQuery.trim() && !binId) {
      void vm.searchBins(selectedWarehouseId, binQuery);
    } else {
      vm.clearBins();
    }
  });

  async function open(id: number): Promise<void> {
    await vm.detail(id, isAdmin);
    memoDraft = vm.selected?.memo ?? '';
    warehouseId = String(vm.selected?.warehouseId ?? '');
    binId = '';
    binQuery = '';
    itemDrafts = {};
  }

  async function searchOriginals(): Promise<void> { await vm.searchOriginals(originalQuery); }

  async function selectOriginal(id: number): Promise<void> {
    await vm.loadReturnableOrder(id);
    requestedQuantities = {};
  }

  async function createRma(): Promise<void> {
    const order = vm.returnableOrder;
    if (!order) return;
    const lines = order.lines
      .map(line => ({ ...line, quantity: Number(requestedQuantities[line.originalSalesOrderLineId] ?? 0) }))
      .filter(line => line.quantity > 0)
      .map(line => ({ itemId: line.itemId, originalSalesOrderLineId: line.originalSalesOrderLineId, quantity: line.quantity }));
    const created = await vm.createReturn(lines, originalMemo);
    if (created) { originalMemo = ''; requestedQuantities = {}; }
  }

  async function saveMemo(): Promise<void> {
    if (vm.selected && canEditMemo) await vm.memo(vm.selected.salesOrderId, memoDraft);
  }

  async function receive(line: ReturnLine): Promise<void> {
    if (!vm.selected || line.itemId == null) return;
    const quantity = Number(itemDrafts[line.soLineId]);
    const destinationWarehouseId = Number(warehouseId);
    const destinationBinId = Number(binId);
    if (!Number.isInteger(quantity) || quantity <= 0) return;
    if (!Number.isInteger(destinationWarehouseId) || destinationWarehouseId <= 0) return;
    if (!Number.isInteger(destinationBinId) || destinationBinId <= 0) return;

    const idempotencyKey = idempotencyKeys[line.soLineId] ?? crypto.randomUUID();
    if (!idempotencyKeys[line.soLineId]) {
      idempotencyKeys = { ...idempotencyKeys, [line.soLineId]: idempotencyKey };
    }

    const ok = await vm.receive(vm.selected.salesOrderId, {
      itemId: line.itemId,
      quantity,
      warehouseId: destinationWarehouseId,
      binId: destinationBinId,
      notes: notes || null,
      idempotencyKey
    }, isAdmin);

    if (ok) {
      itemDrafts = { ...itemDrafts, [line.soLineId]: '' };
      const nextKeys = { ...idempotencyKeys };
      delete nextKeys[line.soLineId];
      idempotencyKeys = nextKeys;
    }
  }

  async function voidRma(): Promise<void> {
    if (vm.selected && confirm('Anular este RMA? Solo se permite si sigue abierto y no ha recibido mercancía.')) {
      await vm.voidReturn(vm.selected.salesOrderId);
    }
  }
</script>

<section class="page">
  <header>
    <div>
      <p class="eyebrow">ABELLIS · SMART WMS</p>
      <h1>{i18n.t('Devoluciones / RMA')}</h1>
      <p>{i18n.t('Gestiona la recepción física de mercancía devuelta y su ubicación de disposición.')}</p>
    </div>
    <button onclick={() => void vm.load()}>{i18n.t('Actualizar')}</button>
  </header>

  {#if isAdmin}
  <section class="create-rma">
    <h2>{i18n.t('Autorizar una devolución')}</h2>
    <p>{i18n.t('Busca un pedido enviado. El sistema descuenta las cantidades ya autorizadas en otros RMA; Flask vuelve a validar el límite de forma transaccional.')}</p>
    <div class="filters">
      <input placeholder={i18n.t('Número de pedido o cliente')} bind:value={originalQuery} onkeydown={(event) => { if (event.key === 'Enter') void searchOriginals(); }} />
      <button onclick={() => void searchOriginals()} disabled={vm.loading}>{i18n.t('Buscar pedidos enviados')}</button>
    </div>
    {#if vm.originals.length > 0}
      <div class="original-list">
        {#each vm.originals as original (original.salesOrderId)}
          <button class="original-option" onclick={() => void selectOriginal(original.salesOrderId)}>
            <strong>{original.salesOrderNumber}</strong><span>{original.customerName ?? '—'} · {original.status} · WH {original.warehouseId}</span>
          </button>
        {/each}
      </div>
    {/if}
    {#if vm.returnableOrder}
      <div class="returnable-order">
        <h3>{vm.returnableOrder.salesOrderNumber} · {vm.returnableOrder.customerName ?? '—'}</h3>
        <p>{i18n.t('La cantidad máxima se calcula como enviado menos devoluciones RMA no anuladas.')}</p>
        <div class="table-wrap"><table>
          <thead><tr><th>SKU</th><th>{i18n.t('Producto')}</th><th>{i18n.t('Enviado')}</th><th>{i18n.t('Ya autorizado')}</th><th>{i18n.t('Disponible')}</th><th>{i18n.t('Solicitar')}</th></tr></thead>
          <tbody>
            {#each vm.returnableOrder.lines as line (line.originalSalesOrderLineId)}
              <tr>
                <td>{line.sku}</td><td>{line.itemName}</td><td>{line.quantityShipped}</td><td>{line.quantityAlreadyAuthorized}</td><td>{line.quantityRemaining}</td>
                <td><input class="qty" type="number" min="0" max={line.quantityRemaining} disabled={line.quantityRemaining <= 0} value={requestedQuantities[line.originalSalesOrderLineId] ?? ''} oninput={(event) => requestedQuantities = { ...requestedQuantities, [line.originalSalesOrderLineId]: event.currentTarget.value }} /></td>
              </tr>
            {/each}
          </tbody>
        </table></div>
        <label>{i18n.t('Motivo / nota')}<textarea rows="2" maxlength="4000" bind:value={originalMemo}></textarea></label>
        <div class="create-actions">
          <button onclick={() => vm.clearReturnableOrder()}>{i18n.t('Cancelar')}</button>
          <button class="primary" disabled={vm.saving || vm.createOutcomeUncertain || !vm.returnableOrder.lines.some(line => Number(requestedQuantities[line.originalSalesOrderLineId]) > 0)} onclick={() => void createRma()}>{i18n.t('Crear RMA')}</button>
        </div>
      </div>
    {/if}
    {#if vm.createOutcomeUncertain}
      <aside class="read-only-note" role="alert">{i18n.t('La respuesta de creación fue incierta y el backend no ofrece idempotencia para create-rma. No vuelvas a enviar la solicitud en esta sesión; verifica la lista de RMA antes de reintentar tras recargar.')}</aside>
    {/if}
  </section>
  {:else}
    <aside class="read-only-note">{i18n.t('La creación y recepción de RMA está temporalmente limitada a ADMIN: los endpoints Flask actuales no aplican warehouse scope en esas mutaciones ni en la consulta de relaciones.')}</aside>
  {/if}

  <div class="filters">
    <select value={vm.status} onchange={(event) => { vm.setStatus(event.currentTarget.value); void vm.load(); }}>
      <option value="">{i18n.t('Todos los estados')}</option>
      {#each ['OPEN', 'PARTIALLY_RECEIVED', 'RECEIVED'] as value}
        <option value={value}>{value}</option>
      {/each}
    </select>
    <input
      placeholder={i18n.t('Buscar por número de RMA')}
      value={vm.search}
      oninput={(event) => vm.setSearch(event.currentTarget.value)}
      onkeydown={(event) => { if (event.key === 'Enter') void vm.load(); }}
    />
    <button onclick={() => void vm.load()}>{i18n.t('Buscar')}</button>
  </div>

  {#if vm.error}<UiStatePanel kind="error" title={i18n.t('No se pudieron cargar las devoluciones')} message={vm.error} retry={() => vm.load()} />{/if}
  {#if vm.loading}
    <UiStatePanel kind="loading" title={i18n.t('Cargando devoluciones')} message={i18n.t('Estamos consultando las devoluciones registradas.')} />
  {:else}
    <div class="table-wrap">
      <table>
        <thead><tr><th>RMA</th><th>{i18n.t('Cliente')}</th><th>{i18n.t('Estado')}</th><th>{i18n.t('Creada')}</th><th>{i18n.t('Almacén')}</th></tr></thead>
        <tbody>
          {#each vm.rows as row (row.salesOrderId)}
            <tr>
              <td><button class="link" onclick={() => void open(row.salesOrderId)}>{row.salesOrderNumber}</button></td>
              <td>{row.customerName ?? '—'}</td><td>{row.status}</td>
              <td>{row.createdAt ?? '—'}</td><td>{row.warehouseId}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}

  {#if vm.selected}
    <aside class="detail">
      <header>
        <div><h2>{vm.selected.salesOrderNumber}</h2><p>{vm.selected.status} · {vm.selected.customerName ?? '—'}</p><p>Pedido original: {vm.selected.parentSalesOrderNumber ?? vm.selected.parentSalesOrderId ?? '—'}</p></div>
        <button onclick={() => vm.close()}>{i18n.t('Cerrar')}</button>
      </header>
      <section>
        <h3>{i18n.t('Nota de operación')}</h3>
        <textarea rows="2" maxlength="4000" bind:value={memoDraft}></textarea>
        <button onclick={() => void saveMemo()} disabled={vm.saving || !canEditMemo}>{i18n.t('Guardar nota')}</button>
      </section>
      {#if !canEditMemo}
        <p class="read-only-note">{i18n.t('La edición de memo requiere el grant fraud en el contrato Flask actual.')}</p>
      {/if}

      <aside class="read-only-note">{i18n.t('Recepción y stock: receive-return registra la recepción e incrementa inventario en el bin elegido dentro de la misma operación. El backend no ofrece clasificación vendible/dañado/cuarentena ni descarte independiente; no se ejecutan esas decisiones desde esta pantalla.')}</aside>
      {#if isAdmin}
      <section class="receipt-history">
        <h3>{i18n.t('Historial de recepciones')}</h3>
        {#if vm.selected.receipts.length === 0}
          <p>{i18n.t('Todavía no hay recepciones registradas.')}</p>
        {:else}
          <table>
            <thead><tr><th>{i18n.t('Fecha')}</th><th>SKU</th><th>{i18n.t('Cantidad')}</th><th>{i18n.t('Ubicación')}</th><th>{i18n.t('Almacén')}</th><th>{i18n.t('Recibido por')}</th><th>{i18n.t('Notas')}</th></tr></thead>
            <tbody>
              {#each vm.selected.receipts as receipt (receipt.receiptId)}
                <tr><td>{receipt.receivedAt ?? '—'}</td><td>{receipt.sku}</td><td>{receipt.quantityReceived}</td><td>{receipt.binCode}</td><td>{receipt.warehouseCode}</td><td>{receipt.receivedBy}</td><td>{receipt.notes ?? '—'}</td></tr>
              {/each}
            </tbody>
          </table>
        {/if}
      </section>
      {:else}
        <aside class="read-only-note">{i18n.t('El historial de recepciones se oculta a usuarios no ADMIN porque el endpoint Flask no aplica warehouse scope.')}</aside>
      {/if}

      {#if vm.selected.status !== 'RECEIVED' && isAdmin}
        <section>
          <h3>{i18n.t('Disposición de la mercancía')}</h3>
          <div class="receive-config">
            <label>{i18n.t('Almacén destino')}
              <select bind:value={warehouseId} onchange={() => { binId = ''; binQuery = ''; }}>
                <option value="">{i18n.t('Seleccionar almacén')}</option>
                {#each vm.warehouses as warehouse (warehouse.warehouseId)}
                  <option value={warehouse.warehouseId}>{warehouse.warehouseCode} · {warehouse.warehouseName}</option>
                {/each}
              </select>
            </label>
            <label>{i18n.t('Buscar ubicación')}<input bind:value={binQuery} placeholder="Bin code" /></label>
            <label>{i18n.t('Ubicación')}
              <select bind:value={binId}>
                <option value="">{i18n.t('Seleccionar ubicación')}</option>
                {#each vm.bins as bin (bin.binId)}
                  <option value={bin.binId}>{bin.binCode} · {bin.zoneName ?? ''}</option>
                {/each}
              </select>
            </label>
            <label>{i18n.t('Notas')}<input bind:value={notes} /></label>
          </div>
          <table>
            <thead><tr><th>SKU</th><th>{i18n.t('Producto')}</th><th>{i18n.t('Esperado')}</th><th>{i18n.t('Recibido')}</th><th>{i18n.t('Pendiente')}</th><th>{i18n.t('Cantidad a recibir')}</th><th></th></tr></thead>
            <tbody>
              {#each vm.selected.lines as line (line.soLineId)}
                <tr>
                  <td>{line.sku || '—'}</td><td>{line.itemName || line.itemId}</td>
                  <td>{line.quantityOrdered}</td><td>{line.quantityReceived}</td>
                  <td>{Math.max(0, line.quantityOrdered - line.quantityReceived)}</td>
                  <td>
                    <input class="qty" type="number" min="1" max={line.quantityOrdered - line.quantityReceived}
                      value={itemDrafts[line.soLineId] ?? ''}
                      oninput={(event) => { itemDrafts = { ...itemDrafts, [line.soLineId]: event.currentTarget.value }; }}
                    />
                  </td>
                  <td><button class="primary" disabled={!isAdmin || vm.saving || !warehouseId || !binId || line.itemId == null} onclick={() => void receive(line)}>{i18n.t('Recibir')}</button></td>
                </tr>
              {/each}
            </tbody>
          </table>
        </section>
      {/if}

      {#if vm.selected.status === 'OPEN' && auth?.user?.role === 'ADMIN'}
        <button class="danger" onclick={() => void voidRma()}>{i18n.t('Anular RMA')}</button>
      {:else if vm.selected.status !== 'RECEIVED' && !isAdmin}
        <aside class="read-only-note">{i18n.t('La recepción física requiere ADMIN hasta que Flask aplique aislamiento por almacén en el endpoint receive-return.')}</aside>
      {/if}
    </aside>
  {/if}
</section>

<style>
  .page { max-width: 78rem; margin: 1.4rem auto; padding: 0 1.1rem; color: var(--ink); }
  header { display: flex; justify-content: space-between; align-items: center; gap: 1rem; margin-bottom: 1rem; }
  h1 { margin: 0; font: 700 1.6rem var(--disp); }
  header p, .detail p { color: var(--slate); font-size: .9rem; }
  .eyebrow { font: 600 .65rem var(--disp); letter-spacing: .14em; }
  button { border: 1px solid var(--line); border-radius: 8px; padding: .5rem .7rem; background: var(--card); color: var(--ink); cursor: pointer; }
  .primary { background: var(--navy); color: white; border-color: var(--navy); }
  .danger, .error { color: var(--danger); }
  .filters, .receive-config { display: flex; gap: .6rem; flex-wrap: wrap; margin: 1rem 0; }
  .create-rma, .returnable-order { border: 1px solid var(--line); border-radius: 12px; padding: 1rem; background: var(--card); margin: 1rem 0; }
  .create-rma p, .returnable-order p { color: var(--slate); font-size: .85rem; }
  .original-list { display: grid; gap: .4rem; max-height: 15rem; overflow: auto; }
  .original-option { display: flex; justify-content: space-between; gap: .8rem; text-align: left; }
  .original-option span { color: var(--slate); }
  .create-actions { display: flex; justify-content: flex-end; gap: .5rem; margin-top: .8rem; }
  .read-only-note { border: 1px solid var(--line); border-radius: 8px; padding: .8rem; color: var(--slate); font-size: .82rem; }
  .filters input, .filters select, .receive-config input, .receive-config select, textarea, .qty { min-height: 38px; border: 1px solid var(--line); border-radius: 8px; padding: .45rem .6rem; background: var(--card); color: var(--ink); }
  .filters input { flex: 1; }
  .table-wrap, .detail { overflow: auto; border: 1px solid var(--line); border-radius: 12px; background: var(--card); margin: 1rem 0; }
  .detail { padding: 1rem; }
  .detail section { margin: 1rem 0; }
  .detail h3 { font-size: .95rem; }
  .receive-config label { display: grid; gap: .25rem; color: var(--slate); font-size: .78rem; }
  .qty { width: 85px; }
  .detail table, .table-wrap table { width: 100%; border-collapse: collapse; white-space: nowrap; font-size: .8rem; }
  th, td { text-align: left; padding: .6rem; border-bottom: 1px solid var(--line); }
  th { color: var(--slate); font-size: .68rem; text-transform: uppercase; }
  .link { border: 0; background: none; color: var(--accent); text-decoration: underline; }
</style>
