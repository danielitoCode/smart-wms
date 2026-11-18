<script lang="ts">
  import { onMount, getContext } from 'svelte';
  import type { I18nState } from '#lib/i18n/i18n.svelte';
  import { createConsumerGroupsState } from '../state/consumerGroupsState.svelte';
  import type { ConnectorRegistryEntry, ConsumerGroup, SubscriptionFilter } from '../../domain/entity/ConsumerGroup';

  const i18n = getContext<I18nState>('i18n');
  const vm = createConsumerGroupsState();
  let showConnectorForm = $state(false);
  let showGroupForm = $state(false);
  let connectorEdit = $state<ConnectorRegistryEntry | null>(null);
  let groupEdit = $state<ConsumerGroup | null>(null);
  let connectorDelete = $state<ConnectorRegistryEntry | null>(null);
  let groupDelete = $state<ConsumerGroup | null>(null);
  let connectorId = $state('');
  let displayName = $state('');
  let groupId = $state('');
  let groupConnectorId = $state('');
  let subscriptionText = $state('{}');
  let acknowledgeReplay = $state(false);
  let formError = $state('');

  onMount(() => { void vm.load(); });

  function openConnector(entry?: ConnectorRegistryEntry) {
    connectorEdit = entry ?? null;
    connectorId = entry?.connectorId ?? '';
    displayName = entry?.displayName ?? '';
    formError = '';
    showConnectorForm = true;
  }
  function openGroup(entry?: ConsumerGroup) {
    groupEdit = entry ?? null;
    groupId = entry?.consumerGroupId ?? '';
    groupConnectorId = entry?.connectorId ?? vm.registry[0]?.connectorId ?? '';
    subscriptionText = JSON.stringify(entry?.subscription ?? {}, null, 2);
    acknowledgeReplay = false;
    formError = '';
    showGroupForm = true;
  }
  function parseSubscription(): SubscriptionFilter | null {
    try {
      const value: unknown = JSON.parse(subscriptionText || '{}');
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('La suscripción debe ser un objeto JSON');
      const candidate = value as Record<string, unknown>;
      if (Object.keys(candidate).some(k => !['event_types', 'warehouse_ids'].includes(k))) throw new Error('Solo se permiten event_types y warehouse_ids');
      if (candidate.event_types !== undefined && (!Array.isArray(candidate.event_types) || candidate.event_types.length > 64 || candidate.event_types.some(v => typeof v !== 'string'))) throw new Error('event_types debe ser una lista de hasta 64 textos');
      if (candidate.warehouse_ids !== undefined && (!Array.isArray(candidate.warehouse_ids) || candidate.warehouse_ids.length > 64 || candidate.warehouse_ids.some(v => !Number.isInteger(v)))) throw new Error('warehouse_ids debe ser una lista de hasta 64 enteros');
      return {
        ...(candidate.event_types !== undefined ? { eventTypes: candidate.event_types as string[] } : {}),
        ...(candidate.warehouse_ids !== undefined ? { warehouseIds: candidate.warehouse_ids as number[] } : {})
      };
    } catch (e) { formError = e instanceof Error ? e.message : 'JSON inválido'; return null; }
  }
  async function saveConnector() {
    formError = '';
    const ok = connectorEdit
      ? await vm.updateConnector({ connectorId: connectorEdit.connectorId, displayName })
      : await vm.createConnector({ connectorId, displayName });
    if (ok) { showConnectorForm = false; connectorEdit = null; }
    else formError = vm.error ?? i18n.t('No se pudo guardar el conector');
  }
  async function saveGroup() {
    formError = '';
    const subscription = parseSubscription();
    if (!subscription) return;
    const ok = groupEdit
      ? await vm.updateGroup({ consumerGroupId: groupEdit.consumerGroupId, subscription })
      : await vm.createGroup({ consumerGroupId: groupId, connectorId: groupConnectorId, subscription, acknowledgeReplay });
    if (ok) { showGroupForm = false; groupEdit = null; }
    else formError = vm.error ?? i18n.t('No se pudo guardar el grupo');
  }
  async function confirmRemoveGroup() {
    if (groupDelete && await vm.removeGroup(groupDelete.consumerGroupId)) groupDelete = null;
  }
  async function confirmRemoveConnector() {
    if (connectorDelete && await vm.removeConnector(connectorDelete.connectorId)) connectorDelete = null;
    else formError = vm.error ?? i18n.t('No se pudo eliminar el conector');
  }
  function subscriptionLabel(value: SubscriptionFilter) {
    const parts = [];
    if (value.eventTypes?.length) parts.push(`event_types: [${value.eventTypes.join(', ')}]`);
    if (value.warehouseIds?.length) parts.push(`warehouse_ids: [${value.warehouseIds.join(', ')}]`);
    return parts.join(' · ') || '—';
  }
  function formatDate(value: string | null) { return value ? new Date(value).toLocaleString() : '—'; }
