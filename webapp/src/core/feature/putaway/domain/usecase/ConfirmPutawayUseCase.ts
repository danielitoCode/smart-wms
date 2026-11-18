import type { ConfirmPutawayInput, ConfirmPutawayResult } from '../entity/Putaway';
import type { PutawayRepository } from '../repository/PutawayRepository';

export class ConfirmPutawayUseCase {
	constructor(private readonly repository: PutawayRepository) {}
	execute(input: ConfirmPutawayInput): Promise<ConfirmPutawayResult> {
		if (!Number.isInteger(input.itemId) || input.itemId <= 0) throw new Error('itemId must be a positive integer');
		const fromBarcode = input.fromBinBarcode?.trim();
		const toBarcode = input.toBinBarcode?.trim();
		if ((!Number.isInteger(input.fromBinId) || (input.fromBinId ?? 0) <= 0) && !fromBarcode) throw new Error('A valid source bin ID or barcode is required');
		if ((!Number.isInteger(input.toBinId) || (input.toBinId ?? 0) <= 0) && !toBarcode) throw new Error('A valid destination bin ID or barcode is required');
		if (input.fromBinId != null && input.fromBinId === input.toBinId) throw new Error('Destination bin must differ from source bin');
		if (fromBarcode && toBarcode && fromBarcode.toUpperCase() === toBarcode.toUpperCase()) throw new Error('Destination barcode must differ from source barcode');
		if (!Number.isInteger(input.quantity) || input.quantity <= 0) throw new Error('quantity must be an integer greater than 0');
		return this.repository.confirm({ ...input, ...(fromBarcode ? { fromBinBarcode: fromBarcode } : {}), ...(toBarcode ? { toBinBarcode: toBarcode } : {}), lotNumber: input.lotNumber?.trim() || null });
	}
}
