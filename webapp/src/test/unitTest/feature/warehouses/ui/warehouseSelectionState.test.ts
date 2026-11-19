import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
});

const user = (warehouseIds = [1, 2], allowedPages: string[] = [], role = 'USER') => ({
	userId: 4, username: 'zone-user', fullName: 'Zone User', role,
	warehouseIds, allowedPages, allowedFunctions: [], allowedOverrides: [],
	mustChangePassword: false
});

describe('warehouse selection state', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		resetWarehouseRequestScopeForTests();
		if (typeof sessionStorage !== 'undefined') sessionStorage.clear();
		dependencies.listWarehouses.execute.mockResolvedValue([warehouse(1), warehouse(2), warehouse(3)]);
	});
	afterEach(() => vi.unstubAllGlobals());

	it('limits users without warehouses grant to assigned warehouses and keeps the assigned default', async () => {
		const state = createWarehouseSelectionState();
		await state.load(user());
		expect(state.canSelect).toBe(false);
		expect(state.warehouseId).toBe(1);
		expect(state.selectableIds).toEqual([1, 2]);
		state.select(2);
		expect(state.warehouseId).toBe(1);
	});

	it('allows warehouse managers to select from the operational catalog', async () => {
		const state = createWarehouseSelectionState();
		await state.load(user([1, 2], ['warehouses'], 'ADMIN'));
		expect(state.canSelect).toBe(true);
		state.select(2);
		expect(state.warehouseId).toBe(2);
		expect(state.selectableIds).toEqual([1, 2, 3]);
	});

	it('preserves the selected warehouse when synchronizing unchanged authority', async () => {
		const state = createWarehouseSelectionState();
		const manager = user([1, 2], ['warehouses'], 'ADMIN');
		await state.load(manager);
		state.select(2);
		await state.syncFromUser(manager);
		expect(dependencies.listWarehouses.execute).toHaveBeenCalledTimes(1);
		expect(state.warehouseId).toBe(2);
		expect(state.selectableIds).toEqual([1, 2, 3]);
	});

	it('aborts requests from the previous warehouse when the active selection changes', async () => {
		const state = createWarehouseSelectionState();
		await state.load(user([1, 2], ['warehouses'], 'ADMIN'));
		const pending = beginWarehouseScopedRequest();
		state.select(2);
		expect(state.warehouseId).toBe(2);
		expect(pending.signal.aborted).toBe(true);
		expect(pending.isCurrent()).toBe(false);
		pending.release();
	});

	it('moves away from a selected warehouse when refreshed assignments revoke it', async () => {
		const state = createWarehouseSelectionState();
		await state.load(user([1, 2], ['warehouses'], 'ADMIN'));
		state.select(2);
		await state.syncFromUser(user([1], []));
		expect(state.warehouseId).toBe(1);
		expect(state.selectableIds).toEqual([1]);
		expect(state.canSelect).toBe(false);
	});
});
