import { beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({ user: { role: 'ADMIN', allowedPages: ['warehouses', 'zones', 'bins'] } }));

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
	authSession: { getUser: () => auth.user }
}));

import { createWarehouseDetailState } from '../../../../../core/feature/warehouses/ui/state/warehouseDetailState.svelte';
import { notifyWarehouseChanged, resetWarehouseRequestScopeForTests } from '../../../../../core/infrastructure/warehouse/WarehouseRequestScope';

const zone = { id: 11, warehouseId: 1, code: 'PICK', name: 'Picking', zoneType: 'PICKING' as const, active: true, binsCount: 2 };
const bin = { id: 3, warehouseId: 1, zoneId: 11, zoneName: 'Picking', code: 'A-01', barcode: 'BC-01', binType: 'Pickable' as const, aisle: 'A', rowNumber: 1, levelNumber: 1, positionNumber: 1, pickSequence: 1, putawaySequence: 1, active: true, maxWeightLbs: 100, maxVolumeCuft: 20, quantityOnHand: 0, quantityAllocated: 0, inventoryLines: 0 };
const binPage = { items: [bin], total: 1, page: 1, pages: 1, perPage: 50 };

describe('WarehouseDetailState zone and bins interactions', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		resetWarehouseRequestScopeForTests();
		auth.user = { role: 'ADMIN', allowedPages: ['warehouses', 'zones', 'bins'] };
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
		const detail = { bin: { ...bin }, inventory: [], occupancy: { quantityOnHand: 0, quantityAllocated: 0, quantityAvailable: 0, inventoryLines: 0 } };
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


	it('supports the Bins grant without requiring the Zones grant', async () => {
		auth.user = { role: 'USER', allowedPages: ['bins'] };
		const state = createWarehouseDetailState(1, true, false);
		expect(await state.load()).toBe(true);
		expect(deps.listZones.execute).not.toHaveBeenCalled();
		expect(deps.listBins.execute).toHaveBeenCalledWith({ warehouseId: 1, page: 1, perPage: 50 });
		expect(await state.updateBin({ id: 3, pickSequence: 4 })).toBe(true);
		expect(deps.updateBin.execute).toHaveBeenCalledWith({ id: 3, pickSequence: 4 });
	});

	it('supports the Zones grant without requiring the Bins grant', async () => {
		auth.user = { role: 'USER', allowedPages: ['zones'] };
		const state = createWarehouseDetailState(1, false, true);
		expect(await state.load()).toBe(true);
		expect(deps.listZones.execute).toHaveBeenCalledWith(1);
		expect(deps.listBins.execute).not.toHaveBeenCalled();
	});

	it('rejects a bins response containing a different warehouse', async () => {
		deps.listBins.execute.mockResolvedValueOnce({ ...binPage, items: [{ ...bin, warehouseId: 2 }] });
		const state = createWarehouseDetailState(1, true);
		expect(await state.load()).toBe(false);
		expect(state.error).toContain('another warehouse');
		expect(state.bins).toEqual([]);
	});

	it('rejects a bin detail from another warehouse and clears the selected detail', async () => {
		deps.getBinDetail.execute.mockResolvedValueOnce({
			bin: { ...bin, warehouseId: 2 }, inventory: [],
			occupancy: { quantityOnHand: 0, quantityAllocated: 0, quantityAvailable: 0, inventoryLines: 0 }
		});
		const state = createWarehouseDetailState(1, true);
		await state.load();
		expect(await state.viewBin(3)).toBe(false);
		expect(state.selectedBinDetail).toBeNull();
		expect(state.error).toContain('another warehouse');
	});

	it('does not mutate a bin absent from the active warehouse result', async () => {
		const state = createWarehouseDetailState(1, true);
		await state.load();
		expect(await state.removeBin(999)).toBe(false);
		expect(deps.deleteBin.execute).not.toHaveBeenCalled();
		expect(await state.updateBin({ id: 999, pickSequence: 8 })).toBe(false);
		expect(deps.updateBin.execute).not.toHaveBeenCalled();
	});

	it.each([
		[400, 'duplicate bin_code'],
		[404, 'Bin not found'],
		[409, 'Bin cannot be deleted because preferred-bin references exist']
	])('preserves Flask %s errors for bin mutations', async (status, message) => {
		deps.deleteBin.execute.mockRejectedValueOnce(Object.assign(new Error(message), { status }));
		const state = createWarehouseDetailState(1, true);
		await state.load();
		expect(await state.removeBin(3)).toBe(false);
		expect(state.error).toContain(message);
	});

	it('preserves Flask 400 and 404 errors for zone mutations and lookup', async () => {
		const state = createWarehouseDetailState(1, true);
		await state.load();
		deps.createZone.execute.mockRejectedValueOnce(Object.assign(new Error('Duplicate zone_code'), { status: 400 }));
		expect(await state.createZone({ code: 'PICK', name: 'Duplicate', zoneType: 'PICKING' })).toBe(false);
		expect(state.error).toContain('Duplicate zone_code');
		deps.getBinDetail.execute.mockRejectedValueOnce(Object.assign(new Error('Bin not found'), { status: 404 }));
		expect(await state.viewBin(404)).toBe(false);
		expect(state.error).toContain('Bin not found');
	});


	it('drops a zones response after the active warehouse generation changes', async () => {
		let resolveZones!: (value: typeof zone[]) => void;
		deps.listZones.execute.mockImplementationOnce(() => new Promise<typeof zone[]>((resolve) => { resolveZones = resolve; }));
		const state = createWarehouseDetailState(1, true, true);
		const pending = state.load();
		await Promise.resolve();
		await Promise.resolve();
		notifyWarehouseChanged();
		resolveZones([zone]);
		expect(await pending).toBe(false);
		expect(deps.listBins.execute).not.toHaveBeenCalled();
	});

	it('rejects bins returned for a different zone even when warehouse matches', async () => {
		deps.listBins.execute.mockResolvedValueOnce({ ...binPage, items: [{ ...bin, zoneId: 12 }] });
		const state = createWarehouseDetailState(1, true, true);
		expect(await state.load(11)).toBe(false);
		expect(state.error).toContain('selected zone');
		expect(state.bins).toEqual([]);
	});

});
