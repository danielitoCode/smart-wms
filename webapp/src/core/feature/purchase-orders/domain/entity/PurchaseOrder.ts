/**
 * Purchase-order domain aggregate.
 *
 * A PO belongs to one warehouse and contains one or more item lines.
 * vendorId is nullable for legacy/imported POs; vendorName preserves the
 * supplier snapshot used by existing purchase-order records.
 */

export type PurchaseOrderStatus =
	| 'OPEN'
	| 'PARTIAL'
	| 'RECEIVED'
	| 'CLOSED'
	| 'ARCHIVED';

export type PurchaseOrderLineStatus = 'PENDING' | 'PARTIAL' | 'RECEIVED';

export type PurchaseOrderLine = {
	poLineId: number;
	lineNumber: number;
	itemId: number;
	quantityOrdered: number;
	quantityReceived: number;
	unitCost: number | null;
	status: PurchaseOrderLineStatus;

	/** Joined item details; these are descriptive, not line identity. */
	sku?: string | null;
	itemName?: string | null;
	upc?: string | null;
	mpn?: string | null;
};

export type PurchaseOrder = {
	poId: number;
	poNumber: string;
	poBarcode: string | null;
	vendorId: string | null;
	vendorName: string | null;
	status: PurchaseOrderStatus;
	expectedDate: string | null;
	warehouseId: number;
	notes: string | null;
	createdAt: string | null;
	receivedAt: string | null;
	createdBy: string | null;
	lines: PurchaseOrderLine[];
};

export type CreatePurchaseOrderLine = {
	itemId: number;
	quantityOrdered: number;
	unitCost?: number | null;
	lineNumber?: number;
};

export type CreatePurchaseOrder = {
	poNumber: string;
	warehouseId: number;
	lines: CreatePurchaseOrderLine[];
	poBarcode?: string | null;
	vendorId?: string | null;
	vendorName?: string | null;
	expectedDate?: string | null;
	notes?: string | null;
};

export type UpdatePurchaseOrder = Partial<
	Pick<PurchaseOrder, 'poNumber' | 'poBarcode' | 'vendorId' | 'vendorName' | 'expectedDate' | 'notes' | 'status'>
>;

export type UpdatePurchaseOrderLine = {
	quantityOrdered: number;
};
