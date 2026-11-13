import type { CreateSalesOrderInput, SalesOrder } from '../entity/SalesOrder';

export type ListSalesOrdersParams = {
	status?: string;
	warehouseId?: number;
	page?: number;
	perPage?: number;
	q?: string;
};

export interface SalesOrderRepository {
	/** GET /api/admin/sales-orders */
	list(params?: ListSalesOrdersParams): Promise<SalesOrder[]>;

	/** GET /api/admin/sales-orders/{id} */
	getById(id: number): Promise<SalesOrder>;

	/** POST /api/admin/sales-orders */
	create(input: CreateSalesOrderInput): Promise<SalesOrder>;

	/** POST /api/admin/sales-orders/{id}/cancel */
	cancel(id: number): Promise<SalesOrder>;
}
