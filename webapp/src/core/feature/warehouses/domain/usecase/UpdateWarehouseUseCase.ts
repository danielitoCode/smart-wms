import type { UpdateWarehouseInput, Warehouse } from '../entity/Warehouse';
import type { WarehouseManagementRepository } from '../repository/WarehouseManagementRepository';
export class UpdateWarehouseUseCase {
	constructor(private readonly repository: WarehouseManagementRepository) {}
	async execute(input: UpdateWarehouseInput): Promise<Warehouse> {
		if (!Number.isInteger(input.id) || input.id <= 0) throw new Error('warehouse id must be a positive integer');
		const update: UpdateWarehouseInput = { id: input.id };
		if (input.code !== undefined) {
			const value = input.code.trim();
			if (!value || value.length > 32) throw new Error('warehouse code must contain 1 to 32 characters');
			update.code = value;
		}
		if (input.name !== undefined) {
			const value = input.name.trim();
			if (!value || value.length > 256) throw new Error('warehouse name must contain 1 to 256 characters');
			update.name = value;
		}
		if (input.address !== undefined) {
			if (input.address !== null && input.address.length > 512) throw new Error('warehouse address cannot exceed 512 characters');
			update.address = input.address?.trim() || null;
		}
		if (input.active !== undefined) update.active = input.active;
		if (Object.keys(update).length === 1) throw new Error('at least one warehouse field is required');
		return this.repository.updateWarehouse(update);
	}
}
