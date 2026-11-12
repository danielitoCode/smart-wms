import type {ApiClient} from '../../../../infrastructure/api/ApiClient';import type {InventoryAdjustmentDto,AdjustmentListDto} from '../dto/InventoryAdjustmentDto';
export class InventoryAdjustmentsRemoteDataSource{constructor(private api:ApiClient){}
 async list(q:{warehouseId?:number|null;pending?:boolean}={}){const p=new URLSearchParams({per_page:'200'});if(q.warehouseId)p.set('warehouse_id',String(q.warehouseId));const path=q.pending?'/api/admin/adjustments/pending':'/api/admin/adjustments/list';const r=await this.api.get<AdjustmentListDto>(path+(q.pending?'':'?'+p));return r.adjustments??[];}
 async create(body:unknown){return this.api.post<unknown>('/api/admin/adjustments/direct',body);}
 async review(body:unknown){return this.api.post<unknown>('/api/admin/adjustments/review',body);}
}