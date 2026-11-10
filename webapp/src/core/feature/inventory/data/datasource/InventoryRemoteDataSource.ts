import type { ApiClient } from '../../../../infrastructure/api/ApiClient';
import type {
	CreateCycleCountResponseDto,
	CycleCountDetailDto,
	CycleCountSubmitResponseDto,
	InventoryOverviewDto,
	InventoryRowDto
} from '../dto/InventoryDto';
import type { CycleCountSubmitLine } from '../../domain/entity/CycleCount';

/**
 * Remote datasource — only HTTP + DTO shapes.
 * Endpoints follow existing SentryWMS contracts.
 */
export class InventoryRemoteDataSource {
	constructor(private readonly api: ApiClient) {}

	async getOverview(params: {
		warehouseId?: number;
		itemId?: number;
		page?: number;
	}): Promise<InventoryRowDto[]> {
		const query = new URLSearchParams();
		if (params.warehouseId != null) query.set('warehouse_id', String(params.warehouseId));
		if (params.itemId != null) query.set('item_id', String(params.itemId));
		if (params.page != null) query.set('page', String(params.page));

		const qs = query.toString();
		const path = `/api/admin/inventory${qs ? `?${qs}` : ''}`;
		const body = await this.api.get<InventoryOverviewDto | InventoryRowDto[]>(path);

		if (Array.isArray(body)) return body;
		return body.inventory ?? body.items ?? body.data ?? [];
	}

	async createCycleCounts(
		warehouseId: number,
		binIds: number[]
	): Promise<CreateCycleCountResponseDto> {
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
			lines: lines.map((l) => ({
				count_line_id: l.countLineId,
				counted_quantity: l.countedQuantity,
				...(l.unexpected != null ? { unexpected: l.unexpected } : {}),
				...(l.itemId != null ? { item_id: l.itemId } : {})
			}))
		});
	}
}
