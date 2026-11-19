import { beforeEach, describe, expect, it, vi } from 'vitest';

const dependencies = vi.hoisted(() => ({
	listWarehouses: { execute: vi.fn() },
	listAdminWarehouses: { execute: vi.fn() }
}));

vi.mock('../../../../../core/feature/warehouses/di/warehouses.dependencies', () => ({
	createWarehousesDependencies: () => dependencies
}));

import { createWarehouseSelectionState } from '../../../../../core/feature/warehouses/ui/state/warehouseSelectionState.svelte';
import {
	beginWarehouseScopedRequest,
	resetWarehouseRequestScopeForTests
} from '../../../../../core/infrastructure/warehouse/WarehouseRequestScope';

const warehouse = (id: number) => ({
	id, code: 'WH-' + id, name: 'Warehouse ' + id, address: null, active: true, createdAt: null
});

const zoneUser = (warehouseIds = [1, 2]) => ({
	userId: 4, username: 'zone-user', fullName: 'Zone User', role: 'USER',
	warehouseIds, allowedPages: ['zones'], allowedFunctions: [], allowedOverrides: [],
	mustChangePassword: false
});

describe('warehouse selection state', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		resetWarehouseRequestScopeForTests();
		dependencies.listWarehouses.execute.mockResolvedValue([warehouse(1), warehouse(2), warehouse(3)]);
	});

	it('allows selecting only warehouses assigned to a user with the zones grant', async () => {
		const state = createWarehouseSelectionState();
		await state.load(zoneUser());
		expect(state.canSelect).toBe(true);
		expect(state.warehouseId).toBe(1);
		state.select(2);
		expect(state.warehouseId).toBe(2);
		state.select(3);
		expect(state.warehouseId).toBe(2);
		expect(state.warehouses.map(item => item.id)).toEqual([1, 2]);
	});

	it('preserves the selected warehouse when synchronizing unchanged authority', async () => {
		const state = createWarehouseSelectionState();
		const user = zoneUser();
		await state.load(user);
		state.select(2);
		await state.syncFromUser(user);
		expect(dependencies.listWarehouses.execute).toHaveBeenCalledTimes(1);
		expect(state.warehouseId).toBe(2);
		expect(state.selectableIds).toEqual([1, 2]);
	});

	it('aborts requests from the previous warehouse when the active selection changes', async () => {
		const state = createWarehouseSelectionState();
		await state.load(zoneUser());
		const pending = beginWarehouseScopedRequest();
		state.select(2);
		expect(state.warehouseId).toBe(2);
		expect(pending.signal.aborted).toBe(true);
		expect(pending.isCurrent()).toBe(false);
		pending.release();
	});

	it('moves away from a warehouse removed from refreshed assignments', async () => {
		const state = createWarehouseSelectionState();
		await state.load(zoneUser());
		state.select(2);
		await state.syncFromUser(zoneUser([1]));
		expect(state.warehouseId).toBe(1);
		expect(state.selectableIds).toEqual([1]);
	});

	it('does not expose warehouse selection without a warehouse-related page grant', async () => {
		const state = createWarehouseSelectionState();
		await state.load({
			...zoneUser([1]),
			username: 'reader',
			allowedPages: ['items']
		});
		expect(state.canSelect).toBe(false);
		state.select(2);
		expect(state.warehouseId).toBe(1);
	});
});
