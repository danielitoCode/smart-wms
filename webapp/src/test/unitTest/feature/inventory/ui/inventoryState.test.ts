import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	getInventoryOverview: { execute: vi.fn() },
	getItemInventory: { execute: vi.fn() },
	lookupBarcode: { execute: vi.fn() },
	listAdminWarehouses: { execute: vi.fn() },
	listBins: { execute: vi.fn() },
	lookupOperationalBin: { execute: vi.fn() }
}));
const selection = { warehouseId: 1, generation: 0, requireWarehouseId: () => selection.warehouseId };

vi.mock('svelte', () => ({ getContext: () => selection }));
vi.mock('../../../../../core/feature/inventory/di/inventory.dependencies', () => ({
	createInventoryDependencies: () => mocks
}));
vi.mock('../../../../../core/feature/warehouses/di/warehouses.dependencies', () => ({
	createWarehousesDependencies: () => mocks
}));

import { createInventoryOverviewState } from '../../../../../core/feature/inventory/ui/state/inventoryState.svelte';
import { notifyWarehouseChanged, resetWarehouseRequestScopeForTests } from '../../../../../core/infrastructure/warehouse/WarehouseRequestScope';

const page = (items: Array<Record<string, unknown>> = []) => ({
	items, page: 1, perPage: 50, total: items.length, pages: 1
});

const deferred = <T,>() => {
	let resolve!: (value: T) => void;
	let reject!: (reason?: unknown) => void;
	const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
	return { promise, resolve, reject };
};

describe('inventory lookup state', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		resetWarehouseRequestScopeForTests();
		selection.warehouseId = 1;
		selection.generation = 0;
		mocks.listAdminWarehouses.execute.mockResolvedValue([
			{ id: 1, code: 'WH-1', name: 'Warehouse 1' },
			{ id: 2, code: 'WH-2', name: 'Warehouse 2' }
		]);
		mocks.listBins.execute.mockResolvedValue({ items: [] });
		mocks.getInventoryOverview.execute.mockResolvedValue(page());
		mocks.getItemInventory.execute.mockResolvedValue(page());
	});

	it('loads item barcode stock only for the selected warehouse', async () => {
		mocks.lookupBarcode.execute.mockResolvedValue({ itemId: 12, sku: 'SKU-12', itemName: 'Bearing', upc: '0012' });
		const state = createInventoryOverviewState();
		await state.initialize();
		await expect(state.lookupBarcode('0012')).resolves.toBe(true);
		expect(mocks.getItemInventory.execute).toHaveBeenCalledWith(12, { warehouseId: 1, page: 1, perPage: 50 });
		expect(state.itemBarcodeResult?.itemId).toBe(12);
	});

	it('loads bin contents and rejects a bin outside the selected warehouse', async () => {
		mocks.lookupOperationalBin.execute.mockResolvedValue({
			bin: { id: 7, warehouseId: 2, code: 'B-02', barcode: 'B02', binType: 'Pickable', zoneName: null, aisle: null, rowNumber: null, levelNumber: null },
			items: []
		});
		const state = createInventoryOverviewState();
		await state.initialize();
		await expect(state.lookupBinContents('B02')).resolves.toBe(false);
		expect(state.lookupError).toMatch(/no pertenece al almacén seleccionado/i);
		expect(state.binContentsResult).toBeNull();
		expect(mocks.getInventoryOverview.execute).toHaveBeenCalledTimes(1);
	});

	it('surfaces lookup API errors without replacing the current inventory', async () => {
		mocks.lookupBarcode.execute.mockRejectedValue(new Error('404 item not found'));
		const state = createInventoryOverviewState();
		await state.initialize();
		await expect(state.lookupBarcode('missing')).resolves.toBe(false);
		expect(state.lookupError).toMatch(/404|not found|encontrar/i);
		expect(state.items).toEqual([]);
	});

	it('drops a late inventory response after the warehouse generation changes', async () => {
		const pending = deferred<ReturnType<typeof page>>();
		mocks.getInventoryOverview.execute.mockReturnValueOnce(pending.promise);
		const state = createInventoryOverviewState();
		const loading = state.load({ warehouseId: 1 });
		await vi.waitFor(() => expect(mocks.getInventoryOverview.execute).toHaveBeenCalledTimes(1));
		selection.warehouseId = 2;
		selection.generation = notifyWarehouseChanged();
		pending.resolve(page([{ inventoryId: 99, itemId: 9 }]));
		await loading;
		expect(state.items).toEqual([]);
	});

	it('drops a late barcode result after changing warehouse context', async () => {
		const pending = deferred<{ itemId: number; sku: string; itemName: string; upc: string | null }>();
		mocks.lookupBarcode.execute.mockReturnValueOnce(pending.promise);
		const state = createInventoryOverviewState();
		await state.initialize();
		const lookup = state.lookupBarcode('0012');
		selection.warehouseId = 2;
		selection.generation = notifyWarehouseChanged();
		pending.resolve({ itemId: 12, sku: 'SKU-12', itemName: 'Bearing', upc: '0012' });
		await lookup;
		expect(state.itemBarcodeResult).toBeNull();
		expect(mocks.getItemInventory.execute).not.toHaveBeenCalled();
	});

	it('clears previous lookup results immediately when the selected warehouse changes', async () => {
		mocks.lookupBarcode.execute.mockResolvedValue({ itemId: 12, sku: 'SKU-12', itemName: 'Bearing', upc: '0012' });
		const state = createInventoryOverviewState();
		await state.initialize();
		await state.lookupBarcode('0012');
		expect(state.itemBarcodeResult).not.toBeNull();
		state.setWarehouseId(2);
		expect(state.itemBarcodeResult).toBeNull();
		expect(state.binContentsResult).toBeNull();
	});
});
