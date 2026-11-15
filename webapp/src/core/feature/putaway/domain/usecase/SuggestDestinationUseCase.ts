import type { PutawaySuggestion } from '../entity/Putaway';
import type { PutawayRepository } from '../repository/PutawayRepository';

export class SuggestDestinationUseCase {
	constructor(private readonly repository: PutawayRepository) {}

	execute(itemId: number): Promise<PutawaySuggestion> {
		if (!Number.isInteger(itemId) || itemId <= 0) {
			throw new Error('itemId must be a positive integer');
		}
		return this.repository.suggest(itemId);
	}
}
