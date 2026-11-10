/**
 * Inventory adjustment domain entity.
 *
 * Represents a stock correction recorded against one item, bin and warehouse.
 * Cycle-count variances and direct operator adjustments share this entity.
 * Quantity changes are signed: positive adds stock; negative removes stock.
 */

export type InventoryAdjustmentStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type InventoryAdjustmentReason =
	| 'CYCLE_COUNT'
	| 'DAMAGE'
	| 'FOUND'
	| 'LOST'
	| 'CORRECTION'
	| 'SHORT'
	| string;

export type InventoryAdjustmentType = 'ADD' | 'REMOVE';

export type InventoryAdjustment = {
	adjustmentId: number;
	itemId: number;
	binId: number;
	warehouseId: number;
	quantityChange: number;
	reasonCode: InventoryAdjustmentReason;
	reasonDetail: string | null;
	status: InventoryAdjustmentStatus;
	adjustedBy: string;
	adjustedAt: string | null;
	cycleCountId: number | null;

	/** Optional read-model enrichment; not required to identify the adjustment. */
	sku?: string | null;
	itemName?: string | null;
	binCode?: string | null;
	expectedQuantity?: number | null;
	countedQuantity?: number | null;
};

export type CreateInventoryAdjustment = {
	itemId: number;
	binId: number;
	warehouseId: number;
	type: InventoryAdjustmentType;
	quantity: number;
	reason: string;
};

export type InventoryAdjustmentDecision = {
	adjustmentId: number;
	action: 'approve' | 'reject';
};
