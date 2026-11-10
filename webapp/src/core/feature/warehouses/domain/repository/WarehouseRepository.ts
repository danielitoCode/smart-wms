import type { Bin, Warehouse, Zone } from '../entity/Warehouse';

export interface WarehouseRepository {
	/** GET /api/warehouses/list — active warehouses for selection */
	listActive(): Promise<Warehouse[]>;

	/** GET /api/admin/warehouses — admin list (optional filters) */
	listAdmin(params?: { page?: number; q?: string }): Promise<Warehouse[]>;

	/** GET /api/admin/warehouses/{id} */
	getById(id: number): Promise<Warehouse>;

	/** GET /api/admin/zones?warehouse_id= */
	listZones(warehouseId: number): Promise<Zone[]>;

	/** GET /api/admin/bins?warehouse_id= */
	listBins(params?: {
		warehouseId?: number;
		zoneId?: number;
		page?: number;
	}): Promise<Bin[]>;
}
