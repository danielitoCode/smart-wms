import {createManagedUsersDependencies} from '../../di/managedUsers.dependencies';
import type {ManagedUser,ManagedWarehouse,CreateManagedUser,UpdateManagedUser,UserPagePermissions} from '../../domain/entity/UserManagement';
import {toUserMessage} from '../../../../infrastructure/errors/ApiError';
const deps=createManagedUsersDependencies();
export function createManagedUsersState(){
 let users=$state<ManagedUser[]>([]),warehouses=$state<ManagedWarehouse[]>([]);
 let loading=$state(false),warehouseLoading=$state(false),saving=$state(false),error=$state<string|null>(null),permissions=$state<UserPagePermissions|null>(null);
 async function load(){loading=true;error=null;try{users=await deps.list.execute();}catch(e){error=toUserMessage(e,'No se pudieron cargar los usuarios');}finally{loading=false;}}
 async function loadWarehouses(){warehouseLoading=true;try{warehouses=await deps.listWarehouses.execute();}catch(e){error=toUserMessage(e,'No se pudieron cargar los almacenes');}finally{warehouseLoading=false;}}
 async function create(v:CreateManagedUser):Promise<ManagedUser|null>{saving=true;error=null;try{const created=await deps.create.execute(v);await load();return created;}catch(e){error=toUserMessage(e,'No se pudo crear el usuario');return null;}finally{saving=false;}}
 async function update(v:UpdateManagedUser){saving=true;error=null;try{await deps.update.execute(v);await load();return true;}catch(e){error=toUserMessage(e,'No se pudo actualizar el usuario');return false;}finally{saving=false;}}
 async function remove(id:number){saving=true;error=null;try{await deps.remove.execute(id);await load();return true;}catch(e){error=toUserMessage(e,'No se pudo eliminar el usuario');return false;}finally{saving=false;}}
 async function loadPermissions(id:number){error=null;permissions=null;try{permissions=await deps.getPermissions.execute(id);return permissions;}catch(e){error=toUserMessage(e,'No se pudieron cargar los permisos');return null;}}
 async function savePermissions(id:number,pageKeys:string[]){saving=true;error=null;try{permissions=await deps.updatePermissions.execute({userId:id,pageKeys});return true;}catch(e){error=toUserMessage(e,'No se pudieron guardar los permisos');return false;}finally{saving=false;}}
 return {get users(){return users;},get warehouses(){return warehouses;},get loading(){return loading;},get warehouseLoading(){return warehouseLoading;},get saving(){return saving;},get error(){return error;},get permissions(){return permissions;},load,loadWarehouses,create,update,remove,loadPermissions,savePermissions};
}