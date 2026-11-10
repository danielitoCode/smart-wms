import type { FulfillShipmentInput, FulfillShipmentResult } from '../entity/Shipping';
import type { ShippingRepository } from '../repository/ShippingRepository';

export class FulfillShipmentUseCase {
	constructor(private readonly repository: ShippingRepository) {}

	execute(input: FulfillShipmentInput): Promise<FulfillShipmentResult> {
		if (!Number.isInteger(input.soId) || input.soId <= 0) {
			throw new Error('soId must be a positive integer');
		}
		const trackingNumber = input.trackingNumber?.trim() ?? '';
		if (!trackingNumber) throw new Error('tracking_number is required');
		if (trackingNumber.length > 255) throw new Error('tracking_number max length is 255');
		const carrier = input.carrier?.trim() ?? '';
		if (!carrier) throw new Error('carrier is required');
		if (carrier.length > 100) throw new Error('carrier max length is 100');
		return this.repository.fulfill({
			soId: input.soId,
			trackingNumber,
			carrier,
			shipMethod: input.shipMethod?.trim() || null
		});
	}
}
