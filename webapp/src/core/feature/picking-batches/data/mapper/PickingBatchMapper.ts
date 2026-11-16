import type {PickingBatch} from '../../domain/entity/PickingBatch';
import type {PickingBatchDto,ReleasePickingBatchResponseDto} from '../dto/PickingBatchDto';
export const PickingBatchMapper={
 toDomain(dto:PickingBatchDto):PickingBatch{return {batchId:dto.batch_id,batchNumber:dto.batch_number,kind:dto.kind,status:dto.status,assignedTo:dto.assigned_to,createdAt:dto.created_at,startedAt:dto.started_at,warehouseId:dto.warehouse_id,totalTasks:Number(dto.total_tasks??0),completedTasks:Number(dto.completed_tasks??0),pendingTasks:Number(dto.pending_tasks??0),orders:Array.isArray(dto.orders)?[...dto.orders]:[],transferOrderNumber:dto.to_number};},
 toReleaseResult(dto:ReleasePickingBatchResponseDto){return {batchId:dto.batch_id,releasedTasks:Number(dto.released_tasks??0),releasedOrders:Array.isArray(dto.released_orders)?[...dto.released_orders]:[]};}
};