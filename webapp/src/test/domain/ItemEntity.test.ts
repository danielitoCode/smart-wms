import { describe, expect, it } from 'vitest';
import type { Item } from '../../core/feature/items/domain/entity/Item';

describe('Item domain contract', () => {
	it('keeps nullable catalog attributes explicit and status boolean', () => {
		const item = {
			id: 7,
			sku: 'SKU-7',
			name: 'Producto de prueba',
			description: null,
			upc: null,
			mpn: null,
			barcodeAliases: [],
			category: null,
			weightLbs: null,
			lengthIn: null,
			widthIn: null,
			heightIn: null,
			defaultBinId: null,
			defaultBinCode: null,
			reorderPoint: null,
			reorderQty: null,
			isLotTracked: false,
			isSerialTracked: false,
			active: true,
			createdAt: null,
			updatedAt: null
		} satisfies Item;
		expect(item.id).toBe(7);
		expect(item.upc).toBeNull();
		expect(item.active).toBe(true);
	});
});
