import type {ApiClient} from '../../../../infrastructure/api/ApiClient';
import type {ManagedUserDto,UserPermissionsDto} from '../dto/ManagedUserDto';
export class ManagedUsersRemoteDataSource{
 constructor(private readonly api:ApiClient){}
 async list():Promise<ManagedUserDto[]>{const r=await this.api.get<{users:ManagedUserDto[]}>('/api/admin/users?per_page=1000');return r.users??[];}
 async create(body:unknown):Promise<ManagedUserDto>{return this.api.post<ManagedUserDto>('/api/admin/users',body);}
 async update(id:number,body:unknown):Promise<ManagedUserDto>{return this.api.put<ManagedUserDto>('/api/admin/users/'+id,body);}
 async remove(id:number):Promise<void>{await this.api.delete<unknown>('/api/admin/users/'+id);}
 async getPermissions(id:number):Promise<UserPermissionsDto>{return this.api.get<UserPermissionsDto>('/api/admin/users/'+id+'/permissions');}
 async updatePermissions(id:number,body:unknown):Promise<UserPermissionsDto>{return this.api.put<UserPermissionsDto>('/api/admin/users/'+id+'/permissions',body);}
}