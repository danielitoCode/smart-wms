/** Fields actually returned by GET /api/admin/sales-orders list. */
export type SalesOrderCustomerDto = {
	so_id?: number;
	so_number?: string | null;
	status?: string | null;
	order_date?: string | null;
	order_total?: string | null;
	customer_name?: string | null;
	customer_phone?: string | null;
	customer_address?: string | null;
	ship_address?: string | null;
	warehouse_id?: number | null;
	billing_address_line1?: string | null;
	billing_address_line2?: string | null;
	billing_address_city?: string | null;
	billing_address_state?: string | null;
	billing_address_postal_code?: string | null;
	shipping_address_line1?: string | null;
	shipping_address_line2?: string | null;
	shipping_address_city?: string | null;
	shipping_address_state?: string | null;
	shipping_address_postal_code?: string | null;
};

export type SalesOrderListForCustomersDto = {
	sales_orders?: SalesOrderCustomerDto[];
	total?: number;
	page?: number;
	per_page?: number;
	pages?: number;
};

export type SalesOrderDetailForCustomerDto = {
	sales_order?: {
		customer_name?: string | null;
		customer_email?: string | null;
		customer_phone?: string | null;
		customer_address?: string | null;
		warehouse_id?: number | null;
	};
};
