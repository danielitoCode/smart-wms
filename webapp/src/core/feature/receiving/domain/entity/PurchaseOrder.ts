/**
 * Receiving domain — purchase order lookup and receipt operations.
 * Contracts: GET /api/receiving/po/{barcode}, POST /api/receiving/receive, POST /api/receiving/cancel
 */

export type PurchaseOrderStatus = 'OPEN' | 'PARTIAL' | 'CLOSED' | string;
export type PoLineStatus = 'PENDING' | 'PARTIAL' | 'COMPLETE' | string;

export type PurchaseOrder = {
	poId: number;
	poNumber: string;
	vendorName: string;
	status: PurchaseOrderStatus;
	warehouseId: number;
};

export type PurchaseOrderLine = {
	poLineId: number;
	itemId: number;
	sku: string;
	itemName: string;
	upc: string | null;
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
