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

export type CancelResponseDto = { message: string; reversed: number };

export type ReceivingBinDto = {
	bin_id: number;
	bin_code: string;
	bin_type: string | null;
	is_active: boolean;
};

export type ReceivingBinsResponseDto = { bins: ReceivingBinDto[] };

export type ReceiptHistoryItemDto = {
	receipt_id: number;
	po_line_id: number;
	line_number: number | null;
	item_id: number;
	sku: string;
	item_name: string;
	quantity_received: number;
	bin_id: number;
	bin_code: string;
	warehouse_id: number;
	received_by: string | null;
	received_at: string | null;
	lot_number: string | null;
	serial_number: string | null;
	notes: string | null;
	external_id: string;
};

export type ReceiptsResponseDto = { po_id: number; receipts: ReceiptHistoryItemDto[] };
export type BinDecrementDto = { bin_id: number; quantity: number };
export type UnreceiveResponseDto = {
	message: string;
	receipt_id: number;
	po_id: number;
	po_status: string;
	quantity_reversed: number;
	bin_decrements: BinDecrementDto[];
};
