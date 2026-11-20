import type { ItemBarcodeLookup } from '../entity/ItemBarcodeLookup';
import type { InventoryRepository } from '../repository/InventoryRepository';

export class LookupBarcodeUseCase {
	constructor(private readonly repository: InventoryRepository) {}

	execute(barcode: string): Promise<ItemBarcodeLookup> {
		const normalized = barcode.trim();
		if (!normalized) throw new Error('item barcode is required');
		if (normalized.length > 128) throw new Error('item barcode cannot exceed 128 characters');
		return this.repository.lookupBarcode(normalized);
	}
}
