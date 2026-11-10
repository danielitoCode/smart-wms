import type { Warehouse } from '../entity/Warehouse';
import type { WarehouseRepository } from '../repository/WarehouseRepository';

export class GetWarehouseUseCase {
	constructor(private readonly repository: WarehouseRepository) {}

	execute(id: number): Promise<Warehouse> {
		if (!Number.isFinite(id) || id <= 0) {
			throw new Error('warehouse id is required');
		}
		return this.repository.getById(id);
	}
}
