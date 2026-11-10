export type ShippingSalesOrderDto = {
	so_id: number;
	so_number: string;
	status: string;
};

export type ShippingLineDto = {
	sku: string;
	quantity?: number;
	qty?: number;
	item_name?: string;
	quantity_ordered?: number;
};

export type ShippingOrderResponseDto = {
	sales_order: ShippingSalesOrderDto;
	lines?: ShippingLineDto[];
	total_items?: number;
	total_lines?: number;
};

export type FulfillResponseDto = {
	message: string;
	fulfillment_id: number;
	so_number: string;
	tracking_number: string;
	carrier: string;
	lines_shipped?: number;
	total_quantity?: number;
};
