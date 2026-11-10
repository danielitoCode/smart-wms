/**
 * Shipping domain — load order for ship, fulfill with tracking.
 * Source: GET /api/shipping/order/{barcode}, POST /api/shipping/fulfill
 * (api-reference.md + api/tests/test_shipping.py)
 */

export type ShippingSalesOrder = {
	soId: number;
	soNumber: string;
	status: string;
};

export type ShippingLine = {
	sku: string;
	quantity: number;
	itemName?: string;
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
	linesShipped: number;
	totalQuantity: number;
};
