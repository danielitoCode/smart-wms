/**
 * Completed inter-warehouse inventory movement.
 *
 * This entity represents the physical movement recorded between two distinct
 * warehouses. In the current business flow, a Transfer Order authorizes and
 * controls picking/approval; this entity represents the resulting movement
 * record and its item quantities, not a second approval workflow.
 */

export type InterWarehouseTransferStatus = 'COMPLETED' | 'CANCELLED';

export type InterWarehouseTransferLine = {
	transferLineId?: number;
	itemId: number;
	quantity: number;
	lotNumber?: string | null;

	/** Optional descriptive snapshot for domain consumers. */
	sku?: string | null;
	itemName?: string | null;
};

export type InterWarehouseTransfer = {
	transferId: number;
	externalId: string;
	transferOrderId?: number | null;
	transferOrderNumber?: string | null;
	sourceWarehouseId: number;
	destinationWarehouseId: number;
	status: InterWarehouseTransferStatus;
	lines: InterWarehouseTransferLine[];
	transferredBy: string;
	transferredAt: string | null;
	reason?: string | null;
	notes?: string | null;
};

export type RecordInterWarehouseTransfer = {
	transferOrderId: number;
	lines: Array<{
		transferOrderLineId: number;
		itemId: number;
		quantity: number;
	}>;
};
