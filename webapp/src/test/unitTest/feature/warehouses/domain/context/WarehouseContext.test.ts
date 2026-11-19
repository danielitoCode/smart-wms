import { describe, it, expect } from 'vitest';
import {
	resolveSelectableWarehouseIds,
	canSelectWarehouseContext,
	type WarehouseAuthority
} from '../../../../../../core/feature/warehouses/domain/context/WarehouseContext';

describe('resolveSelectableWarehouseIds', () => {
	it('uses the server active catalog for ADMIN', () => {
		const authority: WarehouseAuthority = {
			role: 'ADMIN',
			assignedWarehouseIds: [],
			allowedPages: []
		};
		expect(resolveSelectableWarehouseIds(authority, [1, 2, 3])).toEqual([1, 2, 3]);
	});

	it('intersects non-admin assignments with the server active catalog', () => {
		const authority: WarehouseAuthority = {
			role: 'USER',
			assignedWarehouseIds: [2, 3, 4],
			allowedPages: ['receiving']
		};
		expect(resolveSelectableWarehouseIds(authority, [1, 2, 3])).toEqual([2, 3]);
	});

	it('fails closed when the active catalog is empty', () => {
		const authority: WarehouseAuthority = {
			role: 'USER',
			assignedWarehouseIds: [7],
			allowedPages: ['receiving']
		};
		expect(resolveSelectableWarehouseIds(authority, [])).toEqual([]);
	});
});


describe('canSelectWarehouseContext', () => {
	it('keeps master-data grants separate from assigned operational scope', () => {
		expect(canSelectWarehouseContext({
			role: 'USER', assignedWarehouseIds: [2, 3], allowedPages: ['receiving']
		})).toBe(false);
		expect(canSelectWarehouseContext({
			role: 'USER', assignedWarehouseIds: [2], allowedPages: ['bins']
		})).toBe(true);
		expect(canSelectWarehouseContext({
			role: 'ADMIN', assignedWarehouseIds: [], allowedPages: []
		})).toBe(true);
	});
});
