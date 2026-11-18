import type { UpdatePreferredBinResult } from '../entity/Putaway';
import type { PutawayRepository } from '../repository/PutawayRepository';

export class UpdatePreferredBinUseCase {
	constructor(private readonly repository: PutawayRepository) {}

	execute(itemId: number, binId: number): Promise<UpdatePreferredBinResult> {
		if (!Number.isInteger(itemId) || itemId <= 0) throw new Error('itemId must be a positive integer');
		if (!Number.isInteger(binId) || binId <= 0) throw new Error('binId must be a positive integer');
		return this.repository.updatePreferred(itemId, binId);
	}
}
