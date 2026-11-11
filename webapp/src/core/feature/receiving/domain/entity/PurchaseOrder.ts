/**
 * Receiving workflow projection returned by GET /receiving/po/<barcode>.
 *
 * The projection intentionally contains only fields emitted by that
 * endpoint. Canonical purchasing details and administrative fields belong
 * to the purchase-orders feature.
 */
export type PurchaseOrderStatus = 'OPEN' | 'PARTIAL' | 'RECEIVED';
export type PoLineStatus = 'PENDING' | 'PARTIAL' | 'RECEIVED';

export type PurchaseOrder = {
	poId: number;
	poNumber: string;
	vendorName: string | null;
	status: PurchaseOrderStatus;
	warehouseId: number;
	poBarcode: string | null;
	expectedDate: string | null;
	notes: string | null;
	createdAt: string | null;
};

export type PurchaseOrderLine = {
	poLineId: number;
	lineNumber: number;
	itemId: number;
	sku: string;
	itemName: string;
	upc: string | null;
	mpn: string | null;
	quantityOrdered: number;
	quantityReceived: number;
	quantityRemaining: number;
	status: PoLineStatus;
};

export type PurchaseOrderDetail = {
	purchaseOrder: PurchaseOrder;
	lines: PurchaseOrderLine[];
};

export type ReceiveLineInput = {
	itemId: number;
	quantity: number;
	binId: number;
	lotNumber?: string | null;
	serialNumber?: string | null;
	notes?: string | null;
};

export type ReceiveResult = {
	message: string;
	receiptIds: number[];
	poStatus: PurchaseOrderStatus;
	warnings: string[];
};

export type CancelReceiptsResult = {
	message: string;
	reversed: number;
};
