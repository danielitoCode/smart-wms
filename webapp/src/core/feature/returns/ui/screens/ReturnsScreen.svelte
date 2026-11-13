<script lang="ts">
  import { getContext } from 'svelte';
  import type { I18nState } from '../../../../../lib/i18n/i18n.svelte';
  import type { ReturnLine } from '../../domain/entity/Return';
  import { createReturnsState } from '../state/returnsState.svelte';

  const i18n = getContext<I18nState>('i18n');
  const vm = createReturnsState();
  const auth = getContext<{ user: { role: string } | null }>('authGuard');

  let idempotencyKeys = $state<Record<number, string>>({});
  let memoDraft = $state('');
  let warehouseId = $state('');
  let binId = $state('');
  let binQuery = $state('');
  let itemDrafts = $state<Record<number, string>>({});
  let notes = $state('');

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
    await vm.detail(id);
    memoDraft = vm.selected?.memo ?? '';
    warehouseId = String(vm.selected?.warehouseId ?? '');
    binId = '';
    binQuery = '';
    itemDrafts = {};
  }

  async function saveMemo(): Promise<void> {
    if (vm.selected) await vm.memo(vm.selected.salesOrderId, memoDraft);
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
    });

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

  {#if vm.error}<p class="error" role="alert">{vm.error}</p>{/if}
  {#if vm.loading}
    <p>{i18n.t('Cargando…')}</p>
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
        <div><h2>{vm.selected.salesOrderNumber}</h2><p>{vm.selected.status} · {vm.selected.customerName ?? '—'}</p></div>
        <button onclick={() => vm.close()}>{i18n.t('Cerrar')}</button>
      </header>
      <section>
        <h3>{i18n.t('Nota de operación')}</h3>
        <textarea rows="2" maxlength="4000" bind:value={memoDraft}></textarea>
        <button onclick={() => void saveMemo()} disabled={vm.saving}>{i18n.t('Guardar nota')}</button>
      </section>

      {#if vm.selected.status !== 'RECEIVED'}
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
                  <td><button class="primary" disabled={vm.saving || !warehouseId || !binId || line.itemId == null} onclick={() => void receive(line)}>{i18n.t('Recibir')}</button></td>
                </tr>
              {/each}
            </tbody>
          </table>
        </section>
      {/if}

      {#if vm.selected.status === 'OPEN' && auth?.user?.role === 'ADMIN'}
        <button class="danger" onclick={() => void voidRma()}>{i18n.t('Anular RMA')}</button>
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
