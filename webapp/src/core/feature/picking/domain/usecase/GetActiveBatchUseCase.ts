import type { ActiveBatch } from '../entity/Picking';
import type { PickingRepository } from '../repository/PickingRepository';

export class GetActiveBatchUseCase {
	constructor(private readonly repository: PickingRepository) {}

	execute(): Promise<ActiveBatch> {
		return this.repository.getActiveBatch();
	}
}
