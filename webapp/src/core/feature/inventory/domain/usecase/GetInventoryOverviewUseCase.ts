import type { InventoryStock } from '../entity/InventoryStock';
import type { InventoryRepository } from '../repository/InventoryRepository';

export type GetInventoryOverviewInput = {
	warehouseId?: number;
	itemId?: number;
	page?: number;
};

export class GetInventoryOverviewUseCase {
	constructor(private readonly repository: InventoryRepository) {}

	execute(input: GetInventoryOverviewInput = {}): Promise<InventoryStock[]> {
		const warehouseId = input.warehouseId;
		const itemId = input.itemId;
		const page = input.page;

		if (warehouseId != null && (!Number.isInteger(warehouseId) || warehouseId <= 0)) {
			throw new Error('warehouseId must be a positive integer when provided');
		}
		if (itemId != null && (!Number.isInteger(itemId) || itemId <= 0)) {
			throw new Error('itemId must be a positive integer when provided');
		}
		if (page != null && (!Number.isInteger(page) || page < 1)) {
			throw new Error('page must be an integer >= 1 when provided');
		}

		return this.repository.getOverview({
			warehouseId,
			itemId,
			page
		});
	}
}
