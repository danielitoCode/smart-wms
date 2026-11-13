export type SalesOrderLineDto = {
	line_id?: number | null;
	id?: number | null;
	line_number?: number | null;
	item_id?: number | null;
	sku?: string | null;
	item_name?: string | null;
	name?: string | null;
	quantity_ordered?: number | null;
	qty_ordered?: number | null;
	quantity_allocated?: number | null;
	quantity_picked?: number | null;
	quantity_packed?: number | null;
	quantity_shipped?: number | null;
	quantity_received?: number | null;
};

export type SalesOrderDto = {
	so_id?: number;
	id?: number;
	so_number?: string;
	so_barcode?: string | null;
	barcode?: string | null;
	status?: string;
	warehouse_id?: number | null;
	customer_id?: string | null;
	customer_name?: string | null;
	customer_email?: string | null;
	customer_phone?: string | null;
	customer_address?: string | null;
	ship_address?: string | null;
	ship_method?: string | null;
	order_type?: string | null;
	order_origin?: string | null;
	parent_so_id?: number | null;
	parent_so_number?: string | null;
	memo?: string | null;
	order_total?: number | null;
	customer_shipping_paid?: number | null;
	lines?: SalesOrderLineDto[];
	created_at?: string | null;
	picked_at?: string | null;
	shipped_at?: string | null;
};

export type SalesOrderListResponseDto = {
	sales_orders?: SalesOrderDto[];
	data?: SalesOrderDto[];
	results?: SalesOrderDto[];
};

export type SalesOrderDetailResponseDto = {
	sales_order?: SalesOrderDto;
} & SalesOrderDto;
