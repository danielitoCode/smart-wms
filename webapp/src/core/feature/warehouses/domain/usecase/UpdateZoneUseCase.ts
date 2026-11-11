import type { UpdateZoneInput, Zone, ZoneType } from '../entity/Warehouse';
import type { WarehouseManagementRepository } from '../repository/WarehouseManagementRepository';
const TYPES: ZoneType[] = ['RECEIVING', 'STORAGE', 'PICKING', 'STAGING', 'SHIPPING'];
export class UpdateZoneUseCase {
	constructor(private readonly repository: WarehouseManagementRepository) {}
	async execute(input: UpdateZoneInput): Promise<Zone> {
		if (!Number.isInteger(input.id) || input.id <= 0) throw new Error('zone id must be a positive integer');
		const update: UpdateZoneInput = { id: input.id };
		if (input.code !== undefined) {
			const value = input.code.trim();
			if (!value || value.length > 32) throw new Error('zone code must contain 1 to 32 characters');
			update.code = value;
		}
		if (input.name !== undefined) {
			const value = input.name.trim();
			if (!value || value.length > 128) throw new Error('zone name must contain 1 to 128 characters');
			update.name = value;
		}
		if (input.zoneType !== undefined) {
			if (!TYPES.includes(input.zoneType)) throw new Error('zone type is invalid');
			update.zoneType = input.zoneType;
		}
		if (input.active !== undefined) update.active = input.active;
		if (Object.keys(update).length === 1) throw new Error('at least one zone field is required');
		return this.repository.updateZone(update);
	}
}
