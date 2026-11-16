export type PickingBatchKind = 'SO' | 'TO';
export interface PickingBatch {
 batchId:number; batchNumber:string; kind:PickingBatchKind; status:string; assignedTo:string|null;
 createdAt:string|null; startedAt:string|null; warehouseId:number; totalTasks:number; completedTasks:number;
 pendingTasks:number; orders:string[]; transferOrderNumber:string|null;
}
export interface ReleasePickingBatchResult { batchId:number; releasedTasks:number; releasedOrders:string[]; }