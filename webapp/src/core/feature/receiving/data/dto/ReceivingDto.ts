/**
 * Wire contracts for the receiving endpoints.
 *
 * These DTOs intentionally model the receiving API response, not the
 * canonical purchase-orders aggregate. Keep this projection limited to
 * fields returned by GET /api/receiving/po/{barcode}.
 */

export type ReceivingPurchaseOrderStatusDto = 'OPEN' | 'PARTIAL' | 'RECEIVED';
export type ReceivingPoLineStatusDto = 'PENDING' | 'PARTIAL' | 'RECEIVED';
export type ReceivingSubmitPoStatusDto = 'PARTIAL' | 'RECEIVED';

export type PurchaseOrderDto = {
	po_id: number;
	po_number: string;
	po_barcode: string | null;
	vendor_name: string | null;
	status: ReceivingPurchaseOrderStatusDto;
	warehouse_id: number;
	expected_date: string | null;
	notes: string | null;
	created_at: string | null;
};

export type PurchaseOrderLineDto = {
	po_line_id: number;
	line_number: number;
	item_id: number;
	sku: string;
	item_name: string;
	upc: string | null;
	mpn: string | null;
	quantity_ordered: number;
	quantity_received: number;
	quantity_remaining: number;
	status: ReceivingPoLineStatusDto;
};

export type PurchaseOrderLookupDto = {
	purchase_order: PurchaseOrderDto;
	lines: PurchaseOrderLineDto[];
};

export type ReceiveResponseDto = {
	message: string;
	receipt_ids: number[];
	po_status: ReceivingSubmitPoStatusDto;
	warnings: string[];
};

export type CancelResponseDto = {
	message: string;
	reversed: number;
};
