import {createManagedUsersDependencies} from '../../di/managedUsers.dependencies';
import type {ManagedUser,CreateManagedUser,UpdateManagedUser,UserPagePermissions} from '../../domain/entity/UserManagement';
import {toUserMessage} from '../../../../infrastructure/errors/ApiError';
const deps=createManagedUsersDependencies();
export function createManagedUsersState(){let users=$state<ManagedUser[]>([]),loading=$state(false),saving=$state(false),error=$state<string|null>(null),permissions=$state<UserPagePermissions|null>(null);
 async function load(){loading=true;error=null;try{users=await deps.list.execute();}catch(e){error=toUserMessage(e,'No se pudieron cargar los usuarios');}finally{loading=false;}}
 async function create(v:CreateManagedUser){saving=true;error=null;try{await deps.create.execute(v);await load();return true;}catch(e){error=toUserMessage(e,'No se pudo crear el usuario');return false;}finally{saving=false;}}
 async function update(v:UpdateManagedUser){saving=true;error=null;try{await deps.update.execute(v);await load();return true;}catch(e){error=toUserMessage(e,'No se pudo actualizar el usuario');return false;}finally{saving=false;}}
 async function remove(id:number){saving=true;error=null;try{await deps.remove.execute(id);await load();return true;}catch(e){error=toUserMessage(e,'No se pudo eliminar el usuario');return false;}finally{saving=false;}}
 async function loadPermissions(id:number){error=null;try{permissions=await deps.getPermissions.execute(id);return permissions;}catch(e){error=toUserMessage(e,'No se pudieron cargar los permisos');return null;}}
 async function savePermissions(id:number,pageKeys:string[]){saving=true;error=null;try{permissions=await deps.updatePermissions.execute({userId:id,pageKeys});return true;}catch(e){error=toUserMessage(e,'No se pudieron guardar los permisos');return false;}finally{saving=false;}}
 return {get users(){return users;},get loading(){return loading;},get saving(){return saving;},get error(){return error;},get permissions(){return permissions;},load,create,update,remove,loadPermissions,savePermissions};}