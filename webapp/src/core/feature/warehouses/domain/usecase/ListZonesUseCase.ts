import type { Zone } from '../entity/Warehouse';
import type { WarehouseRepository } from '../repository/WarehouseRepository';

export class ListZonesUseCase {
	constructor(private readonly repository: WarehouseRepository) {}

	async execute(warehouseId: number): Promise<Zone[]> {
		if (!Number.isInteger(warehouseId) || warehouseId <= 0) {
			throw new Error('warehouseId must be a positive integer');
		}
		return this.repository.listZones(warehouseId);
	}
}
