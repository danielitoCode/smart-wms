import type { InventoryPage, InventoryQuery } from '../entity/InventoryStock';
import type { InventoryRepository } from '../repository/InventoryRepository';
import { validateQuery } from './GetInventoryOverviewUseCase';

/** Loads one item's stock rows across its permitted locations. */
export class GetItemInventoryUseCase {
	constructor(private readonly repository: InventoryRepository) {}

	execute(itemId: number, filters: Omit<InventoryQuery, 'itemId'> = {}): Promise<InventoryPage> {
		if (!Number.isInteger(itemId) || itemId <= 0) {
			throw new Error('itemId must be a positive integer');
		}
		validateQuery(filters);
		return this.repository.getItemInventory(itemId, filters);
	}
}
