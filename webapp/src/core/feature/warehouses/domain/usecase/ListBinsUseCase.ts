import type { BinPage } from '../entity/Warehouse';
import type { WarehouseRepository } from '../repository/WarehouseRepository';

export type ListBinsInput = {
	warehouseId?: number;
	zoneId?: number;
	page?: number;
	perPage?: number;
	q?: string;
};

export class ListBinsUseCase {
	constructor(private readonly repository: WarehouseRepository) {}

	async execute(params: ListBinsInput = {}): Promise<BinPage> {
		if (params.warehouseId != null && (!Number.isInteger(params.warehouseId) || params.warehouseId <= 0)) {
			throw new Error('warehouseId must be a positive integer when provided');
		}
		if (params.zoneId != null && (!Number.isInteger(params.zoneId) || params.zoneId <= 0)) {
			throw new Error('zoneId must be a positive integer when provided');
		}
		if (params.page != null && (!Number.isInteger(params.page) || params.page < 1)) {
			throw new Error('page must be an integer >= 1 when provided');
		}
		if (params.perPage != null && (!Number.isInteger(params.perPage) || params.perPage < 1 || params.perPage > 1000)) {
			throw new Error('perPage must be an integer between 1 and 1000 when provided');
		}
		return this.repository.listBins(params);
	}
}
