import type { WarehouseManagementRepository } from '../../domain/repository/WarehouseManagementRepository';
import type {
	Bin, BinDetail, BinPage, CreateBinInput, CreateWarehouseInput, CreateZoneInput,
	UpdateBinInput, UpdateWarehouseInput, UpdateZoneInput, Warehouse, Zone
} from '../../domain/entity/Warehouse';
import type { WarehouseRemoteDataSource } from '../datasource/WarehouseRemoteDataSource';
import { WarehouseMapper } from '../mapper/WarehouseMapper';

export class WarehouseRepositoryImpl implements WarehouseManagementRepository {
	constructor(private readonly datasource: WarehouseRemoteDataSource) {}

	async listActive(): Promise<Warehouse[]> {
		return (await this.datasource.listActive()).map(WarehouseMapper.toWarehouse);
	}
	async listAdmin(params?: { page?: number }): Promise<Warehouse[]> {
		return (await this.datasource.listAdmin(params?.page)).map(WarehouseMapper.toWarehouse);
	}
	async getById(id: number): Promise<Warehouse> {
		return WarehouseMapper.toWarehouse(await this.datasource.getById(id));
	}
	async listZones(warehouseId: number): Promise<Zone[]> {
		return (await this.datasource.listZones(warehouseId)).map(WarehouseMapper.toZone);
	}
	async listBins(params?: { warehouseId?: number; zoneId?: number; page?: number; perPage?: number; q?: string }): Promise<BinPage> {
		const response = await this.datasource.listBins(params);
		return {
			items: (response.bins ?? []).map(WarehouseMapper.toBin),
			total: response.total ?? 0,
			page: response.page ?? 1,
			pages: response.pages ?? 1,
			perPage: response.per_page ?? 50
		};
	}
	async createWarehouse(input: CreateWarehouseInput): Promise<Warehouse> {
		const row = await this.datasource.createWarehouse({
			warehouse_code: input.code, warehouse_name: input.name, address: input.address
		});
		return WarehouseMapper.toWarehouse(row);
	}
	async updateWarehouse(input: UpdateWarehouseInput): Promise<Warehouse> {
		const row = await this.datasource.updateWarehouse(input.id, {
			...(input.name !== undefined ? { warehouse_name: input.name } : {}),
			...(input.address !== undefined ? { address: input.address } : {}),
			...(input.active !== undefined ? { is_active: input.active } : {})
		});
		return WarehouseMapper.toWarehouse(row);
	}
	async deleteWarehouse(id: number): Promise<void> {
		await this.datasource.deleteWarehouse(id);
	}
	async createZone(input: CreateZoneInput): Promise<Zone> {
		return WarehouseMapper.toZone(await this.datasource.createZone({
			warehouse_id: input.warehouseId, zone_code: input.code,
			zone_name: input.name, zone_type: input.zoneType
		}));
	}
	async updateZone(input: UpdateZoneInput): Promise<Zone> {
		return WarehouseMapper.toZone(await this.datasource.updateZone(input.id, {
			...(input.code !== undefined ? { zone_code: input.code } : {}),
			...(input.name !== undefined ? { zone_name: input.name } : {}),
			...(input.zoneType !== undefined ? { zone_type: input.zoneType } : {}),
			...(input.active !== undefined ? { is_active: input.active } : {})
		}));
	}
	async deleteZone(id: number): Promise<void> {
		await this.datasource.deleteZone(id);
	}
	async createBin(input: CreateBinInput): Promise<Bin> {
		return WarehouseMapper.toBin(await this.datasource.createBin({
			warehouse_id: input.warehouseId, zone_id: input.zoneId, bin_code: input.code,
			bin_barcode: input.barcode, bin_type: input.binType, aisle: input.aisle,
			pick_sequence: input.pickSequence
		}));
	}
	async updateBin(input: UpdateBinInput): Promise<Bin> {
		return WarehouseMapper.toBin(await this.datasource.updateBin(input.id, {
			...(input.zoneId !== undefined ? { zone_id: input.zoneId } : {}),
			...(input.code !== undefined ? { bin_code: input.code } : {}),
			...(input.barcode !== undefined ? { bin_barcode: input.barcode } : {}),
			...(input.binType !== undefined ? { bin_type: input.binType } : {}),
			...(input.aisle !== undefined ? { aisle: input.aisle } : {}),
			...(input.pickSequence !== undefined ? { pick_sequence: input.pickSequence } : {}),
			...(input.active !== undefined ? { is_active: input.active } : {})
		}));
	}
	async deleteBin(id: number): Promise<void> {
		await this.datasource.deleteBin(id);
	}
	async getBinById(id: number): Promise<BinDetail> {
		return WarehouseMapper.toBinDetail(await this.datasource.getBinById(id));
	}
}
