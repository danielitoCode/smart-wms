import type { FulfillShipmentInput, FulfillShipmentResult } from '../entity/Shipping';
import { isR6ShippingExecutionAvailable, R6OperationNotSupportedError } from '../../../picking/domain/contract/R6PickingLifecycleContract';
import type { ShippingRepository } from '../repository/ShippingRepository';

export class FulfillShipmentUseCase {
	constructor(private readonly repository: ShippingRepository) {}

	execute(input: FulfillShipmentInput): Promise<FulfillShipmentResult> {
		if (!Number.isInteger(input.soId) || input.soId <= 0) {
			throw new Error('soId must be a positive integer');
		}
		if (!Number.isInteger(input.warehouseId) || input.warehouseId <= 0) throw new Error('warehouseId is required');
		const trackingNumber = input.trackingNumber?.trim() ?? '';
		if (!trackingNumber) throw new Error('tracking_number is required');
		if (trackingNumber.length > 255) throw new Error('tracking_number max length is 255');
		const carrier = input.carrier?.trim() ?? '';
		if (!carrier) throw new Error('carrier is required');
		if (carrier.length > 100) throw new Error('carrier max length is 100');
		// Enforce the server capability at the application boundary as well as in UI state.
		// Direct callers must not bypass the physical-package validation gate.
		if (!isR6ShippingExecutionAvailable()) {
			throw new R6OperationNotSupportedError('validateShipmentPackage');
		}
		return this.repository.fulfill({
			soId: input.soId,
			warehouseId: input.warehouseId,
			trackingNumber,
			carrier,
			shipMethod: input.shipMethod?.trim() || null
		});
	}
}
