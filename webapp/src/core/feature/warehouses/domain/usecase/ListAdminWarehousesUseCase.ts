import type { Warehouse, WarehousePage } from '../entity/Warehouse';
import type { WarehouseRepository } from '../repository/WarehouseRepository';

export class ListAdminWarehousesUseCase {
	constructor(private readonly repository: WarehouseRepository) {}
	/** Full admin master-data list, equivalent to React Data > Warehouses. */
	execute(): Promise<Warehouse[]> {
		return this.repository.listAdmin();
	}
	executePage(params?: { page?: number; perPage?: number }): Promise<WarehousePage> {
		return this.repository.listAdminPage(params);
	}
}
