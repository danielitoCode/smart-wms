/**
 * Purchase-order domain aggregate.
 *
 * The admin API creates and edits POs using vendor_name, not vendor_id.
 * vendorId is retained only as optional legacy/import metadata because the
 * persisted schema may contain linkage for inbound records; it is not part
 * of CreatePurchaseOrder or UpdatePurchaseOrder API contracts.
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

	/** Joined item details; descriptive fields returned by PO detail endpoint. */
	sku?: string | null;
	itemName?: string | null;
	upc?: string | null;
	mpn?: string | null;
};

export type PurchaseOrder = {
	poId: number;
	poNumber: string;
	poBarcode: string | null;
	vendorId?: string | null;
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

/** Mirrors CreatePurchaseOrderRequest; vendor_id is deliberately unsupported. */
export type CreatePurchaseOrder = {
	poNumber: string;
	warehouseId: number;
	lines: CreatePurchaseOrderLine[];
	poBarcode?: string | null;
	vendorName?: string | null;
	expectedDate?: string | null;
	notes?: string | null;
};

/** Mirrors UpdatePurchaseOrderRequest, including the backend PO lifecycle. */
export type UpdatePurchaseOrder = Partial<
	Pick<PurchaseOrder, 'poNumber' | 'poBarcode' | 'vendorName' | 'expectedDate' | 'notes' | 'status'>
>;

export type UpdatePurchaseOrderLine = {
	quantityOrdered: number;
};
