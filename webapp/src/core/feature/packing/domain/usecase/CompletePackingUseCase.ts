import type { SimpleMessageResult } from '../entity/Packing';
import type { PackingRepository } from '../repository/PackingRepository';

export class CompletePackingUseCase {
	constructor(private readonly repository: PackingRepository) {}

	execute(soId: number): Promise<SimpleMessageResult> {
		if (!Number.isInteger(soId) || soId <= 0) {
			throw new Error('soId must be a positive integer');
		}
		return this.repository.complete(soId);
	}
}
