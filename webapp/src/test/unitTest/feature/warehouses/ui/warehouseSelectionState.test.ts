import { beforeEach, describe, expect, it, vi } from 'vitest';

const dependencies = vi.hoisted(() => ({
	listAdminWarehouses: { execute: vi.fn() }
}));

vi.mock('../../../../../core/feature/warehouses/di/warehouses.dependencies', () => ({
	createWarehousesDependencies: () => dependencies
}));

import { createWarehouseSelectionState } from '../../../../../core/feature/warehouses/ui/state/warehouseSelectionState.svelte';

const warehouse = (id: number) => ({
	id, code: 'WH-' + id, name: 'Warehouse ' + id, address: null, active: true, createdAt: null
});

describe('warehouse selection state for zone workflows', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		dependencies.listAdminWarehouses.execute.mockResolvedValue([warehouse(1), warehouse(2), warehouse(3)]);
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

		expect(dependencies.listAdminWarehouses.execute).not.toHaveBeenCalled();
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
