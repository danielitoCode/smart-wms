/**
 * Backorder projection over a child Sales Order.
 * Backorders share the sales_orders aggregate (order_type='backorder') and
 * are surfaced in waiting-stock / ready-to-ship queues.
 */

export type BackorderStatus = 'WAITING_STOCK' | 'OPEN' | 'PICKED' | 'PACKED' | 'SHIPPED' | 'CANCELLED' | (string & {});

export type BackorderInboundPurchaseOrder = {
	purchaseOrderId?: number;
	purchaseOrderNumber: string;
	expectedDate: string | null;
	quantityRemaining: number;
};

export type BackorderItem = {
	itemId: number;
	sku: string;
	itemName: string;
	quantity: number;
	openPurchaseOrder: BackorderInboundPurchaseOrder | null;
};

export type Backorder = {
	salesOrderId: number;
	salesOrderNumber: string;
	parentSalesOrderId: number;
	parentSalesOrderNumber: string;
	warehouseId: number;
	customerName: string | null;
	status: BackorderStatus;
	openedAt: string | null;
	fulfillableSince: string | null;
	daysWaiting: number;
	cancellationReason?: string | null;
	items: BackorderItem[];
};

export type BackorderQueueTab = 'waiting' | 'ready-to-ship';

export type CancelBackorderInput = {
	backorderSalesOrderId: number;
	reason: string;
};
