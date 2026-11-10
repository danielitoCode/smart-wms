/**
 * Packing domain — load PICKED SO, verify scans, complete pack.
 * Source contracts: GET /api/packing/order/{barcode},
 * POST /api/packing/verify, POST /api/packing/complete
 * (api-reference.md + api/tests/test_packing.py)
 */

export type PackingSalesOrder = {
	soId: number;
	soNumber: string;
	status: string;
};

export type PackingLine = {
	sku: string;
	quantityPicked: number;
	quantityPacked: number;
	packVerified: boolean;
};

export type PackingOrderDetail = {
	salesOrder: PackingSalesOrder;
	lines: PackingLine[];
	calculatedWeightLbs: number;
	totalItems: number;
	itemsVerified: number;
};

export type VerifyPackInput = {
	soId: number;
	scannedBarcode: string;
	quantity?: number;
};

export type SimpleMessageResult = {
	message: string;
};
