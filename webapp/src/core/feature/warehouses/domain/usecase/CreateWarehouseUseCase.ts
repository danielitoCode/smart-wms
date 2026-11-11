import type { CreateWarehouseInput, Warehouse } from '../entity/Warehouse';
import type { WarehouseManagementRepository } from '../repository/WarehouseManagementRepository';
export class CreateWarehouseUseCase {
	constructor(private readonly repository: WarehouseManagementRepository) {}
	async execute(input: CreateWarehouseInput): Promise<Warehouse> {
		const code = input.code?.trim() ?? '';
		const name = input.name?.trim() ?? '';
		if (!code) throw new Error('warehouse code is required');
		if (code.length > 32) throw new Error('warehouse code cannot exceed 32 characters');
		if (!name) throw new Error('warehouse name is required');
		if (name.length > 256) throw new Error('warehouse name cannot exceed 256 characters');
		if ((input.address ?? '').length > 512) throw new Error('warehouse address cannot exceed 512 characters');
		return this.repository.createWarehouse({ code, name, address: input.address?.trim() || null });
	}
}
