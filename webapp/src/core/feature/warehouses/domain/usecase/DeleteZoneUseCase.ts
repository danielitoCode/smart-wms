import type { WarehouseManagementRepository } from '../repository/WarehouseManagementRepository';
export class DeleteZoneUseCase {
	constructor(private readonly repository: WarehouseManagementRepository) {}
	async execute(id: number): Promise<void> {
		if (!Number.isInteger(id) || id <= 0) throw new Error('zone id must be a positive integer');
		await this.repository.deleteZone(id);
	}
}
