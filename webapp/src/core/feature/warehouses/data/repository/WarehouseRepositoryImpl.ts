import type { WarehouseRepository } from '../../domain/repository/WarehouseRepository';
import type { BinPage, Warehouse, Zone } from '../../domain/entity/Warehouse';
import type { WarehouseRemoteDataSource } from '../datasource/WarehouseRemoteDataSource';
import { WarehouseMapper } from '../mapper/WarehouseMapper';

export class WarehouseRepositoryImpl implements WarehouseRepository {
	constructor(private readonly datasource: WarehouseRemoteDataSource) {}

	async listActive(): Promise<Warehouse[]> {
		return (await this.datasource.listActive()).map(WarehouseMapper.toWarehouse);
	}

	async listAdmin(params?: { page?: number; q?: string }): Promise<Warehouse[]> {
		return (await this.datasource.listAdmin(params)).map(WarehouseMapper.toWarehouse);
	}

	async getById(id: number): Promise<Warehouse> {
		return WarehouseMapper.toWarehouse(await this.datasource.getById(id));
	}

	async listZones(warehouseId: number): Promise<Zone[]> {
		return (await this.datasource.listZones(warehouseId)).map(WarehouseMapper.toZone);
	}

	async listBins(params?: {
		warehouseId?: number;
		zoneId?: number;
		page?: number;
		perPage?: number;
		q?: string;
	}): Promise<BinPage> {
		const response = await this.datasource.listBins(params);
		return {
			items: (response.bins ?? []).map(WarehouseMapper.toBin),
			total: response.total ?? 0,
			page: response.page ?? 1,
			pages: response.pages ?? 1,
			perPage: response.per_page ?? 50
		};
	}
}
