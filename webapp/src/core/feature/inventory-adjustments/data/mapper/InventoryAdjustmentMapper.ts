import type {
	InventoryAdjustment,
	CreateInventoryAdjustment,
	InventoryAdjustmentDecision
} from '../../domain/entity/InventoryAdjustment';
import type { InventoryAdjustmentDto } from '../dto/InventoryAdjustmentDto';

export const InventoryAdjustmentMapper = {
	toDomain(dto: InventoryAdjustmentDto): InventoryAdjustment {
		return {
			adjustmentId: dto.adjustment_id,
			itemId: dto.item_id,
			binId: dto.bin_id,
			warehouseId: dto.warehouse_id,
			type: dto.quantity_change >= 0 ? 'ADD' : 'REMOVE',
			quantityChange: dto.quantity_change,
			reasonCode: dto.reason_code,
			reasonDetail: dto.reason_detail,
			status: dto.status,
			adjustedBy: dto.username ?? dto.adjusted_by,
			adjustedAt: dto.adjusted_at,
			cycleCountId: dto.cycle_count_id,
			sku: dto.sku,
			itemName: dto.item_name,
			binCode: dto.bin_code,
			expectedQuantity: dto.expected_quantity,
			countedQuantity: dto.counted_quantity
		};
	},

	createDto(input: CreateInventoryAdjustment) {
		return {
			item_id: input.itemId,
			bin_id: input.binId,
			warehouse_id: input.warehouseId,
			adjustment_type: input.type,
			quantity: input.quantity,
			reason: input.reason
		};
	},

	reviewDto(decisions: InventoryAdjustmentDecision[]) {
		return {
			decisions: decisions.map((decision) => ({
				adjustment_id: decision.adjustmentId,
				action: decision.action
			}))
		};
	}
};
