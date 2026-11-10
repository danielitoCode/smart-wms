/**
 * Picking domain — batches, sales-order / transfer-order tasks, scans and
 * operational results. These are domain contracts, not UI view models.
 */

export type PickBatchStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | (string & {});
export type PickTaskStatus = 'PENDING' | 'PICKED' | 'SHORT' | 'RELEASED' | (string & {});

export type ActiveBatch = {
	active: boolean;
	batchId: number | null;
	totalPicks: number;
	completedPicks: number;
	totalOrders: number;
	createdAt: string | null;
	kind?: 'SO' | 'TO' | null;
	transferOrderId?: number | null;
	transferOrderNumber?: string | null;
};

export type PickTask = {
	pickTaskId: number;
	batchId: number;
	itemId: number;
	sku: string;
	itemName: string;
	upc: string | null;
	quantityToPick: number;
	binId: number | null;
	binCode: string | null;
	status: PickTaskStatus;
	pickSequence?: number;
	quantityPicked?: number;
	salesOrderId?: number | null;
	salesOrderLineId?: number | null;
	transferOrderId?: number | null;
	transferOrderLineId?: number | null;
};

export type ConfirmPickInput = {
	pickTaskId: number;
	scannedBarcode: string;
	quantityPicked: number;
};

export type ShortPickInput = {
	pickTaskId: number;
	quantityAvailable: number;
};

export type CompleteBatchInput = {
	batchId: number;
};

export type CancelBatchInput = {
	batchId: number;
	reason?: string | null;
};

export type SimpleMessageResult = {
	message: string;
};

export type WaveValidateResult = {
	valid: boolean;
	soNumber?: string;
	soId?: number;
	lineCount?: number;
	totalUnits?: number;
	error?: string;
	batchId?: number;
	message?: string;
};

export type WaveCreateResult = {
	batchId: number;
	batchStatus: string;
	totalOrders: number;
	totalPicks: number;
};

export type CreateBatchResult = {
	batchId: number;
	batchNumber: string;
	totalOrders: number;
	totalItems: number;
	tasks: Array<{
		pickTaskId?: number;
		sku?: string;
		pickSequence?: number;
	}>;
	orders: Array<{
		soId?: number;
		soNumber?: string;
		toteNumber?: string;
	}>;
};
