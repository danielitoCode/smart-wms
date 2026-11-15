import type { StagingBinSummary } from '../entity/Putaway';
import type { PutawayRepository } from '../repository/PutawayRepository';

export class StagingSummaryUseCase {
	constructor(private readonly repository: PutawayRepository) {}

	execute(warehouseId: number): Promise<StagingBinSummary[]> {
		if (!Number.isInteger(warehouseId) || warehouseId <= 0) {
			throw new Error('warehouseId must be a positive integer');
		}
		return this.repository.getStagingSummary(warehouseId);
	}
}
