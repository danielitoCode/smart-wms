import type { Customer, CustomerOrdersPage, CustomerPage } from '../entity/Customer';

export type ListCustomersParams = {
	page?: number;
	perPage?: number;
	warehouseId?: number;
};

export type SearchCustomersParams = {
	q: string;
	warehouseId?: number;
};

export type GetCustomerOrdersParams = {
	customerName: string;
	page?: number;
	perPage?: number;
	warehouseId?: number;
};

export interface CustomerRepository {
	list(params?: ListCustomersParams): Promise<CustomerPage>;
	search(params: SearchCustomersParams): Promise<Customer[]>;
	getOrders(params: GetCustomerOrdersParams): Promise<CustomerOrdersPage>;
	getDetail(customerName: string, warehouseId?: number): Promise<Customer | null>;
}
