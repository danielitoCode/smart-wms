<script lang="ts">
  import { getContext, untrack } from 'svelte';
  import { page } from '$app/state';
  import type { I18nState } from '../../../../../lib/i18n/i18n.svelte';
  import { ADMIN_OPERATION_CATALOG, type AdminOperationColumn } from '../AdminOperationCatalog';
  import type { AdminOperationKey, AdminOperationRow, BackorderItemProjection } from '../../domain/entity/AdminOperation.ts';
  import { createAdminOperationState } from '../state/adminOperationState.svelte';

  const i18n = getContext<I18nState>('i18n');
  const selection = getContext<{ warehouseId: number | null }>('warehouseSelection');
  function isAdminOperationKey(value: string | undefined): value is AdminOperationKey {
    return value !== undefined && Object.prototype.hasOwnProperty.call(ADMIN_OPERATION_CATALOG, value);
  }

  const definition = $derived(
    isAdminOperationKey(page.params.feature)
      ? ADMIN_OPERATION_CATALOG[page.params.feature]
      : undefined
  );
  let activeFeature = $state<AdminOperationKey | null>(null);
  let vm = $state(createAdminOperationState('backorders'));

  $effect(() => {
    const key = definition?.key ?? null;
    if (key && key !== activeFeature) {
      activeFeature = key;
      vm = createAdminOperationState(key);
    }
  });

  $effect(() => {
    const state = vm;
    const current = definition;
    const warehouseId = selection?.warehouseId;
    if (state && current) {
      untrack(() => void state.load({
        warehouseId: current.warehouseScoped ? warehouseId : null
      }));
    }
  });

  type AdminOperationCellValue =
    | string
    | number
    | boolean
    | string[]
    | number[]
    | BackorderItemProjection[]
    | null
    | undefined;

  function projectionValue(row: AdminOperationRow, key: string): AdminOperationCellValue {
    if (!(key in row.data)) return undefined;
    return row.data[key as keyof typeof row.data] as AdminOperationCellValue;
  }

  function formatDate(value: string): string {
    const parsed = new Date(value.includes('T') ? value : `${value}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return value;
    return new Intl.DateTimeFormat(i18n.locale, {
      dateStyle: 'medium',
      timeStyle: value.includes('T') ? 'short' : undefined
    }).format(parsed);
  }

  function formatNumber(value: number): string {
    return new Intl.NumberFormat(i18n.locale, { maximumFractionDigits: 2 }).format(value);
  }

  function formatBackorderItems(items: BackorderItemProjection[]): string {
    if (items.length === 0) return '—';

    return items.map((item) => {
      const purchaseOrder = item.openPurchaseOrder
        ? ` · PO ${item.openPurchaseOrder.number} (${formatNumber(item.openPurchaseOrder.quantityRemaining)} pendientes)`
        : '';
      return `${item.sku} × ${formatNumber(item.quantity)}${purchaseOrder}`;
    }).join(' · ');
  }

  function display(row: AdminOperationRow, column: AdminOperationColumn): string {
    const value = projectionValue(row, column.key);
    if (value == null || value === '') return '—';

    switch (column.format) {
      case 'status':
        return typeof value === 'string' ? i18n.t(value) : '—';
      case 'boolean':
        return value === true ? i18n.t('Sí') : value === false ? i18n.t('No') : '—';
      case 'date':
        return typeof value === 'string' ? formatDate(value) : '—';
      case 'quantity':
        return typeof value === 'number' ? formatNumber(value) : '—';
      case 'money':
        return typeof value === 'number'
          ? new Intl.NumberFormat(i18n.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
          : '—';
      case 'cents':
        return typeof value === 'number'
          ? new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value / 100)
          : '—';
      case 'list':
        return Array.isArray(value) ? value.join(', ') : '—';
      case 'backorder-items':
        return row.feature === 'backorders' ? formatBackorderItems(row.data.items) : '—';
      default:
        return typeof value === 'string' || typeof value === 'number' ? String(value) : '—';
    }
  }

  function summaryMetric(key: 'salesCount' | 'netCents' | 'refundCount'): string {
    if (vm.feature !== 'pos-activity' || !vm.summary) return '0';
    const value = vm.summary.today[key];
    return key === 'netCents'
      ? new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value / 100)
      : formatNumber(value);
  }

  function load(): void {
    if (!definition) return;
    void vm.load({
      warehouseId: definition.warehouseScoped ? selection?.warehouseId : null
    });
  }

  function submit(event: SubmitEvent): void {
    event.preventDefault();
    vm.resetPage();
    load();
  }

  function changePage(nextPage: number): void {
    vm.setPage(nextPage);
    load();
  }
</script>

{#if !definition}
  <section class="page">
    <h1>{i18n.t('Módulo no encontrado')}</h1>
    <p>{i18n.t('La ruta solicitada no corresponde a una funcionalidad migrada.')}</p>
  </section>
{:else}
  <section class="page">
    <header>
      <div>
        <p class="eyebrow">ABELLIS · SMART WMS</p>
        <h1>{i18n.t(definition.title)}</h1>
        <p class="subtitle">{i18n.t(definition.description)}</p>
      </div>
      <button type="button" onclick={load} disabled={vm.loading}>{i18n.t('Actualizar')}</button>
    </header>

    {#if definition.key === 'backorders'}
      <div class="tabs" role="tablist" aria-label={i18n.t('Estado de pedidos pendientes')}>
        <button type="button" class:active={vm.tab === 'waiting'} role="tab" aria-selected={vm.tab === 'waiting'} onclick={() => { vm.setTab('waiting'); load(); }}>{i18n.t('Pendientes de inventario')}</button>
        <button type="button" class:active={vm.tab === 'ready-to-ship'} role="tab" aria-selected={vm.tab === 'ready-to-ship'} onclick={() => { vm.setTab('ready-to-ship'); load(); }}>{i18n.t('Listos para despacho')}</button>
      </div>
    {/if}

    {#if definition.searchable || definition.dateFilter || definition.statusOptions}
      <form class="filters" onsubmit={submit}>
        {#if definition.searchable}
          <label class="search-field">
            <span>{i18n.t('Buscar')}</span>
            <input type="search" placeholder={i18n.t('Buscar…')} value={vm.search} oninput={(event) => vm.setSearch(event.currentTarget.value)} />
          </label>
        {/if}
        {#if definition.dateFilter}
          <label>
            <span>{i18n.t('Fecha')}</span>
            <input type="date" value={vm.date} onchange={(event) => { vm.setDate(event.currentTarget.value); load(); }} />
          </label>
        {/if}
        {#if definition.statusOptions}
          <label>
            <span>{i18n.t('Estado')}</span>
            <select value={vm.status} onchange={(event) => { vm.setStatus(event.currentTarget.value); load(); }}>
              <option value="">{i18n.t('Todos')}</option>
              {#each definition.statusOptions as status}
                <option value={status}>{status}</option>
              {/each}
            </select>
          </label>
        {/if}
        {#if definition.channelFilter}
          <label>
            <span>{i18n.t('Canal')}</span>
            <select value={vm.channel} onchange={(event) => { vm.setChannel(event.currentTarget.value as '' | 'counter' | 'phone'); load(); }}>
              <option value="">{i18n.t('Todos')}</option>
              <option value="counter">{i18n.t('Mostrador')}</option>
              <option value="phone">{i18n.t('Teléfono')}</option>
            </select>
          </label>
        {/if}
        {#if definition.terminalFilter}
          <label>
            <span>{i18n.t('Terminal')}</span>
            <input type="text" value={vm.terminalId} oninput={(event) => vm.setTerminalId(event.currentTarget.value)} />
          </label>
        {/if}
        {#if definition.cashierFilter}
          <label>
            <span>{i18n.t('Cajero')}</span>
            <input type="text" value={vm.cashierId} oninput={(event) => vm.setCashierId(event.currentTarget.value)} />
          </label>
        {/if}
        {#if definition.warehouseIdFilters}
          <label>
            <span>{i18n.t('Almacén origen (ID)')}</span>
            <input type="number" min="1" value={vm.sourceWarehouseId} oninput={(event) => vm.setSourceWarehouseId(event.currentTarget.value)} />
          </label>
          <label>
            <span>{i18n.t('Almacén destino (ID)')}</span>
            <input type="number" min="1" value={vm.destinationWarehouseId} oninput={(event) => vm.setDestinationWarehouseId(event.currentTarget.value)} />
          </label>
        {/if}
        {#if definition.activeFilter}
          <label>
            <span>{i18n.t('Activo')}</span>
            <select value={vm.active} onchange={(event) => { vm.setActive(event.currentTarget.value as '' | 'true' | 'false'); load(); }}>
              <option value="">{i18n.t('Todos')}</option>
              <option value="true">{i18n.t('Activos')}</option>
              <option value="false">{i18n.t('Inactivos')}</option>
            </select>
          </label>
        {/if}
        {#if definition.searchable || definition.terminalFilter || definition.cashierFilter || definition.warehouseIdFilters}
          <button class="accent" type="submit" disabled={vm.loading}>{i18n.t('Aplicar')}</button>
        {/if}
      </form>
    {/if}

    {#if vm.feature === 'pos-activity' && vm.summary}
      <div class="summary">
        <article><span>{i18n.t('Ventas')}</span><strong>{summaryMetric('salesCount')}</strong></article>
        <article><span>{i18n.t('Ingresos netos')}</span><strong>{summaryMetric('netCents')}</strong></article>
        <article><span>{i18n.t('Devoluciones')}</span><strong>{summaryMetric('refundCount')}</strong></article>
      </div>
    {/if}

    {#if vm.error}
      <p class="error" role="alert">{vm.error}</p>
      <button type="button" onclick={load}>{i18n.t('Reintentar')}</button>
    {:else if vm.loading}
      <div class="skeleton" aria-label={i18n.t('Cargando')}><span></span><span></span><span></span></div>
    {:else if vm.rows.length === 0}
      <p class="empty">{i18n.t('No hay registros para mostrar.')}</p>
    {:else}
      <div class="table-wrap">
        <table>
          <thead><tr>{#each definition.columns as column}<th>{i18n.t(column.label)}</th>{/each}</tr></thead>
          <tbody>
            {#each vm.rows as row (row.id)}
              <tr>
                {#each definition.columns as column}
                  <td>
                    {#if column.format === 'status'}
                      <span class="status-value">{display(row, column)}</span>
                    {:else}
                      {display(row, column)}
                    {/if}
                  </td>
                {/each}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}

    {#if vm.pagination}
      <nav class="pagination" aria-label={i18n.t('Paginación')}>
        <span>{i18n.t('Página')} {vm.pagination.page} {i18n.t('de')} {vm.pagination.pages} · {vm.pagination.total} {i18n.t('registros')}</span>
        <div>
          <button type="button" onclick={() => changePage(vm.pagination!.page - 1)} disabled={vm.loading || vm.pagination.page <= 1}>{i18n.t('Anterior')}</button>
          <button type="button" onclick={() => changePage(vm.pagination!.page + 1)} disabled={vm.loading || vm.pagination.page >= vm.pagination.pages}>{i18n.t('Siguiente')}</button>
        </div>
      </nav>
    {/if}

    <p class="footnote">{i18n.t('Consulta conectada al API Flask. Las acciones de escritura se gestionan desde los módulos especializados y conservan sus permisos propios.')}</p>
  </section>
{/if}

<style>
  .page{max-width:78rem;margin:1.4rem auto;padding:0 1.1rem;font-family:var(--body);animation:enter .18s ease-out}
  header{display:flex;align-items:center;justify-content:space-between;gap:1rem;margin-bottom:1.3rem}
  .eyebrow{margin:0 0 .35rem;color:var(--slate);font:600 .64rem var(--disp);letter-spacing:.15em}
  h1{margin:0;color:var(--ink);font:700 1.65rem var(--disp);letter-spacing:-.025em}
  .subtitle{margin:.35rem 0 0;color:var(--slate);font-size:.9rem}
  .filters,.tabs{display:flex;align-items:end;gap:.65rem;flex-wrap:wrap;margin:0 0 1rem}
  .filters label{display:grid;gap:.3rem;color:var(--slate);font-size:.78rem;font-weight:600}
  .search-field{flex:1;min-width:230px}
  input,select{width:100%;min-height:40px;padding:.55rem .7rem;border:1px solid var(--line);border-radius:9px;background:var(--card);color:var(--ink);font:inherit}
  button{min-height:40px;padding:.55rem .9rem;border:1px solid var(--line);border-radius:9px;background:var(--card);color:var(--ink);font:600 .82rem var(--body);cursor:pointer}
  button:disabled{opacity:.5;cursor:not-allowed}
  button.accent,.tabs button.active{background:var(--navy);border-color:var(--navy);color:white}
  .table-wrap{overflow:auto;border:1px solid var(--line);border-radius:12px;background:var(--card)}
  table{width:100%;border-collapse:collapse;font-size:.84rem;white-space:nowrap}
  th,td{padding:.72rem .8rem;text-align:left;border-bottom:1px solid var(--line);max-width:28rem}
  th{position:sticky;top:0;background:var(--surface-subtle,#f7fafc);color:var(--slate);font-size:.7rem;letter-spacing:.06em;text-transform:uppercase}
  td{color:var(--ink);vertical-align:top}
  tr:last-child td{border:0}
  .status-value{display:inline-flex;padding:.2rem .5rem;border-radius:999px;background:var(--surface-subtle);font-size:.72rem;font-weight:650}
  .empty{padding:2rem 0;color:var(--slate)}
  .error{color:var(--danger)}
  .summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.7rem;margin:0 0 1rem}
  .summary article{display:grid;gap:.3rem;padding:1rem;border:1px solid var(--line);border-radius:12px;background:var(--card)}
  .summary span{color:var(--slate);font-size:.75rem}
  .summary strong{font:700 1.25rem var(--disp);color:var(--ink);font-variant-numeric:tabular-nums}
  .skeleton{display:grid;gap:.55rem}
  .skeleton span{height:2.7rem;border-radius:8px;background:var(--surface-subtle);animation:pulse 1s infinite alternate}
  .pagination{display:flex;justify-content:space-between;align-items:center;gap:1rem;margin-top:1rem;color:var(--slate);font-size:.8rem}
  .pagination div{display:flex;gap:.5rem}
  .footnote{margin:1rem 0;color:var(--slate);font-size:.73rem}
  @keyframes enter{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
  @keyframes pulse{to{opacity:.45}}
  @media(max-width:640px){header{align-items:flex-start;flex-direction:column}.search-field{min-width:100%}.summary{grid-template-columns:1fr}.pagination{align-items:flex-start;flex-direction:column}}
  @media(prefers-reduced-motion:reduce){.page,.skeleton span{animation:none}}
</style>
