import type { InventoryRepository } from '../../domain/repository/InventoryRepository';
import type { InventoryStock } from '../../domain/entity/InventoryStock';
import type {
	CycleCountDetail,
	CycleCountSubmitLine,
	CycleCountSubmitResult,
	CycleCountSummary
} from '../../domain/entity/CycleCount';
import type { InventoryRemoteDataSource } from '../datasource/InventoryRemoteDataSource';
import { InventoryMapper } from '../mapper/InventoryMapper';

export class InventoryRepositoryImpl implements InventoryRepository {
	constructor(private readonly datasource: InventoryRemoteDataSource) {}

	async getOverview(params?: {
		warehouseId?: number;
		itemId?: number;
		page?: number;
	}): Promise<InventoryStock[]> {
		const rows = await this.datasource.getOverview(params ?? {});
		return rows.map(InventoryMapper.toStock);
	}

	async createCycleCounts(warehouseId: number, binIds: number[]): Promise<CycleCountSummary[]> {
		const response = await this.datasource.createCycleCounts(warehouseId, binIds);
		return (response.counts ?? []).map(InventoryMapper.toCycleCountSummary);
	}

	async getCycleCount(countId: number): Promise<CycleCountDetail> {
		const dto = await this.datasource.getCycleCount(countId);
		return InventoryMapper.toCycleCountDetail(dto);
	}

	async submitCycleCount(
		countId: number,
		lines: CycleCountSubmitLine[]
	): Promise<CycleCountSubmitResult> {
		const dto = await this.datasource.submitCycleCount(countId, lines);
		return InventoryMapper.toSubmitResult(dto);
	}
}
