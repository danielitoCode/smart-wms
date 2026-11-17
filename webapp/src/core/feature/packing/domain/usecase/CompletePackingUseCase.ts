import type { SimpleMessageResult } from '../entity/Packing';
import type { PackingRepository } from '../repository/PackingRepository';

export class CompletePackingUseCase {
	constructor(private readonly repository: PackingRepository) {}

	execute(soId: number, warehouseId: number): Promise<SimpleMessageResult> {
		if (!Number.isInteger(soId) || soId <= 0) {
			throw new Error('soId must be a positive integer');
		}
		if (!Number.isInteger(warehouseId) || warehouseId <= 0) throw new Error('warehouseId is required');
		return this.repository.complete(soId, warehouseId);
	}
}
