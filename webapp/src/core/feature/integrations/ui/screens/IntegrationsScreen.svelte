<script lang="ts">
  import { onMount, getContext } from 'svelte';
  import UiLoader from '../../../../../lib/components/UiLoader.svelte';
  import type { I18nState } from '#lib/i18n/i18n.svelte';
  import type { WarehouseSelectionState } from '../../../warehouses/ui/state/warehouseSelectionState.svelte';
  import type { Connector, SyncType } from '../../domain/entity/Connector';
  import { createIntegrationsState } from '../state/integrationsState.svelte';
  const i18n = getContext<I18nState>('i18n');
  const warehouse = getContext<WarehouseSelectionState>('warehouseSelection');
  const vm = createIntegrationsState();
  let form = $state<Record<string,string>>({});
  let selectedName = $state('');
  let loadedWarehouse = $state<number|null>(null);
  const activeConnector = $derived(vm.rows.find(c => c.name === selectedName) ?? null);
  const requiredFieldsMissing = $derived(Object.entries(activeConnector?.configSchema ?? {}).some(([key, schema]) => schema.required && !form[key]?.trim() && !vm.credentials.some(item => item.key === key && item.configured)));
  const availableSyncTypes = $derived.by(() => {
    const caps = activeConnector?.capabilities ?? [];
    return ([
      ['orders','sync_orders'], ['items','sync_items'], ['inventory','sync_inventory'], ['fulfillment','push_fulfillment']
    ] as [SyncType,string][]).filter(([,cap]) => caps.includes(cap)).map(([type]) => type);
  });
  onMount(() => { void vm.load(); });
  $effect(() => {
    const wid = warehouse.warehouseId;
    const name = selectedName;
    if (!name) return;
    const connector = vm.rows.find(c => c.name === name);
    if (!wid) { loadedWarehouse = null; form = {}; if (connector) void vm.selectConnector(connector, null); return; }
    if (loadedWarehouse === wid) return;
    if (connector) { loadedWarehouse = wid; form = {}; void vm.selectConnector(connector, wid); }
  });
  function choose(connector: Connector) {
    selectedName = connector.name; form = {}; loadedWarehouse = warehouse.warehouseId;
    void vm.selectConnector(connector, warehouse.warehouseId);
  }
  async function save() {
    const c = activeConnector, wid = warehouse.warehouseId;
    if (!c || !wid) return;
    const values = Object.fromEntries(Object.entries(form).filter(([,v]) => v.trim().length > 0));
    if (await vm.save(c.name, wid, values)) form = {};
  }
  async function test() { if (activeConnector && warehouse.warehouseId) await vm.testConnection(activeConnector.name, warehouse.warehouseId); }
  async function sync(type: SyncType) { if (activeConnector && warehouse.warehouseId) await vm.executeSync(activeConnector.name, warehouse.warehouseId, type); }
  async function removeCredentials() {
    if (!activeConnector || !warehouse.warehouseId || !confirm(i18n.t('¿Eliminar todas las credenciales de este conector para el almacén actual?'))) return;
    await vm.deleteCredentials(activeConnector.name, warehouse.warehouseId);
  }
  function syncTypeLabel(type: SyncType) { return i18n.t(({ orders: 'Pedidos', items: 'Artículos', inventory: 'Inventario', fulfillment: 'Cumplimiento' })[type]); }
  function credentialInputType(key: string, secret?: boolean) {
    if (secret ?? /secret|token|key|password|credential/i.test(key)) return 'password';
    return 'text';
  }
  function statusLabel(type: SyncType) {
    const state = vm.syncStates.find(s => s.syncType === type);
    if (!state) return i18n.t('Nunca sincronizado');
    if (state.status === 'running') return i18n.t('En ejecución');
    if (state.status === 'error') return i18n.t('Error') + ` · ${state.consecutiveErrors}`;
    if (state.consecutiveErrors > 0) return i18n.t('Último intento fallido') + ` · ${state.consecutiveErrors}`;
    return i18n.t('Correcto');
  }
