/**
 * Cycle-count approval domain entity.
 *
 * Approval is performed over the inventory adjustments produced by a submitted
 * cycle count. A count can contain several adjustment lines, each decided
 * independently; the approval work item groups those lines by count/bin.
 */

import type { InventoryAdjustment, InventoryAdjustmentDecision } from '../../../inventory-adjustments/domain/entity/InventoryAdjustment';

export type CycleCountApprovalStatus = 'PENDING' | 'REVIEWED';

export type CycleCountApprovalLine = InventoryAdjustment & {
	/** Decision selected by the reviewer; null until a decision is selected. */
	decision: InventoryAdjustmentDecision['action'] | null;
};

export type CycleCountApproval = {
	cycleCountId: number;
	binId: number;
	binCode: string;
	warehouseId: number;
	status: CycleCountApprovalStatus;
	lines: CycleCountApprovalLine[];
};

export type ReviewCycleCountApproval = {
	cycleCountId: number;
	decisions: InventoryAdjustmentDecision[];
};
