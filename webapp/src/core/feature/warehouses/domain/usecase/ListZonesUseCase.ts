import type { Zone } from '../entity/Warehouse';
import type { WarehouseRepository } from '../repository/WarehouseRepository';

export class ListZonesUseCase {
	constructor(private readonly repository: WarehouseRepository) {}

	execute(warehouseId: number): Promise<Zone[]> {
		if (!Number.isFinite(warehouseId) || warehouseId <= 0) {
			throw new Error('warehouseId is required');
		}
		return this.repository.listZones(warehouseId);
	}
}
