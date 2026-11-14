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
});
