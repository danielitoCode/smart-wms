/**
 * Transfer Order aggregate.
 *
 * A transfer order coordinates replenishment between two different
 * warehouses. Picking reserves/collects goods at the source; submitting
 * creates an immutable approval snapshot. Inventory moves from source to
 * destination only when that snapshot is approved.
 */

export type TransferOrderStatus =
	| 'OPEN'
	| 'PARTIALLY_PICKED'
	| 'AWAITING_APPROVAL'
	| 'APPROVED'
	| 'CLOSED'
	| 'CANCELLED';

export type TransferOrderLineStatus =
	| 'PENDING'
	| 'PARTIALLY_PICKED'
	| 'PICKED'
	| 'APPROVED'
	| 'SHORT_CLOSED';

export type TransferOrderApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type TransferOrderLine = {
	toLineId: number;
	transferOrderId: number;
	itemId: number;
	lineNumber: number;
	requestedQuantity: number;
	committedQuantity: number;
	pickedQuantity: number;
	approvedQuantity: number;
	status: TransferOrderLineStatus;

	/** Optional item description; not part of line identity. */
	sku?: string | null;
	itemName?: string | null;
};

export type TransferOrder = {
	transferOrderId: number;
	transferOrderNumber: string;
	sourceWarehouseId: number;
	destinationWarehouseId: number;
	status: TransferOrderStatus;
	createdBy: string;
	externalId: string;
	createdAt: string | null;
	updatedAt: string | null;
	notes: string | null;
	lines: TransferOrderLine[];
};

export type TransferOrderApprovalLineSnapshot = {
	transferOrderLineId: number;
	itemId: number;
	pickedQuantityInSnapshot: number;
};

export type TransferOrderApproval = {
	approvalId: number;
	transferOrderId: number;
	submittedBy: string;
	submittedAt: string | null;
	approvedBy: string | null;
	approvedAt: string | null;
	rejectedAt: string | null;
	rejectionReason: string | null;
	status: TransferOrderApprovalStatus;
	externalId: string;
	linesSnapshot: TransferOrderApprovalLineSnapshot[];
};

export type CreateTransferOrderLine = {
	itemId: number;
	requestedQuantity: number;
};

export type CreateTransferOrder = {
	sourceWarehouseId: number;
	destinationWarehouseId: number;
	lines: CreateTransferOrderLine[];
	notes?: string | null;
};

export type UpdateTransferOrder = {
	notes?: string | null;
};

export type SubmitTransferOrderPicks = {
	transferOrderId: number;
};

export type DecideTransferOrderApproval = {
	transferOrderId: number;
	approvalId: number;
	action: 'APPROVE' | 'REJECT';
	rejectionReason?: string | null;
};
