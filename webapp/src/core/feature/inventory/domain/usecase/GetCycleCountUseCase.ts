import type { CycleCountDetail } from '../entity/CycleCount';
import type { InventoryRepository } from '../repository/InventoryRepository';

/** GET /api/inventory/cycle-count/{count_id} */
export class GetCycleCountUseCase {
	constructor(private readonly repository: InventoryRepository) {}

	execute(countId: number): Promise<CycleCountDetail> {
		if (!Number.isInteger(countId) || countId <= 0) {
			throw new Error('countId must be a positive integer');
		}
		return this.repository.getCycleCount(countId);
	}
}
