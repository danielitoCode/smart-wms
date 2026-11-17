export type ShippingSalesOrderDto = {
	so_id: number;
	so_number: string;
	so_barcode?: string | null;
	customer_name?: string | null;
	status: string;
	ship_method?: string | null;
	ship_address?: string | null;
	warehouse_id: number;
	memo?: string | null;
};

export type ShippingLineDto = {
	so_line_id: number;
	line_number: number;
	item_id: number;
	sku: string;
	item_name: string;
	quantity_ordered: number;
	quantity_picked: number;
};

export type ShippingOrderResponseDto = {
	sales_order: ShippingSalesOrderDto;
	lines: ShippingLineDto[];
	total_items: number;
	total_lines: number;
};

export type FulfillResponseDto = {
	message: string;
	fulfillment_id: number;
	so_number: string;
	tracking_number: string;
	carrier: string;
	ship_method?: string | null;
	lines_shipped: number;
	total_quantity: number;
};
