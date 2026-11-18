import type { WarehouseManagementRepository } from '../repository/WarehouseManagementRepository';
export class DeleteBinUseCase {
	constructor(private readonly repository: WarehouseManagementRepository) {}
	async execute(id: number): Promise<void> {
		if (!Number.isInteger(id) || id <= 0) throw new Error('bin id must be a positive integer');
		await this.repository.deleteBin(id);
	}
}
