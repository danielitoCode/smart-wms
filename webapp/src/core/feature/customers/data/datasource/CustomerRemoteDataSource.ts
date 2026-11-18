import type { ApiClient } from '../../../../infrastructure/api/ApiClient';
import type {
	SalesOrderCustomerDto,
	SalesOrderListForCustomersDto,
	SearchCustomerHitDto,
	SearchResponseDto
} from '../dto/CustomerDto';

export class CustomerRemoteDataSource {
	constructor(private readonly api: ApiClient) {}

	/** GET /api/admin/search?q=&warehouse_id= → customer hits only */
	async search(q: string, warehouseId?: number): Promise<SearchCustomerHitDto[]> {
		const query = new URLSearchParams();
		query.set('q', q);
		if (warehouseId != null) query.set('warehouse_id', String(warehouseId));
		const body = await this.api.get<SearchResponseDto | SearchCustomerHitDto[]>(
			`/api/admin/search?${query.toString()}`
		);
		const results = Array.isArray(body)
			? body
			: Array.isArray(body?.results)
				? body.results
				: [];
		return results.filter((r) => (r.type ?? '').toLowerCase() === 'customer');
	}

	/** GET /api/admin/sales-orders for client-side customer projection */
	async listFromSalesOrders(warehouseId?: number): Promise<SalesOrderCustomerDto[]> {
		const query = new URLSearchParams();
		query.set('per_page', '1000');
		if (warehouseId != null) query.set('warehouse_id', String(warehouseId));
		const body = await this.api.get<SalesOrderListForCustomersDto | SalesOrderCustomerDto[]>(
			`/api/admin/sales-orders?${query.toString()}`
		);
		if (Array.isArray(body)) return body;
		if (body && Array.isArray(body.sales_orders)) return body.sales_orders;
		if (body && Array.isArray(body.data)) return body.data;
		return [];
	}
}
