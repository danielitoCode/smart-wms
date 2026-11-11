import type { Warehouse } from '../entity/Warehouse';
import type { WarehouseRepository } from '../repository/WarehouseRepository';

export class ListWarehousesUseCase {
	constructor(private readonly repository: WarehouseRepository) {}
	/** Admin master-data list, equivalent to React Data > Warehouses. */
	execute(): Promise<Warehouse[]> {
		return this.repository.listAdmin();
	}
}
