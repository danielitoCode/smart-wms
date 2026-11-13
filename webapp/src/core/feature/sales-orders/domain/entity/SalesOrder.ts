/**
 * Sales order (SO) from SentryWMS admin surface.
 * Contracts: GET/POST/PUT /api/admin/sales-orders, POST .../cancel
 */
export type SalesOrderStatus =
	| 'OPEN'
	| 'ALLOCATED'
	| 'PICKED'
	| 'PACKED'
	| 'SHIPPED'
	| 'CANCELLED'
	| string;

export type SalesOrderLine = {
	lineId: number | null;
	lineNumber: number | null;
	itemId: number | null;
	sku: string;
	itemName: string;
	quantityOrdered: number;
	quantityAllocated: number;
	quantityPicked: number;
	quantityPacked: number;
	quantityShipped: number;
	quantityReceived: number;
};

export type SalesOrder = {
	id: number;
	soNumber: string;
	barcode: string | null;
	status: SalesOrderStatus;
	warehouseId: number | null;
	customerId: string | null;
	customerName: string;
	customerEmail: string | null;
	customerPhone: string | null;
	customerAddress: string | null;
	shipAddress: string | null;
	shipMethod: string | null;
	orderType: string | null;
	orderOrigin: string | null;
	parentSoId: number | null;
	parentSoNumber: string | null;
	memo: string | null;
	orderTotal: number | null;
	customerShippingPaid: number | null;
	lines: SalesOrderLine[];
	createdAt: string | null;
	pickedAt: string | null;
	shippedAt: string | null;
};

export type CreateSalesOrderLineInput = {
	itemId: number;
	quantityOrdered: number;
};

export type CreateSalesOrderInput = {
	soNumber: string;
	warehouseId: number;
	customerName?: string;
	customerEmail?: string;
	customerPhone?: string;
	customerAddress?: string;
	shipAddress?: string;
	shipMethod?: string;
	memo?: string;
	lines: CreateSalesOrderLineInput[];
};
