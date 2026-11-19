import { describe, it, expect } from 'vitest';
import {
	assertWarehouseAuthorized,
	canSelectWarehouseContext,
	resolveSelectableWarehouseIds,
	authorizedWarehouseIds,
	resolveActiveWarehouseId
} from '../../../../../core/feature/warehouses/domain/context/WarehouseContext';

describe('WarehouseContext F0.3 / P-06..P-11', () => {
	it('P-06 USER assigned to 4 may use 4', () => {
		const ids = authorizedWarehouseIds({
			role: 'USER',
			assignedWarehouseIds: [4],
			allowedPages: []
		});
		expect(ids).toEqual([4]);
		expect(() =>
			assertWarehouseAuthorized(
				{ role: 'USER', assignedWarehouseIds: [4], allowedPages: [] },
				4
			)
		).not.toThrow();
	});

	it('P-07 USER assigned to 4 cannot use 9', () => {
		expect(() =>
			assertWarehouseAuthorized(
				{ role: 'USER', assignedWarehouseIds: [4], allowedPages: ['warehouses'] },
				9,
				[4, 9]
			)
		).toThrow(/not authorized/i);
	});

	it('P-09 USER with empty assignment has no selectable ids', () => {
		expect(
			authorizedWarehouseIds({ role: 'USER', assignedWarehouseIds: [], allowedPages: [] })
		).toEqual([]);
		expect(resolveActiveWarehouseId({ authorizedIds: [], savedId: 4 })).toBeNull();
	});

	it('P-10 ADMIN may use catalog ids beyond assignment', () => {
		const ids = authorizedWarehouseIds(
			{ role: 'ADMIN', assignedWarehouseIds: [1], allowedPages: [] },
			[1, 2, 9]
		);
		expect(ids).toEqual([1, 2, 9]);
		expect(() =>
			assertWarehouseAuthorized(
				{ role: 'ADMIN', assignedWarehouseIds: [1], allowedPages: [] },
				9,
				[1, 2, 9]
			)
		).not.toThrow();
	});

	it('P-11 discards persisted 99 when assignment is [4,8]', () => {
		const next = resolveActiveWarehouseId({ authorizedIds: [4, 8], savedId: 99 });
		expect(next).toBe(4);
	});

	it('zones-only users can switch among assigned warehouses, never another tenant', () => {
		const authority = { role: 'USER', assignedWarehouseIds: [2, 5], allowedPages: ['zones'] };
		expect(canSelectWarehouseContext(authority)).toBe(true);
		expect(authorizedWarehouseIds(authority, [1, 2, 3, 5])).toEqual([2, 5]);
		expect(() => assertWarehouseAuthorized(authority, 3, [1, 2, 3, 5])).toThrow(/not authorized/i);
		expect(() => assertWarehouseAuthorized(authority, 5, [1, 2, 3, 5])).not.toThrow();
	});

	it('unrelated page grants do not enable warehouse selection', () => {
		expect(canSelectWarehouseContext({ role: 'USER', assignedWarehouseIds: [2], allowedPages: ['items'] })).toBe(false);
	});

	it('P-11 keeps valid saved id', () => {
		expect(resolveActiveWarehouseId({ authorizedIds: [4, 8], savedId: 8 })).toBe(8);
	});

	it('bins-only grant allows selecting only assigned active warehouses', () => {
		const authority = { role: 'USER', assignedWarehouseIds: [3, 7], allowedPages: ['bins'] };
		expect(canSelectWarehouseContext(authority)).toBe(true);
		expect(resolveSelectableWarehouseIds(authority, [1, 3, 5, 7])).toEqual([3, 7]);
		expect(() => assertWarehouseAuthorized(authority, 5, [1, 3, 5, 7])).toThrow(/not authorized/i);
		expect(() => assertWarehouseAuthorized(authority, 7, [1, 3, 5, 7])).not.toThrow();
	});

});