</script>
<section class="page">
  <header><div><p class="eyebrow">ABELLIS · SMART WMS</p><h1>{i18n.t('Integraciones')}</h1><p>{i18n.t('Conectores externos, credenciales y sincronización por almacén.')}</p></div></header>
  {#if vm.error}<p class="error" role="alert">{vm.error}</p>{/if}
  {#if vm.message}<p class="success" role="status">{vm.message}</p>{/if}
  {#if !warehouse.warehouseId}<p class="notice">{i18n.t('Selecciona un almacén para administrar credenciales y sincronización.')}</p>{/if}
  {#if vm.loading}<UiLoader label={i18n.t('Cargando…')} />{/if}
  {#if vm.rows.length === 0 && !vm.loading}<p class="empty">{i18n.t('No hay conectores registrados.')}</p>{/if}
  <div class="catalog" aria-label={i18n.t('Catálogo de conectores')}>
    {#each vm.rows as connector (connector.name)}
      <button type="button" class:active={selectedName === connector.name} aria-pressed={selectedName === connector.name} onclick={() => choose(connector)}>{connector.name}<small>{connector.capabilities.length} {i18n.t('capacidades')}</small></button>
    {/each}
  </div>
  {#if activeConnector}
    <article class="panel">
      <div class="panel-head"><div><h2>{activeConnector.name}</h2><p>{activeConnector.capabilities.join(' · ') || i18n.t('Sin capacidades declaradas')}</p></div><button type="button" disabled={vm.saving || !warehouse.warehouseId} onclick={test}>{i18n.t('Probar conexión')}</button></div>
      {#if vm.testResult}<p class:success={vm.testResult.connected} class:error={!vm.testResult.connected} role="status">{vm.testResult.connected ? i18n.t('Conexión correcta') : i18n.t('Conexión fallida')}: {vm.testResult.message}</p>{/if}
      <section class="subsection"><h3>{i18n.t('Credenciales')}</h3>
        {#if vm.credentials.length}<ul class="keys">{#each vm.credentials as item (item.key)}<li><code>{item.key}</code><span>{i18n.t('Configurada')} · ••••••••</span></li>{/each}</ul>{:else}<p class="muted">{i18n.t('No hay credenciales guardadas para este almacén.')}</p>{/if}
        <div class="fields">
          {#each Object.entries(activeConnector.configSchema) as [key, schema] (key)}
            <label for={`credential-${key}`}><span>{schema.label ?? key}{#if schema.required}<b aria-hidden="true">*</b><span class="sr-only"> · {i18n.t('Obligatorio')}</span>{/if}</span><input id={`credential-${key}`} type={credentialInputType(key, schema.secret)} autocomplete={credentialInputType(key, schema.secret) === 'password' ? 'new-password' : 'off'} required={Boolean(schema.required && !vm.credentials.some(item => item.key === key && item.configured))} aria-required={schema.required ? 'true' : undefined} placeholder={vm.credentials.some(item => item.key === key && item.configured) ? i18n.t('Deja vacío para conservar el valor actual') : (schema.description ?? i18n.t('Introduce un nuevo valor'))} bind:value={form[key]} /></label>
          {/each}
        </div>
        <div class="actions"><button class="primary" type="button" disabled={vm.saving || !warehouse.warehouseId || requiredFieldsMissing || !Object.values(form).some(v => v.trim())} onclick={save}>{i18n.t('Guardar credenciales')}</button><button class="danger" type="button" disabled={vm.saving || vm.credentials.length === 0} onclick={removeCredentials}>{i18n.t('Eliminar todas')}</button></div>
      </section>
      <section class="subsection"><h3>{i18n.t('Estado de sincronización')}</h3>
        {#if availableSyncTypes.length === 0}<p class="muted">{i18n.t('Este conector no declara capacidades de sincronización.')}</p>{/if}
        {#each availableSyncTypes as type (type)}
          {@const state = vm.syncStates.find(s => s.syncType === type)}
          <div class="sync-row"><div><strong>{syncTypeLabel(type)}</strong><span>{statusLabel(type)}</span>{#if state?.lastSyncedAt}<small>{i18n.t('Última ejecución')}: {new Date(state.lastSyncedAt).toLocaleString()}</small>{/if}{#if state?.lastErrorMessage}<small class="error">{state.lastErrorMessage}</small>{/if}</div><button type="button" disabled={vm.saving || state?.status === 'running' || !warehouse.warehouseId} aria-label={`${i18n.t('Sincronizar')} ${syncTypeLabel(type)}`} onclick={() => sync(type)}>{i18n.t('Sincronizar')}</button></div>
        {/each}
        {#if vm.syncStates.some(s => s.status === 'running')}<button type="button" class="secondary" disabled={vm.saving} onclick={() => activeConnector && warehouse.warehouseId && vm.resetSync(activeConnector.name, warehouse.warehouseId)}>{i18n.t('Restablecer estados atascados')}</button>{/if}
        <button type="button" class="secondary" disabled={vm.saving || !warehouse.warehouseId} onclick={() => activeConnector && warehouse.warehouseId && vm.refreshSync(activeConnector.name, warehouse.warehouseId)}>{i18n.t('Actualizar estado')}</button>
      </section>
    </article>
  {/if}
</section>
<style>
.page{max-width:76rem;margin:0 auto;padding:2rem 1.25rem;color:var(--ink)}header{margin-bottom:1.3rem}.eyebrow{margin:0;font-size:.68rem;font-weight:650;letter-spacing:.14em;color:var(--navy)}h1{margin:.25rem 0;font-size:1.5rem}header p{margin:0;color:var(--slate)}.catalog{display:flex;gap:.55rem;flex-wrap:wrap;margin:1rem 0}.catalog button,.panel button{border:1px solid var(--line);border-radius:.6rem;padding:.55rem .8rem;background:var(--surface);color:var(--ink);cursor:pointer}.catalog button{display:grid;text-align:left;gap:.15rem}.catalog small,.muted,.panel-head p{color:var(--slate);font-size:.78rem}.catalog button.active{border-color:var(--navy);background:color-mix(in srgb,var(--navy) 9%,var(--surface))}.panel{border:1px solid var(--line);border-radius:1rem;padding:1.1rem;background:var(--surface)}.panel-head{display:flex;justify-content:space-between;align-items:center;gap:1rem}.panel-head h2{margin:0;font-size:1.15rem}.panel-head p{margin:.3rem 0}.subsection{border-top:1px solid var(--line);margin-top:1rem;padding-top:1rem}.subsection h3{margin:0 0 .75rem;font-size:.98rem}.keys{list-style:none;padding:0;margin:.4rem 0 1rem}.keys li{display:flex;gap:1rem;justify-content:space-between;padding:.45rem 0;border-bottom:1px solid var(--line);font-size:.84rem}.keys li span{color:var(--slate)}.fields{display:grid;grid-template-columns:repeat(auto-fit,minmax(15rem,1fr));gap:.75rem}.fields label{display:grid;gap:.35rem;font-size:.84rem}.fields b{color:var(--danger);margin-left:.2rem}.fields input{min-width:0;width:100%;box-sizing:border-box;padding:.65rem .7rem;border:1px solid var(--line);border-radius:.55rem;background:var(--bg);color:var(--ink)}.actions{display:flex;gap:.6rem;flex-wrap:wrap;margin-top:.85rem}.panel button.primary{background:var(--navy);border-color:var(--navy);color:white}.panel button.danger{color:var(--danger)}.panel button.secondary{margin:.5rem .5rem 0 0}.sync-row{display:flex;justify-content:space-between;align-items:center;gap:1rem;padding:.7rem 0;border-bottom:1px solid var(--line)}.sync-row div{display:grid;gap:.15rem}.sync-row span,.sync-row small{font-size:.8rem;color:var(--slate)}.error{color:var(--danger)}.success{color:var(--success,#16804a)}.notice{padding:.7rem;border:1px solid var(--line);border-radius:.6rem}.empty{color:var(--slate)}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}@media(max-width:600px){.page{padding:1.25rem .85rem}.panel-head,.sync-row{align-items:stretch;flex-direction:column}.keys li{align-items:flex-start;flex-direction:column}}
</style>