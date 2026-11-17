<script lang="ts">
  import { onDestroy, onMount, getContext } from 'svelte';
  import type { I18nState } from '../../../../../lib/i18n/i18n.svelte';
  import { createInterWarehouseTransfersState } from '../state/interWarehouseTransfersState.svelte';
  import type { RecordInterWarehouseTransfer } from '../../domain/entity/InterWarehouseTransfer';
  import type { OperationalBinSearchResult } from '../../../warehouses/domain/entity/Warehouse';
  import type { Item } from '../../../items/domain/entity/Item';

  const i18n = getContext<I18nState>('i18n');
  const vm = createInterWarehouseTransfersState();

  let open = $state(false);
  let itemId = $state(0);
  let itemLabel = $state('');
  let itemQuery = $state('');
  let itemOpen = $state(false);
  let fromWarehouseId = $state(0);
  let fromBinId = $state(0);
  let fromBinLabel = $state('');
  let fromBinQuery = $state('');
  let fromBinOpen = $state(false);
  let toWarehouseId = $state(0);
  let toBinId = $state(0);
  let toBinLabel = $state('');
  let toBinQuery = $state('');
  let toBinOpen = $state(false);
  let quantity = $state('1');
  let reason = $state('');
  let idempotencyKey = '';
  let sourceTimer: ReturnType<typeof setTimeout> | undefined;
  let destinationTimer: ReturnType<typeof setTimeout> | undefined;
  let itemTimer: ReturnType<typeof setTimeout> | undefined;

  onMount(() => { void vm.load(); });
  onDestroy(() => {
    if (sourceTimer) clearTimeout(sourceTimer);
    if (destinationTimer) clearTimeout(destinationTimer);
    if (itemTimer) clearTimeout(itemTimer);
  });

  function invalidateKey() { idempotencyKey = ''; }
  function setSourceWarehouse(value: string) {
    fromWarehouseId = Number(value) || 0; fromBinId = 0; fromBinLabel = ''; fromBinQuery = ''; invalidateKey();
    vm.searchBins('source', '', 0);
  }
  function setDestinationWarehouse(value: string) {
    toWarehouseId = Number(value) || 0; toBinId = 0; toBinLabel = ''; toBinQuery = ''; invalidateKey();
    vm.searchBins('destination', '', 0);
  }
  function searchSourceBins(value: string) {
    fromBinQuery = value; fromBinId = 0; fromBinLabel = ''; fromBinOpen = true; invalidateKey();
    if (sourceTimer) clearTimeout(sourceTimer);
    sourceTimer = setTimeout(() => void vm.searchBins('source', value, fromWarehouseId), 220);
  }
  function searchDestinationBins(value: string) {
    toBinQuery = value; toBinId = 0; toBinLabel = ''; toBinOpen = true; invalidateKey();
    if (destinationTimer) clearTimeout(destinationTimer);
    destinationTimer = setTimeout(() => void vm.searchBins('destination', value, toWarehouseId), 220);
  }
  function searchItemOptions(value: string) {
    itemQuery = value; itemId = 0; itemLabel = ''; itemOpen = true; invalidateKey();
    if (itemTimer) clearTimeout(itemTimer);
    itemTimer = setTimeout(() => void vm.searchItems(value), 220);
  }
  function chooseSourceBin(bin: OperationalBinSearchResult) {
    if (bin.warehouseId !== fromWarehouseId) return;
    fromBinId = bin.id; fromBinLabel = bin.code + (bin.zoneName ? ' · ' + bin.zoneName : '');
    fromBinQuery = fromBinLabel; fromBinOpen = false; invalidateKey();
  }
  function chooseDestinationBin(bin: OperationalBinSearchResult) {
    if (bin.warehouseId !== toWarehouseId) return;
    toBinId = bin.id; toBinLabel = bin.code + (bin.zoneName ? ' · ' + bin.zoneName : '');
    toBinQuery = toBinLabel; toBinOpen = false; invalidateKey();
  }
  function chooseItem(item: Item) {
    itemId = item.id; itemLabel = item.sku + ' · ' + item.name;
    itemQuery = itemLabel; itemOpen = false; invalidateKey();
  }
  function resetForm() {
    itemId = 0; itemLabel = ''; itemQuery = ''; fromWarehouseId = 0; fromBinId = 0; fromBinLabel = ''; fromBinQuery = '';
    toWarehouseId = 0; toBinId = 0; toBinLabel = ''; toBinQuery = ''; quantity = '1'; reason = ''; idempotencyKey = '';
    vm.searchBins('source', '', 0); vm.searchBins('destination', '', 0); vm.searchItems('');
  }
  async function create() {
    const qty = Number(quantity);
    if (!itemId || !fromWarehouseId || !fromBinId || !toWarehouseId || !toBinId) return;
    if (!Number.isSafeInteger(qty) || qty < 1 || qty > 100000) return;
    if (!idempotencyKey) idempotencyKey = crypto.randomUUID();
    const value: RecordInterWarehouseTransfer = {
      itemId, sourceWarehouseId: fromWarehouseId, sourceBinId: fromBinId,
      destinationWarehouseId: toWarehouseId, destinationBinId: toBinId,
      quantity: qty, reason, idempotencyKey
    };
    if (await vm.create(value)) { open = false; resetForm(); }
  }
