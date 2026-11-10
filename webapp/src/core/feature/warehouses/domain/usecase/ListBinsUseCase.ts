import type { Bin } from '../entity/Warehouse';
import type { WarehouseRepository } from '../repository/WarehouseRepository';

export class ListBinsUseCase {
	constructor(private readonly repository: WarehouseRepository) {}

	execute(params?: { warehouseId?: number; zoneId?: number; page?: number }): Promise<Bin[]> {
		return this.repository.listBins(params);
	}
}
