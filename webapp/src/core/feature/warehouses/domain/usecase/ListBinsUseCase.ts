import type { Bin } from '../entity/Warehouse';
import type { WarehouseRepository } from '../repository/WarehouseRepository';

export type ListBinsInput = {
	warehouseId?: number;
	zoneId?: number;
	page?: number;
};

export class ListBinsUseCase {
	constructor(private readonly repository: WarehouseRepository) {}

	execute(params: ListBinsInput = {}): Promise<Bin[]> {
		if (
			params.warehouseId != null &&
			(!Number.isInteger(params.warehouseId) || params.warehouseId <= 0)
		) {
			throw new Error('warehouseId must be a positive integer when provided');
		}
		if (params.zoneId != null && (!Number.isInteger(params.zoneId) || params.zoneId <= 0)) {
			throw new Error('zoneId must be a positive integer when provided');
		}
		if (params.page != null && (!Number.isInteger(params.page) || params.page < 1)) {
			throw new Error('page must be an integer >= 1 when provided');
		}
		return this.repository.listBins(params);
	}
}
