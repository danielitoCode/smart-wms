/**
 * Completed inter-warehouse inventory movement.
 *
 * The current backend records the physical cross-warehouse movement when a
 * Transfer Order approval is approved. The movement identity therefore maps
 * to the approval aggregate (to_approval_id / external_id); it is not a
 * separate persisted transfer header. This entity is the domain projection
 * of that completed movement/event.
 */

export type InterWarehouseTransferStatus = 'COMPLETED';

export type InterWarehouseTransferLine = {
	itemId: number;
	quantity: number;
	itemExternalId: string;

	/** Optional descriptive snapshot for domain consumers. */
	sku?: string | null;
	itemName?: string | null;
};

export type InterWarehouseTransfer = {
	transferId: number;
	externalId: string;
	transferOrderId: number;
	approvalId: number;
	sourceWarehouseId: number;
	destinationWarehouseId: number;
	status: InterWarehouseTransferStatus;
	lines: InterWarehouseTransferLine[];
	transferredBy: string;
	transferredAt: string | null;
};

export type RecordInterWarehouseTransfer = {
	transferOrderId: number;
	approvalId: number;
	lines: Array<{
		itemId: number;
		itemExternalId: string;
		quantity: number;
	}>;
};