</script>

<section class="page">
  <header>
    <div><p class="eyebrow">ABELLIS · SMART WMS</p><h1>{i18n.t('Movimientos entre almacenes')}</h1>
      <p>{i18n.t('Transfiere existencias entre almacenes autorizados con registro transaccional e idempotente.')}</p></div>
    <button class="primary" onclick={() => open = !open}>{open ? i18n.t('Cerrar') : i18n.t('Nueva transferencia')}</button>
  </header>
  {#if vm.error}<p class="error" role="alert">{vm.error}</p>{/if}

  {#if open}
    <form class="editor" onsubmit={event => { event.preventDefault(); void create(); }}>
      <label>{i18n.t('Almacén origen')}
        <select required value={fromWarehouseId || ''} onchange={event => setSourceWarehouse(event.currentTarget.value)}>
          <option value="">{i18n.t('Selecciona un almacén')}</option>
          {#each vm.warehouses as warehouse (warehouse.id)}
            <option value={warehouse.id} disabled={warehouse.id === toWarehouseId}>{warehouse.name} ({warehouse.code})</option>
          {/each}
        </select>
      </label>
      <label class="lookup">{i18n.t('Ubicación origen')}
        <input required autocomplete="off" disabled={!fromWarehouseId} placeholder={i18n.t('Busca código de ubicación')} value={fromBinQuery}
          oninput={event => searchSourceBins(event.currentTarget.value)} onfocus={() => fromBinOpen = true}/>
        {#if fromBinOpen && vm.sourceBins.length > 0}
          <div class="suggestions">{#each vm.sourceBins as bin (bin.id)}
            <button type="button" class="suggestion" onclick={() => chooseSourceBin(bin)}>{bin.code} <small>{bin.zoneName ?? bin.binType}</small></button>
          {/each}</div>
        {:else if fromBinOpen && vm.sourceBinSearching}<div class="hint">{i18n.t('Buscando ubicaciones…')}</div>
        {:else if fromBinOpen && fromBinQuery.trim()}<div class="hint">{i18n.t('No hay ubicaciones coincidentes en este almacén.')}</div>{/if}
      </label>
      <label>{i18n.t('Almacén destino')}
        <select required value={toWarehouseId || ''} onchange={event => setDestinationWarehouse(event.currentTarget.value)}>
          <option value="">{i18n.t('Selecciona un almacén')}</option>
          {#each vm.warehouses as warehouse (warehouse.id)}
            <option value={warehouse.id} disabled={warehouse.id === fromWarehouseId}>{warehouse.name} ({warehouse.code})</option>
          {/each}
        </select>
      </label>
      <label class="lookup">{i18n.t('Ubicación destino')}
        <input required autocomplete="off" disabled={!toWarehouseId} placeholder={i18n.t('Busca código de ubicación')} value={toBinQuery}
          oninput={event => searchDestinationBins(event.currentTarget.value)} onfocus={() => toBinOpen = true}/>
        {#if toBinOpen && vm.destinationBins.length > 0}
          <div class="suggestions">{#each vm.destinationBins as bin (bin.id)}
            <button type="button" class="suggestion" onclick={() => chooseDestinationBin(bin)}>{bin.code} <small>{bin.zoneName ?? bin.binType}</small></button>
          {/each}</div>
        {:else if toBinOpen && vm.destinationBinSearching}<div class="hint">{i18n.t('Buscando ubicaciones…')}</div>
        {:else if toBinOpen && toBinQuery.trim()}<div class="hint">{i18n.t('No hay ubicaciones coincidentes en este almacén.')}</div>{/if}
      </label>
      <label class="lookup">{i18n.t('Producto')}
        <input required autocomplete="off" placeholder={i18n.t('Busca por SKU o nombre (mín. 2 caracteres)')} value={itemQuery}
          oninput={event => searchItemOptions(event.currentTarget.value)} onfocus={() => itemOpen = true}/>
        {#if itemOpen && vm.itemResults.length > 0}
          <div class="suggestions">{#each vm.itemResults as item (item.id)}
            <button type="button" class="suggestion" onclick={() => chooseItem(item)}><strong>{item.sku}</strong><small>{item.name}</small></button>
          {/each}</div>
        {:else if itemOpen && vm.itemSearching}<div class="hint">{i18n.t('Buscando productos…')}</div>
        {:else if itemOpen && itemQuery.trim().length >= 2}<div class="hint">{i18n.t('No se encontraron productos.')}</div>{/if}
      </label>
      <label>{i18n.t('Cantidad')}
        <input type="number" min="1" max="100000" step="1" required value={quantity} oninput={event => { quantity = event.currentTarget.value; invalidateKey(); }}/>
      </label>
      <label class="wide">{i18n.t('Motivo')}
        <input maxlength="200" value={reason} oninput={event => { reason = event.currentTarget.value; invalidateKey(); }}/>
      </label>
      <div class="actions"><button type="button" onclick={() => { open = false; resetForm(); }}>{i18n.t('Cancelar')}</button>
        <button class="primary" disabled={vm.saving || !itemId || !fromBinId || !toBinId || !fromWarehouseId || !toWarehouseId || fromWarehouseId === toWarehouseId || !Number.isSafeInteger(Number(quantity)) || Number(quantity) < 1 || Number(quantity) > 100000}>
          {vm.saving ? i18n.t('Procesando…') : i18n.t('Transferir inventario')}</button></div>
    </form>
  {/if}

  <div class="filters">
    <label>{i18n.t('Origen')}
      <select value={vm.fromWarehouseFilter} onchange={event => vm.setFromWarehouseFilter(event.currentTarget.value)}>
        <option value="">{i18n.t('Todos los almacenes autorizados')}</option>
        {#each vm.warehouses as warehouse (warehouse.id)}<option value={warehouse.id}>{warehouse.name} ({warehouse.code})</option>{/each}
      </select>
    </label>
    <label>{i18n.t('Destino')}
      <select value={vm.toWarehouseFilter} onchange={event => vm.setToWarehouseFilter(event.currentTarget.value)}>
        <option value="">{i18n.t('Todos los almacenes autorizados')}</option>
        {#each vm.warehouses as warehouse (warehouse.id)}<option value={warehouse.id}>{warehouse.name} ({warehouse.code})</option>{/each}
      </select>
    </label>
    <button type="button" onclick={() => { vm.setFromWarehouseFilter(''); vm.setToWarehouseFilter(''); }}>{i18n.t('Limpiar filtros')}</button>
  </div>
  {#if vm.loading}<p>{i18n.t('Cargando…')}</p>
  {:else if vm.rows.length === 0}<p class="empty">{i18n.t('No hay movimientos que coincidan con los filtros.')}</p>
  {:else}
    <div class="table-wrap"><table><thead><tr><th>{i18n.t('Fecha')}</th><th>SKU</th><th>{i18n.t('Producto')}</th><th>{i18n.t('Origen')}</th><th>{i18n.t('Destino')}</th><th>{i18n.t('Cantidad')}</th><th>{i18n.t('Responsable')}</th><th>{i18n.t('Estado')}</th></tr></thead>
      <tbody>{#each vm.rows as row (row.transferId)}<tr>
        <td>{row.transferredAt ?? '—'}</td><td>{row.lines[0]?.sku ?? '—'}</td><td>{row.lines[0]?.itemName ?? row.lines[0]?.itemId}</td>
        <td>{row.sourceWarehouseName} ({row.sourceWarehouseCode}) · {row.sourceBinCode}</td>
        <td>{row.destinationWarehouseName} ({row.destinationWarehouseCode}) · {row.destinationBinCode}</td>
        <td>{row.lines[0]?.quantity}</td><td>{row.transferredBy}</td><td><span class="status">{row.status}</span></td>
      </tr>{/each}</tbody>
    </table></div>
  {/if}
</section>

<style>
.page{max-width:78rem;margin:1.4rem auto;padding:0 1.1rem;color:var(--ink)}
header{display:flex;justify-content:space-between;align-items:center;gap:1rem;margin-bottom:1rem}
h1{margin:0;font:700 1.6rem var(--disp)}header p{color:var(--slate);font-size:.9rem}.eyebrow{font:600 .65rem var(--disp);letter-spacing:.14em}
button,select,input{font:inherit}button{border:1px solid var(--line);border-radius:8px;padding:.5rem .7rem;background:var(--card);color:var(--ink);cursor:pointer}
button:disabled{opacity:.55;cursor:not-allowed}.primary{background:var(--navy);color:white;border-color:var(--navy)}
.editor{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.85rem;padding:1rem;border:1px solid var(--line);border-radius:12px;background:var(--card)}
.editor label,.filters label{display:grid;gap:.3rem;color:var(--slate);font-size:.8rem;min-width:0}
.editor input,.editor select,.filters select{width:100%;min-height:40px;border:1px solid var(--line);border-radius:8px;padding:.5rem;background:var(--card);color:var(--ink)}
.lookup{position:relative}.suggestions{position:absolute;z-index:5;top:100%;left:0;right:0;max-height:220px;overflow:auto;border:1px solid var(--line);border-radius:8px;background:var(--card);box-shadow:0 8px 24px #0002}
.suggestion{display:flex;width:100%;justify-content:space-between;gap:.7rem;text-align:left;border:0;border-bottom:1px solid var(--line);border-radius:0;padding:.65rem}.suggestion small,.hint{color:var(--slate);font-size:.75rem}.hint{position:absolute;z-index:5;top:100%;left:0;right:0;padding:.65rem;background:var(--card);border:1px solid var(--line);border-radius:8px}
.wide,.actions{grid-column:1/-1}.actions{display:flex;justify-content:flex-end;gap:.5rem}
.filters{display:flex;flex-wrap:wrap;align-items:end;gap:.7rem;margin:1rem 0}.filters label{min-width:15rem}
.table-wrap{overflow:auto;border:1px solid var(--line);border-radius:12px;background:var(--card);margin:1rem 0}
table{width:100%;border-collapse:collapse;white-space:nowrap;font-size:.82rem}th,td{text-align:left;padding:.65rem;border-bottom:1px solid var(--line)}th{color:var(--slate);font-size:.7rem;text-transform:uppercase}
.error{color:var(--danger)}.empty{color:var(--slate);padding:2rem 0}.status{font-size:.75rem;color:var(--success)}
@media(max-width:680px){header{align-items:flex-start;flex-direction:column}.editor{grid-template-columns:1fr}.filters{align-items:stretch;flex-direction:column}.filters label{min-width:0}.wide,.actions{grid-column:auto}}
</style>
