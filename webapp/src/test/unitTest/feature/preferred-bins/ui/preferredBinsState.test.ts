import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Item } from '../../../../../core/feature/items/domain/entity/Item';
import { createPreferredBinsState } from '../../../../../core/feature/preferred-bins/ui/state/preferredBinsState.svelte';

const row = {
	preferredBinId: 91, itemId: 7, binId: 42, warehouseId: 3, priority: 1,
	updatedAt: null, sku: 'SKU-7', itemName: 'Test item', binCode: 'PICK-42', zoneName: 'Picking'
};

function createDependencies() {
	return {
		preferred: {
			list: { execute: vi.fn().mockResolvedValue([row]) },
			catalog: { execute: vi.fn().mockResolvedValue({
				warehouses: [
					{ id: 3, code: 'WH-3', name: 'Warehouse 3' },
					{ id: 4, code: 'WH-4', name: 'Warehouse 4' }
				],
				bins: [{ id: 42, warehouseId: 3, zoneId: 8, zoneName: 'Picking', code: 'PICK-42', barcode: null, binType: 'Pickable', active: true }],
				total: 1, page: 1, perPage: 1000, pages: 1
			}) },
			add: { execute: vi.fn().mockResolvedValue(undefined) },
			updatePriority: { execute: vi.fn().mockResolvedValue(undefined) },
			remove: { execute: vi.fn().mockResolvedValue(undefined) }
		},
		items: { searchItems: { execute: vi.fn().mockResolvedValue([]) } }
	};
}

const item = { id: 7, sku: 'SKU-7', name: 'Test item' } as Item;

describe('Preferred Bins UI state', () => {
	let dependencies: ReturnType<typeof createDependencies>;

	beforeEach(() => { dependencies = createDependencies(); });

	it('loads the global list and supports SKU/name search and warehouse filtering', async () => {
		const state = createPreferredBinsState(dependencies as never);
		await state.loadCatalogs();
		expect(state.rows).toEqual([row]);
		await state.searchRows('SKU-7');
		expect(dependencies.preferred.list.execute).toHaveBeenLastCalledWith({ search: 'SKU-7', warehouseId: undefined });
		await state.setWarehouseFilter(3);
		expect(dependencies.preferred.list.execute).toHaveBeenLastCalledWith({ search: 'SKU-7', warehouseId: 3 });
	});

	it('loads only active Pickable bins from the selected warehouse', async () => {
		const state = createPreferredBinsState(dependencies as never);
		await state.loadCatalogs();
		await state.chooseWarehouse(3);
		expect(state.binOptions.map(bin => bin.id)).toEqual([42]);
		expect(dependencies.preferred.catalog.execute).toHaveBeenCalledWith({
			warehouseId: 3, search: undefined, page: 1, perPage: 1000
		});
	});

	it('adds a relation with warehouse and bin-type context, then reloads the list', async () => {
		const state = createPreferredBinsState(dependencies as never);
		await state.loadCatalogs();
		await state.chooseWarehouse(3);
		state.chooseItem(item);
		state.setSelectedBinId(42);
		await expect(state.add()).resolves.toBe(true);
		expect(dependencies.preferred.add.execute).toHaveBeenCalledWith({
			itemId: 7, binId: 42, priority: 1, warehouseId: 3, binWarehouseId: 3, binType: 'Pickable'
		});
		expect(dependencies.preferred.list.execute).toHaveBeenCalledTimes(2);
	});

	it('does not keep a stale item selected after the user changes the item query', async () => {
		const state = createPreferredBinsState(dependencies as never);
		state.chooseItem(item);
		await state.searchItemCatalog('DIFFERENT');
		expect(state.selectedItem).toBeNull();
	});
});
