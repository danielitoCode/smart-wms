import type {CycleCountApproval,CycleCountApprovalLine} from '../../domain/entity/CycleCountApproval'
import type {CycleCountApprovalLineDto} from '../dto/CycleCountApprovalDto'

export const CycleCountApprovalMapper={
    group(rows:CycleCountApprovalLineDto[]):CycleCountApproval[]{
        const groups=new Map<number,CycleCountApprovalLine[]>()

        for(const r of rows){
            const id=r.cycle_count_id??0
            const line:CycleCountApprovalLine={
                adjustmentId:r.adjustment_id,
                itemId:r.item_id,
                binId:r.bin_id,
                warehouseId:r.warehouse_id,
                quantityChange:r.quantity_change,
                expectedQuantity:r.expected_quantity,
                countedQuantity:r.counted_quantity,
                reasonCode:r.reason_code,
                reasonDetail:r.reason_detail,
                status:r.status as CycleCountApprovalLine['status'],
                adjustedBy:r.adjusted_by,
                adjustedAt:r.adjusted_at,
                cycleCountId:r.cycle_count_id,
                sku:r.sku
                ,itemName:r.item_name,
                binCode:r.bin_code,
                decision:'approve'
            }
            const bucket=groups.get(id)??[];bucket.push(line)
            groups.set(id,bucket)
        }
        return [...groups.entries()].map(([cycleCountId,adjustments])=>({
            cycleCountId,
            binId:adjustments[0]?.binId??0,
            binCode:adjustments[0]?.binCode??'—',
            warehouseId:adjustments[0]?.warehouseId??0,
            adjustments
        }))
    }
}