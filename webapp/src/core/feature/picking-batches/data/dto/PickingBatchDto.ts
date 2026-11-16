export interface PickingBatchDto {
 batch_id:number; batch_number:string; status:string; kind:'SO'|'TO'; assigned_to:string|null;
 created_at:string|null; started_at:string|null; warehouse_id:number; total_tasks:number;
 completed_tasks:number; pending_tasks:number; orders:string[]; to_number:string|null;
}
export interface PickingBatchesResponseDto { pick_batches:PickingBatchDto[]; }
export interface ReleasePickingBatchResponseDto { batch_id:number; released_tasks:number; released_orders:string[]; message?:string; }