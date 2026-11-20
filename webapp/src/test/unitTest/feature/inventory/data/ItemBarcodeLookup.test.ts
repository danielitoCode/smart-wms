import { describe, expect, it, vi } from 'vitest';
import { InventoryRemoteDataSource } from '../../../../../core/feature/inventory/data/datasource/InventoryRemoteDataSource';
import { InventoryRepositoryImpl } from '../../../../../core/feature/inventory/data/repository/InventoryRepositoryImpl';
import type { ApiClient } from '../../../../../core/infrastructure/api/ApiClient';

describe('item barcode lookup', () => {
	it('calls Flask exact item lookup with an encoded barcode', async () => {
		const response = { item: { item_id: 8, sku: 'SKU-8', item_name: 'Bearing', upc: '001234' }, locations: [] };
		const api = { get: vi.fn().mockResolvedValue(response) } as unknown as ApiClient;
		const source = new InventoryRemoteDataSource(api);
		await expect(source.lookupBarcode('00/1234')).resolves.toEqual(response);
		expect(api.get).toHaveBeenCalledWith('/api/lookup/item/00%2F1234');
	});

	it('maps only the item identity into the domain result', async () => {
		const source = {
			lookupBarcode: vi.fn().mockResolvedValue({
				item: { item_id: 8, sku: 'SKU-8', item_name: 'Bearing', upc: '001234' },
				locations: [{ bin_id: 4, bin_code: 'A-01', quantity_on_hand: 5 }]
			})
		} as unknown as InventoryRemoteDataSource;
		const repository = new InventoryRepositoryImpl(source);
		await expect(repository.lookupBarcode('001234')).resolves.toEqual({
			itemId: 8, sku: 'SKU-8', itemName: 'Bearing', upc: '001234'
		});
	});
});
