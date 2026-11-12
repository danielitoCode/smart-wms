import type {ApiClient} from '../../../../infrastructure/api/ApiClient';
import type {PreferredBinDto} from '../dto/PreferredBinDto';
export class PreferredBinsRemoteDataSource{constructor(private readonly api:ApiClient){}
 async list(q:{search?:string;itemId?:number}={}):Promise<PreferredBinDto[]>{const p=new URLSearchParams();if(q.search?.trim())p.set('q',q.search.trim());if(q.itemId)p.set('item_id',String(q.itemId));const r=await this.api.get<{preferred_bins:PreferredBinDto[]}>('/api/admin/preferred-bins'+(p.size?'?'+p.toString():''));return r.preferred_bins??[];}
 async create(v:unknown):Promise<void>{await this.api.post('/api/admin/preferred-bins',v);}
 async update(id:number,v:unknown):Promise<void>{await this.api.put('/api/admin/preferred-bins/'+id,v);}
 async remove(id:number):Promise<void>{await this.api.delete('/api/admin/preferred-bins/'+id);}
}