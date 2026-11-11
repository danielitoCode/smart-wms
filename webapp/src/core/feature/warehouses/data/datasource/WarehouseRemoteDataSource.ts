import type { ApiClient } from '../../../../infrastructure/api/ApiClient';
import type {
	BinDetailResponseDto, BinDto, BinListResponseDto, MessageDto,
	WarehouseDetailResponseDto, WarehouseListItemDto, WarehouseListResponseDto,
	ZoneDto, ZoneListResponseDto
} from '../dto/WarehouseDto';
import type {
	CreateBinRequestDto, CreateWarehouseRequestDto, CreateZoneRequestDto,
	UpdateBinRequestDto, UpdateWarehouseRequestDto, UpdateZoneRequestDto
} from '../dto/WarehouseMutationDto';

function asList<T>(
	body: T[] | { warehouses?: T[]; zones?: T[]; bins?: T[]; items?: T[]; data?: T[] },
	keys: Array<'warehouses' | 'zones' | 'bins' | 'items' | 'data'>
): T[] {
	if (Array.isArray(body)) return body;
	for (const key of keys) if (Array.isArray(body[key])) return body[key] as T[];
	return [];
}

export class WarehouseRemoteDataSource {
	constructor(private readonly api: ApiClient) {}

	async listActive(): Promise<WarehouseListItemDto[]> {
		const body = await this.api.get<WarehouseListResponseDto | WarehouseListItemDto[]>('/api/warehouses/list');
		return asList(body, ['warehouses', 'items', 'data']);
	}
	async listAdmin(page = 1): Promise<WarehouseListItemDto[]> {
		const body = await this.api.get<WarehouseListResponseDto | WarehouseListItemDto[]>('/api/admin/warehouses?page=' + page);
		return asList(body, ['warehouses', 'items', 'data']);
	}
	async getById(id: number): Promise<WarehouseListItemDto> {
		const response = await this.api.get<WarehouseDetailResponseDto>('/api/admin/warehouses/' + id);
		return response.warehouse;
	}
	async listZones(warehouseId: number): Promise<ZoneDto[]> {
		const body = await this.api.get<ZoneListResponseDto | ZoneDto[]>('/api/admin/zones?warehouse_id=' + warehouseId);
		return asList(body, ['zones', 'items', 'data']);
	}
	async listBins(params?: { warehouseId?: number; zoneId?: number; page?: number; perPage?: number; q?: string }): Promise<BinListResponseDto> {
		const query = new URLSearchParams();
		if (params?.warehouseId != null) query.set('warehouse_id', String(params.warehouseId));
		if (params?.zoneId != null) query.set('zone_id', String(params.zoneId));
		if (params?.page != null) query.set('page', String(params.page));
		if (params?.perPage != null) query.set('per_page', String(params.perPage));
		if (params?.q) query.set('q', params.q);
		const qs = query.toString();
		return this.api.get<BinListResponseDto>('/api/admin/bins' + (qs ? '?' + qs : ''));
	}
	createWarehouse(input: CreateWarehouseRequestDto): Promise<WarehouseListItemDto> {
		return this.api.post<WarehouseListItemDto>('/api/admin/warehouses', input);
	}
	updateWarehouse(id: number, input: UpdateWarehouseRequestDto): Promise<WarehouseListItemDto> {
		return this.api.put<WarehouseListItemDto>('/api/admin/warehouses/' + id, input);
	}
	deleteWarehouse(id: number): Promise<MessageDto> {
		return this.api.delete<MessageDto>('/api/admin/warehouses/' + id);
	}
	createZone(input: CreateZoneRequestDto): Promise<ZoneDto> {
		return this.api.post<ZoneDto>('/api/admin/zones', input);
	}
	updateZone(id: number, input: UpdateZoneRequestDto): Promise<ZoneDto> {
		return this.api.put<ZoneDto>('/api/admin/zones/' + id, input);
	}
	deleteZone(id: number): Promise<MessageDto> {
		return this.api.delete<MessageDto>('/api/admin/zones/' + id);
	}
	createBin(input: CreateBinRequestDto): Promise<BinDto> {
		return this.api.post<BinDto>('/api/admin/bins', input);
	}
	updateBin(id: number, input: UpdateBinRequestDto): Promise<BinDto> {
		return this.api.put<BinDto>('/api/admin/bins/' + id, input);
	}
	deleteBin(id: number): Promise<MessageDto> {
		return this.api.delete<MessageDto>('/api/admin/bins/' + id);
	}
	getBinById(id: number): Promise<BinDetailResponseDto> {
		return this.api.get<BinDetailResponseDto>('/api/admin/bins/' + id);
	}
}
