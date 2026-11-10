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
		return this.repository.getOverview({
			warehouseId: input.warehouseId,
			itemId: input.itemId,
			page: input.page
		});
	}
}
