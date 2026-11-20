import type { InventoryRepository } from '../../domain/repository/InventoryRepository';
import type { InventoryPage, InventoryQuery } from '../../domain/entity/InventoryStock';
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

	lookupBarcode(barcode: string) {
		return this.datasource.lookupBarcode(barcode);
	}

	async getOverview(params: InventoryQuery = {}): Promise<InventoryPage> {
		const response = await this.datasource.getOverview({
			warehouseId: params.warehouseId,
			itemId: params.itemId,
			binId: params.binId,
			query: params.query,
			page: params.page,
			perPage: params.perPage
		});
		return InventoryMapper.toOverview(response);
	}

	getItemInventory(
		itemId: number,
		params: Omit<InventoryQuery, 'itemId'> = {}
	): Promise<InventoryPage> {
		return this.getOverview({ ...params, itemId });
	}

	async createCycleCounts(warehouseId: number, binIds: number[]): Promise<CycleCountSummary[]> {
		const response = await this.datasource.createCycleCounts(warehouseId, binIds);
		return response.counts.map((count) => InventoryMapper.toCycleCountSummary(count, warehouseId));
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
