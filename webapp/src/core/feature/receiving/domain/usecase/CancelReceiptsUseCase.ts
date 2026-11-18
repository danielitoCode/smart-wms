import type { CancelReceiptsResult } from '../entity/PurchaseOrder';
import type { ReceivingRepository } from '../repository/ReceivingRepository';

export class CancelReceiptsUseCase {
	constructor(private readonly repository: ReceivingRepository) {}

	execute(poId: number, receiptIds: number[]): Promise<CancelReceiptsResult> {
		if (!Number.isInteger(poId) || poId <= 0) {
			throw new Error('poId must be a positive integer');
		}
		if (!Array.isArray(receiptIds) || receiptIds.length === 0) {
			throw new Error('receiptIds must not be empty');
		}
		if (receiptIds.some((id) => !Number.isInteger(id) || id <= 0)) {
			throw new Error('each receiptId must be a positive integer');
		}
		return this.repository.cancelReceipts(poId, receiptIds);
	}
}
