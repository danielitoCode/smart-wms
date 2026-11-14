import type { ApiClient } from '../../../../infrastructure/api/ApiClient';
import type { CycleCountSubmitLine } from '../../domain/entity/CycleCount';
import type {
	CreateCycleCountResponseDto,
	CycleCountDetailDto,
	CycleCountSubmitResponseDto,
	InventoryOverviewDto
} from '../dto/InventoryDto';

export type InventoryRequestParams = {
	warehouseId?: number;
	itemId?: number;
	binId?: number;
	query?: string;
	page?: number;
	perPage?: number;
};

export class InventoryRemoteDataSource {
	constructor(private readonly api: ApiClient) {}

	async getOverview(params: InventoryRequestParams = {}): Promise<InventoryOverviewDto> {
		const query = new URLSearchParams();
		if (params.warehouseId != null) query.set('warehouse_id', String(params.warehouseId));
		if (params.itemId != null) query.set('item_id', String(params.itemId));
		if (params.binId != null) query.set('bin_id', String(params.binId));
		if (params.query?.trim()) query.set('q', params.query.trim());
		query.set('page', String(params.page ?? 1));
		query.set('per_page', String(params.perPage ?? 50));

		return this.api.get<InventoryOverviewDto>(`/api/admin/inventory?${query.toString()}`);
	}

	async createCycleCounts(warehouseId: number, binIds: number[]): Promise<CreateCycleCountResponseDto> {
		return this.api.post<CreateCycleCountResponseDto>('/api/inventory/cycle-count/create', {
			warehouse_id: warehouseId,
			bin_ids: binIds
		});
	}

	async getCycleCount(countId: number): Promise<CycleCountDetailDto> {
		return this.api.get<CycleCountDetailDto>(`/api/inventory/cycle-count/${countId}`);
	}

	async submitCycleCount(
		countId: number,
		lines: CycleCountSubmitLine[]
	): Promise<CycleCountSubmitResponseDto> {
		return this.api.post<CycleCountSubmitResponseDto>('/api/inventory/cycle-count/submit', {
			count_id: countId,
			lines: lines.map((line) => ({
				count_line_id: line.countLineId,
				counted_quantity: line.countedQuantity,
				...(line.unexpected != null ? { unexpected: line.unexpected } : {}),
				...(line.itemId != null ? { item_id: line.itemId } : {})
			}))
		});
	}
}
