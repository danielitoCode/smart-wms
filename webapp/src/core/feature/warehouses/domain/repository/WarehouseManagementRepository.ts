import type {
	Bin, BinDetail, CreateBinInput, CreateWarehouseInput, CreateZoneInput,
	UpdateBinInput, UpdateWarehouseInput, UpdateZoneInput, Warehouse, Zone
} from '../entity/Warehouse';
import type { WarehouseRepository } from './WarehouseRepository';

export interface WarehouseManagementRepository extends WarehouseRepository {
	createWarehouse(input: CreateWarehouseInput): Promise<Warehouse>;
	updateWarehouse(input: UpdateWarehouseInput): Promise<Warehouse>;
	deleteWarehouse(id: number): Promise<void>;
	createZone(input: CreateZoneInput): Promise<Zone>;
	updateZone(input: UpdateZoneInput): Promise<Zone>;
	deleteZone(id: number): Promise<void>;
	createBin(input: CreateBinInput): Promise<Bin>;
	updateBin(input: UpdateBinInput): Promise<Bin>;
	deleteBin(id: number): Promise<void>;
	getBinById(id: number): Promise<BinDetail>;
}
