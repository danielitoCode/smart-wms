import type {ManagedUser,CreateManagedUser,UpdateManagedUser,UserPagePermissions,UpdateUserPagePermissions} from '../../domain/entity/UserManagement';
import type {ManagedUsersRepository} from '../../domain/repository/ManagedUsersRepository';
import type {ManagedUsersRemoteDataSource} from '../datasource/ManagedUsersRemoteDataSource';
import {ManagedUserMapper as M} from '../mapper/ManagedUserMapper';
export class ManagedUsersRepositoryImpl implements ManagedUsersRepository{
 constructor(private readonly remote:ManagedUsersRemoteDataSource){}
 async list():Promise<ManagedUser[]>{return (await this.remote.list()).map(M.toDomain);}
 async create(v:CreateManagedUser):Promise<ManagedUser>{return M.toDomain(await this.remote.create(M.createToDto(v)));}
 async update(v:UpdateManagedUser):Promise<ManagedUser>{return M.toDomain(await this.remote.update(v.userId,M.updateToDto(v)));}
 remove(id:number){return this.remote.remove(id);}
 async getPermissions(id:number):Promise<UserPagePermissions>{return M.permissionsToDomain(await this.remote.getPermissions(id));}
 async updatePermissions(v:UpdateUserPagePermissions):Promise<UserPagePermissions>{return M.permissionsToDomain(await this.remote.updatePermissions(v.userId,M.permissionsToDto(v)));}
}