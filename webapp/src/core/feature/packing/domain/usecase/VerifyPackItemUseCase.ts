import type { SimpleMessageResult, VerifyPackInput } from '../entity/Packing';
import type { PackingRepository } from '../repository/PackingRepository';

export class VerifyPackItemUseCase {
	constructor(private readonly repository: PackingRepository) {}

	execute(input: VerifyPackInput): Promise<SimpleMessageResult> {
		if (!Number.isInteger(input.soId) || input.soId <= 0) {
			throw new Error('soId must be a positive integer');
		}
		const scannedBarcode = input.scannedBarcode?.trim() ?? '';
		if (!scannedBarcode) throw new Error('scannedBarcode is required');
		const quantity = input.quantity ?? 1;
		if (!Number.isInteger(quantity) || quantity <= 0) {
			throw new Error('quantity must be an integer greater than 0');
		}
		return this.repository.verify({ soId: input.soId, scannedBarcode, quantity });
	}
}
