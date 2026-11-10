import type { CycleCountSummary } from '../entity/CycleCount';
import type { InventoryRepository } from '../repository/InventoryRepository';

export class CreateCycleCountUseCase {
	constructor(private readonly repository: InventoryRepository) {}

	execute(warehouseId: number, binIds: number[]): Promise<CycleCountSummary[]> {
		if (!Number.isInteger(warehouseId) || warehouseId <= 0) {
			throw new Error('warehouseId must be a positive integer');
		}
		if (!Array.isArray(binIds) || binIds.length === 0) {
			throw new Error('binIds must contain at least one bin');
		}
		if (binIds.some((id) => !Number.isInteger(id) || id <= 0)) {
			throw new Error('each binId must be a positive integer');
		}
		return this.repository.createCycleCounts(warehouseId, binIds);
	}
}
