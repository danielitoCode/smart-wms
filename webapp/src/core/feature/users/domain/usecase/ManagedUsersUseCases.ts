import type {ManagedUsersRepository} from '../repository/ManagedUsersRepository';
import type {CreateManagedUser,UpdateManagedUser,UpdateUserPagePermissions} from '../entity/UserManagement';
export class ListManagedUsersUseCase{constructor(private r:ManagedUsersRepository){}execute(){return this.r.list();}}
export class CreateManagedUserUseCase{constructor(private r:ManagedUsersRepository){}execute(v:CreateManagedUser){return this.r.create(v);}}
export class UpdateManagedUserUseCase{constructor(private r:ManagedUsersRepository){}execute(v:UpdateManagedUser){return this.r.update(v);}}
export class DeleteManagedUserUseCase{constructor(private r:ManagedUsersRepository){}execute(id:number){return this.r.remove(id);}}
export class GetUserPagePermissionsUseCase{constructor(private r:ManagedUsersRepository){}execute(id:number){return this.r.getPermissions(id);}}
export class UpdateUserPagePermissionsUseCase{constructor(private r:ManagedUsersRepository){}execute(v:UpdateUserPagePermissions){return this.r.updatePermissions(v);}}