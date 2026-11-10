export type PackingSalesOrderDto = {
	so_id: number;
	so_number: string;
	status: string;
};

export type PackingLineDto = {
	sku: string;
	quantity_picked: number;
	quantity_packed: number;
	pack_verified: boolean;
};

export type PackingOrderResponseDto = {
	sales_order: PackingSalesOrderDto;
	lines: PackingLineDto[];
	calculated_weight_lbs?: number;
	total_items?: number;
	items_verified?: number;
};

export type MessageDto = { message: string };
