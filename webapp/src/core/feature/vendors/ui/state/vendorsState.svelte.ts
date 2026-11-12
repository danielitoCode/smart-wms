import {createVendorDependencies} from '../../di/vendors.dependencies';
import type {Vendor,CreateVendor,UpdateVendor} from '../../domain/entity/Vendor';
import {toUserMessage} from '../../../../infrastructure/errors/ApiError';
const deps=createVendorDependencies();
export function createVendorsState(){let vendors=$state<Vendor[]>([]),loading=$state(false),saving=$state(false),error=$state<string|null>(null),search=$state(''),editing=$state<Vendor|null>(null);
 async function load(){loading=true;error=null;try{vendors=await deps.list.execute({search,active:null});}catch(e){error=toUserMessage(e,'No se pudieron cargar los proveedores');}finally{loading=false;}}
 async function create(v:CreateVendor){saving=true;error=null;try{await deps.create.execute(v);await load();return true;}catch(e){error=toUserMessage(e,'No se pudo crear el proveedor');return false;}finally{saving=false;}}
 async function update(id:string,v:UpdateVendor){saving=true;error=null;try{await deps.update.execute(id,v);editing=null;await load();return true;}catch(e){error=toUserMessage(e,'No se pudo actualizar el proveedor');return false;}finally{saving=false;}}
 async function remove(id:string){saving=true;error=null;try{await deps.remove.execute(id);await load();return true;}catch(e){error=toUserMessage(e,'No se pudo eliminar el proveedor');return false;}finally{saving=false;}}
 return {get vendors(){return vendors;},get loading(){return loading;},get saving(){return saving;},get error(){return error;},get search(){return search;},get editing(){return editing;},setSearch(v:string){search=v;},setEditing(v:Vendor|null){editing=v;},load,create,update,remove};}