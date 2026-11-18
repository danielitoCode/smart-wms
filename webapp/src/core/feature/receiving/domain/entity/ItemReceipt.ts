/**
 * Receiving record for either a purchase-order receipt or an RMA receipt.
 * Exactly one source pair is populated: (poId, poLineId) for PO receiving,
 * or (salesOrderId, salesOrderLineId) for goods returned against an RMA.
 */
export type ItemReceipt = {
	receiptId: number;
	externalId: string;
	poId: number | null;
	poLineId: number | null;
	salesOrderId: number | null;
	salesOrderLineId: number | null;
	itemId: number;
	quantityReceived: number;
	binId: number;
	warehouseId: number;
	lotNumber: string | null;
	serialNumber: string | null;
	receivedBy: string;
	receivedAt: string | null;
	notes: string | null;
};

export type ReceiveItemInput = {
	itemId: number;
	quantity: number;
	binId: number;
	lotNumber?: string | null;
	serialNumber?: string | null;
	notes?: string | null;
};

export type ReceivePurchaseOrderInput = {
	poId: number;
	items: ReceiveItemInput[];
};

export type ReceivePurchaseOrderResult = {
	message: string;
	receiptIds: number[];
	poStatus: 'OPEN' | 'PARTIAL' | 'RECEIVED' | string;
	warnings: string[];
};

export type CancelReceivingInput = {
	poId: number;
	receiptIds: number[];
	warehouseId?: number;
};

export type CancelReceivingResult = {
	message: string;
	reversed: number;
};

export type ReceivingLineProgress = {
	poLineId: number;
	itemId: number;
	quantityOrdered: number;
	quantityReceived: number;
	quantityRemaining: number;
	status: 'PENDING' | 'PARTIAL' | 'RECEIVED';
};
