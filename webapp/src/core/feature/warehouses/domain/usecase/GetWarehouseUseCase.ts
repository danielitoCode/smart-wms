import type { Warehouse } from '../entity/Warehouse';
import type { WarehouseRepository } from '../repository/WarehouseRepository';

export class GetWarehouseUseCase {
	constructor(private readonly repository: WarehouseRepository) {}

	async execute(id: number): Promise<Warehouse> {
		if (!Number.isInteger(id) || id <= 0) throw new Error('warehouse id must be a positive integer');
		return this.repository.getById(id);
	}
}
