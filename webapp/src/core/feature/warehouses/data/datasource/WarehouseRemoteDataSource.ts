import type { ApiClient } from '../../../../infrastructure/api/ApiClient';
import type {
	BinDto,
	BinListResponseDto,
	WarehouseDetailResponseDto,
	WarehouseListItemDto,
	WarehouseListResponseDto,
	ZoneDto,
	ZoneListResponseDto
} from '../dto/WarehouseDto';

function asList<T>(
	body: T[] | { warehouses?: T[]; zones?: T[]; bins?: T[]; items?: T[]; data?: T[] },
	keys: Array<'warehouses' | 'zones' | 'bins' | 'items' | 'data'>
): T[] {
	if (Array.isArray(body)) return body;
	for (const key of keys) {
		const value = body[key];
		if (Array.isArray(value)) return value;
	}
	return [];
}

export class WarehouseRemoteDataSource {
	constructor(private readonly api: ApiClient) {}

	async listActive(): Promise<WarehouseListItemDto[]> {
		const body = await this.api.get<WarehouseListResponseDto | WarehouseListItemDto[]>('/api/warehouses/list');
		return asList(body, ['warehouses', 'items', 'data']);
	}

	async listAdmin(params?: { page?: number; q?: string }): Promise<WarehouseListItemDto[]> {
		const query = new URLSearchParams();
		if (params?.page != null) query.set('page', String(params.page));
		if (params?.q) query.set('q', params.q);
		const qs = query.toString();
		const body = await this.api.get<WarehouseListResponseDto | WarehouseListItemDto[]>(
			`/api/admin/warehouses${qs ? `?${qs}` : ''}`
		);
		return asList(body, ['warehouses', 'items', 'data']);
	}

	async getById(id: number): Promise<WarehouseListItemDto> {
		const response = await this.api.get<WarehouseDetailResponseDto>(`/api/admin/warehouses/${id}`);
		return response.warehouse;
	}

	async listZones(warehouseId: number): Promise<ZoneDto[]> {
		const body = await this.api.get<ZoneListResponseDto | ZoneDto[]>(
			`/api/admin/zones?warehouse_id=${warehouseId}`
		);
		return asList(body, ['zones', 'items', 'data']);
	}

	async listBins(params?: {
		warehouseId?: number;
		zoneId?: number;
		page?: number;
		perPage?: number;
		q?: string;
	}): Promise<BinListResponseDto> {
		const query = new URLSearchParams();
		if (params?.warehouseId != null) query.set('warehouse_id', String(params.warehouseId));
		if (params?.zoneId != null) query.set('zone_id', String(params.zoneId));
		if (params?.page != null) query.set('page', String(params.page));
		if (params?.perPage != null) query.set('per_page', String(params.perPage));
		if (params?.q) query.set('q', params.q);
		const qs = query.toString();
		return this.api.get<BinListResponseDto>(
			`/api/admin/bins${qs ? `?${qs}` : ''}`
		);
	}
}
