import type { PurchaseOrderDetail } from '../entity/PurchaseOrder';
import type { ReceivingRepository } from '../repository/ReceivingRepository';

export class LookupPurchaseOrderUseCase {
	constructor(private readonly repository: ReceivingRepository) {}

	execute(barcode: string): Promise<PurchaseOrderDetail> {
		const code = barcode?.trim() ?? '';
		if (!code) {
			throw new Error('barcode is required');
		}
		return this.repository.lookupByBarcode(code);
	}
}
