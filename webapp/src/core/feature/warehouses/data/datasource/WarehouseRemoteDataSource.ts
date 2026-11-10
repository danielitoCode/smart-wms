import type { ApiClient } from '../../../../infrastructure/api/ApiClient';
import type {
	BinDto,
	BinListResponseDto,
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
		const body = await this.api.get<WarehouseListResponseDto | WarehouseListItemDto[]>(
			'/api/warehouses/list'
		);
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
		return this.api.get<WarehouseListItemDto>(`/api/admin/warehouses/${id}`);
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
	}): Promise<BinDto[]> {
		const query = new URLSearchParams();
		if (params?.warehouseId != null) query.set('warehouse_id', String(params.warehouseId));
		if (params?.zoneId != null) query.set('zone_id', String(params.zoneId));
		if (params?.page != null) query.set('page', String(params.page));
		const qs = query.toString();
		const body = await this.api.get<BinListResponseDto | BinDto[]>(
			`/api/admin/bins${qs ? `?${qs}` : ''}`
		);
		return asList(body, ['bins', 'items', 'data']);
	}
}
