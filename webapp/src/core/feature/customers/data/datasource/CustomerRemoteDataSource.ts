import type { ApiClient } from '../../../../infrastructure/api/ApiClient';
import type {
	SalesOrderCustomerDto,
	SalesOrderDetailForCustomerDto,
	SalesOrderListForCustomersDto,
	SearchCustomerHitDto,
	SearchResponseDto
} from '../dto/CustomerDto';

export class CustomerRemoteDataSource {
	constructor(private readonly api: ApiClient) {}

	async search(q: string, warehouseId?: number): Promise<SearchCustomerHitDto[]> {
		const query = new URLSearchParams({ q });
		if (warehouseId != null) query.set('warehouse_id', String(warehouseId));
		const body = await this.api.get<SearchResponseDto>(`/api/admin/search?${query.toString()}`);
		return (body?.results ?? []).filter((result) => result.type?.toLowerCase() === 'customer');
	}

	async listSalesOrders(page = 1, perPage = 50, warehouseId?: number): Promise<SalesOrderListForCustomersDto> {
		const query = new URLSearchParams({
			page: String(page),
			per_page: String(perPage)
		});
		if (warehouseId != null) query.set('warehouse_id', String(warehouseId));
		return this.api.get<SalesOrderListForCustomersDto>(
			`/api/admin/sales-orders?${query.toString()}`
		);
	}

	async searchSalesOrders(
		customerName: string,
		page = 1,
		perPage = 50,
		warehouseId?: number
	): Promise<SalesOrderListForCustomersDto> {
		const query = new URLSearchParams({
			q: customerName,
			page: String(page),
			per_page: String(perPage)
		});
		if (warehouseId != null) query.set('warehouse_id', String(warehouseId));
		return this.api.get<SalesOrderListForCustomersDto>(
			`/api/admin/sales-orders?${query.toString()}`
		);
	}

	async getSalesOrderDetail(id: number): Promise<SalesOrderDetailForCustomerDto> {
		return this.api.get<SalesOrderDetailForCustomerDto>(`/api/admin/sales-orders/${id}`);
	}
}
