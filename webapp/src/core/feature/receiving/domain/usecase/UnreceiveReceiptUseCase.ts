import type { UnreceiveResult } from '../entity/PurchaseOrder';
import type { ReceivingRepository } from '../repository/ReceivingRepository';

export class UnreceiveReceiptUseCase {
	constructor(private readonly repository: ReceivingRepository) {}

	execute(receiptId: number, reason?: string): Promise<UnreceiveResult> {
		if (!Number.isInteger(receiptId) || receiptId <= 0) {
			throw new Error('receiptId must be a positive integer');
		}
		const normalizedReason = reason?.trim();
		if (normalizedReason && normalizedReason.length > 500) {
			throw new Error('reason must be 500 characters or fewer');
		}
		return this.repository.unreceiveReceipt(receiptId, normalizedReason || undefined);
	}
}
