import type { ShippingOrderDetail } from '../entity/Shipping';
import type { ShippingRepository } from '../repository/ShippingRepository';

export class LoadShippingOrderUseCase {
	constructor(private readonly repository: ShippingRepository) {}

	execute(barcode: string): Promise<ShippingOrderDetail> {
		const code = barcode?.trim() ?? '';
		if (!code) throw new Error('barcode is required');
		return this.repository.loadOrder(code);
	}
}
