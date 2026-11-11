import type { CreateZoneInput, Zone, ZoneType } from '../entity/Warehouse';
import type { WarehouseManagementRepository } from '../repository/WarehouseManagementRepository';
const TYPES: ZoneType[] = ['RECEIVING', 'STORAGE', 'PICKING', 'STAGING', 'SHIPPING'];
export class CreateZoneUseCase {
	constructor(private readonly repository: WarehouseManagementRepository) {}
	async execute(input: CreateZoneInput): Promise<Zone> {
		const code = input.code?.trim() ?? '', name = input.name?.trim() ?? '';
		if (!Number.isInteger(input.warehouseId) || input.warehouseId <= 0) throw new Error('warehouseId must be a positive integer');
		if (!code || code.length > 32) throw new Error('zone code must contain 1 to 32 characters');
		if (!name || name.length > 128) throw new Error('zone name must contain 1 to 128 characters');
		if (!TYPES.includes(input.zoneType)) throw new Error('zone type is invalid');
		return this.repository.createZone({ ...input, code, name });
	}
}
