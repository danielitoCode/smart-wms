import type { ReceivingBin } from '../entity/PurchaseOrder';
import type { ReceivingRepository } from '../repository/ReceivingRepository';

export class ListReceivingBinsUseCase {
	constructor(private readonly repository: ReceivingRepository) {}

	execute(warehouseId: number): Promise<ReceivingBin[]> {
		if (!Number.isInteger(warehouseId) || warehouseId <= 0) {
			throw new Error('warehouseId must be a positive integer');
		}
		return this.repository.listBins(warehouseId);
	}
}
