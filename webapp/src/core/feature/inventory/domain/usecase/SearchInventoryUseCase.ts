import type { InventoryPage, InventoryQuery } from '../entity/InventoryStock';
import type { InventoryRepository } from '../repository/InventoryRepository';
import { validateQuery } from './GetInventoryOverviewUseCase';

/** Server-side search across SKU, item name, UPC, MPN and bin code. */
export class SearchInventoryUseCase {
	constructor(private readonly repository: InventoryRepository) {}

	execute(query: string, filters: Omit<InventoryQuery, 'query'> = {}): Promise<InventoryPage> {
		if (typeof query !== 'string') throw new Error('query must be a string');
		validateQuery(filters);
		return this.repository.getOverview({ ...filters, query: query.trim() });
	}
}
