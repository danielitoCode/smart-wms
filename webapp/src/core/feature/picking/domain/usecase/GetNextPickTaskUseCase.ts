import type { PickTask } from '../entity/Picking';
import type { PickingRepository } from '../repository/PickingRepository';

export class GetNextPickTaskUseCase {
	constructor(private readonly repository: PickingRepository) {}

	execute(batchId: number): Promise<PickTask | null> {
		if (!Number.isInteger(batchId) || batchId <= 0) {
			throw new Error('batchId must be a positive integer');
		}
		return this.repository.getNextTask(batchId);
	}
}
