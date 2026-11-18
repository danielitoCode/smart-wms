import { beforeEach, describe, expect, it, vi } from 'vitest';

const deps = vi.hoisted(() => ({
	getWarehouse: { execute: vi.fn() },
	listZones: { execute: vi.fn() },
	listBins: { execute: vi.fn() },
	createZone: { execute: vi.fn() },
	updateZone: { execute: vi.fn() },
	deleteZone: { execute: vi.fn() },
	createBin: { execute: vi.fn() },
	updateBin: { execute: vi.fn() },
	deleteBin: { execute: vi.fn() },
	getBinDetail: { execute: vi.fn() }
}));

vi.mock('../../../../../core/feature/warehouses/di/warehouses.dependencies', () => ({
	createWarehousesDependencies: () => deps
}));
vi.mock('../../../../../core/infrastructure/auth/AuthSession', () => ({
	authSession: { getUser: () => ({ role: 'ADMIN', allowedPages: ['warehouses', 'zones', 'bins'] }) }
}));

import { createWarehouseDetailState } from '../../../../../core/feature/warehouses/ui/state/warehouseDetailState.svelte';

const zone = { id: 11, warehouseId: 1, code: 'PICK', name: 'Picking', zoneType: 'PICKING' as const, active: true, binsCount: 2 };
const binPage = { items: [], total: 0, page: 1, pages: 1, perPage: 50 };

describe('WarehouseDetailState zone and bins interactions', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		deps.getWarehouse.execute.mockResolvedValue({ id: 1, code: 'WH-01', name: 'Central', address: null, active: true, createdAt: null });
		deps.listZones.execute.mockResolvedValue([zone]);
		deps.listBins.execute.mockResolvedValue(binPage);
		deps.createZone.execute.mockResolvedValue(zone);
		deps.updateZone.execute.mockResolvedValue(zone);
		deps.deleteZone.execute.mockResolvedValue({ message: 'Zone deleted' });
	});

	it('opens the bins workspace filtered to the requested zone', async () => {
		const state = createWarehouseDetailState(1, true);
		expect(await state.load(11)).toBe(true);
		expect(state.selectedZoneId).toBe(11);
		expect(deps.listBins.execute).toHaveBeenCalledWith({ warehouseId: 1, zoneId: 11, page: 1, perPage: 50 });
	});

	it('rejects a requested zone that does not belong to the active warehouse', async () => {
		const state = createWarehouseDetailState(1, true);
		expect(await state.load(99)).toBe(false);
		expect(state.error).toContain('no pertenece al almacén activo');
		expect(deps.listBins.execute).not.toHaveBeenCalled();
	});

	it('keeps duplicate-code API errors visible after create', async () => {
		deps.createZone.execute.mockRejectedValueOnce(new Error("Duplicate zone_code 'PICK' in warehouse 1"));
		const state = createWarehouseDetailState(1, false);
		await state.load();
		expect(await state.createZone({ code: 'PICK', name: 'Duplicate', zoneType: 'PICKING' })).toBe(false);
		expect(state.error).toContain('Duplicate zone_code');
	});

	it('keeps 409 location restriction visible and does not clear the delete target state', async () => {
		deps.deleteZone.execute.mockRejectedValueOnce(new Error('Zone cannot be deleted because 2 bin(s) are assigned'));
		const state = createWarehouseDetailState(1, false);
		await state.load();
		expect(await state.removeZone(11)).toBe(false);
		expect(state.error).toContain('2 bin(s)');
		expect(deps.deleteZone.execute).toHaveBeenCalledWith(11);
	});

	it('blocks mutation when the selected zone belongs to another warehouse', async () => {
		const state = createWarehouseDetailState(2, false);
		deps.listZones.execute.mockResolvedValueOnce([zone]);
		await state.load();
		expect(await state.updateZone({ id: 11, name: 'Wrong warehouse' })).toBe(false);
		expect(state.error).toContain('does not belong');
		expect(deps.updateZone.execute).not.toHaveBeenCalled();
	});
	it('searches bins within the active warehouse and selected zone', async () => {
		const state = createWarehouseDetailState(1, true);
		await state.load(11);
		await state.searchBins(' A-01 ');
		expect(deps.listBins.execute).toHaveBeenLastCalledWith({
			warehouseId: 1, zoneId: 11, page: 1, perPage: 50, q: 'A-01'
		});
	});

	it('applies bin type filter without losing warehouse, zone or text filters', async () => {
		const state = createWarehouseDetailState(1, true);
		await state.load(11);
		await state.searchBins('A-01');
		await state.filterBinsByType('Pickable');
		expect(deps.listBins.execute).toHaveBeenLastCalledWith({
			warehouseId: 1, zoneId: 11, binType: 'Pickable', page: 1, perPage: 50, q: 'A-01'
		});
	});

	it('creates a bin with the active warehouse and optional capacity', async () => {
		const state = createWarehouseDetailState(1, true);
		await state.load(11);
		await state.createBin({
			zoneId: 11, code: 'A-02', barcode: 'BC-02', binType: 'Pickable',
			maxWeightLbs: 120.5, maxVolumeCuft: 18
		});
		expect(deps.createBin.execute).toHaveBeenCalledWith(expect.objectContaining({
			warehouseId: 1, zoneId: 11, code: 'A-02', maxWeightLbs: 120.5, maxVolumeCuft: 18
		}));
	});

	it('loads bin detail and exposes the inventory projection', async () => {
		const detail = { bin: { id: 3, warehouseId: 1, zoneId: 11, code: 'A-01', binType: 'Pickable' }, inventory: [], occupancy: { quantityOnHand: 0, quantityAllocated: 0, quantityAvailable: 0, inventoryLines: 0 } };
		deps.getBinDetail.execute.mockResolvedValueOnce(detail);
		const state = createWarehouseDetailState(1, true);
		await state.load();
		expect(await state.viewBin(3)).toBe(true);
		expect(state.selectedBinDetail).toEqual(detail);
	});

	it('updates a bin and reloads the current filtered page', async () => {
		deps.listBins.execute.mockResolvedValueOnce(binPage).mockResolvedValueOnce({ ...binPage, page: 2 });
		const state = createWarehouseDetailState(1, true);
		await state.load(11);
		await state.loadBinsForZone(11, 2);
		await state.updateBin({ id: 3, pickSequence: 9 });
		expect(deps.updateBin.execute).toHaveBeenCalledWith({ id: 3, pickSequence: 9 });
		expect(deps.listBins.execute).toHaveBeenLastCalledWith({ warehouseId: 1, zoneId: 11, page: 2, perPage: 50 });
	});

	it('rejects create and update when the selected zone is outside the active warehouse', async () => {
		const state = createWarehouseDetailState(1, true);
		await state.load();
		const createResult = await state.createBin({ zoneId: 99, code: 'BAD', barcode: 'BAD', binType: 'Pickable' });
		expect(createResult).toBe(false);
		expect(deps.createBin.execute).not.toHaveBeenCalled();
		const updateResult = await state.updateBin({ id: 3, zoneId: 99 });
		expect(updateResult).toBe(false);
		expect(deps.updateBin.execute).not.toHaveBeenCalled();
		expect(state.error).toContain('does not belong');
	});

	it('keeps stock and preferred-bin deletion conflicts visible', async () => {
		deps.deleteBin.execute.mockRejectedValueOnce(new Error('Bin cannot be deleted because inventory remains'));
		const state = createWarehouseDetailState(1, true);
		await state.load();
		expect(await state.removeBin(3)).toBe(false);
		expect(state.error).toContain('inventory remains');
	});

});
