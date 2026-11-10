import type { ConfirmPickInput, SimpleMessageResult } from '../entity/Picking';
import type { PickingRepository } from '../repository/PickingRepository';

export class ConfirmPickUseCase {
	constructor(private readonly repository: PickingRepository) {}

	execute(input: ConfirmPickInput): Promise<SimpleMessageResult> {
		if (!Number.isInteger(input.pickTaskId) || input.pickTaskId <= 0) {
			throw new Error('pickTaskId must be a positive integer');
		}
		const barcode = input.scannedBarcode?.trim() ?? '';
		if (!barcode) {
			throw new Error('scannedBarcode is required');
		}
		if (!Number.isInteger(input.quantityPicked) || input.quantityPicked <= 0) {
			throw new Error('quantityPicked must be an integer greater than 0');
		}
		return this.repository.confirm({
			...input,
			scannedBarcode: barcode
		});
	}
}
