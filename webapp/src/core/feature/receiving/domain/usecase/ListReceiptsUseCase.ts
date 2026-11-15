import type { ReceiptHistoryItem } from '../entity/PurchaseOrder';
import type { ReceivingRepository } from '../repository/ReceivingRepository';

export class ListReceiptsUseCase {
	constructor(private readonly repository: ReceivingRepository) {}

	execute(poId: number): Promise<ReceiptHistoryItem[]> {
		if (!Number.isInteger(poId) || poId <= 0) {
			throw new Error('poId must be a positive integer');
		}
		return this.repository.listReceipts(poId);
	}
}
