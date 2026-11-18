import type { ReceiveLineInput, ReceiveResult } from '../entity/PurchaseOrder';
import type { ReceivingRepository } from '../repository/ReceivingRepository';

export class ReceiveGoodsUseCase {
	constructor(private readonly repository: ReceivingRepository) {}

	execute(poId: number, items: ReceiveLineInput[]): Promise<ReceiveResult> {
		if (!Number.isInteger(poId) || poId <= 0) {
			throw new Error('poId must be a positive integer');
		}
		if (!Array.isArray(items) || items.length === 0) {
			throw new Error('items must not be empty');
		}
		for (const item of items) {
			if (!Number.isInteger(item.itemId) || item.itemId <= 0) {
				throw new Error('itemId must be a positive integer');
			}
			if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
				throw new Error('quantity must be an integer greater than 0');
			}
			if (!Number.isInteger(item.binId) || item.binId <= 0) {
				throw new Error('binId must be a positive integer');
			}
		}
		return this.repository.receive(poId, items);
	}
}
