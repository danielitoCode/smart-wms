<script lang="ts">
 import {getContext,untrack} from 'svelte';
 import {page} from '$app/state';
 import type {I18nState} from '../../../../../lib/i18n/i18n.svelte';
 import {ADMIN_OPERATION_CATALOG} from '../AdminOperationCatalog';
 import type {AdminOperationKey} from '../../domain/entity/AdminOperation.ts';
 import {createAdminOperationState} from '../state/adminOperationState.svelte';
 const i18n=getContext<I18nState>('i18n');
 const selection=getContext<{warehouseId:number|null}>('warehouseSelection');
 const definition=$derived(ADMIN_OPERATION_CATALOG[page.params.feature??'']);
 let activeFeature=$state<AdminOperationKey|null>(null);
 let vm=$state(createAdminOperationState('backorders'));
 $effect(()=>{
  const key=definition?.key??null;
  if(key&&key!==activeFeature){activeFeature=key;vm=createAdminOperationState(key);}
 });
 $effect(()=>{
  const state=vm, current=definition, warehouseId=selection?.warehouseId;
  if(state&&current)untrack(()=>void state.load({warehouseId:current.warehouseScoped?warehouseId:null}));
 });
 function display(row:Record<string,unknown>,key:string){const v=row[key];if(v==null||v==='')return '—';return typeof v==='object'?JSON.stringify(v):String(v);}
 function summaryMetric(key:string):string {
  const today=vm.summary?.today;
  if(!today||typeof today!=='object')return '0';
  const value=(today as Record<string,unknown>)[key];
  return value==null?'0':String(value);
 }
 function submit(e:SubmitEvent){e.preventDefault();if(vm&&definition)void vm.load({warehouseId:definition.warehouseScoped?selection?.warehouseId:null});}
