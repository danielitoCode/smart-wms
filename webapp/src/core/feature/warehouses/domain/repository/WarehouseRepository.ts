import type { BinPage, Warehouse, Zone } from '../entity/Warehouse';

export interface WarehouseRepository {
	listActive(): Promise<Warehouse[]>;
	listAdmin(params?: { page?: number }): Promise<Warehouse[]>;
	getById(id: number): Promise<Warehouse>;
	listZones(warehouseId: number): Promise<Zone[]>;
	listBins(params?: { warehouseId?: number; zoneId?: number; page?: number; perPage?: number; q?: string }): Promise<BinPage>;
}
