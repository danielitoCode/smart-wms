import type { ApiClient } from '../../../../infrastructure/api/ApiClient';
import type {
	SalesOrderDetailResponseDto,
	SalesOrderDto,
	SalesOrderListResponseDto
} from '../dto/SalesOrderDto';

function asList(body: SalesOrderDto[] | SalesOrderListResponseDto | null | undefined): SalesOrderDto[] {
	if (Array.isArray(body)) return body;
	if (body && typeof body === 'object') {
		if (Array.isArray(body.sales_orders)) return body.sales_orders;
		if (Array.isArray(body.data)) return body.data;
		if (Array.isArray(body.results)) return body.results;
	}
	return [];
}

function asDetail(body: SalesOrderDetailResponseDto | SalesOrderDto): SalesOrderDto {
	if (body && typeof body === 'object' && 'sales_order' in body && body.sales_order) {
		return body.sales_order;
	}
	return body as SalesOrderDto;
}

export class SalesOrderRemoteDataSource {
	constructor(private readonly api: ApiClient) {}

	async list(params?: {
		status?: string;
		warehouseId?: number;
		page?: number;
		perPage?: number;
		q?: string;
	}): Promise<SalesOrderDto[]> {
		const query = new URLSearchParams();
		if (params?.status) query.set('status', params.status);
		if (params?.warehouseId != null) query.set('warehouse_id', String(params.warehouseId));
		if (params?.page != null) query.set('page', String(params.page));
		if (params?.perPage != null) query.set('per_page', String(params.perPage));
		if (params?.q) query.set('q', params.q);
		const qs = query.toString();
		const body = await this.api.get<SalesOrderDto[] | SalesOrderListResponseDto>(
			`/api/admin/sales-orders${qs ? `?${qs}` : ''}`
		);
		return asList(body);
	}

	async getById(id: number): Promise<SalesOrderDto> {
		const body = await this.api.get<SalesOrderDetailResponseDto | SalesOrderDto>(
			`/api/admin/sales-orders/${id}`
		);
		return asDetail(body);
	}

	async create(payload: Record<string, unknown>): Promise<SalesOrderDto> {
		const body = await this.api.post<SalesOrderDetailResponseDto | SalesOrderDto>(
			'/api/admin/sales-orders',
			payload
		);
		return asDetail(body);
	}

	async cancel(id: number): Promise<SalesOrderDto> {
		const body = await this.api.post<SalesOrderDetailResponseDto | SalesOrderDto>(
			`/api/admin/sales-orders/${id}/cancel`
		);
		return asDetail(body);
	}
}
