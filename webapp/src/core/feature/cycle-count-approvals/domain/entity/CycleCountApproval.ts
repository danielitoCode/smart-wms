/**
 * Cycle-count approval domain entity.
 *
 * A submitted count can create several pending inventory adjustments.
 * The approval work item groups those adjustments by cycle count/bin while
 * each adjustment retains its own reviewer decision.
 */

import type { InventoryAdjustment } from '../../../inventory-adjustments/domain/entity/InventoryAdjustment';

export type CycleCountApprovalLine = Omit<
	InventoryAdjustment,
	'sku' | 'itemName' | 'binCode' | 'expectedQuantity' | 'countedQuantity'
> & {
	sku: string | null;
	itemName: string | null;
	binCode: string;
	expectedQuantity: number | null;
	countedQuantity: number | null;
	decision: 'approve' | 'reject' | null;
};

export type CycleCountApproval = {
	cycleCountId: number;
	binId: number;
	binCode: string;
	warehouseId: number;
	adjustments: CycleCountApprovalLine[];
};

export type ReviewCycleCountApproval = {
	cycleCountId: number;
	decisions: Array<{
		adjustmentId: number;
		action: 'approve' | 'reject';
	}>;
};
