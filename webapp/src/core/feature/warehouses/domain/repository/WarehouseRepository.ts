import type { BinPage, Warehouse, WarehousePage, Zone } from '../entity/Warehouse';

export interface WarehouseRepository {
	listActive(): Promise<Warehouse[]>;
	listAdmin(): Promise<Warehouse[]>;
	listAdminPage(params?: { page?: number; perPage?: number }): Promise<WarehousePage>;
	getById(id: number): Promise<Warehouse>;
	listZones(warehouseId: number): Promise<Zone[]>;
	listBins(params?: { warehouseId?: number; zoneId?: number; page?: number; perPage?: number; q?: string }): Promise<BinPage>;
}
