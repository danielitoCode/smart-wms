export type CustomerAddress = {
	kind: 'customer' | 'billing' | 'shipping';
	lines: string[];
	city: string | null;
	state: string | null;
	postalCode: string | null;
	country: string | null;
	phone: string | null;
	warehouseId: number | null;
};

export type CustomerOrder = {
	id: number;
	number: string;
	status: string | null;
	orderDate: string | null;
	orderTotal: string | null;
	warehouseId: number | null;
};

export type Customer = {
	/** No canonical customer ID is exposed by the current admin APIs. */
	id: string;
	name: string;
	email: string | null;
	phone: string | null;
	/** Global aggregate when available; otherwise count of rows in the current source page. */
	orderCount: number | null;
	warehouseIds: number[];
	addresses: CustomerAddress[];
};

export type CustomerPage = {
	customers: Customer[];
	/** Pagination belongs to the underlying sales-order endpoint, not customers. */
	page: number;
	perPage: number;
	totalOrders: number;
	totalPages: number;
};

export type CustomerOrdersPage = {
	orders: CustomerOrder[];
	page: number;
	perPage: number;
	/** Backend q searches both SO number and customer name; this total is not exact per customer. */
	matchingSalesOrders: number;
	totalPages: number;
};

export type CustomerSearchQuery = {
	search: string;
	warehouseId?: number;
};
