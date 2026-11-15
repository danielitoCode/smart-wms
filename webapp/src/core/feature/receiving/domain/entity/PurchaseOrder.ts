export type PurchaseOrderStatus = 'OPEN' | 'PARTIAL' | 'RECEIVED';
export type PoLineStatus = 'PENDING' | 'PARTIAL' | 'RECEIVED';
export type ReceivePurchaseOrderStatus = 'PARTIAL' | 'RECEIVED';

export type PurchaseOrder = {
	poId: number;
	poNumber: string;
	poBarcode: string | null;
	vendorName: string | null;
	status: PurchaseOrderStatus;
	warehouseId: number;
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
	poStatus: ReceivePurchaseOrderStatus;
	warnings: string[];
};

export type CancelReceiptsResult = {
	message: string;
	reversed: number;
};

export type ReceivingBin = {
	binId: number;
	binCode: string;
	binType: string | null;
	isActive: boolean;
};

export type ReceiptHistoryItem = {
	receiptId: number;
	poLineId: number;
	lineNumber: number | null;
	itemId: number;
	sku: string;
	itemName: string;
	quantityReceived: number;
	binId: number;
	binCode: string;
	warehouseId: number;
	receivedBy: string | null;
	receivedAt: string | null;
	lotNumber: string | null;
	serialNumber: string | null;
	notes: string | null;
	externalId: string;
};

export type BinDecrement = { binId: number; quantity: number };

export type UnreceiveResult = {
	message: string;
	receiptId: number;
	poId: number;
	poStatus: string;
	quantityReversed: number;
	binDecrements: BinDecrement[];
};