</script>
{#if !definition}
 <section class="page"><h1>{i18n.t('Módulo no encontrado')}</h1><p>{i18n.t('La ruta solicitada no corresponde a una funcionalidad migrada.')}</p></section>
{:else}
 <section class="page">
  <header><div><p class="eyebrow">ABELLIS · SMART WMS</p><h1>{i18n.t(definition.title)}</h1><p class="subtitle">{i18n.t(definition.description)}</p></div><button type="button" onclick={()=>vm.load({warehouseId:definition.warehouseScoped?selection?.warehouseId:null})} disabled={vm.loading}>{i18n.t('Actualizar')}</button></header>
  {#if definition.key==='backorders'}<div class="tabs" role="tablist"><button type="button" class:active={vm.tab==='waiting'} role="tab" aria-selected={vm.tab==='waiting'} onclick={()=>{vm.setTab('waiting');void vm.load({warehouseId:selection?.warehouseId});}}>{i18n.t('Pendientes de inventario')}</button><button type="button" class:active={vm.tab==='ready-to-ship'} role="tab" aria-selected={vm.tab==='ready-to-ship'} onclick={()=>{vm.setTab('ready-to-ship');void vm.load({warehouseId:selection?.warehouseId});}}>{i18n.t('Listos para despacho')}</button></div>{/if}
  {#if definition.key==='pos-activity'}<div class="filters"><label>{i18n.t('Fecha')}<input type="date" value={vm.date} onchange={e=>{vm.setDate(e.currentTarget.value);void vm.load();}}/></label><label>{i18n.t('Estado')}<select value={vm.status} onchange={e=>{vm.setStatus(e.currentTarget.value);void vm.load();}}><option value="">{i18n.t('Todos')}</option>{#each ['OPEN','ALLOCATED','PICKED','PACKED','SHIPPED','CANCELLED'] as s}<option value={s}>{s}</option>{/each}</select></label></div>{#if vm.summary}<div class="summary"><article><span>{i18n.t('Ventas')}</span><strong>{summaryMetric('sales_count')}</strong></article><article><span>{i18n.t('Ingresos netos (centavos)')}</span><strong>{summaryMetric('net_cents')}</strong></article><article><span>{i18n.t('Devoluciones')}</span><strong>{summaryMetric('refund_count')}</strong></article></div>{/if}{/if}
  <form class="search" onsubmit={submit}><input type="search" placeholder={i18n.t('Buscar…')} value={vm.search} oninput={e=>vm.setSearch(e.currentTarget.value)}/><button class="accent" type="submit" disabled={vm.loading}>{i18n.t('Buscar')}</button></form>
  {#if vm.error}<p class="error" role="alert">{vm.error}</p><button type="button" onclick={()=>vm.load()}>{i18n.t('Reintentar')}</button>{:else if vm.loading}<div class="skeleton" aria-label={i18n.t('Cargando')}><span></span><span></span><span></span></div>{:else if vm.rows.length===0}<p class="empty">{i18n.t('No hay registros para mostrar.')}</p>{:else}<div class="table-wrap"><table><thead><tr>{#each definition.columns as col}<th>{i18n.t(col.label)}</th>{/each}</tr></thead><tbody>{#each vm.rows as row,i (String(row.id??row.so_id??row.po_id??row.to_id??row.user_id??row.adjustment_id??i))}<tr>{#each definition.columns as col}<td>{display(row,col.key)}</td>{/each}</tr>{/each}</tbody></table></div>{/if}
  <p class="footnote">{i18n.t('Consulta conectada al API Flask. Las acciones de escritura se migrarán con sus contratos y permisos específicos.')}</p>
 </section>
{/if}
<style>
.page{max-width:78rem;margin:1.4rem auto;padding:0 1.1rem;font-family:var(--body);animation:enter .18s ease-out}header{display:flex;align-items:center;justify-content:space-between;gap:1rem;margin-bottom:1.3rem}.eyebrow{margin:0 0 .35rem;color:var(--slate);font:600 .64rem var(--disp);letter-spacing:.15em}h1{margin:0;color:var(--ink);font:700 1.65rem var(--disp);letter-spacing:-.025em}.subtitle{margin:.35rem 0 0;color:var(--slate);font-size:.9rem}.search,.filters,.tabs{display:flex;align-items:end;gap:.65rem;flex-wrap:wrap;margin:0 0 1rem}input,select{min-height:40px;padding:.55rem .7rem;border:1px solid var(--line);border-radius:9px;background:var(--card);color:var(--ink);font:inherit}.search input{flex:1;min-width:220px}.filters label{display:grid;gap:.3rem;color:var(--slate);font-size:.78rem;font-weight:600}button{min-height:40px;padding:.55rem .9rem;border:1px solid var(--line);border-radius:9px;background:var(--card);color:var(--ink);font:600 .82rem var(--body);cursor:pointer}button.accent,.tabs button.active{background:var(--navy);border-color:var(--navy);color:white}.table-wrap{overflow:auto;border:1px solid var(--line);border-radius:12px;background:var(--card)}table{width:100%;border-collapse:collapse;font-size:.84rem;white-space:nowrap}th,td{padding:.72rem .8rem;text-align:left;border-bottom:1px solid var(--line);max-width:24rem}th{position:sticky;top:0;background:var(--surface-subtle,#f7fafc);color:var(--slate);font-size:.7rem;letter-spacing:.06em;text-transform:uppercase}td{color:var(--ink)}tr:last-child td{border:0}.empty{padding:2rem 0;color:var(--slate)}.error{color:var(--danger)}.summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.7rem;margin:0 0 1rem}.summary article{display:grid;gap:.3rem;padding:1rem;border:1px solid var(--line);border-radius:12px;background:var(--card)}.summary span{color:var(--slate);font-size:.75rem}.summary strong{font:700 1.25rem var(--disp);color:var(--ink)}.skeleton{display:grid;gap:.55rem}.skeleton span{height:2.7rem;border-radius:8px;background:var(--surface-subtle);animation:pulse 1s infinite alternate}.footnote{margin:1rem 0;color:var(--slate);font-size:.73rem}@keyframes enter{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}@keyframes pulse{to{opacity:.45}}@media(max-width:640px){header{align-items:flex-start;flex-direction:column}.search input{min-width:100%}.summary{grid-template-columns:1fr}}@media(prefers-reduced-motion:reduce){.page,.skeleton span{animation:none}}
</style>