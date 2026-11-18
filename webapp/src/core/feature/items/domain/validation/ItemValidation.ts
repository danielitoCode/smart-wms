import type { ItemWriteInput } from '../entity/Item';

export function validateItemWrite(input: ItemWriteInput, partial = false): void {
	const sku = input.sku?.trim();
	const name = input.itemName?.trim();

	if (!partial || input.sku !== undefined) {
		if (!sku) throw new Error('SKU is required');
		if (sku.length > 128) throw new Error('SKU must be at most 128 characters');
	}
	if (!partial || input.itemName !== undefined) {
		if (!name) throw new Error('Item name is required');
		if (name.length > 256) throw new Error('Item name must be at most 256 characters');
	}
	if (input.description != null && input.description.length > 1000) {
		throw new Error('Description must be at most 1000 characters');
	}
	if (input.upc != null && input.upc.length > 128) {
		throw new Error('UPC must be at most 128 characters');
	}
	if (input.mpn != null && input.mpn.length > 64) {
		throw new Error('MPN must be at most 64 characters');
	}
	if (input.category != null && input.category.length > 128) {
		throw new Error('Category must be at most 128 characters');
	}
	if (input.weightLbs != null) {
		if (!Number.isFinite(input.weightLbs) || input.weightLbs < 0 || input.weightLbs > 99999) {
			throw new Error('Weight must be between 0 and 99999');
		}
	}
	if (input.defaultBinId != null && (!Number.isInteger(input.defaultBinId) || input.defaultBinId < 1)) {
		throw new Error('default_bin_id must be a positive integer');
	}
	if (input.reorderPoint != null && (!Number.isInteger(input.reorderPoint) || input.reorderPoint < 0)) {
		throw new Error('reorder_point must be >= 0');
	}
	if (input.reorderQty != null && (!Number.isInteger(input.reorderQty) || input.reorderQty < 0)) {
		throw new Error('reorder_qty must be >= 0');
	}
}
