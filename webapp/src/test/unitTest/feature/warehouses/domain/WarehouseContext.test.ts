import { describe, it, expect } from 'vitest';
import {
	assertWarehouseAuthorized,
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

	it('P-11 keeps valid saved id', () => {
		expect(resolveActiveWarehouseId({ authorizedIds: [4, 8], savedId: 8 })).toBe(8);
	});
});
