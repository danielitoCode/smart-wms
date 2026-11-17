export type PackingSalesOrderDto = {
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

export type PackingLineDto = {
	so_line_id: number;
	line_number: number;
	item_id: number;
	sku: string;
	item_name: string;
	upc?: string | null;
	weight_lbs: number;
	quantity_ordered: number;
	quantity_picked: number;
	quantity_packed: number;
	pack_verified: boolean;
};

export type PackingOrderResponseDto = {
	sales_order: PackingSalesOrderDto;
	lines: PackingLineDto[];
	calculated_weight_lbs: number;
	total_items: number;
	items_verified: number;
};

export type MessageDto = { message: string };
