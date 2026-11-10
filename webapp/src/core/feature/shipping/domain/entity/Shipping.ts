/**
 * Shipping domain — validate shipment readiness, load order details and
 * record fulfillment with carrier/tracking metadata.
 */

export type ShippingSalesOrder = {
	soId: number;
	soNumber: string;
	soBarcode?: string | null;
	customerName?: string | null;
	status: string;
	shipMethod?: string | null;
	shipAddress?: string | null;
	warehouseId?: number;
	memo?: string | null;
};

export type ShippingLine = {
	soLineId?: number;
	lineNumber?: number;
	itemId?: number;
	sku: string;
	quantity: number;
	itemName?: string;
	quantityOrdered?: number;
	quantityPicked?: number;
	quantityPacked?: number;
};

export type ShippingOrderDetail = {
	salesOrder: ShippingSalesOrder;
	lines: ShippingLine[];
	totalItems: number;
	totalLines: number;
};

export type FulfillShipmentInput = {
	soId: number;
	trackingNumber: string;
	carrier: string;
	shipMethod?: string | null;
};

export type FulfillShipmentResult = {
	message: string;
	fulfillmentId: number;
	soNumber: string;
	trackingNumber: string;
	carrier: string;
	shipMethod?: string | null;
	linesShipped: number;
	totalQuantity: number;
};

export type ShipmentStatus = 'PENDING' | 'FULFILLED' | 'CANCELLED' | (string & {});

export type Shipment = {
	fulfillmentId: number;
	salesOrderId: number;
	warehouseId: number;
	carrier: string;
	trackingNumber: string;
	shipMethod: string | null;
	status: ShipmentStatus;
	shippedAt: string | null;
	shippedBy?: string | null;
	linesShipped: number;
	totalQuantity: number;
};
