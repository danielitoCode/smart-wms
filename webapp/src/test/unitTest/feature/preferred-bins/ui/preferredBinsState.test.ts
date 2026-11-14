import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Item } from '../../../../../core/feature/items/domain/entity/Item';
import type { Bin, Warehouse } from '../../../../../core/feature/warehouses/domain/entity/Warehouse';
import { createPreferredBinsState } from '../../../../../core/feature/preferred-bins/ui/state/preferredBinsState.svelte';

const row = {
	preferredBinId: 91, itemId: 7, binId: 42, warehouseId: 3, priority: 1,
	updatedAt: null, sku: 'SKU-7', itemName: 'Test item', binCode: 'PICK-42', zoneName: 'Picking'
};

function createDependencies() {
	return {
		preferred: {
			list: { execute: vi.fn().mockResolvedValue([row]) },
			add: { execute: vi.fn().mockResolvedValue(undefined) },
			updatePriority: { execute: vi.fn().mockResolvedValue(undefined) },
			remove: { execute: vi.fn().mockResolvedValue(undefined) }
		},
		items: { searchItems: { execute: vi.fn().mockResolvedValue([]) } },
		warehouses: {
			listAdminWarehouses: { execute: vi.fn().mockResolvedValue([
				{ id: 3, code: 'WH-3', name: 'Warehouse 3', address: null, active: true, createdAt: null },
				{ id: 4, code: 'WH-4', name: 'Warehouse 4', address: null, active: true, createdAt: null }
			] satisfies Warehouse[]) },
			listBins: { execute: vi.fn().mockResolvedValue({
				items: [{ id: 42, warehouseId: 3, zoneId: 8, zoneName: 'Picking', code: 'PICK-42', barcode: null, binType: 'Pickable', aisle: null, rowNumber: null, levelNumber: null, positionNumber: null, pickSequence: 1, putawaySequence: 1, active: true, maxWeightLbs: null, maxVolumeCuft: null, quantityOnHand: 0, quantityAllocated: 0, inventoryLines: 0 }] satisfies Bin[],
				page: 1, pages: 1, total: 1, perPage: 1000
			}) }
		}
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
		expect(dependencies.warehouses.listBins.execute).toHaveBeenCalledWith({
			warehouseId: 3, q: undefined, page: 1, perPage: 1000
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
