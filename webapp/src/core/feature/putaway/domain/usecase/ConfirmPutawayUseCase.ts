import type { ConfirmPutawayInput, ConfirmPutawayResult } from '../entity/Putaway';
import type { PutawayRepository } from '../repository/PutawayRepository';

export class ConfirmPutawayUseCase {
	constructor(private readonly repository: PutawayRepository) {}

	execute(input: ConfirmPutawayInput): Promise<ConfirmPutawayResult> {
		if (!Number.isInteger(input.itemId) || input.itemId <= 0) {
			throw new Error('itemId must be a positive integer');
		}
		if (!Number.isInteger(input.fromBinId) || input.fromBinId <= 0) {
			throw new Error('fromBinId must be a positive integer');
		}
		if (!Number.isInteger(input.toBinId) || input.toBinId <= 0) {
			throw new Error('toBinId must be a positive integer');
		}
		if (input.fromBinId === input.toBinId) {
			throw new Error('toBinId must differ from fromBinId');
		}
		if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
			throw new Error('quantity must be an integer greater than 0');
		}
		return this.repository.confirm({
			...input,
			lotNumber: input.lotNumber?.trim() || null
		});
	}
}
