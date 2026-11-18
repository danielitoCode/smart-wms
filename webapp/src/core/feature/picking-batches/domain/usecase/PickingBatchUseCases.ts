import type {PickingBatch} from '../entity/PickingBatch';
import type {PickingBatchRepository} from '../repository/PickingBatchRepository';
export class ListPickingBatchesUseCase{
 constructor(private readonly repo:PickingBatchRepository){}
 async execute(warehouseId:number){if(!Number.isInteger(warehouseId)||warehouseId<=0)throw new Error('warehouseId must be a positive integer');const rows=await this.repo.list(warehouseId);return rows.filter(row=>row.status==='OPEN'||row.status==='IN_PROGRESS');}
}
/** No admin detail endpoint exists: resolve detail from the warehouse-scoped list. */
export class GetPickingBatchDetailUseCase{
 constructor(private readonly repo:PickingBatchRepository){}
 async execute(warehouseId:number,batchId:number){if(!Number.isInteger(warehouseId)||warehouseId<=0)throw new Error('warehouseId must be a positive integer');if(!Number.isInteger(batchId)||batchId<=0)throw new Error('batchId must be a positive integer');const found=(await this.repo.list(warehouseId)).find(x=>x.batchId===batchId);if(!found)throw new Error('Picking batch was not found in the selected warehouse or is no longer active');return found;}
}
export class ReleasePickingBatchUseCase{
 constructor(private readonly repo:PickingBatchRepository){}
 execute(batch:Pick<PickingBatch,'batchId'|'kind'>){if(!Number.isInteger(batch.batchId)||batch.batchId<=0)throw new Error('batchId must be a positive integer');if(batch.kind!=='SO')throw new Error('Transfer-order batches cannot be released from Picking Batches');return this.repo.release(batch.batchId);}
}