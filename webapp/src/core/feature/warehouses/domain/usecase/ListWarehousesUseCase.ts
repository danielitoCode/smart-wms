import type { Warehouse } from '../entity/Warehouse';
import type { WarehouseRepository } from '../repository/WarehouseRepository';

export class ListWarehousesUseCase {
	constructor(private readonly repository: WarehouseRepository) {}
	/** Active warehouse lookup used by operational selection flows. */
	execute(): Promise<Warehouse[]> {
		return this.repository.listActive();
	}
}
