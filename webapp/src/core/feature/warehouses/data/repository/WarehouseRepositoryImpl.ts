import type { WarehouseRepository } from '../../domain/repository/WarehouseRepository';
import type { Bin, Warehouse, Zone } from '../../domain/entity/Warehouse';
import type { WarehouseRemoteDataSource } from '../datasource/WarehouseRemoteDataSource';
import { WarehouseMapper } from '../mapper/WarehouseMapper';

export class WarehouseRepositoryImpl implements WarehouseRepository {
	constructor(private readonly datasource: WarehouseRemoteDataSource) {}

	async listActive(): Promise<Warehouse[]> {
		const rows = await this.datasource.listActive();
		return rows.map(WarehouseMapper.toWarehouse);
	}

	async listAdmin(params?: { page?: number; q?: string }): Promise<Warehouse[]> {
		const rows = await this.datasource.listAdmin(params);
		return rows.map(WarehouseMapper.toWarehouse);
	}

	async getById(id: number): Promise<Warehouse> {
		const row = await this.datasource.getById(id);
		return WarehouseMapper.toWarehouse(row);
	}

	async listZones(warehouseId: number): Promise<Zone[]> {
		const rows = await this.datasource.listZones(warehouseId);
		return rows.map(WarehouseMapper.toZone);
	}

	async listBins(params?: {
		warehouseId?: number;
		zoneId?: number;
		page?: number;
	}): Promise<Bin[]> {
		const rows = await this.datasource.listBins(params);
		return rows.map(WarehouseMapper.toBin);
	}
}
