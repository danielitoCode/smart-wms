<script lang="ts">
  import { getContext } from 'svelte';
  import { goto } from '$app/navigation';
  import type { I18nState } from '../../../../../lib/i18n/i18n.svelte';
  import { createCustomersState } from '../state/customersState.svelte';

  const i18n = getContext<I18nState>('i18n');
  const vm = createCustomersState();

  function openOrders(customerName: string): void {
    void goto(`/management/sales-orders?q=${encodeURIComponent(customerName)}`);
  }
</script>

<section class="page">
  <header>
    <div>
      <p class="eyebrow">ABELLIS · SMART WMS</p>
      <h1>{i18n.t('Clientes')}</h1>
      <p class="subtitle">{i18n.t('Consulta los clientes identificados en el historial de pedidos.')}</p>
    </div>
  </header>

  <form class="search" onsubmit={(event) => { event.preventDefault(); void vm.find(); }}>
    <input
      type="search"
      minlength="2"
      required
      placeholder={i18n.t('Buscar cliente por nombre')}
      value={vm.search}
      oninput={(event) => vm.setSearch(event.currentTarget.value)}
    />
    <button class="primary" type="submit" disabled={vm.loading}>
      {vm.loading ? i18n.t('Buscando…') : i18n.t('Buscar')}
    </button>
  </form>

  <p class="notice">{i18n.t('Los clientes son una vista de consulta derivada de los pedidos. El backend actual no ofrece operaciones administrativas independientes para crear, modificar o eliminar clientes.')}</p>

  {#if vm.error}
    <p class="error" role="alert">{vm.error}</p>
  {:else if vm.loading}
    <p>{i18n.t('Cargando…')}</p>
  {:else if vm.searched && vm.customers.length === 0}
    <p class="empty">{i18n.t('No se encontraron clientes.')}</p>
  {:else if vm.customers.length > 0}
    <div class="table-wrap">
      <table>
        <thead><tr><th>{i18n.t('Cliente')}</th><th>{i18n.t('Pedidos registrados')}</th><th>{i18n.t('Acciones')}</th></tr></thead>
        <tbody>
          {#each vm.customers as customer (customer.id)}
            <tr>
              <td>{customer.name}</td>
              <td>{customer.orderCount}</td>
              <td><button type="button" onclick={() => openOrders(customer.name)}>{i18n.t('Ver pedidos')}</button></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</section>

<style>
  .page { max-width: 78rem; margin: 1.5rem auto; padding: 0 1.25rem; color: var(--ink); }
  header { margin-bottom: 1.25rem; }
  .eyebrow { margin: 0 0 .35rem; color: var(--slate); font: 600 .68rem var(--disp); letter-spacing: .14em; }
  h1 { margin: 0; font: 700 1.65rem var(--disp); }
  .subtitle { margin: .4rem 0 0; color: var(--slate); }
  .search { display: flex; gap: .65rem; margin-bottom: 1rem; }
  input { flex: 1; min-width: 0; min-height: 42px; padding: .6rem .75rem; border: 1px solid var(--line); border-radius: 9px; background: var(--card); color: var(--ink); font: inherit; }
  button { min-height: 40px; padding: .55rem .85rem; border: 1px solid var(--line); border-radius: 8px; background: var(--card); color: var(--ink); cursor: pointer; }
  button.primary { border-color: var(--navy); background: var(--navy); color: white; }
  button:disabled { opacity: .55; cursor: wait; }
  .notice { margin: 0 0 1rem; padding: .8rem 1rem; border-left: 3px solid var(--line); background: var(--surface-subtle); color: var(--slate); font-size: .85rem; line-height: 1.5; }
  .table-wrap { overflow-x: auto; border: 1px solid var(--line); border-radius: 12px; background: var(--card); }
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: .8rem .9rem; border-bottom: 1px solid var(--line); text-align: left; }
  th { color: var(--slate); font-size: .72rem; text-transform: uppercase; }
  .empty { padding: 1.5rem 0; color: var(--slate); }
  .error { color: var(--danger); }
  @media (max-width: 600px) { .search { flex-direction: column; } }
</style>