</script>

<section class="page">
  <header>
    <div><p class="eyebrow">SMART WMS · ADMINISTRACIÓN</p><h1>{i18n.t('Consumer groups')}</h1><p>{i18n.t('Administra el registro de conectores y sus grupos de consumo.')}</p></div>
    <button class="primary" type="button" onclick={() => openGroup()} disabled={vm.registry.length === 0}>{i18n.t('Nuevo grupo')}</button>
  </header>

  {#if vm.error}<p class="error" role="alert">{vm.error}</p>{/if}
  {#if vm.loading}<p>{i18n.t('Cargando…')}</p>{/if}

  <section class="panel">
    <div class="section-head"><div><h2>{i18n.t('Connector Registry')}</h2><p>{i18n.t('Registro independiente de conectores disponibles.')}</p></div><button type="button" onclick={() => openConnector()}>{i18n.t('Nuevo conector')}</button></div>
    {#if vm.registry.length === 0 && !vm.loading}<p class="empty">{i18n.t('No hay conectores registrados.')}</p>{:else}
      <div class="table-wrap"><table><thead><tr><th>ID</th><th>{i18n.t('Nombre visible')}</th><th>{i18n.t('Creado')}</th><th>{i18n.t('Acciones')}</th></tr></thead>
        <tbody>{#each vm.registry as item (item.connectorId)}<tr><td class="mono">{item.connectorId}</td><td>{item.displayName}</td><td>{formatDate(item.createdAt)}</td><td class="actions"><button type="button" onclick={() => openConnector(item)}>{i18n.t('Editar')}</button><button class="danger" type="button" onclick={() => { connectorDelete = item; formError = ''; }}>{i18n.t('Eliminar')}</button></td></tr>{/each}</tbody>
      </table></div>
    {/if}
  </section>

  <section class="panel">
    <div class="section-head"><div><h2>{i18n.t('Consumer Groups')}</h2><p>{i18n.t('Cursor, heartbeat y filtros asociados a cada conector.')}</p></div><button class="primary" type="button" onclick={() => openGroup()} disabled={vm.registry.length === 0}>{i18n.t('Nuevo grupo')}</button></div>
    {#if vm.groups.length === 0 && !vm.loading}<p class="empty">{i18n.t('No hay consumer groups.')}</p>{:else}
      <div class="table-wrap"><table><thead><tr><th>{i18n.t('Group ID')}</th><th>{i18n.t('Conector')}</th><th>{i18n.t('Cursor')}</th><th>{i18n.t('Heartbeat')}</th><th>{i18n.t('Suscripción')}</th><th>{i18n.t('Estado')}</th><th>{i18n.t('Acciones')}</th></tr></thead>
        <tbody>{#each vm.groups as item (item.consumerGroupId)}<tr><td class="mono">{item.consumerGroupId}</td><td class="mono">{vm.registry.find(c => c.connectorId === item.connectorId)?.displayName ?? item.connectorId}</td><td>{item.lastCursor}</td><td>{formatDate(item.lastHeartbeat)}</td><td>{subscriptionLabel(item.subscription)}</td><td><span class:muted={!item.lastHeartbeat} class="state">{item.lastHeartbeat ? i18n.t('Con heartbeat') : i18n.t('Sin heartbeat')}</span></td><td class="actions"><button type="button" onclick={() => openGroup(item)}>{i18n.t('Editar')}</button><button class="danger" type="button" onclick={() => { groupDelete = item; }}>{i18n.t('Eliminar')}</button></td></tr>{/each}</tbody>
      </table></div>
    {/if}
  </section>

  {#if showConnectorForm}
    <div class="overlay" role="presentation"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="connector-title"><h2 id="connector-title">{connectorEdit ? i18n.t('Editar conector') : i18n.t('Nuevo conector')}</h2>
      {#if formError}<p class="error" role="alert">{formError}</p>{/if}
      <label>Connector ID<input bind:value={connectorId} disabled={!!connectorEdit} maxlength="64" required /></label>
      <label>{i18n.t('Nombre visible')}<input bind:value={displayName} maxlength="128" required /></label>
      <div class="actions"><button type="button" onclick={() => showConnectorForm = false}>{i18n.t('Cancelar')}</button><button class="primary" type="button" onclick={() => void saveConnector()} disabled={vm.saving}>{i18n.t('Guardar')}</button></div>
    </section></div>
  {/if}

  {#if showGroupForm}
    <div class="overlay" role="presentation"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="group-title"><h2 id="group-title">{groupEdit ? i18n.t('Editar suscripción') : i18n.t('Nuevo consumer group')}</h2>
      {#if formError}<p class="error" role="alert">{formError}</p>{/if}
      {#if !groupEdit}<label>Consumer Group ID<input bind:value={groupId} maxlength="64" required /></label><label>{i18n.t('Conector')}<select bind:value={groupConnectorId} required>{#each vm.registry as c}<option value={c.connectorId}>{c.displayName} ({c.connectorId})</option>{/each}</select></label>{:else}<p class="meta">{groupEdit.consumerGroupId} · {groupEdit.connectorId} · cursor {groupEdit.lastCursor}</p>{/if}
      <label>{i18n.t('Suscripción (JSON)')}<textarea bind:value={subscriptionText} rows="7" spellcheck="false"></textarea></label>
      <p class="hint">event_types: string[] · warehouse_ids: integer[] · máx. 64 elementos por campo</p>
      {#if !groupEdit}<label class="check"><input type="checkbox" bind:checked={acknowledgeReplay} />{i18n.t('Reconozco que recrear un ID borrado reproducirá eventos desde el cursor inicial.')}</label>{/if}
      <div class="actions"><button type="button" onclick={() => showGroupForm = false}>{i18n.t('Cancelar')}</button><button class="primary" type="button" onclick={() => void saveGroup()} disabled={vm.saving}>{i18n.t('Guardar')}</button></div>
    </section></div>
  {/if}

  {#if groupDelete}
    <div class="overlay" role="presentation"><section class="dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-group-title"><h2 id="delete-group-title">{i18n.t('Eliminar consumer group')}</h2><p>{i18n.t('La eliminación guarda un tombstone. Si se recrea el mismo ID, el backend exigirá reconocer el replay de eventos.')}</p><p class="mono">{groupDelete.consumerGroupId}</p><div class="actions"><button type="button" onclick={() => groupDelete = null}>{i18n.t('Cancelar')}</button><button class="danger" type="button" onclick={() => void confirmRemoveGroup()} disabled={vm.saving}>{i18n.t('Confirmar eliminación')}</button></div></section></div>
  {/if}
  {#if connectorDelete}
    <div class="overlay" role="presentation"><section class="dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-connector-title"><h2 id="delete-connector-title">{i18n.t('Eliminar conector')}</h2><p>{i18n.t('Solo se puede eliminar si no tiene consumer groups ni webhook subscriptions asociados.')}</p><p class="mono">{connectorDelete.connectorId}</p>{#if formError}<p class="error" role="alert">{formError}</p>{/if}<div class="actions"><button type="button" onclick={() => connectorDelete = null}>{i18n.t('Cancelar')}</button><button class="danger" type="button" onclick={() => void confirmRemoveConnector()} disabled={vm.saving}>{i18n.t('Confirmar eliminación')}</button></div></section></div>
  {/if}
</section>

<style>
  .page{max-width:76rem;margin:0 auto;padding:2rem 1.25rem}header,.section-head{display:flex;justify-content:space-between;align-items:flex-start;gap:1rem}header{margin-bottom:1.4rem}header p,.section-head p{margin:.25rem 0;color:var(--slate)}.eyebrow{font-size:.68rem;letter-spacing:.14em;font-weight:700;color:var(--navy)}h1{font-size:1.5rem;margin:.2rem 0}h2{font-size:1.05rem;margin:0}.panel{border:1px solid var(--line);border-radius:12px;padding:1rem;margin:1rem 0;background:var(--surface)}.section-head{margin-bottom:1rem}.table-wrap{overflow:auto}table{width:100%;border-collapse:collapse;font-size:.85rem;min-width:52rem}th,td{text-align:left;padding:.65rem .7rem;border-bottom:1px solid var(--line);vertical-align:top}th{color:var(--slate);font-weight:600}.mono{font-family:ui-monospace,monospace}.actions{display:flex;gap:.4rem;flex-wrap:wrap}button{border:1px solid var(--line);border-radius:7px;padding:.4rem .7rem;background:var(--surface);cursor:pointer}button:disabled{opacity:.55;cursor:not-allowed}.primary{background:var(--navy);color:white;border-color:var(--navy)}.danger,.error{color:var(--danger)}.empty,.hint,.meta{color:var(--slate)}.state{font-size:.78rem}.muted{opacity:.65}.overlay{position:fixed;inset:0;background:#10182888;display:grid;place-items:center;padding:1rem;z-index:50}.dialog{width:min(34rem,100%);max-height:90vh;overflow:auto;background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:1.25rem;display:flex;flex-direction:column;gap:.8rem}.dialog label{display:flex;flex-direction:column;gap:.3rem}.dialog input,.dialog select,.dialog textarea{width:100%;padding:.55rem;border:1px solid var(--line);border-radius:7px;background:var(--surface);color:inherit}.dialog .check{flex-direction:row;align-items:flex-start}.dialog .check input{width:auto;margin-top:.2rem}.dialog .actions{justify-content:flex-end;margin-top:.5rem}@media(max-width:650px){.page{padding:1rem .75rem}header,.section-head{flex-direction:column}.panel{padding:.75rem}}
</style>
