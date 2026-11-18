import type { WaveCreateResult } from '../entity/Picking';
import type { PickingRepository } from '../repository/PickingRepository';

export class WaveCreateUseCase {
	constructor(private readonly repository: PickingRepository) {}

	execute(soIds: number[], warehouseId: number): Promise<WaveCreateResult> {
		if (!Array.isArray(soIds) || soIds.length === 0) {
			throw new Error('so_ids must not be empty');
		}
		if (soIds.some((id) => !Number.isInteger(id) || id <= 0)) {
			throw new Error('each so_id must be a positive integer');
		}
		if (!Number.isInteger(warehouseId) || warehouseId <= 0) {
			throw new Error('warehouse_id must be a positive integer');
		}
		return this.repository.waveCreate(soIds, warehouseId);
	}
}
