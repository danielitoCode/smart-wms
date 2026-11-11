import type { BinDetail } from '../entity/Warehouse';
import type { WarehouseManagementRepository } from '../repository/WarehouseManagementRepository';
export class GetBinDetailUseCase {
	constructor(private readonly repository: WarehouseManagementRepository) {}
	async execute(id: number): Promise<BinDetail> {
		if (!Number.isInteger(id) || id <= 0) throw new Error('bin id must be a positive integer');
		return this.repository.getBinById(id);
	}
}
