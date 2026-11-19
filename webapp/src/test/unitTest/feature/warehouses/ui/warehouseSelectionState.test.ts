import { beforeEach, describe, expect, it, vi } from 'vitest';

const dependencies = vi.hoisted(() => ({
	listWarehouses: { execute: vi.fn() },
	listAdminWarehouses: { execute: vi.fn() }
}));

vi.mock('../../../../../core/feature/warehouses/di/warehouses.dependencies', () => ({
	createWarehousesDependencies: () => dependencies
}));

import { createWarehouseSelectionState } from '../../../../../core/feature/warehouses/ui/state/warehouseSelectionState.svelte';
import { beginWarehouseScopedRequest, resetWarehouseRequestScopeForTests } from '../../../../../core/infrastructure/warehouse/WarehouseRequestScope';

const warehouse = (id: number) => ({
	id, code: 'WH-' + id, name: 'Warehouse ' + id, address: null, active: true, createdAt: null
	it('aborts work from the previous warehouse when the active selection changes', async () => {
		const state = createWarehouseSelectionState();
		await state.load({
			userId: 4, username: 'zone-user', fullName: 'Zone User', role: 'USER',
			warehouseIds: [1, 2], allowedPages: ['zones'], allowedFunctions: [], allowedOverrides: [],
			mustChangePassword: false
		});
		const pending = beginWarehouseScopedRequest();
		state.select(2);
		expect(state.warehouseId).toBe(2);
		expect(pending.signal.aborted).toBe(true);
		expect(pending.isCurrent()).toBe(false);
		pending.release();
	});

	it('moves away from a warehouse that is removed from the refreshed user assignments', async () => {
		const state = createWarehouseSelectionState();
		const user = {
			userId: 4, username: 'zone-user', fullName: 'Zone User', role: 'USER',
			warehouseIds: [1, 2], allowedPages: ['zones'], allowedFunctions: [], allowedOverrides: [],
			mustChangePassword: false
		};
		await state.load(user);
		state.select(2);
		await state.syncFromUser({ ...user, warehouseIds: [1] });
		expect(state.warehouseId).toBe(1);
		expect(state.selectableIds).toEqual([1]);
	});

});

describe('warehouse selection state for zone workflows', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		resetWarehouseRequestScopeForTests();
		dependencies.listWarehouses.execute.mockResolvedValue([warehouse(1), warehouse(2), warehouse(3)]);
	});

	it('allows selecting only warehouses assigned to a user with the zones grant', async () => {
		const state = createWarehouseSelectionState();
		await state.load({
			userId: 4, username: 'zone-user', fullName: 'Zone User', role: 'USER',
			warehouseIds: [1, 2], allowedPages: ['zones'], allowedFunctions: [], allowedOverrides: [],
			mustChangePassword: false
		});
		expect(state.canSelect).toBe(true);
		expect(state.warehouseId).toBe(1);
		state.select(2);
		expect(state.warehouseId).toBe(2);
		state.select(3);
		expect(state.warehouseId).toBe(2);
		expect(state.warehouses.map(item => item.id)).toEqual([1, 2]);
	});

	it('preserves the selected warehouse when synchronizing the authenticated user without reloading the catalogue', async () => {
		const state = createWarehouseSelectionState();
		const user = {
			userId: 4, username: 'zone-user', fullName: 'Zone User', role: 'USER',
			warehouseIds: [1, 2], allowedPages: ['zones'], allowedFunctions: [], allowedOverrides: [],
			mustChangePassword: false
		};
		await state.load(user);
		state.select(2);

		await state.syncFromUser(user);

		expect(dependencies.listWarehouses.execute).toHaveBeenCalledTimes(1);
		expect(state.warehouseId).toBe(2);
		expect(state.selectableIds).toEqual([1, 2]);
	});

	it('does not expose warehouse selection to a user without warehouse, zones or bins grants', async () => {
		const state = createWarehouseSelectionState();
		await state.load({
			userId: 5, username: 'reader', fullName: 'Reader', role: 'USER',
			warehouseIds: [1], allowedPages: ['items'], allowedFunctions: [], allowedOverrides: [],
			mustChangePassword: false
		});
		expect(state.canSelect).toBe(false);
		state.select(2);
		expect(state.warehouseId).toBe(1);
	});
});
