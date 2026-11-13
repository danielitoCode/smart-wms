import type {ApiClient} from '#core/infrastructure/api/ApiClient.ts'
import type {BackorderDto,BackorderListDto} from '../dto/BackorderDto'

export class BackordersRemoteDataSource {
 constructor(private api:ApiClient){}
 async list(warehouseId:number|null,tab:'waiting'|'ready-to-ship'){
  const p=new URLSearchParams({tab})
  if(warehouseId) p.set('warehouse_id',String(warehouseId))
  const r=await this.api.get<BackorderListDto>('/api/admin/backorders?'+p)
  return r.backorders??[]
 }

 async cancel(id:number,reason:string){
  return this.api.post<unknown>('/api/admin/sales-orders/'+id+'/cancel-backorder',{cancellation_reason:reason})
 }
}