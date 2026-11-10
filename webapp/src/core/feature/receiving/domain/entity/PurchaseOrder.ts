/**
 * Receiving workflow projection of a purchase order.
 *
 * The canonical purchasing aggregate lives in the purchase-orders feature.
 * These types preserve the barcode-receiving use case and its operational
 * line-progress information.
 */

export type PurchaseOrderStatus = 'OPEN' | 'PARTIAL' | 'RECEIVED' | 'CLOSED' | 'ARCHIVED' | string;
export type PoLineStatus = 'PENDING' | 'PARTIAL' | 'RECEIVED' | 'COMPLETE' | string;

export type PurchaseOrder = {
	poId: number;
	poNumber: string;
	vendorName: string;
	status: PurchaseOrderStatus;
	warehouseId: number;
	poBarcode?: string | null;
	vendorId?: string | null;
	expectedDate?: string | null;
	notes?: string | null;
	createdAt?: string | null;
	receivedAt?: string | null;
	createdBy?: string | null;
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
	lineNumber?: number;
	unitCost?: number | null;
	mpn?: string | null;
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
