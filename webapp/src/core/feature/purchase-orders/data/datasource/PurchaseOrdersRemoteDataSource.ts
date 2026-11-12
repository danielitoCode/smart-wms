import type {ApiClient} from '../../../infrastructure/api/ApiClient';import type {PurchaseOrderDto,PurchaseOrderDetailDto,PurchaseOrderListDto} from '../dto/PurchaseOrderDto';
export class PurchaseOrdersRemoteDataSource{constructor(private api:ApiClient){}
 async list(q:{warehouseId?:number|null;search?:string;status?:string}={}):Promise<PurchaseOrderDto[]>{const p=new URLSearchParams({per_page:'200'});if(q.warehouseId)p.set('warehouse_id',String(q.warehouseId));if(q.search?.trim())p.set('q',q.search.trim());if(q.status)p.set('status',q.status);const r=await this.api.get<PurchaseOrderListDto>('/api/admin/purchase-orders?'+p);return r.purchase_orders??[];}
 async detail(id:number){return this.api.get<PurchaseOrderDetailDto>('/api/admin/purchase-orders/'+id);}
 async create(body:unknown){return this.api.post<PurchaseOrderDetailDto>('/api/admin/purchase-orders',body);}
 async update(id:number,body:unknown){return this.api.put<unknown>('/api/admin/purchase-orders/'+id,body);}
 async lifecycle(id:number,action:'close'|'reopen'){return this.api.post<unknown>('/api/admin/purchase-orders/'+id+'/'+action);}
}