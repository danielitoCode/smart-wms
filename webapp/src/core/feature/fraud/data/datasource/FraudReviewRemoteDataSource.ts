import type {ApiClient} from '../../../../infrastructure/api/ApiClient';import type {FraudReviewDto,FraudReviewListDto} from '../dto/FraudReviewDto';
export class FraudReviewRemoteDataSource{constructor(private api:ApiClient){}
 async list(warehouseId:number|null){const p=new URLSearchParams({status:'FRAUD_REVIEW',per_page:'100'});if(warehouseId)p.set('warehouse_id',String(warehouseId));const r=await this.api.get<FraudReviewListDto>('/api/admin/sales-orders?'+p);return r.sales_orders??[];}
 async updateMemo(id:number,memo:string){await this.api.request('/api/admin/sales-orders/'+id+'/memo',{method:'PATCH',body:{memo}});}
 async pushToQueue(id:number){await this.api.post<unknown>('/api/admin/sales-orders/'+id+'/push-to-queue');}
}