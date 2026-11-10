/**
 * Picking domain — active batch, next task, confirm / short / complete,
 * wave-validate, wave-create, create-batch.
 * Contracts under /api/picking/* (api-reference + tests).
 */

export type ActiveBatch = {
	active: boolean;
	batchId: number | null;
	totalPicks: number;
	completedPicks: number;
	totalOrders: number;
	createdAt: string | null;
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
	status: string;
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

export type SimpleMessageResult = {
	message: string;
};

/** POST /api/picking/wave-validate response (200 / 4xx body). */
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

/** POST /api/picking/create-batch response (test_picking.py). */
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
