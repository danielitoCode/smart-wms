import type { ApiClient } from '../../../../infrastructure/api/ApiClient';
import type {
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
