import type { ShortPickInput, SimpleMessageResult } from '../entity/Picking';
import type { PickingRepository } from '../repository/PickingRepository';

export class ShortPickUseCase {
	constructor(private readonly repository: PickingRepository) {}

	execute(input: ShortPickInput): Promise<SimpleMessageResult> {
		if (!Number.isInteger(input.pickTaskId) || input.pickTaskId <= 0) {
			throw new Error('pickTaskId must be a positive integer');
		}
		if (!Number.isInteger(input.quantityAvailable) || input.quantityAvailable < 0) {
			throw new Error('quantityAvailable must be a non-negative integer');
		}
		return this.repository.short(input);
	}
}
