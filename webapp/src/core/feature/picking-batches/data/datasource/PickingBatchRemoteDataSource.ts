import type {ApiClient} from '#core/infrastructure/api/ApiClient.ts';
import type {PickingBatchesResponseDto,ReleasePickingBatchResponseDto} from '../dto/PickingBatchDto';
export class PickingBatchRemoteDataSource{
 constructor(private readonly api:ApiClient){}
 list(warehouseId:number):Promise<PickingBatchesResponseDto>{return this.api.get('/api/admin/pick-batches',{query:{warehouse_id:warehouseId}});}
 release(batchId:number):Promise<ReleasePickingBatchResponseDto>{return this.api.post(`/api/admin/pick-batches/${batchId}/delete`,{});}
}