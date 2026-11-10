import type { PendingPutawayItem } from '../entity/Putaway';
import type { PutawayRepository } from '../repository/PutawayRepository';

export class ListPendingPutawayUseCase {
	constructor(private readonly repository: PutawayRepository) {}

	execute(warehouseId: number): Promise<PendingPutawayItem[]> {
		if (!Number.isInteger(warehouseId) || warehouseId <= 0) {
			throw new Error('warehouseId must be a positive integer');
		}
		return this.repository.listPending(warehouseId);
	}
}
