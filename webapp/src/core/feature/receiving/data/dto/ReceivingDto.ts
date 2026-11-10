export type PurchaseOrderDto = {
	po_id: number;
	po_number: string;
	vendor_name: string;
	status: string;
	warehouse_id: number;
};

export type PurchaseOrderLineDto = {
	po_line_id: number;
	item_id: number;
	sku: string;
	item_name: string;
	upc?: string | null;
	quantity_ordered: number;
	quantity_received: number;
	quantity_remaining: number;
	status: string;
};

export type PurchaseOrderLookupDto = {
	purchase_order: PurchaseOrderDto;
	lines: PurchaseOrderLineDto[];
};

export type ReceiveResponseDto = {
	message: string;
	receipt_ids: number[];
	po_status: string;
	warnings?: string[];
};

export type CancelResponseDto = {
	message: string;
	reversed: number;
};
