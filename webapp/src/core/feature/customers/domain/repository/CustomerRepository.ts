import type { Customer } from '../entity/Customer';

export type ListCustomersParams = {
	q?: string;
	warehouseId?: number;
};

export interface CustomerRepository {
	/**
	 * List customers.
	 * - With `q`: uses GET /api/admin/search (type=customer hits).
	 * - Without `q`: projects unique customers from GET /api/admin/sales-orders.
	 */
	list(params?: ListCustomersParams): Promise<Customer[]>;
}
