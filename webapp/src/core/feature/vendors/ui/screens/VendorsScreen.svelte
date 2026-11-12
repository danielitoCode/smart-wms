<script lang="ts">
 import {onMount} from 'svelte';
 import {getContext} from 'svelte';
 import type {I18nState} from '../../../../../lib/i18n/i18n.svelte';
 import {createVendorsState} from '../state/vendorsState.svelte';
 import type {CreateVendor,UpdateVendor,Vendor} from '../../domain/entity/Vendor';
 const i18n=getContext<I18nState>('i18n');const vm=createVendorsState();
 let showForm=$state(false),vendorName=$state(''),contactName=$state(''),email=$state(''),phone=$state(''),paymentTerms=$state(''),isActive=$state(true);
 onMount(()=>{void vm.load();});
 function reset(){showForm=false;vm.setEditing(null);vendorName='';contactName='';email='';phone='';paymentTerms='';isActive=true;}
 function edit(v:Vendor){vm.setEditing(v);vendorName=v.vendorName??'';contactName=v.contactName??'';email=v.email??'';phone=v.phone??'';paymentTerms=v.paymentTerms??'';isActive=v.isActive??true;showForm=true;}
 async function save(){if(!vendorName.trim())return;const payload={vendorName:vendorName.trim(),contactName:contactName||null,email:email||null,phone:phone||null,paymentTerms:paymentTerms||null,isActive};const ok=vm.editing?await vm.update(vm.editing.canonicalId,payload as UpdateVendor):await vm.create(payload as CreateVendor);if(ok)reset();}
 async function remove(v:Vendor){if(confirm('¿Eliminar este proveedor? Esta operación no se puede deshacer.'))await vm.remove(v.canonicalId);}
</script>
<section class="page">
 <header><div><p class="eyebrow">ABELLIS · SMART WMS</p><h1>{i18n.t('Proveedores')}</h1><p>{i18n.t('Gestiona el catálogo de proveedores y sus datos de contacto.')}</p></div><button class="primary" onclick={()=>{reset();showForm=true;}}>{i18n.t('Nuevo proveedor')}</button></header>
 {#if vm.error}<p class="error" role="alert">{vm.error}</p>{/if}
 {#if showForm}<form class="editor" onsubmit={(e)=>{e.preventDefault();void save();}}>
  <h2>{vm.editing?i18n.t('Editar proveedor'):i18n.t('Nuevo proveedor')}</h2>
  <label>{i18n.t('Proveedor')} *<input required maxlength="200" bind:value={vendorName}/></label>
  <label>{i18n.t('Contacto')}<input maxlength="200" bind:value={contactName}/></label>
  <label>{i18n.t('Correo')}<input type="email" maxlength="255" bind:value={email}/></label>
  <label>{i18n.t('Teléfono')}<input maxlength="50" bind:value={phone}/></label>
  <label>{i18n.t('Condiciones de pago')}<input maxlength="64" bind:value={paymentTerms}/></label>
  <label class="check"><input type="checkbox" bind:checked={isActive}/>{i18n.t('Activo')}</label>
  <div class="actions"><button type="button" onclick={reset}>{i18n.t('Cancelar')}</button><button class="primary" type="submit" disabled={vm.saving}>{vm.saving?i18n.t('Guardando…'):i18n.t('Guardar')}</button></div>
 </form>{/if}
 <div class="toolbar"><input type="search" placeholder={i18n.t('Buscar proveedor…')} value={vm.search} oninput={e=>vm.setSearch(e.currentTarget.value)} onkeydown={e=>{if(e.key==='Enter')void vm.load();}}/><button onclick={()=>void vm.load()} disabled={vm.loading}>{i18n.t('Buscar')}</button></div>
 {#if vm.loading}<p>{i18n.t('Cargando…')}</p>{:else if vm.vendors.length===0}<p class="empty">{i18n.t('No hay proveedores registrados.')}</p>{:else}
 <div class="table-wrap"><table><thead><tr><th>{i18n.t('Proveedor')}</th><th>{i18n.t('Contacto')}</th><th>{i18n.t('Correo')}</th><th>{i18n.t('Teléfono')}</th><th>{i18n.t('Condiciones de pago')}</th><th>{i18n.t('Estado')}</th><th>{i18n.t('Acciones')}</th></tr></thead><tbody>{#each vm.vendors as v (v.canonicalId)}<tr><td>{v.vendorName??'—'}</td><td>{v.contactName??'—'}</td><td>{v.email??'—'}</td><td>{v.phone??'—'}</td><td>{v.paymentTerms??'—'}</td><td>{v.isActive?i18n.t('Activo'):i18n.t('Inactivo')}</td><td><button onclick={()=>edit(v)}>{i18n.t('Editar')}</button><button class="danger" onclick={()=>void remove(v)} disabled={vm.saving}>{i18n.t('Eliminar')}</button></td></tr>{/each}</tbody></table></div>{/if}
</section>
<style>
.page{max-width:78rem;margin:1.4rem auto;padding:0 1.1rem;color:var(--ink)}header{display:flex;justify-content:space-between;align-items:center;gap:1rem;margin-bottom:1.2rem}h1{margin:0;font:700 1.6rem var(--disp)}header p{color:var(--slate);font-size:.9rem}.eyebrow{font:600 .65rem var(--disp);letter-spacing:.14em}.primary{background:var(--navy);color:#fff;border-color:var(--navy)}button{border:1px solid var(--line);border-radius:8px;padding:.55rem .8rem;background:var(--card);color:var(--ink);cursor:pointer;margin-right:.35rem}button:disabled{opacity:.55}.danger{color:var(--danger)}.toolbar{display:flex;gap:.5rem;margin:1rem 0}.toolbar input{flex:1}input{min-height:39px;border:1px solid var(--line);border-radius:8px;padding:.5rem .65rem;background:var(--card);color:var(--ink);font:inherit}.editor{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.8rem;padding:1rem;border:1px solid var(--line);border-radius:12px;background:var(--card)}.editor h2{grid-column:1/-1;margin:0;font-size:1rem}.editor label{display:grid;gap:.35rem;color:var(--slate);font-size:.8rem}.editor .check{display:flex;align-items:center}.editor .check input{min-height:auto}.actions{grid-column:1/-1;display:flex;justify-content:flex-end}.table-wrap{overflow:auto;border:1px solid var(--line);border-radius:12px;background:var(--card)}table{width:100%;border-collapse:collapse;white-space:nowrap;font-size:.84rem}th,td{text-align:left;padding:.7rem;border-bottom:1px solid var(--line)}th{color:var(--slate);font-size:.72rem;text-transform:uppercase}.empty{color:var(--slate);padding:2rem 0}.error{color:var(--danger)}@media(max-width:640px){header{align-items:flex-start;flex-direction:column}.editor{grid-template-columns:1fr}}
</style>