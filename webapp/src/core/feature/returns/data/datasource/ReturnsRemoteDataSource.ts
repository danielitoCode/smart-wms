import type {ApiClient} from '../../../../infrastructure/api/ApiClient';import type {ReturnHeaderDto,ReturnLineDto,ReturnListDto,ReturnDetailDto,WarehouseOptionDto,BinOptionDto} from '../dto/ReturnDto';
export class ReturnsRemoteDataSource{constructor(private api:ApiClient){}
 async list(q:{status?:string;search?:string}={}){const p=new URLSearchParams({order_type:'return',per_page:'50'});if(q.status)p.set('status',q.status);if(q.search?.trim())p.set('q',q.search.trim());const r=await this.api.get<ReturnListDto>('/api/admin/sales-orders?'+p);return r.sales_orders??[];}
 async detail(id:number){return this.api.get<ReturnDetailDto>('/api/admin/sales-orders/'+id);}
 async saveMemo(id:number,memo:string){await this.api.request('/api/admin/sales-orders/'+id+'/memo',{method:'PATCH',body:{memo}});}
 async receive(id:number,v:{item_id:number;quantity:number;warehouse_id:number;bin_id:number;notes?:string|null;idempotency_key:string}){await this.api.post<unknown>('/api/admin/sales-orders/'+id+'/receive-return',v);}
 async void(id:number){await this.api.post<unknown>('/api/admin/sales-orders/'+id+'/void-return',{});}
 async warehouses(){const r=await this.api.get<{warehouses:WarehouseOptionDto[]}>('/api/admin/warehouses?per_page=500');return r.warehouses??[];}
 async bins(warehouseId:number,query:string){const p=new URLSearchParams({warehouse_id:String(warehouseId),q:query,per_page:'25'});const r=await this.api.get<{bins:BinOptionDto[]}>('/api/admin/bins?'+p);return r.bins??[];}
}