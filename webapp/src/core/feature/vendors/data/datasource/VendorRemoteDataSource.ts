import type {ApiClient} from '../../../../infrastructure/api/ApiClient';
import type {VendorDto,VendorListDto,VendorMutationDto} from '../dto/VendorDto';
export class VendorRemoteDataSource{
 constructor(private readonly api:ApiClient){}
 async list(q:{search?:string;active?:boolean|null}={}):Promise<VendorDto[]>{const p=new URLSearchParams({per_page:'200'});if(q.search?.trim())p.set('q',q.search.trim());if(q.active!==undefined&&q.active!==null)p.set('active',String(q.active));const r=await this.api.get<VendorListDto>('/api/admin/vendors?'+p.toString());return Array.isArray(r.vendors)?r.vendors:[];}
 async get(id:string):Promise<VendorDto>{const r=await this.api.get<{vendor:VendorDto}>('/api/admin/vendors/'+encodeURIComponent(id));return r.vendor;}
 async create(body:VendorMutationDto):Promise<VendorDto>{const r=await this.api.post<{vendor:VendorDto}>('/api/admin/vendors',body);return r.vendor;}
 async update(id:string,body:VendorMutationDto):Promise<VendorDto>{const r=await this.api.put<{vendor:VendorDto}>('/api/admin/vendors/'+encodeURIComponent(id),body);return r.vendor;}
 async delete(id:string):Promise<void>{await this.api.delete<{deleted:boolean}>('/api/admin/vendors/'+encodeURIComponent(id));}
}