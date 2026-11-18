import type { ApiClient } from '../../../../infrastructure/api/ApiClient';
import type {
	PreferredBinCatalogDto,
	PreferredBinCreateDto,
	PreferredBinDto,
	PreferredBinListResponseDto,
	PreferredBinMessageDto,
	PreferredBinPriorityDto
} from '../dto/PreferredBinDto';

export class PreferredBinsRemoteDataSource {
	constructor(private readonly api: ApiClient) {}

	async list(query: { search?: string; itemId?: number; warehouseId?: number } = {}): Promise<PreferredBinDto[]> {
		const params = new URLSearchParams();
		if (query.search?.trim()) params.set('q', query.search.trim());
		if (query.itemId != null) params.set('item_id', String(query.itemId));
		if (query.warehouseId != null) params.set('warehouse_id', String(query.warehouseId));
		const suffix = params.size ? '?' + params.toString() : '';
		const response = await this.api.get<PreferredBinListResponseDto>('/api/admin/preferred-bins' + suffix);
		return response.preferred_bins ?? [];
	}

	catalog(query: { warehouseId?: number; search?: string; page?: number; perPage?: number } = {}): Promise<PreferredBinCatalogDto> {
		const params = new URLSearchParams();
		if (query.warehouseId != null) params.set('warehouse_id', String(query.warehouseId));
		if (query.search?.trim()) params.set('q', query.search.trim());
		if (query.page != null) params.set('page', String(query.page));
		if (query.perPage != null) params.set('per_page', String(query.perPage));
		const suffix = params.size ? '?' + params.toString() : '';
		return this.api.get<PreferredBinCatalogDto>('/api/admin/preferred-bins/catalog' + suffix);
	}

	create(input: PreferredBinCreateDto): Promise<PreferredBinMessageDto> {
		return this.api.post<PreferredBinMessageDto>('/api/admin/preferred-bins', input);
	}

	update(id: number, input: PreferredBinPriorityDto): Promise<PreferredBinMessageDto> {
		return this.api.put<PreferredBinMessageDto>('/api/admin/preferred-bins/' + id, input);
	}

	remove(id: number): Promise<PreferredBinMessageDto> {
		return this.api.delete<PreferredBinMessageDto>('/api/admin/preferred-bins/' + id);
	}
}
