import type {ApiClient} from '../../../infrastructure/api/ApiClient';import type {TransferOrderListDto,TransferOrderDetailDto,TransferOrderImportDto} from '../dto/TransferOrderDto';
export class TransferOrdersRemoteDataSource{constructor(private api:ApiClient){}
 async list(q:{status?:string}={}){const p=new URLSearchParams({per_page:'200'});if(q.status)p.set('status',q.status);const r=await this.api.get<TransferOrderListDto>('/api/admin/transfer-orders?'+p);return r.transfer_orders??[];}
 detail(id:number){return this.api.get<TransferOrderDetailDto>('/api/admin/transfer-orders/'+id);}
 create(body:unknown){return this.api.post<TransferOrderImportDto>('/api/admin/transfer-orders/import',body);}
 startPicking(id:number){return this.api.post<unknown>('/api/admin/transfer-orders/'+id+'/start-picking');}
 submitPicks(id:number){return this.api.post<unknown>('/api/admin/picker/transfer-orders/'+id+'/submit');}
 approve(id:number,approvalId:number){return this.api.post<unknown>('/api/admin/transfer-orders/'+id+'/approvals/'+approvalId+'/approve');}
 reject(id:number,approvalId:number,reason:string){return this.api.post<unknown>('/api/admin/transfer-orders/'+id+'/approvals/'+approvalId+'/reject',{rejection_reason:reason});}
 cancel(id:number){return this.api.post<unknown>('/api/admin/transfer-orders/'+id+'/cancel');}
 remove(id:number){return this.api.delete<unknown>('/api/admin/transfer-orders/'+id);}
 shortClose(id:number,lineId:number){return this.api.post<unknown>('/api/admin/transfer-orders/'+id+'/lines/'+lineId+'/short-close');}
}