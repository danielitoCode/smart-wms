import type { Warehouse } from '../entity/Warehouse';
import type { WarehouseRepository } from '../repository/WarehouseRepository';

export class ListWarehousesUseCase {
	constructor(private readonly repository: WarehouseRepository) {}

	/** Active warehouses (post-login / operational selection). */
	execute(): Promise<Warehouse[]> {
		return this.repository.listActive();
	}
}
