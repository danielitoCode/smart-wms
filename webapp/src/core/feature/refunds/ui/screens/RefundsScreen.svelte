<script lang="ts">
  import UiLoader from '../../../../../lib/components/UiLoader.svelte';
  import { getContext } from 'svelte';
  import type { I18nState } from '../../../../../lib/i18n/i18n.svelte';
  import { createRefundsState } from '../state/refundsState.svelte';

  const i18n = getContext<I18nState>('i18n');
  const vm = createRefundsState();
  const money = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' });
  const formatMoney = (amount: number) => money.format(amount);
  const formatDate = (value: string | null) => value ? value.slice(0, 10) : '—';

  $effect(() => {
    const currentStatus = vm.status;
    const currentSearch = vm.search;
    void vm.load();
  });
</script>

<section class="page">
  <header class="page-header">
    <div>
      <p class="eyebrow">ABELLIS · SMART WMS</p>
      <h1>{i18n.t('Reembolsos')}</h1>
      <p>{i18n.t('Registro administrativo de notas de crédito generadas por el POS.')}</p>
    </div>
      <button onclick={() => void vm.load()} disabled={vm.loading}>{i18n.t('Actualizar')}</button>
  </header>

  <aside class="read-only-note">
    <strong>{i18n.t('Consulta administrativa')}</strong>
    <span>{i18n.t('Esta pantalla no emite ni repite reembolsos. La devolución del dinero debe ejecutarse en el POS mediante el flujo de pago correspondiente.')}</span>
  </aside>

  <div class="filters">
    <select aria-label={i18n.t('Filtrar por estado')} value={vm.status} onchange={event => { vm.setStatus(event.currentTarget.value); void vm.load(); }}>
      <option value="">{i18n.t('Todos los estados')}</option>
      <option value="SHIPPED">SHIPPED</option>
      <option value="CANCELLED">CANCELLED</option>
    </select>
    <input
      aria-label={i18n.t('Buscar reembolso')}
      placeholder={i18n.t('Buscar por número o cliente')}
      value={vm.search}
      oninput={event => vm.setSearch(event.currentTarget.value)}
      onkeydown={event => { if (event.key === 'Enter') void vm.load(); }}
    />
    <button onclick={() => void vm.load()} disabled={vm.loading}>{i18n.t('Buscar')}</button>
  </div>

  {#if vm.error}
    <p class="error" role="alert">{vm.error}</p>
  {/if}

  {#if vm.loading}
    <UiLoader label={i18n.t('Cargando…')} />
  {:else}
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>{i18n.t('Reembolso')}</th>
            <th>{i18n.t('Cliente')}</th>
            <th>{i18n.t('Pedido original')}</th>
            <th>{i18n.t('Estado')}</th>
            <th>{i18n.t('Fecha')}</th>
            <th class="numeric">{i18n.t('Importe')}</th>
          </tr>
        </thead>
        <tbody>
          {#each vm.rows as refund (refund.salesOrderId)}
            <tr>
              <td><button class="link" onclick={() => void vm.detail(refund.salesOrderId)}>{refund.salesOrderNumber}</button></td>
              <td>{refund.customerName ?? '—'}</td>
              <td class="mono">{refund.parentSalesOrderNumber ?? '—'}</td>
              <td><span class="status">{refund.status}</span></td>
              <td>{formatDate(refund.createdAt)}</td>
              <td class="numeric amount">
                {formatMoney(refund.orderTotal)}
                {#if refund.amountIntegrity !== 'VALID'}
                  <span class="warning" title={i18n.t('El importe almacenado no tiene el signo o valor esperado')}>!</span>
                {/if}
              </td>
            </tr>
          {:else}
            <tr><td colspan="6" class="empty">{i18n.t('No se encontraron reembolsos')}</td></tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}

  {#if vm.selected}
    <section class="detail" aria-label={i18n.t('Detalle del reembolso')}>
      <header>
        <div>
          <p class="eyebrow">{i18n.t('Detalle de nota de crédito')}</p>
          <h2>{vm.selected.salesOrderNumber}</h2>
          <span class="status">{vm.selected.status}</span>
        </div>
        <button onclick={() => vm.close()}>{i18n.t('Cerrar')}</button>
      </header>

      <div class="summary-grid">
        <div><span>{i18n.t('Cliente')}</span><strong>{vm.selected.customerName ?? '—'}</strong></div>
        <div><span>{i18n.t('Pedido original')}</span><strong class="mono">{vm.selected.parentSalesOrderNumber ?? '—'}</strong></div>
        <div><span>{i18n.t('Fecha registrada')}</span><strong>{formatDate(vm.selected.createdAt)}</strong></div>
        <div><span>{i18n.t('Importe del crédito')}</span><strong>{formatMoney(vm.selected.orderTotal)}</strong></div>
      </div>

      {#if vm.selected.amountIntegrity !== 'VALID'}
        <p class="warning-panel" role="alert">
          {i18n.t('Inconsistencia del crédito: el importe debe ser negativo y las cantidades de sus líneas también. Verifica el registro en el POS y el libro contable.')}
          {#if vm.selected.signedAmount !== null}
            <span>{i18n.t('Valor almacenado')}: {formatMoney(vm.selected.signedAmount)}</span>
          {/if}
        </p>
      {/if}

      <h3>{i18n.t('Líneas de la nota de crédito')}</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>SKU</th><th>{i18n.t('Producto')}</th><th class="numeric">{i18n.t('Cantidad')}</th></tr></thead>
          <tbody>
            {#each vm.selected.lines as line (line.soLineId)}
              <tr>
                <td class="mono">{line.sku ?? '—'}</td>
                <td>{line.itemName ?? line.itemId}</td>
                <td class="numeric">{Math.abs(line.quantityOrdered)}</td>
              </tr>
            {:else}
              <tr><td colspan="3" class="empty">{i18n.t('No hay líneas en esta nota de crédito')}</td></tr>
            {/each}
          </tbody>
        </table>
      </div>

      <h3>{i18n.t('Reembolsos del mismo pedido')}</h3>
      <p class="relationship-note">{i18n.t('Las notas de crédito parciales se relacionan con el pedido original. Se muestran juntas para facilitar la conciliación.')}</p>
      {#each vm.selected.relatedRecords.filter(record => record.orderType === 'refund' && record.salesOrderId !== vm.selected?.salesOrderId) as sibling (sibling.salesOrderId)}
        <div class="related-row">
          <span class="mono">{sibling.salesOrderNumber}</span>
          <span>{sibling.status}</span>
          <strong>{sibling.signedAmount === null ? '—' : formatMoney(Math.abs(sibling.signedAmount))}</strong>
        </div>
      {:else}
        <p class="empty">{i18n.t('No hay otros reembolsos registrados para este pedido')}</p>
      {/each}

      <h3>{i18n.t('Devoluciones RMA del pedido original')}</h3>
      <p class="relationship-note">{i18n.t('La relación se establece a través del pedido original; no existe un vínculo directo entre esta nota de crédito y una RMA específica.')}</p>
      {#each vm.selected.relatedRecords.filter(record => record.orderType === 'return') as rma (rma.salesOrderId)}
        <div class="related-row" class:voided={rma.isVoided}>
          <span class="mono">{rma.salesOrderNumber}</span>
          <span>{rma.isVoided ? i18n.t('Anulada') : rma.status}</span>
          <strong>{rma.isVoided ? '—' : i18n.t('RMA')}</strong>
        </div>
      {:else}
        <p class="empty">{i18n.t('No hay una RMA asociada al pedido original')}</p>
      {/each}

      <p class="pos-note"><strong>{i18n.t('Ejecución del reembolso')}</strong> — {i18n.t('Debe realizarse desde el POS. Esta vista solo consulta el registro administrativo y no modifica pagos ni inventario.')}</p>
    </section>
  {/if}
</section>

<style>
  .page{max-width:82rem;margin:1.4rem auto;padding:0 1.1rem;color:var(--ink)}
  .page-header{display:flex;justify-content:space-between;align-items:center;gap:1rem;margin-bottom:1rem}
  h1{margin:0;font:700 1.65rem var(--disp)}h2{margin:.1rem 0 .5rem;font:700 1.25rem var(--disp)}
  .page-header p,.detail p{color:var(--slate);font-size:.9rem}.eyebrow{font:600 .65rem var(--disp);letter-spacing:.14em;color:var(--slate)}
  button{border:1px solid var(--line);border-radius:8px;padding:.5rem .75rem;background:var(--card);color:var(--ink);cursor:pointer}
  button:disabled{opacity:.55;cursor:wait}
  .read-only-note,.pos-note{display:flex;gap:.6rem;align-items:flex-start;padding:.8rem 1rem;border:1px solid var(--line);border-radius:10px;background:var(--card);font-size:.85rem;margin:1rem 0}
  .read-only-note{flex-direction:column}.pos-note{display:block;line-height:1.5}
  .filters{display:flex;gap:.6rem;margin:1rem 0}.filters input,.filters select{min-height:38px;border:1px solid var(--line);border-radius:8px;padding:.45rem;background:var(--card);color:var(--ink)}.filters input{flex:1}
  .table-wrap,.detail{overflow:auto;border:1px solid var(--line);border-radius:12px;background:var(--card);margin:1rem 0}
  .detail{padding:1rem}.detail>header{display:flex;justify-content:space-between;align-items:flex-start;gap:1rem}
  table{width:100%;border-collapse:collapse;white-space:nowrap;font-size:.84rem}th,td{text-align:left;padding:.7rem;border-bottom:1px solid var(--line)}th{color:var(--slate);font-size:.7rem;text-transform:uppercase}
  .numeric{text-align:right;font-variant-numeric:tabular-nums}.amount{font-weight:650}.mono{font-family:var(--mono,monospace)}
  .link{border:0;background:none;color:var(--accent);text-decoration:underline;padding:0}.status{display:inline-block;border:1px solid var(--line);border-radius:99px;padding:.2rem .5rem;font-size:.72rem}
  .summary-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.8rem;margin:1rem 0;padding:1rem;border:1px solid var(--line);border-radius:10px}
  .summary-grid div{display:flex;flex-direction:column;gap:.35rem}.summary-grid span{font-size:.72rem;color:var(--slate)}.summary-grid strong{font-size:.9rem}
  h3{font-size:.95rem;margin:1.2rem 0 .45rem}.relationship-note{margin:.2rem 0 .6rem}.related-row{display:grid;grid-template-columns:1fr 1fr auto;gap:1rem;padding:.65rem;border-bottom:1px solid var(--line);font-size:.84rem}.voided{opacity:.55}
  .warning{display:inline-grid;place-items:center;width:1rem;height:1rem;border-radius:50%;background:var(--danger);color:white;font-size:.7rem;margin-left:.3rem}
  .warning-panel{padding:.8rem;border:1px solid var(--danger);border-radius:8px;color:var(--danger)!important}.warning-panel span{display:block;margin-top:.3rem}
  .error{color:var(--danger)}.empty{color:var(--slate);text-align:center;padding:1.2rem}.relationship-note{font-size:.8rem}
  @media(max-width:700px){.page-header{align-items:flex-start}.filters{flex-wrap:wrap}.filters input{min-width:100%}.summary-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.related-row{grid-template-columns:1fr auto}.related-row span:nth-child(2){grid-column:1}.related-row strong{grid-column:2;grid-row:1/3;align-self:center}}
</style>
