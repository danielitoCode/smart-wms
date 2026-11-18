/** Row from GET /api/admin/search when type === 'customer' */
export type SearchCustomerHitDto = {
	type?: string;
	label?: string;
	sublabel?: string;
	id?: string | number;
	customer_id?: string;
	customer_name?: string;
};

export type SearchResponseDto = {
	results?: SearchCustomerHitDto[];
};

/** Minimal SO fields used to project distinct customers */
export type SalesOrderCustomerDto = {
	customer_id?: string | null;
	customer_name?: string | null;
	customer_email?: string | null;
	customer_phone?: string | null;
	warehouse_id?: number | null;
};

export type SalesOrderListForCustomersDto = {
	sales_orders?: SalesOrderCustomerDto[];
	data?: SalesOrderCustomerDto[];
};
