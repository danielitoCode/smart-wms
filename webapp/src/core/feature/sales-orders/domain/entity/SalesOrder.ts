/**
 * Canonical Sales Order aggregate.
 * Returns, refunds, backorders, replacements and exchanges are typed child
 * orders in the same sales_orders aggregate; they are not separate persisted
 * aggregates.
 */

export type SalesOrderStatus =
	| 'OPEN'
	| 'FRAUD_REVIEW'
	| 'WAITING_STOCK'
	| 'PICKED'
	| 'PACKED'
	| 'SHIPPED'
	| 'REFUNDED'
	| 'CANCELLED'
	| 'PARTIALLY_RECEIVED'
	| 'RECEIVED'
	| 'CLOSED'
	| (string & {});

export type SalesOrderType =
	| 'sale'
	| 'refund'
	| 'backorder'
	| 'replacement'
	| 'exchange'
	| 'return'
	| (string & {});

export type SalesOrderAddress = {
	name?: string | null;
	line1?: string | null;
	line2?: string | null;
	city?: string | null;
	state?: string | null;
	postalCode?: string | null;
	country?: string | null;
	phone?: string | null;
};

export type SalesOrderLineStatus = 'PENDING' | 'PICKED' | 'PACKED' | 'SHIPPED' | (string & {});

export type SalesOrderLine = {
	soLineId: number;
	salesOrderId: number;
	itemId: number;
	lineNumber: number;
	quantityOrdered: number;
	quantityAllocated: number;
	quantityPicked: number;
	quantityPacked: number;
	quantityShipped: number;
	/** Return-SO receipt progress; zero for ordinary sales lines. */
	quantityReceived: number;
	status: SalesOrderLineStatus;
	/** Source line for return, replacement or exchange child orders. */
	originalSalesOrderLineId?: number | null;
	sku?: string | null;
	itemName?: string | null;
};

export type SalesOrder = {
	salesOrderId: number;
	salesOrderNumber: string;
	barcode: string | null;
	externalId: string;
	warehouseId: number;
	customerId?: string | null;
	customerName: string | null;
	customerPhone: string | null;
	customerEmail: string | null;
	billingAddress: SalesOrderAddress;
	shippingAddress: SalesOrderAddress;
	shipMethod: string | null;
	shipByDate: string | null;
	priority?: number;
	status: SalesOrderStatus;
	orderType: SalesOrderType;
	parentSalesOrderId?: number | null;
	orderOrigin?: string | null;
	orderSource?: string | null;
	memo: string | null;
	/** Signed monetary total stored on sales_orders (POS refunds are negative). */
	orderTotal?: number | null;
	externalTxnRef?: string | null;
	/** Original sale refund audit/linkage fields. */
	refundedAt?: string | null;
	refundSalesOrderId?: number | null;
	/** RMA soft-void fields; NULL voidedAt means the RMA is active. */
	voidedAt?: string | null;
	voidedBy?: string | null;
	createdAt?: string | null;
	updatedAt?: string | null;
	shippedAt?: string | null;
	carrier?: string | null;
	trackingNumber?: string | null;
	lines: SalesOrderLine[];
};

export type CreateSalesOrderLine = {
	itemId: number;
	quantityOrdered: number;
	lineNumber?: number;
};

export type CreateSalesOrder = {
	salesOrderNumber: string;
	warehouseId: number;
	lines: CreateSalesOrderLine[];
	barcode?: string | null;
	customerId?: string | null;
	customerName?: string | null;
	customerPhone?: string | null;
	customerEmail?: string | null;
	shipMethod?: string | null;
	shipByDate?: string | null;
	memo?: string | null;
	orderOrigin?: string | null;
	billingAddress?: SalesOrderAddress;
	shippingAddress?: SalesOrderAddress;
};

export type UpdateSalesOrder = Partial<Omit<CreateSalesOrder, 'lines'>> & {
	priority?: number;
	status?: SalesOrderStatus;
	carrier?: string | null;
	trackingNumber?: string | null;
	shippedAt?: string | null;
};

export type AddSalesOrderLine = CreateSalesOrderLine;
export type UpdateSalesOrderLine = {
	quantityOrdered: number;
};

export type CancelSalesOrder = {
	salesOrderId: number;
	reason?: 'found' | 'customer_asked' | 'refunded' | 'parent_cancelled' | 'other' | null;
};
