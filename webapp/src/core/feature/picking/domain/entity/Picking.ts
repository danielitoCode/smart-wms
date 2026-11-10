/**
 * Picking domain — active batch, next task, confirm / short / complete, wave.
 * Contracts under /api/picking/* (api-reference.md + test_wave_picking.py)
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

export type WaveValidateResult = {
	message: string;
	soId?: number;
	soNumber?: string;
};

export type WaveCreateResult = {
	batchId: number;
	batchStatus: string;
	totalOrders: number;
	totalPicks: number;
};
