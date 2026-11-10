/**
 * Packing domain — load a picked sales order, verify item scans and complete
 * the package. Packing is a separate fulfillment stage before shipping.
 */

export type PackingSalesOrder = {
	soId: number;
	soNumber: string;
	soBarcode?: string | null;
	customerName?: string | null;
	status: string;
	shipMethod?: string | null;
	shipAddress?: string | null;
	warehouseId?: number;
	memo?: string | null;
};

export type PackingLine = {
	soLineId?: number;
	lineNumber?: number;
	itemId?: number;
	sku: string;
	itemName?: string;
	upc?: string | null;
	weightLbs?: number;
	quantityOrdered?: number;
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

export type CompletePackingInput = {
	soId: number;
};

export type PackingProgress = {
	totalLines: number;
	linesVerified: number;
	allVerified: boolean;
};

export type VerifyPackResult = {
	message: string;
	item: {
		sku: string;
		itemName: string;
		quantityVerified: number;
		lineComplete: boolean;
	};
	orderProgress: PackingProgress;
};

export type SimpleMessageResult = {
	message: string;
};
